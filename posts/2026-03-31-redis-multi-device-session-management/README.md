# How to Build Multi-Device Session Management with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Session, Authentication

Description: Build a Redis-backed multi-device session system that tracks all active sessions per user across devices with per-device metadata.

---

Modern applications need to support users logged in on multiple devices simultaneously - phone, laptop, tablet. Redis makes multi-device session management straightforward by storing a set of session IDs per user alongside per-session metadata that identifies each device.

## Data Model

For each user, maintain a sorted set of session IDs ordered by creation time, and a hash per session with device metadata:

```text
user:sessions:{user_id}  -> Sorted Set: {session_id -> created_at timestamp}
session:{session_id}     -> Hash: {user_id, device, ip, user_agent, last_active}
```

## Creating Sessions with Device Info

```python
import redis
import uuid
import time
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

SESSION_TTL = 86400  # 24 hours

def create_session(user_id: str, device_info: dict) -> str:
    session_id = str(uuid.uuid4())
    now = time.time()

    pipe = r.pipeline()

    # Store session data as hash
    session_data = {
        "user_id": user_id,
        "device": device_info.get("device", "unknown"),
        "ip": device_info.get("ip", ""),
        "user_agent": device_info.get("user_agent", ""),
        "last_active": str(now),
        "created_at": str(now),
    }
    pipe.hset(f"session:{session_id}", mapping=session_data)
    pipe.expire(f"session:{session_id}", SESSION_TTL)

    # Add to user's session set (score = creation timestamp)
    pipe.zadd(f"user:sessions:{user_id}", {session_id: now})
    pipe.expire(f"user:sessions:{user_id}", SESSION_TTL)

    pipe.execute()
    return session_id
```

## Listing Active Sessions for a User

```python
def list_user_sessions(user_id: str) -> list:
    session_ids = r.zrange(f"user:sessions:{user_id}", 0, -1)
    sessions = []
    for sid in session_ids:
        data = r.hgetall(f"session:{sid}")
        if data:
            data['session_id'] = sid
            sessions.append(data)
        else:
            # Prune expired sessions from the set
            r.zrem(f"user:sessions:{user_id}", sid)
    return sessions
```

## Updating Last Active Timestamp

```python
def touch_session(session_id: str, user_id: str):
    now = time.time()
    pipe = r.pipeline()
    pipe.hset(f"session:{session_id}", "last_active", str(now))
    pipe.expire(f"session:{session_id}", SESSION_TTL)
    pipe.expire(f"user:sessions:{user_id}", SESSION_TTL)
    pipe.execute()
```

## Revoking a Specific Device Session

```python
def revoke_session(session_id: str, user_id: str):
    pipe = r.pipeline()
    pipe.delete(f"session:{session_id}")
    pipe.zrem(f"user:sessions:{user_id}", session_id)
    pipe.execute()
```

## Enforcing a Maximum Number of Active Devices

Automatically revoke the oldest session when a user exceeds their device limit:

```python
MAX_DEVICES = 5

def enforce_device_limit(user_id: str):
    session_set_key = f"user:sessions:{user_id}"
    count = r.zcard(session_set_key)
    if count > MAX_DEVICES:
        # Remove oldest sessions (lowest score = oldest)
        oldest = r.zrange(session_set_key, 0, count - MAX_DEVICES - 1)
        for sid in oldest:
            revoke_session(sid, user_id)
```

## Summary

Redis sorted sets and hashes work together to power a clean multi-device session system. Each user gets a sorted set of active sessions ordered by creation time, while each session stores per-device metadata as a hash. This makes it easy to display active sessions to users, revoke individual devices, and enforce device count limits - all with fast O(log N) operations.
