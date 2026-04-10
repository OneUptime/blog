# How to Implement Session Expiration and Cleanup in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Session, Security

Description: Learn how to configure Redis session expiration with TTL, sliding expiry, and cleanup strategies to prevent stale session buildup.

---

Sessions left in Redis indefinitely consume memory and create security risks. Proper session expiration - combining absolute TTLs, sliding expiration for active users, and periodic cleanup - ensures your session store stays lean and secure.

## Setting a Fixed Session TTL

The simplest approach is to set an absolute expiration when the session is created:

```python
import redis
import uuid
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

SESSION_TTL = 3600  # 1 hour

def create_session(user_id: str, data: dict) -> str:
    session_id = str(uuid.uuid4())
    session_key = f"session:{session_id}"
    session_data = {"user_id": user_id, **data}
    r.setex(session_key, SESSION_TTL, json.dumps(session_data))
    return session_id

def get_session(session_id: str) -> dict | None:
    data = r.get(f"session:{session_id}")
    return json.loads(data) if data else None
```

## Sliding Expiration (Activity-Based)

Reset the TTL every time the session is accessed so active users never get logged out:

```python
def touch_session(session_id: str) -> bool:
    key = f"session:{session_id}"
    if r.exists(key):
        r.expire(key, SESSION_TTL)
        return True
    return False

def get_session_with_slide(session_id: str) -> dict | None:
    key = f"session:{session_id}"
    data = r.get(key)
    if data:
        r.expire(key, SESSION_TTL)  # Extend TTL on access
        return json.loads(data)
    return None
```

## Tracking All Sessions per User

Store a set of session IDs per user to enable bulk cleanup:

```python
def create_session_tracked(user_id: str, data: dict) -> str:
    session_id = str(uuid.uuid4())
    session_key = f"session:{session_id}"
    user_sessions_key = f"user:sessions:{user_id}"

    pipe = r.pipeline()
    pipe.setex(session_key, SESSION_TTL, json.dumps({"user_id": user_id, **data}))
    pipe.sadd(user_sessions_key, session_id)
    pipe.expire(user_sessions_key, SESSION_TTL * 2)
    pipe.execute()

    return session_id

def cleanup_expired_sessions(user_id: str):
    user_sessions_key = f"user:sessions:{user_id}"
    session_ids = r.smembers(user_sessions_key)

    for sid in session_ids:
        if not r.exists(f"session:{sid}"):
            r.srem(user_sessions_key, sid)
```

## Explicit Session Deletion on Logout

Always delete the session immediately on logout rather than waiting for TTL:

```python
def logout(session_id: str):
    data = get_session(session_id)
    if data:
        user_id = data.get('user_id')
        r.delete(f"session:{session_id}")
        if user_id:
            r.srem(f"user:sessions:{user_id}", session_id)
```

## Monitoring Session Count

```bash
# Count total keys in the current database
redis-cli DBSIZE

# Count sessions matching pattern
redis-cli KEYS "session:*" | wc -l

# Check memory used by sessions
redis-cli MEMORY USAGE "session:abc123"
```

## Redis Keyspace Notifications for Cleanup Hooks

Enable keyspace notifications to react when sessions expire:

```bash
redis-cli CONFIG SET notify-keyspace-events "Ex"
```

```python
pubsub = r.pubsub()
pubsub.psubscribe('__keyevent@0__:expired')

for message in pubsub.listen():
    if message['type'] == 'pmessage':
        expired_key = message['data']
        if expired_key.startswith('session:'):
            handle_session_expiry(expired_key)
```

## Summary

Combining Redis TTL-based expiration with sliding renewal for active users and explicit deletion on logout gives you a clean, secure session lifecycle. Tracking session IDs per user enables efficient bulk cleanup without scanning the entire keyspace. Keyspace notifications let you hook into expiration events for any additional cleanup logic your application requires.
