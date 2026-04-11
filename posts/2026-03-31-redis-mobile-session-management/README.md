# How to Implement Mobile App Session Management with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Mobile, Session Management

Description: Learn how to implement mobile app session management with Redis, including device-specific sessions, token refresh, multi-device logout, and security hardening.

---

Mobile apps have different session requirements from web apps: users expect to stay logged in for weeks, they use multiple devices, and sessions must be revokable instantly. Redis handles all of this efficiently.

## Session Data Structure

Store each session as a Redis Hash with device metadata:

```python
import redis
import secrets
import time

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

SESSION_TTL = 30 * 24 * 3600  # 30 days
REFRESH_TTL = 7 * 24 * 3600   # 7 days for access tokens

def create_mobile_session(
    user_id: str,
    device_id: str,
    device_name: str,
    platform: str,  # "ios" or "android"
) -> dict:
    access_token = secrets.token_urlsafe(32)
    refresh_token = secrets.token_urlsafe(48)
    session_id = f"session:{user_id}:{device_id}"
    now = int(time.time())

    # Store session in Redis Hash
    client.hset(session_id, mapping={
        "user_id": user_id,
        "device_id": device_id,
        "device_name": device_name,
        "platform": platform,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "created_at": now,
        "last_seen": now,
    })
    client.expire(session_id, SESSION_TTL)

    # Index: user -> list of device sessions
    client.sadd(f"user:sessions:{user_id}", session_id)

    # Access token lookup: token -> session_id
    client.set(f"token:{access_token}", session_id, ex=REFRESH_TTL)

    # Refresh token lookup: refresh_token -> session_id
    client.set(f"refresh:{refresh_token}", session_id, ex=SESSION_TTL)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": REFRESH_TTL,
    }
```

## Validate Access Token

```python
def validate_access_token(token: str) -> dict | None:
    session_id = client.get(f"token:{token}")
    if not session_id:
        return None

    session = client.hgetall(session_id)
    if not session:
        return None

    # Update last seen
    client.hset(session_id, "last_seen", int(time.time()))
    return session
```

## Refresh Access Token

```python
def refresh_session(refresh_token: str) -> dict | None:
    # Find session by refresh token using a reverse index
    refresh_key = f"refresh:{refresh_token}"
    session_id = client.get(refresh_key)

    if not session_id:
        return None

    session = client.hgetall(session_id)
    if not session or session.get("refresh_token") != refresh_token:
        client.delete(refresh_key)
        return None

    # Issue new access token
    new_access_token = secrets.token_urlsafe(32)
    old_token = session["access_token"]

    client.hset(session_id, "access_token", new_access_token)
    client.delete(f"token:{old_token}")
    client.set(f"token:{new_access_token}", session_id, ex=REFRESH_TTL)
    client.expire(session_id, SESSION_TTL)  # Reset session TTL

    return {"access_token": new_access_token, "expires_in": REFRESH_TTL}
```

## Logout Single Device

```python
def logout_device(user_id: str, device_id: str):
    session_id = f"session:{user_id}:{device_id}"
    session = client.hgetall(session_id)

    if session:
        client.delete(f"token:{session.get('access_token')}")
        client.delete(f"refresh:{session.get('refresh_token')}")
        client.delete(session_id)
        client.srem(f"user:sessions:{user_id}", session_id)
```

## Logout All Devices (Multi-Device Revocation)

```python
def logout_all_devices(user_id: str):
    session_ids = client.smembers(f"user:sessions:{user_id}")
    pipe = client.pipeline()

    for session_id in session_ids:
        session = client.hgetall(session_id)
        if session:
            pipe.delete(f"token:{session.get('access_token')}")
            pipe.delete(f"refresh:{session.get('refresh_token')}")
            pipe.delete(session_id)

    pipe.delete(f"user:sessions:{user_id}")
    pipe.execute()
```

## Summary

Redis mobile session management supports per-device sessions with access token lookups, instant revocation of individual devices or all sessions, and sliding expiration via TTL refresh on token renewal. Store session details in Hashes for efficient field-level updates, maintain a set of session IDs per user for multi-device operations, and use separate token-to-session lookup keys to enable O(1) token validation.
