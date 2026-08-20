# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from pathlib import Path
import os
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
# pyrefly: ignore [missing-import]
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr, Field

from auth_utils import (hash_password, verify_password, create_access_token, create_refresh_token,
                        set_auth_cookies, clear_auth_cookies, get_current_user_from_db)
from seed_data import seed

import certifi

mongo_url = os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

motor_kwargs = {"serverSelectionTimeoutMS": 5000}
if "mongodb+srv://" in mongo_url or "ssl=true" in mongo_url.lower() or "tls=true" in mongo_url.lower():
    motor_kwargs["tlsCAFile"] = certifi.where()

client = AsyncIOMotorClient(mongo_url, **motor_kwargs)
db = client[db_name]


app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

NOW = lambda: datetime.now(timezone.utc).isoformat()


# ---------------- Dependencies ----------------
async def current_user(request: Request) -> dict:
    return await get_current_user_from_db(request, db)


def require_roles(*roles):
    async def checker(user: dict = Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


def is_internal(user):
    return user["role"] in ("super_admin", "admin", "team_member")


def is_manager(user):
    return user["role"] in ("super_admin", "admin")


# ---------------- Helpers ----------------
async def user_client_ids(user):
    """Return list of client_ids a client-role user may access."""
    clients = await db.clients.find({"portal_user_id": user["id"]}, {"_id": 0, "id": 1}).to_list(100)
    return [c["id"] for c in clients]


async def log_activity(actor_id, action, task=None):
    doc = {"id": str(uuid.uuid4()), "actor_id": actor_id, "action": action,
           "task_id": task.get("id") if task else None,
           "project_id": task.get("project_id") if task else None,
           "client_id": task.get("client_id") if task else None, "created_at": NOW()}
    await db.activities.insert_one(dict(doc))


async def notify(user_id, ntype, title, body, link="/"):
    if not user_id:
        return
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "type": ntype, "title": title,
           "body": body, "link": link, "read": False, "created_at": NOW()}
    await db.notifications.insert_one(dict(doc))


async def enrich_user_map():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {u["id"]: u for u in users}


def clean(doc):
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    doc.pop("seed_marker", None)
    return doc


# ---------------- Models ----------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "team_member"


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ClientInput(BaseModel):
    name: str
    industry: str = ""
    logo: str = "🏢"
    account_owner_id: Optional[str] = None
    status: str = "active"
    contacts: List[dict] = []


class ProjectInput(BaseModel):
    name: str
    description: str = ""
    client_id: str
    service_id: Optional[str] = None
    owner_id: Optional[str] = None
    member_ids: List[str] = []
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    status: str = "Not Started"
    budget: Optional[float] = None
    tags: List[str] = []


class TaskInput(BaseModel):
    title: str
    description: str = ""
    brief: str = ""
    client_id: str
    project_id: str
    service_id: Optional[str] = None
    assignee_id: Optional[str] = None
    collaborator_ids: List[str] = []
    priority: str = "Medium"
    status: str = "To Do"
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimate_hours: Optional[float] = None
    tags: List[str] = []
    checklist: List[dict] = []
    subtasks: List[dict] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    brief: Optional[str] = None
    assignee_id: Optional[str] = None
    collaborator_ids: Optional[List[str]] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimate_hours: Optional[float] = None
    tags: Optional[List[str]] = None
    checklist: Optional[List[dict]] = None
    subtasks: Optional[List[dict]] = None
    service_id: Optional[str] = None
    blocked_reason: Optional[str] = None


class CommentInput(BaseModel):
    body: str
    mentions: List[str] = []


class ReviewInput(BaseModel):
    action: str  # approve | request_changes
    feedback: str = ""


class BulkAssign(BaseModel):
    task_ids: List[str]
    assignee_id: str


class ServiceInput(BaseModel):
    name: str
    color: str = "#C2410C"
    description: str = ""


class FileInput(BaseModel):
    name: str
    type: str
    size: int
    data: str
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None


class UserInput(BaseModel):
    email: EmailStr
    password: str = "admin123"
    name: str
    role: str = "team_member"
    department: str = ""
    title: str = ""


# ================= AUTH =================
@api.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower()
    try:
        if await db.users.find_one({"email": email}):
            raise HTTPException(status_code=400, detail="Email already registered")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error during register: {e}")
        raise HTTPException(status_code=500, detail="Database connection error. Please ensure MONGO_URL is properly configured.")
    uid = str(uuid.uuid4())
    doc = {"id": uid, "email": email, "password_hash": hash_password(body.password), "name": body.name,
           "role": body.role, "department": "", "title": "", "avatar": "", "phone": "", "status": "active",
           "created_at": NOW()}
    await db.users.insert_one(dict(doc))
    access_token = create_access_token(uid, email)
    refresh_token = create_refresh_token(uid)
    set_auth_cookies(response, access_token, refresh_token)
    user_data = clean(doc)
    user_data["access_token"] = access_token
    user_data["token"] = access_token
    return user_data


@api.post("/auth/login")
async def login(body: LoginInput, response: Response):
    email = body.email.lower()
    try:
        user = await db.users.find_one({"email": email})
    except Exception as e:
        logger.error(f"Database error during login: {e}")
        raise HTTPException(status_code=500, detail="Database connection error. Please ensure MONGO_URL is properly configured.")
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(user["id"], email)
    refresh_token = create_refresh_token(user["id"])
    set_auth_cookies(response, access_token, refresh_token)
    user_data = clean(dict(user))
    user_data["access_token"] = access_token
    user_data["token"] = access_token
    return user_data


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    import jwt as _jwt
    from auth_utils import _secret, JWT_ALGORITHM
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = _jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        u = await db.users.find_one({"id": payload["sub"]})
        set_auth_cookies(response, create_access_token(u["id"], u["email"]), create_refresh_token(u["id"]))
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ================= USERS / TEAM =================
@api.get("/users")
async def list_users(user: dict = Depends(current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "seed_marker": 0}).to_list(1000)
    return users


@api.get("/team")
async def team_workload(user: dict = Depends(require_roles("super_admin", "admin"))):
    users = await db.users.find({"role": {"$in": ["team_member", "admin", "super_admin"]}},
                                {"_id": 0, "password_hash": 0, "seed_marker": 0}).to_list(1000)
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(5000)
    now = datetime.now(timezone.utc).isoformat()
    for u in users:
        mine = [t for t in tasks if t.get("assignee_id") == u["id"]]
        u["active_tasks"] = len([t for t in mine if t["status"] not in ("Completed", "Approved")])
        u["completed_tasks"] = len([t for t in mine if t["status"] in ("Completed", "Approved")])
        u["overdue_tasks"] = len([t for t in mine if t.get("due_date") and t["due_date"] < now
                                  and t["status"] not in ("Completed", "Approved")])
        u["in_progress"] = len([t for t in mine if t["status"] == "In Progress"])
        load = u["active_tasks"]
        u["workload"] = "high" if load >= 5 else "medium" if load >= 3 else "low"
    return users


@api.post("/users")
async def create_user(body: UserInput, user: dict = Depends(require_roles("super_admin", "admin"))):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(body.password),
           "name": body.name, "role": body.role, "department": body.department, "title": body.title,
           "avatar": "", "phone": "", "status": "active", "created_at": NOW()}
    await db.users.insert_one(dict(doc))
    return clean(doc)


# ================= SERVICES =================
@api.get("/services")
async def list_services(user: dict = Depends(current_user)):
    svcs = await db.services.find({}, {"_id": 0, "seed_marker": 0}).to_list(200)
    tasks = await db.tasks.find({}, {"_id": 0, "service_id": 1, "status": 1}).to_list(5000)
    for s in svcs:
        st = [t for t in tasks if t.get("service_id") == s["id"]]
        s["active_tasks"] = len([t for t in st if t["status"] not in ("Completed", "Approved")])
        s["total_tasks"] = len(st)
        done = len([t for t in st if t["status"] in ("Completed", "Approved")])
        s["completion"] = round(done / len(st) * 100) if st else 0
    return svcs


@api.post("/services")
async def create_service(body: ServiceInput, user: dict = Depends(require_roles("super_admin", "admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump()}
    await db.services.insert_one(dict(doc))
    return doc


# ================= CLIENTS =================
@api.get("/clients")
async def list_clients(user: dict = Depends(current_user)):
    q = {}
    if user["role"] == "client":
        q = {"portal_user_id": user["id"]}
    clients = await db.clients.find(q, {"_id": 0, "seed_marker": 0}).to_list(500)
    projects = await db.projects.find({}, {"_id": 0}).to_list(2000)
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(5000)
    umap = await enrich_user_map()
    for c in clients:
        cps = [p for p in projects if p["client_id"] == c["id"]]
        c["active_projects"] = len([p for p in cps if p["status"] not in ("Completed", "Archived")])
        cts = [t for t in tasks if t["client_id"] == c["id"]]
        c["open_tasks"] = len([t for t in cts if t["status"] not in ("Completed", "Approved")])
        owner = umap.get(c.get("account_owner_id"))
        c["account_owner"] = {"name": owner["name"], "avatar": owner.get("avatar")} if owner else None
    return clients


@api.post("/clients")
async def create_client(body: ClientInput, user: dict = Depends(require_roles("super_admin", "admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": NOW()}
    if not doc.get("account_owner_id"):
        doc["account_owner_id"] = user["id"]
    await db.clients.insert_one(dict(doc))
    await log_activity(user["id"], f"created client {body.name}")
    return doc


@api.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(current_user)):
    c = await db.clients.find_one({"id": client_id}, {"_id": 0, "seed_marker": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    if user["role"] == "client" and c.get("portal_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    projects = await db.projects.find({"client_id": client_id}, {"_id": 0, "seed_marker": 0}).to_list(500)
    tasks = await db.tasks.find({"client_id": client_id}, {"_id": 0, "seed_marker": 0}).to_list(2000)
    files = await db.files.find({"client_id": client_id}, {"_id": 0, "data": 0, "seed_marker": 0}).to_list(500)
    acts = await db.activities.find({"client_id": client_id}, {"_id": 0, "seed_marker": 0}).sort("created_at", -1).to_list(50)
    return {"client": c, "projects": projects, "tasks": tasks, "files": files, "activities": acts}


@api.patch("/clients/{client_id}")
async def update_client(client_id: str, body: dict, user: dict = Depends(require_roles("super_admin", "admin"))):
    body.pop("id", None)
    await db.clients.update_one({"id": client_id}, {"$set": body})
    return {"ok": True}


# ================= PROJECTS =================
@api.get("/projects")
async def list_projects(user: dict = Depends(current_user)):
    q = {}
    if user["role"] == "client":
        q = {"client_id": {"$in": await user_client_ids(user)}}
    projects = await db.projects.find(q, {"_id": 0, "seed_marker": 0}).to_list(2000)
    clients = {c["id"]: c for c in await db.clients.find({}, {"_id": 0}).to_list(500)}
    services = {s["id"]: s for s in await db.services.find({}, {"_id": 0}).to_list(200)}
    tasks = await db.tasks.find({}, {"_id": 0, "project_id": 1, "status": 1}).to_list(5000)
    umap = await enrich_user_map()
    for p in projects:
        cl = clients.get(p["client_id"])
        p["client"] = {"name": cl["name"], "logo": cl.get("logo")} if cl else None
        sv = services.get(p.get("service_id"))
        p["service"] = {"name": sv["name"], "color": sv["color"]} if sv else None
        ow = umap.get(p.get("owner_id"))
        p["owner"] = {"name": ow["name"], "avatar": ow.get("avatar")} if ow else None
        p["members"] = [{"name": umap[m]["name"], "avatar": umap[m].get("avatar")} for m in p.get("member_ids", []) if m in umap]
        pts = [t for t in tasks if t["project_id"] == p["id"]]
        p["total_tasks"] = len(pts)
        p["completed_tasks"] = len([t for t in pts if t["status"] in ("Completed", "Approved")])
        p["progress"] = round(p["completed_tasks"] / len(pts) * 100) if pts else 0
    return projects


@api.post("/projects")
async def create_project(body: ProjectInput, user: dict = Depends(require_roles("super_admin", "admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": NOW()}
    if not doc.get("owner_id"):
        doc["owner_id"] = user["id"]
    await db.projects.insert_one(dict(doc))
    await log_activity(user["id"], f"created project {body.name}")
    for m in body.member_ids:
        await notify(m, "project", "Added to project", f"You were added to {body.name}", "/projects")
    return doc


@api.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(current_user)):
    p = await db.projects.find_one({"id": project_id}, {"_id": 0, "seed_marker": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if user["role"] == "client" and p["client_id"] not in await user_client_ids(user):
        raise HTTPException(status_code=403, detail="Access denied")
    tasks = await enrich_tasks(await db.tasks.find({"project_id": project_id}, {"_id": 0, "seed_marker": 0}).to_list(2000))
    client_doc = await db.clients.find_one({"id": p["client_id"]}, {"_id": 0, "seed_marker": 0})
    files = await db.files.find({"project_id": project_id}, {"_id": 0, "data": 0, "seed_marker": 0}).to_list(500)
    acts = await db.activities.find({"project_id": project_id}, {"_id": 0, "seed_marker": 0}).sort("created_at", -1).to_list(50)
    umap = await enrich_user_map()
    p["owner"] = _uref(umap.get(p.get("owner_id")))
    p["members"] = [_uref(umap[m]) for m in p.get("member_ids", []) if m in umap]
    return {"project": p, "tasks": tasks, "client": client_doc, "files": files, "activities": acts}


@api.patch("/projects/{project_id}")
async def update_project(project_id: str, body: dict, user: dict = Depends(require_roles("super_admin", "admin"))):
    body.pop("id", None)
    await db.projects.update_one({"id": project_id}, {"$set": body})
    return {"ok": True}


# ================= TASKS =================
def _uref(u):
    if not u:
        return None
    return {"id": u["id"], "name": u["name"], "avatar": u.get("avatar"), "role": u.get("role")}


async def enrich_tasks(tasks):
    clients = {c["id"]: c for c in await db.clients.find({}, {"_id": 0}).to_list(500)}
    projects = {p["id"]: p for p in await db.projects.find({}, {"_id": 0}).to_list(2000)}
    services = {s["id"]: s for s in await db.services.find({}, {"_id": 0}).to_list(200)}
    umap = await enrich_user_map()
    for t in tasks:
        cl = clients.get(t.get("client_id"))
        t["client"] = {"id": cl["id"], "name": cl["name"], "logo": cl.get("logo")} if cl else None
        pr = projects.get(t.get("project_id"))
        t["project"] = {"id": pr["id"], "name": pr["name"]} if pr else None
        sv = services.get(t.get("service_id"))
        t["service"] = {"name": sv["name"], "color": sv["color"]} if sv else None
        t["assignee"] = _uref(umap.get(t.get("assignee_id")))
        t["reporter"] = _uref(umap.get(t.get("reporter_id")))
        t["collaborators"] = [_uref(umap[c]) for c in t.get("collaborator_ids", []) if c in umap]
    return tasks


@api.get("/tasks")
async def list_tasks(assignee_id: Optional[str] = None, project_id: Optional[str] = None,
                     client_id: Optional[str] = None, status: Optional[str] = None,
                     priority: Optional[str] = None, user: dict = Depends(current_user)):
    q = {}
    if user["role"] == "client":
        q["client_id"] = {"$in": await user_client_ids(user)}
    if assignee_id:
        q["assignee_id"] = assignee_id
    if project_id:
        q["project_id"] = project_id
    if client_id:
        q["client_id"] = client_id
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    tasks = await db.tasks.find(q, {"_id": 0, "seed_marker": 0}).sort("created_at", -1).to_list(5000)
    return await enrich_tasks(tasks)


@api.post("/tasks")
async def create_task(body: TaskInput, user: dict = Depends(require_roles("super_admin", "admin"))):
    count = await db.counters.find_one_and_update({"id": "task"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True)
    seq = count["seq"] if count else 2500
    doc = {"id": str(uuid.uuid4()), "key": f"TASK-{2500 + seq}", **body.model_dump(),
           "reporter_id": user["id"], "blocked_reason": None, "created_at": NOW(), "updated_at": NOW()}
    await db.tasks.insert_one(dict(doc))
    await log_activity(user["id"], f"created {doc['key']}", doc)
    if body.assignee_id:
        await notify(body.assignee_id, "assignment", "New task assigned",
                     f"{doc['key']} — {body.title}", "/my-work")
        await log_activity(user["id"], f"assigned {doc['key']}", doc)
    return (await enrich_tasks([clean(dict(doc))]))[0]


@api.get("/tasks/{task_id}")
async def get_task(task_id: str, user: dict = Depends(current_user)):
    t = await db.tasks.find_one({"id": task_id}, {"_id": 0, "seed_marker": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    if user["role"] == "client" and t["client_id"] not in await user_client_ids(user):
        raise HTTPException(status_code=403, detail="Access denied")
    t = (await enrich_tasks([t]))[0]
    comments = await db.comments.find({"task_id": task_id}, {"_id": 0, "seed_marker": 0}).sort("created_at", 1).to_list(500)
    umap = await enrich_user_map()
    for c in comments:
        c["author"] = _uref(umap.get(c["author_id"]))
    files = await db.files.find({"task_id": task_id}, {"_id": 0, "seed_marker": 0}).sort("created_at", -1).to_list(200)
    acts = await db.activities.find({"task_id": task_id}, {"_id": 0, "seed_marker": 0}).sort("created_at", -1).to_list(100)
    for a in acts:
        a["actor"] = _uref(umap.get(a["actor_id"]))
    return {"task": t, "comments": comments, "files": files, "activities": acts}


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    # team member can only edit their own assigned tasks
    if user["role"] == "team_member" and t.get("assignee_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own tasks")
    if user["role"] == "client":
        raise HTTPException(status_code=403, detail="Access denied")
    changes["updated_at"] = NOW()
    await db.tasks.update_one({"id": task_id}, {"$set": changes})
    if "status" in changes and changes["status"] != t["status"]:
        await log_activity(user["id"], f"moved {t['key']} to {changes['status']}", t)
        if t.get("reporter_id") and t["reporter_id"] != user["id"]:
            await notify(t["reporter_id"], "status", "Status changed",
                         f"{t['key']} moved to {changes['status']}", "/tasks")
    if "assignee_id" in changes and changes["assignee_id"] != t.get("assignee_id"):
        await log_activity(user["id"], f"reassigned {t['key']}", t)
        await notify(changes["assignee_id"], "assignment", "Task assigned to you",
                     f"{t['key']} — {t['title']}", "/my-work")
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0, "seed_marker": 0})
    return (await enrich_tasks([updated]))[0]


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(require_roles("super_admin", "admin"))):
    await db.tasks.delete_one({"id": task_id})
    return {"ok": True}


@api.post("/tasks/bulk-assign")
async def bulk_assign(body: BulkAssign, user: dict = Depends(require_roles("super_admin", "admin"))):
    await db.tasks.update_many({"id": {"$in": body.task_ids}},
                               {"$set": {"assignee_id": body.assignee_id, "updated_at": NOW()}})
    await notify(body.assignee_id, "assignment", "Tasks assigned",
                 f"{len(body.task_ids)} tasks assigned to you", "/my-work")
    await log_activity(user["id"], f"assigned {len(body.task_ids)} tasks")
    return {"ok": True, "count": len(body.task_ids)}


@api.post("/tasks/{task_id}/submit")
async def submit_review(task_id: str, user: dict = Depends(current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.tasks.update_one({"id": task_id}, {"$set": {"status": "In Review", "updated_at": NOW()}})
    await log_activity(user["id"], f"submitted {t['key']} for review", t)
    if t.get("reporter_id"):
        await notify(t["reporter_id"], "review", "Work submitted",
                     f"{t['key']} submitted for review", "/tasks")
    return {"ok": True}


@api.post("/tasks/{task_id}/review")
async def review_task(task_id: str, body: ReviewInput, user: dict = Depends(require_roles("super_admin", "admin"))):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    new_status = "Approved" if body.action == "approve" else "Changes Requested"
    await db.tasks.update_one({"id": task_id}, {"$set": {"status": new_status, "updated_at": NOW()}})
    verb = "approved" if body.action == "approve" else "requested changes on"
    await log_activity(user["id"], f"{verb} {t['key']}", t)
    if body.feedback:
        cdoc = {"id": str(uuid.uuid4()), "task_id": task_id, "author_id": user["id"],
                "body": body.feedback, "mentions": [], "created_at": NOW()}
        await db.comments.insert_one(dict(cdoc))
    if t.get("assignee_id"):
        title = "Work approved" if body.action == "approve" else "Changes requested"
        await notify(t["assignee_id"], "review", title, f"{t['key']}: {body.feedback or new_status}", "/my-work")
    return {"ok": True, "status": new_status}


# ================= COMMENTS =================
@api.post("/tasks/{task_id}/comments")
async def add_comment(task_id: str, body: CommentInput, user: dict = Depends(current_user)):
    t = await db.tasks.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    doc = {"id": str(uuid.uuid4()), "task_id": task_id, "author_id": user["id"],
           "body": body.body, "mentions": body.mentions, "created_at": NOW()}
    await db.comments.insert_one(dict(doc))
    await log_activity(user["id"], f"commented on {t['key']}", t)
    for m in body.mentions:
        await notify(m, "mention", "You were mentioned",
                     f"{user['name']} mentioned you on {t['key']}", "/tasks")
    umap = await enrich_user_map()
    d = clean(dict(doc))
    d["author"] = _uref(umap.get(user["id"]))
    return d


# ================= FILES =================
@api.get("/files")
async def list_files(user: dict = Depends(current_user)):
    q = {}
    if user["role"] == "client":
        q = {"client_id": {"$in": await user_client_ids(user)}}
    files = await db.files.find(q, {"_id": 0, "data": 0, "seed_marker": 0}).sort("created_at", -1).to_list(1000)
    clients = {c["id"]: c["name"] for c in await db.clients.find({}, {"_id": 0}).to_list(500)}
    projects = {p["id"]: p["name"] for p in await db.projects.find({}, {"_id": 0}).to_list(2000)}
    umap = await enrich_user_map()
    for f in files:
        f["client_name"] = clients.get(f.get("client_id"))
        f["project_name"] = projects.get(f.get("project_id"))
        f["uploader"] = _uref(umap.get(f.get("uploader_id")))
    return files


@api.post("/files")
async def upload_file(body: FileInput, user: dict = Depends(current_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "uploader_id": user["id"], "created_at": NOW()}
    await db.files.insert_one(dict(doc))
    if body.task_id:
        t = await db.tasks.find_one({"id": body.task_id})
        if t:
            await log_activity(user["id"], f"uploaded {body.name} to {t['key']}", t)
    d = clean(dict(doc))
    d.pop("data", None)
    return d


@api.get("/files/{file_id}")
async def get_file(file_id: str, user: dict = Depends(current_user)):
    f = await db.files.find_one({"id": file_id}, {"_id": 0, "seed_marker": 0})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f


@api.delete("/files/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(current_user)):
    await db.files.delete_one({"id": file_id})
    return {"ok": True}


# ================= NOTIFICATIONS =================
@api.get("/notifications")
async def list_notifications(user: dict = Depends(current_user)):
    notes = await db.notifications.find({"user_id": user["id"]}, {"_id": 0, "seed_marker": 0}).sort("created_at", -1).to_list(200)
    return notes


@api.post("/notifications/{note_id}/read")
async def mark_read(note_id: str, user: dict = Depends(current_user)):
    await db.notifications.update_one({"id": note_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ================= ACTIVITIES =================
@api.get("/activities")
async def list_activities(user: dict = Depends(current_user)):
    q = {}
    if user["role"] == "client":
        q = {"client_id": {"$in": await user_client_ids(user)}}
    acts = await db.activities.find(q, {"_id": 0, "seed_marker": 0}).sort("created_at", -1).to_list(100)
    umap = await enrich_user_map()
    for a in acts:
        a["actor"] = _uref(umap.get(a["actor_id"]))
    return acts


# ================= DASHBOARD =================
@api.get("/dashboard")
async def dashboard(user: dict = Depends(current_user)):
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()
    q = {}
    if user["role"] == "client":
        q = {"client_id": {"$in": await user_client_ids(user)}}
    all_tasks = await enrich_tasks(await db.tasks.find(q, {"_id": 0, "seed_marker": 0}).to_list(5000))

    if user["role"] in ("team_member",):
        my = [t for t in all_tasks if t.get("assignee_id") == user["id"]]
    else:
        my = [t for t in all_tasks if t.get("assignee_id") == user["id"]]

    def open_of(lst):
        return [t for t in lst if t["status"] not in ("Completed", "Approved")]

    stats = {
        "open": len(open_of(my)),
        "due_today": len([t for t in my if (t.get("due_date") or "").startswith(today) and t["status"] not in ("Completed", "Approved")]),
        "overdue": len([t for t in my if t.get("due_date") and t["due_date"] < now and t["status"] not in ("Completed", "Approved")]),
        "in_review": len([t for t in my if t["status"] == "In Review"]),
        "blocked": len([t for t in my if t["status"] == "Blocked"]),
        "completed_week": len([t for t in my if t["status"] in ("Completed", "Approved")]),
    }
    upcoming = sorted([t for t in open_of(my) if t.get("due_date")], key=lambda x: x["due_date"])[:8]
    blocked = [t for t in all_tasks if t["status"] == "Blocked"][:8]
    acts = await list_activities(user)

    team = []
    if is_manager(user):
        team = await team_workload(user)

    return {"stats": stats, "my_tasks": my[:12], "upcoming": upcoming,
            "blocked": blocked, "activities": acts[:10], "team": team}


# ================= REPORTS =================
@api.get("/reports")
async def reports(user: dict = Depends(require_roles("super_admin", "admin"))):
    now = datetime.now(timezone.utc).isoformat()
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(5000)
    projects = await db.projects.find({}, {"_id": 0}).to_list(2000)
    clients = {c["id"]: c["name"] for c in await db.clients.find({}, {"_id": 0}).to_list(500)}
    services = {s["id"]: s["name"] for s in await db.services.find({}, {"_id": 0}).to_list(200)}
    umap = await enrich_user_map()

    def count_by(key_fn, label_map=None):
        d = {}
        for t in tasks:
            k = key_fn(t)
            if k:
                d[k] = d.get(k, 0) + 1
        return [{"name": (label_map.get(k) if label_map else k), "value": v} for k, v in d.items()]

    return {
        "totals": {
            "active_projects": len([p for p in projects if p["status"] not in ("Completed", "Archived")]),
            "active_tasks": len([t for t in tasks if t["status"] not in ("Completed", "Approved")]),
            "completed": len([t for t in tasks if t["status"] in ("Completed", "Approved")]),
            "overdue": len([t for t in tasks if t.get("due_date") and t["due_date"] < now and t["status"] not in ("Completed", "Approved")]),
            "blocked": len([t for t in tasks if t["status"] == "Blocked"]),
        },
        "by_status": count_by(lambda t: t["status"]),
        "by_priority": count_by(lambda t: t["priority"]),
        "by_member": count_by(lambda t: t.get("assignee_id"), {u: umap[u]["name"] for u in umap}),
        "by_client": count_by(lambda t: t.get("client_id"), clients),
        "by_service": count_by(lambda t: t.get("service_id"), services),
    }


# ================= SEARCH =================
@api.get("/search")
async def search(q: str, user: dict = Depends(current_user)):
    if not q or len(q) < 1:
        return {"clients": [], "projects": [], "tasks": [], "users": [], "files": []}
    rx = {"$regex": q, "$options": "i"}
    client_filter = {}
    if user["role"] == "client":
        cids = await user_client_ids(user)
        client_filter = {"client_id": {"$in": cids}}
    clients = [] if user["role"] == "client" else await db.clients.find({"name": rx}, {"_id": 0, "seed_marker": 0}).to_list(10)
    projects = await db.projects.find({**client_filter, "name": rx}, {"_id": 0, "seed_marker": 0}).to_list(10)
    tasks = await db.tasks.find({**client_filter, "$or": [{"title": rx}, {"key": rx}]}, {"_id": 0, "seed_marker": 0}).to_list(15)
    users = [] if user["role"] == "client" else await db.users.find({"name": rx}, {"_id": 0, "password_hash": 0, "seed_marker": 0}).to_list(10)
    files = await db.files.find({**client_filter, "name": rx}, {"_id": 0, "data": 0, "seed_marker": 0}).to_list(10)
    return {"clients": clients, "projects": projects, "tasks": tasks, "users": users, "files": files}


# ---------------- App wiring ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id")
        await db.tasks.create_index("id")
        await db.projects.create_index("id")
        await db.clients.create_index("id")
        await seed(db, os.environ.get("ADMIN_EMAIL", "coconutwater2911@gmail.com"),
                   os.environ.get("ADMIN_PASSWORD", "admin123"))
        logger.info("Startup complete, seed ensured.")
    except Exception as e:
        logger.warning(f"Startup database warning (will retry on next request): {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
