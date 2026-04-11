# How to Build a Scalable Session Store with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Session, Authentication, Scalability, Backend

Description: Learn how to build a scalable, distributed session store with Redis that supports millions of concurrent users with fast reads and automatic expiry.

---

## Why Redis for Session Storage

Traditional sticky sessions tie users to a single server, breaking load balancing and horizontal scaling. A centralized Redis session store decouples user state from application servers so any node can serve any request.

Redis provides sub-millisecond reads, built-in TTL expiry, and optional persistence - making it ideal for storing session data at scale.

## Session Data Structure

Use a Redis Hash to store session fields. This allows partial updates without rewriting the entire session.

```bash
# Create a session
HSET session:abc123 user_id 42 username "alice" role "admin" created_at 1711900000
EXPIRE session:abc123 86400
```

## Implementing a Session Manager in Python

```python
import redis
import uuid
import time

r = redis.Redis(decode_responses=True)

SESSION_TTL = 86400  # 24 hours

def create_session(user_id: int, username: str, role: str) -> str:
    session_id = str(uuid.uuid4())
    session_key = f"session:{session_id}"

    r.hset(session_key, mapping={
        "user_id": user_id,
        "username": username,
        "role": role,
        "created_at": int(time.time()),
        "last_seen": int(time.time())
    })
    r.expire(session_key, SESSION_TTL)
    return session_id

def get_session(session_id: str) -> dict | None:
    session_key = f"session:{session_id}"
    data = r.hgetall(session_key)
    if not data:
        return None
    # Refresh TTL on access (sliding expiry)
    r.expire(session_key, SESSION_TTL)
    r.hset(session_key, "last_seen", int(time.time()))
    return data

def update_session(session_id: str, fields: dict):
    session_key = f"session:{session_id}"
    if not r.exists(session_key):
        raise ValueError("Session not found")
    r.hset(session_key, mapping=fields)
    r.expire(session_key, SESSION_TTL)

def delete_session(session_id: str):
    r.delete(f"session:{session_id}")
```

## Tracking Active Sessions per User

Maintain a Set of active session IDs per user to support listing and bulk invalidation:

```python
def create_session(user_id: int, username: str, role: str) -> str:
    session_id = str(uuid.uuid4())
    session_key = f"session:{session_id}"
    user_sessions_key = f"user_sessions:{user_id}"

    pipe = r.pipeline()
    pipe.hset(session_key, mapping={
        "user_id": user_id,
        "username": username,
        "role": role,
        "created_at": int(time.time())
    })
    pipe.expire(session_key, SESSION_TTL)
    pipe.sadd(user_sessions_key, session_id)
    pipe.expire(user_sessions_key, SESSION_TTL)
    pipe.execute()
    return session_id

def get_user_sessions(user_id: int) -> list:
    user_sessions_key = f"user_sessions:{user_id}"
    session_ids = r.smembers(user_sessions_key)
    sessions = []
    for sid in session_ids:
        data = r.hgetall(f"session:{sid}")
        if data:
            data["session_id"] = sid
            sessions.append(data)
    return sessions

def invalidate_all_user_sessions(user_id: int):
    user_sessions_key = f"user_sessions:{user_id}"
    session_ids = r.smembers(user_sessions_key)
    pipe = r.pipeline()
    for sid in session_ids:
        pipe.delete(f"session:{sid}")
    pipe.delete(user_sessions_key)
    pipe.execute()
```

## Integrating with FastAPI

```python
from fastapi import FastAPI, Cookie, Response, HTTPException

app = FastAPI()

@app.post("/login")
def login(username: str, password: str, response: Response):
    # Validate credentials (simplified)
    user = authenticate(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_id = create_session(user["id"], user["username"], user["role"])
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=SESSION_TTL
    )
    return {"message": "Logged in"}

@app.get("/me")
def me(session_id: str = Cookie(None)):
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired")
    return session

@app.post("/logout")
def logout(response: Response, session_id: str = Cookie(None)):
    if session_id:
        delete_session(session_id)
    response.delete_cookie("session_id")
    return {"message": "Logged out"}
```

## Scaling with Redis Cluster

When session volume exceeds a single node, Redis Cluster automatically shards keys across nodes. Use consistent hash tags to co-locate related keys:

```python
# Use hash tags to route session and user_sessions to the same slot
session_key = f"{{user:{user_id}}}:session:{session_id}"
user_sessions_key = f"{{user:{user_id}}}:sessions"
```

## Summary

A Redis-backed session store decouples session state from application servers, enabling horizontal scaling without sticky sessions. Using Hashes for session data and Sets for per-user session tracking supports efficient reads, partial updates, and bulk invalidation. Sliding TTLs keep active sessions alive while automatically cleaning up expired ones.
