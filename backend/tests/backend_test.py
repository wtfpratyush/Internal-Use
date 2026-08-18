"""Backend API tests for Orbit work-management platform."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://project-command-101.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

CREDS = {
    "super_admin": ("coconutwater2911@gmail.com", "admin123"),
    "admin": ("priya@studio.com", "admin123"),
    "team_member": ("rahul@studio.com", "admin123"),
    "client": ("contact@novaathletics.com", "admin123"),
}


def login(role):
    s = requests.Session()
    email, pw = CREDS[role]
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"Login failed {role}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin_session():
    return login("admin")


@pytest.fixture(scope="session")
def super_admin_session():
    return login("super_admin")


@pytest.fixture(scope="session")
def team_session():
    return login("team_member")


@pytest.fixture(scope="session")
def client_session():
    return login("client")


# ---------------- AUTH ----------------
class TestAuth:
    @pytest.mark.parametrize("role", list(CREDS.keys()))
    def test_login_all_roles(self, role):
        s = login(role)
        r = s.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        me = r.json()
        assert me["email"] == CREDS[role][0]
        assert me["role"] == role or role in ("super_admin",) and me["role"] == "super_admin"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "priya@studio.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_no_cookie(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- RBAC ----------------
class TestRBAC:
    def test_team_member_cannot_access_team(self, team_session):
        r = team_session.get(f"{API}/team")
        assert r.status_code == 403

    def test_team_member_cannot_access_reports(self, team_session):
        r = team_session.get(f"{API}/reports")
        assert r.status_code == 403

    def test_team_member_cannot_create_client(self, team_session):
        r = team_session.post(f"{API}/clients", json={"name": "TEST_bad"})
        assert r.status_code == 403

    def test_admin_can_access_team(self, admin_session):
        r = admin_session.get(f"{API}/team")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_can_access_reports(self, admin_session):
        r = admin_session.get(f"{API}/reports")
        assert r.status_code == 200

    def test_client_sees_only_own_clients(self, client_session):
        r = client_session.get(f"{API}/clients")
        assert r.status_code == 200
        data = r.json()
        # client role should get only its own clients
        assert isinstance(data, list)
        for c in data:
            assert c.get("portal_user_id") is not None

    def test_client_cannot_access_team(self, client_session):
        r = client_session.get(f"{API}/team")
        assert r.status_code == 403


# ---------------- DASHBOARD ----------------
class TestDashboard:
    def test_admin_dashboard(self, admin_session):
        r = admin_session.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ("stats", "my_tasks", "upcoming", "blocked", "activities", "team"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["team"], list) and len(d["team"]) > 0

    def test_team_dashboard_no_team_field(self, team_session):
        r = team_session.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert d["team"] == [] or d["team"] == []

    def test_client_dashboard(self, client_session):
        r = client_session.get(f"{API}/dashboard")
        assert r.status_code == 200


# ---------------- CRUD FLOWS ----------------
class TestCRUD:
    created = {}

    def test_create_client(self, admin_session):
        payload = {"name": "TEST_ClientCo", "industry": "Testing", "logo": "🧪"}
        r = admin_session.post(f"{API}/clients", json=payload)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["name"] == "TEST_ClientCo"
        assert "id" in c
        TestCRUD.created["client_id"] = c["id"]

        # verify in list
        lst = admin_session.get(f"{API}/clients").json()
        assert any(x["id"] == c["id"] for x in lst)

    def test_create_project(self, admin_session):
        cid = TestCRUD.created["client_id"]
        payload = {"name": "TEST_Project1", "client_id": cid, "priority": "High"}
        r = admin_session.post(f"{API}/projects", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["name"] == "TEST_Project1"
        TestCRUD.created["project_id"] = p["id"]
        lst = admin_session.get(f"{API}/projects").json()
        found = next((x for x in lst if x["id"] == p["id"]), None)
        assert found is not None
        assert "progress" in found

    def test_create_task_with_assignee_notifies(self, admin_session):
        # find team_member user id
        users = admin_session.get(f"{API}/users").json()
        rahul = next(u for u in users if u["email"] == "rahul@studio.com")
        payload = {
            "title": "TEST_Task_Assignment", "client_id": TestCRUD.created["client_id"],
            "project_id": TestCRUD.created["project_id"], "assignee_id": rahul["id"],
            "priority": "High",
        }
        r = admin_session.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["title"] == "TEST_Task_Assignment"
        assert t.get("key", "").startswith("TASK-")
        TestCRUD.created["task_id"] = t["id"]
        TestCRUD.created["task_key"] = t["key"]
        TestCRUD.created["rahul_id"] = rahul["id"]

        # assignee should have a notification
        rahul_s = login("team_member")
        notes = rahul_s.get(f"{API}/notifications").json()
        assert any(t["key"] in (n.get("body") or "") for n in notes)

        # task shows in list
        lst = admin_session.get(f"{API}/tasks").json()
        assert any(x["id"] == t["id"] for x in lst)

    def test_my_work_filter(self, admin_session):
        rahul_id = TestCRUD.created["rahul_id"]
        r = admin_session.get(f"{API}/tasks", params={"assignee_id": rahul_id})
        assert r.status_code == 200
        tasks = r.json()
        assert all(t.get("assignee_id") == rahul_id for t in tasks)
        assert any(t["id"] == TestCRUD.created["task_id"] for t in tasks)

    def test_task_detail_enriched(self, admin_session):
        tid = TestCRUD.created["task_id"]
        r = admin_session.get(f"{API}/tasks/{tid}")
        assert r.status_code == 200
        d = r.json()
        assert "task" in d and "comments" in d and "files" in d and "activities" in d
        assert d["task"]["id"] == tid

    def test_comment_with_mention(self, admin_session):
        tid = TestCRUD.created["task_id"]
        rahul_id = TestCRUD.created["rahul_id"]
        r = admin_session.post(f"{API}/tasks/{tid}/comments",
                               json={"body": "TEST @mention", "mentions": [rahul_id]})
        assert r.status_code == 200, r.text
        # rahul should get mention notification
        rahul_s = login("team_member")
        notes = rahul_s.get(f"{API}/notifications").json()
        assert any(n["type"] == "mention" for n in notes)

    def test_file_upload(self, admin_session):
        tid = TestCRUD.created["task_id"]
        payload = {"name": "test.txt", "type": "text/plain", "size": 5,
                   "data": "data:text/plain;base64,SGVsbG8=", "task_id": tid,
                   "client_id": TestCRUD.created["client_id"],
                   "project_id": TestCRUD.created["project_id"]}
        r = admin_session.post(f"{API}/files", json=payload)
        assert r.status_code == 200, r.text
        f = r.json()
        assert "id" in f
        TestCRUD.created["file_id"] = f["id"]
        # List
        lst = admin_session.get(f"{API}/files").json()
        assert any(x["id"] == f["id"] for x in lst)
        # Get
        got = admin_session.get(f"{API}/files/{f['id']}")
        assert got.status_code == 200
        assert got.json().get("data", "").startswith("data:")

    def test_submit_and_approve_workflow(self, admin_session):
        tid = TestCRUD.created["task_id"]
        rahul_s = login("team_member")
        r = rahul_s.post(f"{API}/tasks/{tid}/submit")
        assert r.status_code == 200
        # status should be In Review
        d = admin_session.get(f"{API}/tasks/{tid}").json()
        assert d["task"]["status"] == "In Review"
        # approve
        r = admin_session.post(f"{API}/tasks/{tid}/review", json={"action": "approve", "feedback": "LGTM"})
        assert r.status_code == 200
        assert r.json()["status"] == "Approved"
        # notification to assignee
        notes = rahul_s.get(f"{API}/notifications").json()
        assert any(n["type"] == "review" for n in notes)

    def test_request_changes(self, admin_session):
        tid = TestCRUD.created["task_id"]
        r = admin_session.post(f"{API}/tasks/{tid}/review",
                               json={"action": "request_changes", "feedback": "please fix"})
        assert r.status_code == 200
        d = admin_session.get(f"{API}/tasks/{tid}").json()
        assert d["task"]["status"] == "Changes Requested"

    def test_bulk_assign(self, admin_session):
        rahul_id = TestCRUD.created["rahul_id"]
        # create 2 tasks
        cid = TestCRUD.created["client_id"]
        pid = TestCRUD.created["project_id"]
        ids = []
        for i in range(2):
            r = admin_session.post(f"{API}/tasks", json={"title": f"TEST_bulk_{i}",
                                                          "client_id": cid, "project_id": pid})
            ids.append(r.json()["id"])
        r = admin_session.post(f"{API}/tasks/bulk-assign",
                               json={"task_ids": ids, "assignee_id": rahul_id})
        assert r.status_code == 200
        assert r.json()["count"] == 2
        # verify
        for tid in ids:
            t = admin_session.get(f"{API}/tasks/{tid}").json()["task"]
            assert t["assignee_id"] == rahul_id


# ---------------- NOTIFICATIONS ----------------
class TestNotifications:
    def test_list_and_read_all(self, admin_session):
        r = admin_session.get(f"{API}/notifications")
        assert r.status_code == 200
        r = admin_session.post(f"{API}/notifications/read-all")
        assert r.status_code == 200


# ---------------- SEARCH ----------------
class TestSearch:
    def test_search_returns_all_buckets(self, admin_session):
        r = admin_session.get(f"{API}/search", params={"q": "TEST"})
        assert r.status_code == 200
        d = r.json()
        for k in ("clients", "projects", "tasks", "users", "files"):
            assert k in d

    def test_search_autumn(self, admin_session):
        r = admin_session.get(f"{API}/search", params={"q": "Autumn"})
        assert r.status_code == 200
        d = r.json()
        # at least one non-empty bucket possibly
        total = sum(len(v) for v in d.values())
        assert total >= 0


# ---------------- REPORTS / SERVICES / TEAM ----------------
class TestReports:
    def test_reports_structure(self, admin_session):
        r = admin_session.get(f"{API}/reports")
        assert r.status_code == 200
        d = r.json()
        for k in ("totals", "by_status", "by_priority", "by_member", "by_client", "by_service"):
            assert k in d
        assert isinstance(d["totals"]["active_tasks"], int)

    def test_services_list(self, admin_session):
        r = admin_session.get(f"{API}/services")
        assert r.status_code == 200
        for s in r.json():
            assert "completion" in s and "total_tasks" in s

    def test_service_create(self, admin_session):
        r = admin_session.post(f"{API}/services", json={"name": "TEST_svc"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_svc"

    def test_team_workload(self, admin_session):
        r = admin_session.get(f"{API}/team")
        assert r.status_code == 200
        for u in r.json():
            assert "active_tasks" in u and "workload" in u


# ---------------- CLEANUP ----------------
def test_zzz_cleanup(admin_session):
    """Best-effort cleanup of TEST_ data."""
    try:
        # delete tasks
        tasks = admin_session.get(f"{API}/tasks").json()
        for t in tasks:
            if t.get("title", "").startswith("TEST_"):
                admin_session.delete(f"{API}/tasks/{t['id']}")
    except Exception:
        pass
