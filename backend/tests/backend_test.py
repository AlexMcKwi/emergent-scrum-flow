"""Backend API tests for the IT BA / Scrum Master task manager."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://backlog-master-4.preview.emergentagent.com").rstrip("/")
TOKEN1 = os.environ.get("TEST_TOKEN1")
USERID1 = os.environ.get("TEST_USERID1")
TOKEN2 = os.environ.get("TEST_TOKEN2")


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- Auth tests ---
class TestAuth:
    def test_session_with_fake_id_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/auth/session", json={"session_id": "fake_invalid_xyz"})
        assert r.status_code == 401

    def test_me_without_credentials_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_bearer_returns_user(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(TOKEN1))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == USERID1
        assert "email" in data and "name" in data


# --- Task CRUD ---
@pytest.fixture(scope="module")
def created_task_id():
    payload = {
        "title": "TEST_Task1",
        "description": "desc",
        "start_date": "2026-01-01",
        "due_date": "2026-01-10",
        "priority": "high",
        "status": "todo",
        "tags": ["sprint1"],
    }
    r = requests.post(f"{BASE_URL}/api/tasks", json=payload, headers=_h(TOKEN1))
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    yield tid
    requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=_h(TOKEN1))


class TestTaskCRUD:
    def test_create_returns_full_task(self):
        r = requests.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_Create", "priority": "low"}, headers=_h(TOKEN1))
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_Create"
        assert d["priority"] == "low"
        assert d["archived"] is False
        assert d["status"] == "todo"
        # cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{d['id']}", headers=_h(TOKEN1))

    def test_get_task(self, created_task_id):
        r = requests.get(f"{BASE_URL}/api/tasks/{created_task_id}", headers=_h(TOKEN1))
        assert r.status_code == 200
        assert r.json()["id"] == created_task_id

    def test_list_tasks(self, created_task_id):
        r = requests.get(f"{BASE_URL}/api/tasks", headers=_h(TOKEN1))
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert created_task_id in ids

    def test_update_task(self, created_task_id):
        r = requests.put(f"{BASE_URL}/api/tasks/{created_task_id}",
                         json={"description": "updated desc", "priority": "medium"}, headers=_h(TOKEN1))
        assert r.status_code == 200
        d = r.json()
        assert d["description"] == "updated desc"
        assert d["priority"] == "medium"

    def test_status_done_sets_actual_end_date(self):
        # create then mark done
        c = requests.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_Done", "start_date": "2026-01-01"}, headers=_h(TOKEN1))
        tid = c.json()["id"]
        r = requests.put(f"{BASE_URL}/api/tasks/{tid}", json={"status": "done"}, headers=_h(TOKEN1))
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "done"
        assert d["actual_end_date"] is not None and len(d["actual_end_date"]) >= 8
        requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=_h(TOKEN1))

    def test_archive_unarchive(self, created_task_id):
        r = requests.post(f"{BASE_URL}/api/tasks/{created_task_id}/archive", headers=_h(TOKEN1))
        assert r.status_code == 200 and r.json()["archived"] is True
        # not in default list
        r2 = requests.get(f"{BASE_URL}/api/tasks", headers=_h(TOKEN1))
        assert created_task_id not in [t["id"] for t in r2.json()]
        # appears in archived=true
        r3 = requests.get(f"{BASE_URL}/api/tasks?archived=true", headers=_h(TOKEN1))
        assert created_task_id in [t["id"] for t in r3.json()]
        r4 = requests.post(f"{BASE_URL}/api/tasks/{created_task_id}/unarchive", headers=_h(TOKEN1))
        assert r4.status_code == 200 and r4.json()["archived"] is False

    def test_delete_task(self):
        c = requests.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_Del"}, headers=_h(TOKEN1))
        tid = c.json()["id"]
        r = requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=_h(TOKEN1))
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_h(TOKEN1))
        assert r2.status_code == 404


class TestParentChild:
    def test_delete_parent_unlinks_children(self):
        p = requests.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_Parent"}, headers=_h(TOKEN1)).json()
        c = requests.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_Child", "parent_id": p["id"]}, headers=_h(TOKEN1)).json()
        assert c["parent_id"] == p["id"]
        # delete parent
        r = requests.delete(f"{BASE_URL}/api/tasks/{p['id']}", headers=_h(TOKEN1))
        assert r.status_code == 200
        rc = requests.get(f"{BASE_URL}/api/tasks/{c['id']}", headers=_h(TOKEN1))
        assert rc.status_code == 200
        assert rc.json()["parent_id"] is None
        requests.delete(f"{BASE_URL}/api/tasks/{c['id']}", headers=_h(TOKEN1))


class TestStats:
    def test_stats_structure(self):
        r = requests.get(f"{BASE_URL}/api/stats", headers=_h(TOKEN1))
        assert r.status_code == 200
        d = r.json()
        for k in ["total", "active", "completed", "overdue", "archived", "by_status", "by_priority", "avg_duration_days"]:
            assert k in d
        assert set(d["by_status"].keys()) >= {"todo", "in_progress", "blocked", "done"}
        assert set(d["by_priority"].keys()) >= {"low", "medium", "high"}


class TestUserScoping:
    def test_user_cannot_read_other_user_task(self):
        # create with user1
        c = requests.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_Scoped"}, headers=_h(TOKEN1))
        tid = c.json()["id"]
        # user2 tries to GET
        r = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_h(TOKEN2))
        assert r.status_code == 404
        # user2 list shouldn't contain it
        r2 = requests.get(f"{BASE_URL}/api/tasks", headers=_h(TOKEN2))
        assert tid not in [t["id"] for t in r2.json()]
        # user2 can't update / archive / delete
        assert requests.put(f"{BASE_URL}/api/tasks/{tid}", json={"title": "X"}, headers=_h(TOKEN2)).status_code == 404
        assert requests.post(f"{BASE_URL}/api/tasks/{tid}/archive", headers=_h(TOKEN2)).status_code == 404
        assert requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=_h(TOKEN2)).status_code == 404
        # cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=_h(TOKEN1))
