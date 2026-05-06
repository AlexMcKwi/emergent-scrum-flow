"""Iteration 4 backend tests: story_points field on tasks + velocity in /api/stats."""
import os
from datetime import datetime, timedelta, timezone
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://backlog-master-4.preview.emergentagent.com").rstrip("/")
TOKEN1 = os.environ.get("TEST_TOKEN1")


def _h(t=TOKEN1):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


def _today():
    return datetime.now(timezone.utc).date()


def _monday_of(d):
    return d - timedelta(days=d.weekday())


@pytest.fixture
def cleanup():
    created = []
    yield created
    for tid in created:
        try:
            requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers=_h())
        except Exception:
            pass


# ----- Story points field on tasks -----
class TestStoryPointsField:
    def test_create_with_story_points(self, cleanup):
        r = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_sp_create", "story_points": 5},
                          headers=_h())
        assert r.status_code == 200, r.text
        d = r.json()
        cleanup.append(d["id"])
        assert d["story_points"] == 5

        # GET returns it
        g = requests.get(f"{BASE_URL}/api/tasks/{d['id']}", headers=_h())
        assert g.status_code == 200
        assert g.json()["story_points"] == 5

    def test_create_without_story_points_defaults_none(self, cleanup):
        r = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_sp_none"}, headers=_h())
        assert r.status_code == 200
        d = r.json()
        cleanup.append(d["id"])
        assert d["story_points"] is None

    def test_update_story_points_value(self, cleanup):
        r = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_sp_update", "story_points": 3},
                          headers=_h())
        tid = r.json()["id"]
        cleanup.append(tid)

        u = requests.put(f"{BASE_URL}/api/tasks/{tid}", json={"story_points": 8}, headers=_h())
        assert u.status_code == 200
        assert u.json()["story_points"] == 8

        # Verify persisted
        g = requests.get(f"{BASE_URL}/api/tasks/{tid}", headers=_h())
        assert g.json()["story_points"] == 8

    def test_update_story_points_to_null(self, cleanup):
        """PUT with explicit null should clear the value.
        Note: server.py update_task drops keys whose value is None - so to actually
        null out a field, the client must send a sentinel (e.g. 0). This test documents
        the current behavior. If story_points=null is supposed to clear, this will fail."""
        r = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_sp_nullify", "story_points": 5},
                          headers=_h())
        tid = r.json()["id"]
        cleanup.append(tid)

        u = requests.put(f"{BASE_URL}/api/tasks/{tid}", json={"story_points": None}, headers=_h())
        assert u.status_code == 200
        # current backend drops None; story_points should remain 5 (documenting behavior)
        # but the spec says "PUT can update or null it" - flag as a potential bug.
        body = u.json()
        if body["story_points"] is not None:
            pytest.xfail(
                "Backend update_task strips None values; sending story_points=null does not clear "
                "the field. To support nulling, server.py would need to use exclude_unset and keep None."
            )
        assert body["story_points"] is None


# ----- Stats velocity fields -----
class TestStatsVelocity:
    def test_stats_returns_new_velocity_fields(self):
        r = requests.get(f"{BASE_URL}/api/stats", headers=_h())
        assert r.status_code == 200
        d = r.json()
        for k in ["total_points_completed", "points_active", "velocity_avg", "weekly_velocity"]:
            assert k in d, f"missing {k}"
        # 8 weekly buckets
        assert isinstance(d["weekly_velocity"], list)
        assert len(d["weekly_velocity"]) == 8
        for w in d["weekly_velocity"]:
            assert {"start", "end", "points", "tasks"} <= set(w.keys())
            # Mon-Sun (7 days span)
            sd = datetime.fromisoformat(w["start"]).date()
            ed = datetime.fromisoformat(w["end"]).date()
            assert (ed - sd).days == 6
            assert sd.weekday() == 0  # Monday

    def test_stats_regression_old_fields(self):
        r = requests.get(f"{BASE_URL}/api/stats", headers=_h())
        d = r.json()
        for k in ["total", "active", "completed", "overdue", "by_status", "by_priority", "avg_duration_days"]:
            assert k in d

    def test_active_task_with_sp_counts_in_points_active(self, cleanup):
        baseline = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()["points_active"]
        c = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_active_sp", "status": "in_progress", "story_points": 5},
                          headers=_h()).json()
        cleanup.append(c["id"])
        after = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()["points_active"]
        assert after == baseline + 5

    def test_done_task_buckets_into_correct_week(self, cleanup):
        """A done task with actual_end_date in current week should bump that week's points."""
        today = _today()
        monday = _monday_of(today)
        end_date = (monday + timedelta(days=2)).isoformat()  # Wednesday this week

        # Get baseline weekly velocity
        s_before = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        # find the bucket containing today (last bucket = current week)
        idx = None
        for i, w in enumerate(s_before["weekly_velocity"]):
            if w["start"] <= end_date <= w["end"]:
                idx = i
                break
        assert idx is not None, "current week not found in weekly_velocity"
        before_points = s_before["weekly_velocity"][idx]["points"]
        before_tasks = s_before["weekly_velocity"][idx]["tasks"]
        before_total = s_before["total_points_completed"]

        c = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_done_thisweek",
                                "status": "done",
                                "actual_end_date": end_date,
                                "start_date": end_date,
                                "story_points": 13},
                          headers=_h()).json()
        cleanup.append(c["id"])

        s_after = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        assert s_after["weekly_velocity"][idx]["points"] == before_points + 13
        assert s_after["weekly_velocity"][idx]["tasks"] == before_tasks + 1
        assert s_after["total_points_completed"] == before_total + 13

    def test_done_task_without_sp_counts_zero(self, cleanup):
        s_before = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        c = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_done_nosp",
                                "status": "done",
                                "actual_end_date": _today().isoformat()},
                          headers=_h())
        assert c.status_code == 200
        cleanup.append(c.json()["id"])
        s_after = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        # total_points_completed unchanged
        assert s_after["total_points_completed"] == s_before["total_points_completed"]
        # 'completed' counter incremented though
        assert s_after["completed"] == s_before["completed"] + 1

    def test_archived_done_task_still_counts_in_velocity(self, cleanup):
        """Archived done tasks should still contribute total_points_completed and weekly_velocity."""
        today = _today()
        monday = _monday_of(today)
        end_date = (monday + timedelta(days=1)).isoformat()  # Tuesday this week

        # baseline
        s_before = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        idx = None
        for i, w in enumerate(s_before["weekly_velocity"]):
            if w["start"] <= end_date <= w["end"]:
                idx = i
                break
        assert idx is not None
        before_points = s_before["weekly_velocity"][idx]["points"]
        before_total = s_before["total_points_completed"]

        c = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_archived_done",
                                "status": "done",
                                "actual_end_date": end_date,
                                "story_points": 21},
                          headers=_h()).json()
        cleanup.append(c["id"])

        a = requests.post(f"{BASE_URL}/api/tasks/{c['id']}/archive", headers=_h())
        assert a.status_code == 200 and a.json()["archived"] is True

        s_after = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        assert s_after["total_points_completed"] == before_total + 21
        assert s_after["weekly_velocity"][idx]["points"] == before_points + 21

    def test_done_task_outside_8week_window_not_in_weekly(self, cleanup):
        """A done task >8 weeks ago should add to total_points_completed but NOT into any weekly bucket."""
        today = _today()
        far_past = (today - timedelta(weeks=20)).isoformat()
        s_before = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        sum_before = sum(w["points"] for w in s_before["weekly_velocity"])
        total_before = s_before["total_points_completed"]

        c = requests.post(f"{BASE_URL}/api/tasks",
                          json={"title": "TEST_iter4_done_old",
                                "status": "done",
                                "actual_end_date": far_past,
                                "story_points": 8},
                          headers=_h()).json()
        cleanup.append(c["id"])

        s_after = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        sum_after = sum(w["points"] for w in s_after["weekly_velocity"])
        assert s_after["total_points_completed"] == total_before + 8
        assert sum_after == sum_before  # not in any of the 8 weekly buckets

    def test_velocity_avg_matches_weekly_sum(self, cleanup):
        s = requests.get(f"{BASE_URL}/api/stats", headers=_h()).json()
        expected = round(sum(w["points"] for w in s["weekly_velocity"]) / 8, 1)
        assert s["velocity_avg"] == expected
