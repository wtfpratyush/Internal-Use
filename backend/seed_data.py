"""Idempotent rich demo data seeding."""
import uuid
from datetime import datetime, timezone, timedelta
from auth_utils import hash_password

AV = [
    "https://images.unsplash.com/photo-1609436132311-e4b0c9370469?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXR8ZW58MHx8fHwxNzg3MDQyMDIwfDA&ixlib=rb-4.1.0&q=85",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXR8ZW58MHx8fHwxNzg3MDQyMDIwfDA&ixlib=rb-4.1.0&q=85",
    "https://images.pexels.com/photos/17049771/pexels-photo-17049771.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "https://images.pexels.com/photos/37148308/pexels-photo-37148308.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
]


def _iso(dt):
    return dt.isoformat()


async def seed(db, admin_email: str, admin_password: str):
    if await db.users.find_one({"seed_marker": True}):
        return

    now = datetime.now(timezone.utc)
    pw = hash_password("admin123")

    # ---- Users ----
    owner = {"id": str(uuid.uuid4()), "email": admin_email, "password_hash": hash_password(admin_password),
             "name": "Alex Rivera", "role": "super_admin", "department": "Leadership", "title": "Founder & CEO",
             "avatar": AV[0], "phone": "+1 555 0100", "status": "active", "seed_marker": True, "created_at": _iso(now)}
    priya = {"id": str(uuid.uuid4()), "email": "priya@studio.com", "password_hash": pw, "name": "Priya Menon",
             "role": "admin", "department": "Operations", "title": "Operations Manager", "avatar": AV[1],
             "phone": "+1 555 0101", "status": "active", "seed_marker": True, "created_at": _iso(now)}
    rahul = {"id": str(uuid.uuid4()), "email": "rahul@studio.com", "password_hash": pw, "name": "Rahul Verma",
             "role": "team_member", "department": "Design", "title": "Senior Designer", "avatar": AV[2],
             "phone": "+1 555 0102", "status": "active", "seed_marker": True, "created_at": _iso(now)}
    ananya = {"id": str(uuid.uuid4()), "email": "ananya@studio.com", "password_hash": pw, "name": "Ananya Rao",
              "role": "team_member", "department": "Content", "title": "Content Lead", "avatar": AV[3],
              "phone": "+1 555 0103", "status": "active", "seed_marker": True, "created_at": _iso(now)}
    dev = {"id": str(uuid.uuid4()), "email": "dev@studio.com", "password_hash": pw, "name": "Dev Kapoor",
           "role": "team_member", "department": "Engineering", "title": "Frontend Engineer", "avatar": AV[0],
           "phone": "+1 555 0104", "status": "active", "seed_marker": True, "created_at": _iso(now)}
    client_user = {"id": str(uuid.uuid4()), "email": "contact@novaathletics.com", "password_hash": pw,
                   "name": "Jordan Blake", "role": "client", "department": "Client", "title": "Brand Manager",
                   "avatar": AV[1], "phone": "+1 555 0200", "status": "active", "seed_marker": True, "created_at": _iso(now)}
    users = [owner, priya, rahul, ananya, dev, client_user]
    await db.users.insert_many([dict(u) for u in users])
    team = [rahul, ananya, dev]

    # ---- Services ----
    services = [
        {"id": str(uuid.uuid4()), "name": "UI/UX Design", "color": "#C2410C", "description": "Product & interface design", "seed_marker": True},
        {"id": str(uuid.uuid4()), "name": "Web Development", "color": "#0EA5E9", "description": "Websites & web apps", "seed_marker": True},
        {"id": str(uuid.uuid4()), "name": "Branding", "color": "#8B5CF6", "description": "Identity & brand systems", "seed_marker": True},
        {"id": str(uuid.uuid4()), "name": "Social Media", "color": "#10B981", "description": "Social content & campaigns", "seed_marker": True},
        {"id": str(uuid.uuid4()), "name": "SEO", "color": "#F59E0B", "description": "Search optimization", "seed_marker": True},
        {"id": str(uuid.uuid4()), "name": "Content", "color": "#EC4899", "description": "Copywriting & content", "seed_marker": True},
    ]
    await db.services.insert_many([dict(s) for s in services])
    svc = {s["name"]: s["id"] for s in services}

    # ---- Clients ----
    clients = [
        {"id": str(uuid.uuid4()), "name": "Nova Athletics", "industry": "Sportswear", "logo": "🏃",
         "account_owner_id": priya["id"], "status": "active", "seed_marker": True, "created_at": _iso(now - timedelta(days=40)),
         "contacts": [{"name": "Jordan Blake", "email": "contact@novaathletics.com", "role": "Brand Manager"}],
         "portal_user_id": client_user["id"]},
        {"id": str(uuid.uuid4()), "name": "Nike", "industry": "Sportswear", "logo": "✔️",
         "account_owner_id": priya["id"], "status": "active", "seed_marker": True, "created_at": _iso(now - timedelta(days=60)),
         "contacts": [{"name": "Sam Carter", "email": "sam@nike.com", "role": "Marketing Director"}]},
        {"id": str(uuid.uuid4()), "name": "Lumen Coffee", "industry": "F&B", "logo": "☕",
         "account_owner_id": owner["id"], "status": "active", "seed_marker": True, "created_at": _iso(now - timedelta(days=20)),
         "contacts": [{"name": "Mia Chen", "email": "mia@lumen.com", "role": "Founder"}]},
        {"id": str(uuid.uuid4()), "name": "Vertex Finance", "industry": "Fintech", "logo": "📈",
         "account_owner_id": priya["id"], "status": "archived", "seed_marker": True, "created_at": _iso(now - timedelta(days=120)),
         "contacts": [{"name": "Leo Park", "email": "leo@vertex.com", "role": "CMO"}]},
    ]
    await db.clients.insert_many([dict(c) for c in clients])
    nova, nike, lumen = clients[0]["id"], clients[1]["id"], clients[2]["id"]

    # ---- Projects ----
    def proj(name, desc, client_id, service, owner_id, members, days_start, days_due, priority, status, budget, tags):
        return {"id": str(uuid.uuid4()), "name": name, "description": desc, "client_id": client_id,
                "service_id": svc[service], "owner_id": owner_id, "member_ids": members,
                "start_date": _iso(now + timedelta(days=days_start)), "due_date": _iso(now + timedelta(days=days_due)),
                "priority": priority, "status": status, "budget": budget, "tags": tags, "seed_marker": True,
                "created_at": _iso(now - timedelta(days=abs(days_start)))}

    projects = [
        proj("Autumn Drop Campaign", "Full brand campaign for the Autumn 2026 product line.", nova, "Branding",
             priya["id"], [rahul["id"], ananya["id"], dev["id"]], -14, 12, "High", "In Progress", 45000,
             ["campaign", "autumn"]),
        proj("Website Redesign", "Complete overhaul of the Nova Athletics e-commerce site.", nova, "Web Development",
             owner["id"], [dev["id"], rahul["id"]], -7, 30, "High", "Planning", 80000, ["web", "ecommerce"]),
        proj("Social Media Campaign", "Q3 Instagram & TikTok content push.", nike, "Social Media",
             priya["id"], [ananya["id"], rahul["id"]], -21, 5, "Urgent", "In Review", 30000, ["social"]),
        proj("Brand Refresh", "New identity system and guidelines.", lumen, "Branding",
             owner["id"], [rahul["id"], ananya["id"]], -5, 45, "Medium", "Not Started", 25000, ["branding"]),
    ]
    await db.projects.insert_many([dict(p) for p in projects])
    p_autumn, p_web, p_social, p_brand = [p["id"] for p in projects]

    # ---- Tasks ----
    counter = {"n": 2480}

    def task(title, desc, client_id, project_id, service, assignee, priority, status, days_due, tags,
             reporter=priya["id"], collaborators=None, blocked_reason=None, checklist=None, subtasks=None, brief=""):
        counter["n"] += 1
        return {"id": str(uuid.uuid4()), "key": f"TASK-{counter['n']}", "title": title, "description": desc,
                "brief": brief, "client_id": client_id, "project_id": project_id, "service_id": svc[service],
                "assignee_id": assignee, "collaborator_ids": collaborators or [], "reporter_id": reporter,
                "priority": priority, "status": status, "start_date": _iso(now - timedelta(days=3)),
                "due_date": _iso(now + timedelta(days=days_due)), "estimate_hours": 8, "tags": tags,
                "checklist": checklist or [], "subtasks": subtasks or [], "blocked_reason": blocked_reason,
                "seed_marker": True, "created_at": _iso(now - timedelta(days=5)), "updated_at": _iso(now - timedelta(hours=6))}

    tasks = [
        task("Hero Key Visual — Autumn Drop", "Design the primary hero key visual for the campaign landing.",
             nova, p_autumn, "Branding", rahul["id"], "High", "In Progress", 3, ["design", "hero"],
             collaborators=[ananya["id"]],
             brief="Bold, energetic, autumn palette (rust/amber). 16:9 and 9:16 variants.",
             checklist=[{"id": str(uuid.uuid4()), "text": "Mood board approved", "done": True},
                        {"id": str(uuid.uuid4()), "text": "First draft", "done": True},
                        {"id": str(uuid.uuid4()), "text": "Export variants", "done": False}],
             subtasks=[{"id": str(uuid.uuid4()), "title": "16:9 variant", "done": True},
                       {"id": str(uuid.uuid4()), "title": "9:16 variant", "done": False}]),
        task("Instagram Carousel — 5 slides", "Create a 5-slide product carousel.", nova, p_autumn, "Social Media",
             ananya["id"], "Medium", "In Review", 1, ["social"], collaborators=[rahul["id"]]),
        task("Reel — Product Teaser", "15s teaser reel for launch day.", nova, p_autumn, "Social Media",
             ananya["id"], "High", "Changes Requested", 2, ["video"]),
        task("Static Creative Pack", "Set of 6 static creatives for paid ads.", nova, p_autumn, "UI/UX Design",
             rahul["id"], "Medium", "To Do", 6, ["ads"]),
        task("Campaign Copywriting", "Headlines and body copy for all placements.", nova, p_autumn, "Content",
             ananya["id"], "Medium", "Brief", 4, ["copy"]),
        task("Final Delivery Package", "Bundle all approved assets for handoff.", nova, p_autumn, "Branding",
             rahul["id"], "Low", "Blocked", 8, ["delivery"], blocked_reason="Waiting for Client approval"),
        task("Homepage Wireframes", "Low-fi wireframes for the new homepage.", nova, p_web, "UI/UX Design",
             dev["id"], "High", "In Progress", -1, ["web"], collaborators=[rahul["id"]]),
        task("Product Page Build", "Build responsive PDP components.", nova, p_web, "Web Development",
             dev["id"], "Urgent", "To Do", 10, ["dev"]),
        task("Checkout Flow", "Implement multi-step checkout.", nova, p_web, "Web Development",
             dev["id"], "High", "Blocked", 15, ["dev"], blocked_reason="Waiting for payment API keys"),
        task("TikTok Content Batch", "10 short-form videos for Nike Q3.", nike, p_social, "Social Media",
             ananya["id"], "Urgent", "In Review", 0, ["tiktok"]),
        task("Instagram Grid Plan", "Plan 30-day grid layout.", nike, p_social, "Social Media",
             rahul["id"], "Medium", "Approved", -2, ["social"]),
        task("Logo Exploration", "3 logo directions for Lumen refresh.", lumen, p_brand, "Branding",
             rahul["id"], "Medium", "To Do", 12, ["logo"]),
        task("Brand Guidelines Doc", "Compile identity guidelines.", lumen, p_brand, "Content",
             ananya["id"], "Low", "To Do", 20, ["docs"]),
        task("SEO Audit", "Technical SEO audit of current site.", nova, p_web, "SEO",
             dev["id"], "Medium", "Completed", -5, ["seo"]),
    ]
    await db.tasks.insert_many([dict(t) for t in tasks])

    # ---- Comments ----
    t0, t1, t2 = tasks[0], tasks[1], tasks[2]
    comments = [
        {"id": str(uuid.uuid4()), "task_id": t0["id"], "author_id": priya["id"],
         "body": "Looking great @Rahul Verma! Can we push the amber tones a bit more?", "mentions": [rahul["id"]],
         "seed_marker": True, "created_at": _iso(now - timedelta(hours=8))},
        {"id": str(uuid.uuid4()), "task_id": t0["id"], "author_id": rahul["id"],
         "body": "On it — will have the updated variant by EOD.", "mentions": [], "seed_marker": True,
         "created_at": _iso(now - timedelta(hours=6))},
        {"id": str(uuid.uuid4()), "task_id": t2["id"], "author_id": priya["id"],
         "body": "Please change the headline size and update the CTA.", "mentions": [ananya["id"]],
         "seed_marker": True, "created_at": _iso(now - timedelta(hours=3))},
    ]
    await db.comments.insert_many([dict(c) for c in comments])

    # ---- Activities ----
    def act(actor, action, task_obj=None, hours=1):
        return {"id": str(uuid.uuid4()), "actor_id": actor,
                "task_id": task_obj["id"] if task_obj else None,
                "project_id": task_obj["project_id"] if task_obj else None,
                "client_id": task_obj["client_id"] if task_obj else None,
                "action": action, "seed_marker": True, "created_at": _iso(now - timedelta(hours=hours))}

    activities = [
        act(priya["id"], f"assigned {t0['key']} to Rahul Verma", t0, 30),
        act(rahul["id"], f"uploaded hero-final-v2.jpg to {t0['key']}", t0, 20),
        act(ananya["id"], f"submitted {t1['key']} for review", t1, 10),
        act(priya["id"], f"requested changes on {t2['key']}", t2, 3),
        act(rahul["id"], f"moved {tasks[10]['key']} to Approved", tasks[10], 2),
        act(priya["id"], "assigned 3 new tasks to the team", None, 1),
    ]
    await db.activities.insert_many([dict(a) for a in activities])

    # ---- Notifications ----
    def notif(user_id, ntype, title, body, link, read, hours):
        return {"id": str(uuid.uuid4()), "user_id": user_id, "type": ntype, "title": title, "body": body,
                "link": link, "read": read, "seed_marker": True, "created_at": _iso(now - timedelta(hours=hours))}

    notifications = [
        notif(rahul["id"], "assignment", "New task assigned", f"{t0['key']} — Hero Key Visual", f"/tasks", False, 30),
        notif(rahul["id"], "mention", "You were mentioned", "Priya mentioned you on TASK-2481", "/tasks", False, 8),
        notif(rahul["id"], "comment", "New comment", "Priya commented on TASK-2481", "/tasks", True, 6),
        notif(ananya["id"], "changes", "Changes requested", "Changes requested on TASK-2483", "/tasks", False, 3),
        notif(priya["id"], "review", "Work submitted", "Ananya submitted TASK-2482 for review", "/tasks", False, 10),
        notif(owner["id"], "project", "Project update", "Autumn Drop Campaign is now In Progress", "/projects", True, 24),
    ]
    await db.notifications.insert_many([dict(n) for n in notifications])
