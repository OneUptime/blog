# How to Implement Sliding Window Session Expiration in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Session, TTL

Description: Implement sliding window session expiration in Redis so sessions stay alive as long as users are active and expire only after inactivity.

---

Fixed TTL sessions expire at a set time regardless of user activity, causing frustration for active users who get logged out mid-task. Sliding window expiration resets the TTL on every request, keeping sessions alive while users are engaged and expiring them only after a period of inactivity.

## How It Works

Every time a user makes an authenticated request, you call `EXPIRE` (or `PEXPIRE` for millisecond precision) on their session key to push the expiration forward. The session only truly expires if no requests arrive within the idle timeout window.

## Basic Implementation

```python
import redis
import uuid
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

IDLE_TIMEOUT = 1800       # 30 minutes idle = session expires
ABSOLUTE_MAX = 86400 * 7  # 7 days hard cap regardless of activity

def create_session(user_id: str, data: dict) -> str:
    session_id = str(uuid.uuid4())
    now = time.time()
    session_data = {
        "user_id": user_id,
        "created_at": now,
        **data
    }
    r.setex(f"session:{session_id}", IDLE_TIMEOUT, json.dumps(session_data))
    return session_id

def get_session(session_id: str) -> dict | None:
    key = f"session:{session_id}"
    data_str = r.get(key)
    if not data_str:
        return None
    data = json.loads(data_str)

    # Enforce absolute maximum TTL
    created_at = data.get("created_at", time.time())
    age = time.time() - created_at
    if age > ABSOLUTE_MAX:
        r.delete(key)
        return None

    # Slide the expiration window
    r.expire(key, IDLE_TIMEOUT)
    return data
```

## Tracking Remaining Idle Time

```python
def get_session_idle_remaining(session_id: str) -> int:
    ttl = r.ttl(f"session:{session_id}")
    return max(ttl, 0)
```

## Middleware Integration

Apply sliding expiration in a middleware layer so every authenticated request automatically extends the session:

```python
from functools import wraps
from flask import request, g, jsonify

def require_session(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        session_id = request.cookies.get('session_id')
        if not session_id:
            return jsonify({"error": "Unauthorized"}), 401

        session = get_session(session_id)
        if not session:
            return jsonify({"error": "Session expired"}), 401

        g.session = session
        g.user_id = session['user_id']
        return f(*args, **kwargs)
    return decorated
```

## Handling WebSocket and Long-Polling Connections

For long-lived connections, periodically refresh the session TTL:

```python
import asyncio

async def keep_session_alive(session_id: str, user_id: str):
    while True:
        await asyncio.sleep(300)  # Refresh every 5 minutes
        if r.exists(f"session:{session_id}"):
            r.expire(f"session:{session_id}", IDLE_TIMEOUT)
        else:
            break  # Session expired, stop refreshing
```

## Checking Current TTL

```bash
# Remaining idle time for a session
redis-cli TTL "session:abc123"

# Confirm sliding behavior: TTL resets after a request
redis-cli EXPIRE "session:abc123" 1800
redis-cli TTL "session:abc123"
```

## Summary

Sliding window session expiration in Redis is implemented with a single `EXPIRE` call on each authenticated request. Combine this with an absolute maximum session age to prevent tokens from living forever. Adding this logic to authentication middleware ensures every route automatically participates in the sliding window without per-handler code duplication.
