from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============ Models ============
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: Optional[str] = None


class SessionCreate(BaseModel):
    session_id: str


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    start_date: Optional[str] = None      # ISO date
    due_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    priority: str = "medium"              # low | medium | high
    status: str = "todo"                  # todo | in_progress | blocked | done
    tags: List[str] = Field(default_factory=list)
    parent_id: Optional[str] = None


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


class Task(TaskBase):
    id: str
    user_id: str
    archived: bool = False
    created_at: str
    updated_at: str


# ============ Auth helpers ============
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# ============ Auth endpoints ============
@api_router.post("/auth/session")
async def create_session(payload: SessionCreate, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name"), "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc}


@api_router.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ============ Task endpoints ============
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
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        doc = await db.tasks.find_one({"id": task_id, "user_id": user.user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return _task_from_doc(doc)

    # Auto-set actual_end_date when status flips to done
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
    # Also unlink children
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
    today = datetime.now(timezone.utc).date().isoformat()

    by_status = {"todo": 0, "in_progress": 0, "blocked": 0, "done": 0}
    by_priority = {"low": 0, "medium": 0, "high": 0}
    overdue = 0
    completed = 0
    active = 0
    archived = 0
    avg_duration_days = 0.0
    durations = []

    for d in docs:
        if d.get("archived"):
            archived += 1
            continue
        s = d.get("status", "todo")
        by_status[s] = by_status.get(s, 0) + 1
        p = d.get("priority", "medium")
        by_priority[p] = by_priority.get(p, 0) + 1
        if s == "done":
            completed += 1
            sd = d.get("start_date")
            ed = d.get("actual_end_date")
            if sd and ed:
                try:
                    days = (datetime.fromisoformat(ed) - datetime.fromisoformat(sd)).days
                    durations.append(max(days, 0))
                except Exception:
                    pass
        else:
            active += 1
            due = d.get("due_date")
            if due and due < today:
                overdue += 1

    if durations:
        avg_duration_days = round(sum(durations) / len(durations), 1)

    return {
        "total": len(docs),
        "active": active,
        "completed": completed,
        "overdue": overdue,
        "archived": archived,
        "by_status": by_status,
        "by_priority": by_priority,
        "avg_duration_days": avg_duration_days,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
