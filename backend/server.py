from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    tls=True,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=5000,
)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============ CORS ============
ALLOWED_ORIGINS_EXACT = [
    o.strip()
    for o in os.environ.get('CORS_ORIGINS', '').split(',')
    if o.strip()
]

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS_EXACT:
        return True
    if re.match(r'https://emergent-scrum-flow-[a-z0-9]+-alexmckwis-projects\.vercel\.app', origin):
        return True
    return False

CORS_HEADERS = "Content-Type, Authorization, Accept, Origin, X-Requested-With"

@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    if request.method == "OPTIONS":
        response = Response()
        if is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = CORS_HEADERS
        return response
    response = await call_next(request)
    if is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = CORS_HEADERS
    return response


# ============ Models ============
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: Optional[str] = None

    @classmethod
    def from_doc(cls, doc: dict) -> "User":
        d = dict(doc)
        ca = d.get("created_at")
        if ca is not None and not isinstance(ca, str):
            try:
                d["created_at"] = ca.isoformat()
            except Exception:
                d["created_at"] = str(ca)
        return cls(**d)


class SessionCreate(BaseModel):
    session_id: str


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    priority: str = "medium"
    status: str = "todo"
    tags: List[str] = Field(default_factory=list)
    parent_id: Optional[str] = None
    story_points: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[str] = None
    archived: Optional[bool] = None
    story_points: Optional[int] = None


class Task(TaskBase):
    id: str
    user_id: str
    archived: bool = False
    created_at: str
    updated_at: str


# ============ Auth ============
async def get_current_user(request: Request) -> User:
    return User(
        user_id="user_default",
        email="alexander.makkaoui@gmail.com",
        name="Alexander Makkaoui",
    )


@api_router.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    return {"ok": True}


# ============ Tasks ============
def _task_from_doc(doc: dict) -> Task:
    return Task(**doc)


@api_router.get("/tasks", response_model=List[Task])
async def list_tasks(
    archived: Optional[bool] = False,
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    query = {"user_id": user.user_id, "archived": bool(archived)}
    if status:
        query["status"] = status
    docs = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return [_task_from_doc(d) for d in docs]


@api_router.post("/tasks", response_model=Task)
async def create_task(payload: TaskCreate, user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    task = Task(
        id=f"task_{uuid.uuid4().hex[:12]}",
        user_id=user.user_id,
        archived=False,
        created_at=now,
        updated_at=now,
        **payload.model_dump(),
    )
    await db.tasks.insert_one(task.model_dump())
    doc = await db.tasks.find_one({"id": task.id}, {"_id": 0})
    return _task_from_doc(doc)


@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, user: User = Depends(get_current_user)):
    doc = await db.tasks.find_one({"id": task_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return _task_from_doc(doc)


@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate, user: User = Depends(get_current_user)):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        doc = await db.tasks.find_one({"id": task_id, "user_id": user.user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return _task_from_doc(doc)

    if updates.get("status") == "done":
        existing = await db.tasks.find_one({"id": task_id, "user_id": user.user_id}, {"_id": 0})
        if existing and not existing.get("actual_end_date"):
            updates.setdefault("actual_end_date", datetime.now(timezone.utc).date().isoformat())

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": user.user_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.tasks.find_one({"id": task_id, "user_id": user.user_id}, {"_id": 0})
    return _task_from_doc(doc)


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: User = Depends(get_current_user)):
    await db.tasks.update_many(
        {"parent_id": task_id, "user_id": user.user_id},
        {"$set": {"parent_id": None}},
    )
    result = await db.tasks.delete_one({"id": task_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.post("/tasks/{task_id}/archive", response_model=Task)
async def archive_task(task_id: str, user: User = Depends(get_current_user)):
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": user.user_id},
        {"$set": {"archived": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.tasks.find_one({"id": task_id, "user_id": user.user_id}, {"_id": 0})
    return _task_from_doc(doc)


@api_router.post("/tasks/{task_id}/unarchive", response_model=Task)
async def unarchive_task(task_id: str, user: User = Depends(get_current_user)):
    result = await db.tasks.update_one(
        {"id": task_id, "user_id": user.user_id},
        {"$set": {"archived": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.tasks.find_one({"id": task_id, "user_id": user.user_id}, {"_id": 0})
    return _task_from_doc(doc)


@api_router.get("/stats")
async def get_stats(user: User = Depends(get_current_user)):
    docs = await db.tasks.find({"user_id": user.user_id}, {"_id": 0}).to_list(10000)
    today_dt = datetime.now(timezone.utc).date()
    today = today_dt.isoformat()

    by_status = {"todo": 0, "in_progress": 0, "blocked": 0, "done": 0}
    by_priority = {"low": 0, "medium": 0, "high": 0}
    overdue = 0
    completed = 0
    active = 0
    archived = 0
    avg_duration_days = 0.0
    durations = []
    total_points_completed = 0
    points_active = 0

    today_monday = today_dt - timedelta(days=today_dt.weekday())
    weeks = []
    for i in range(7, -1, -1):
        wstart = today_monday - timedelta(weeks=i)
        wend = wstart + timedelta(days=6)
        weeks.append({"start": wstart.isoformat(), "end": wend.isoformat(), "points": 0, "tasks": 0})

    for d in docs:
        if d.get("archived"):
            archived += 1
            sp = d.get("story_points") or 0
            if d.get("status") == "done" and sp:
                total_points_completed += sp
                ed = d.get("actual_end_date")
                if ed:
                    for w in weeks:
                        if w["start"] <= ed <= w["end"]:
                            w["points"] += sp
                            w["tasks"] += 1
                            break
            continue
        s = d.get("status", "todo")
        by_status[s] = by_status.get(s, 0) + 1
        p = d.get("priority", "medium")
        by_priority[p] = by_priority.get(p, 0) + 1
        sp = d.get("story_points") or 0
        if s == "done":
            completed += 1
            if sp:
                total_points_completed += sp
            sd = d.get("start_date")
            ed = d.get("actual_end_date")
            if sd and ed:
                try:
                    days = (datetime.fromisoformat(ed) - datetime.fromisoformat(sd)).days
                    durations.append(max(days, 0))
                except Exception:
                    pass
            if ed and sp:
                for w in weeks:
                    if w["start"] <= ed <= w["end"]:
                        w["points"] += sp
                        w["tasks"] += 1
                        break
        else:
            active += 1
            if sp:
                points_active += sp
            due = d.get("due_date")
            if due and due < today:
                overdue += 1

    if durations:
        avg_duration_days = round(sum(durations) / len(durations), 1)

    velocity_avg = round(sum(w["points"] for w in weeks) / len(weeks), 1) if weeks else 0.0

    return {
        "total": len(docs),
        "active": active,
        "completed": completed,
        "overdue": overdue,
        "archived": archived,
        "by_status": by_status,
        "by_priority": by_priority,
        "avg_duration_days": avg_duration_days,
        "total_points_completed": total_points_completed,
        "points_active": points_active,
        "velocity_avg": velocity_avg,
        "weekly_velocity": weeks,
    }


app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()