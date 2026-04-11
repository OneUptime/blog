# How to Design a Session Store Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Session Store, Interview, Authentication, Scalability

Description: A system design walkthrough for building a scalable session store with Redis, covering data modeling, TTL management, and horizontal scaling strategies.

---

## Problem Statement

Design a session management system that:
- Stores authenticated user sessions across multiple API servers
- Supports 10 million active sessions
- Handles 100K session reads/sec, 10K writes/sec
- Sessions expire after 24 hours of inactivity

## Why Redis for Sessions?

```text
Requirement             Why Redis
-----------             ---------
Fast reads              O(1) GET by session ID
TTL support             Built-in EXPIRE/SETEX
Horizontal scaling      Redis Cluster or read replicas
Session data            Hash or JSON string per session
High availability       Redis Sentinel or Redis Cluster
```

## Session Data Model

```text
Key: session:{sessionId}
Type: Hash or String (JSON)
TTL: 86400 seconds (24 hours, refreshed on activity)

Fields:
  userId         - User's database ID
  email          - User email (for quick display)
  roles          - Comma-separated roles (admin, user)
  createdAt      - Session creation timestamp
  lastAccessedAt - Last activity timestamp
  ipAddress      - IP at login (for security)
  userAgent      - Browser/device info
```

## Session Creation

```python
import redis
import secrets
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

SESSION_TTL = 86400  # 24 hours

def create_session(user_id: int, email: str, roles: list, ip: str, user_agent: str) -> str:
    session_id = secrets.token_urlsafe(32)  # Cryptographically secure
    session_key = f"session:{session_id}"

    session_data = {
        'userId': str(user_id),
        'email': email,
        'roles': ','.join(roles),
        'createdAt': str(int(time.time())),
        'lastAccessedAt': str(int(time.time())),
        'ipAddress': ip,
        'userAgent': user_agent
    }

    r.hset(session_key, mapping=session_data)
    r.expire(session_key, SESSION_TTL)

    # Track user's active sessions
    r.sadd(f"user:{user_id}:sessions", session_id)
    r.expire(f"user:{user_id}:sessions", SESSION_TTL)

    return session_id
```

## Session Retrieval and TTL Refresh

```python
def get_session(session_id: str) -> dict | None:
    session_key = f"session:{session_id}"

    # Use pipeline: get data + refresh TTL atomically
    pipe = r.pipeline()
    pipe.hgetall(session_key)
    pipe.expire(session_key, SESSION_TTL)
    results = pipe.execute()

    session_data = results[0]
    if not session_data:
        return None  # Session expired or invalid

    # Update last accessed time
    r.hset(session_key, 'lastAccessedAt', str(int(time.time())))

    return session_data
```

## Session Invalidation (Logout)

```python
def invalidate_session(session_id: str) -> bool:
    session_key = f"session:{session_id}"

    # Get userId before deleting
    user_id = r.hget(session_key, 'userId')

    # Delete session
    deleted = r.delete(session_key)

    # Remove from user's session set
    if user_id:
        r.srem(f"user:{user_id}:sessions", session_id)

    return deleted > 0
```

## Invalidating All Sessions for a User (Force Logout)

```python
def invalidate_all_user_sessions(user_id: int):
    """Force logout from all devices."""
    sessions_key = f"user:{user_id}:sessions"
    session_ids = r.smembers(sessions_key)

    if not session_ids:
        return

    pipe = r.pipeline()
    for session_id in session_ids:
        pipe.delete(f"session:{session_id}")
    pipe.delete(sessions_key)
    pipe.execute()
```

## Node.js Express Middleware

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

async function sessionMiddleware(req, res, next) {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

  if (!sessionId) {
    req.session = null;
    return next();
  }

  const sessionData = await redis.hgetall(`session:${sessionId}`);

  if (!sessionData || Object.keys(sessionData).length === 0) {
    res.clearCookie('sessionId');
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  // Refresh TTL on every request
  await redis.expire(`session:${sessionId}`, 86400);

  req.session = {
    sessionId,
    userId: sessionData.userId,
    email: sessionData.email,
    roles: sessionData.roles.split(',')
  };

  next();
}
```

## Scaling Considerations

### Read Replicas for High Read Volume

```text
100K session reads/sec -> distribute across read replicas

Architecture:
  Write (new sessions) --> Redis Primary
  Read (session lookup) --> Redis Replicas (3-5 replicas)
```

### Redis Cluster for 10M+ Sessions

```text
10M sessions * ~500 bytes each = ~5GB
Redis Cluster with 3 shards of 2GB each handles this comfortably.
```

### Session Affinity vs. Shared Store

```text
Option 1: Sticky sessions (session affinity)
  - Route requests to same server
  - Server holds session in memory
  - Problem: server failure loses all sessions

Option 2: Redis shared store (recommended)
  - Any server can handle any request
  - Sessions survive server failure
  - Horizontal scaling is seamless
```

## Security Considerations

```python
def validate_session_security(session_data: dict, current_ip: str) -> bool:
    """Optional: detect session hijacking."""
    stored_ip = session_data.get('ipAddress', '')

    # Flag if IP changed dramatically (different country)
    # This is a simplified check - use geo-IP in production
    if stored_ip and stored_ip != current_ip:
        # Log suspicious activity
        print(f"Session IP changed: {stored_ip} -> {current_ip}")
        # Optionally invalidate or require re-authentication

    return True  # Policy decision: warn only vs. invalidate
```

## Session ID Best Practices

```python
import secrets

# Good: 256-bit cryptographically secure token
session_id = secrets.token_urlsafe(32)  # 43-char URL-safe base64

# Bad: predictable or short tokens
# session_id = str(user_id)          # Enumerable
# session_id = uuid.uuid4().hex      # 128-bit, acceptable but weaker
```

## Capacity Estimation

```text
10M sessions * 500 bytes per session = 5GB Redis memory
Peak: 100K reads/sec -> Redis handles this on a single node (sub-ms)
Writes: 10K/sec -> Well within Redis capacity
```

## Summary

Redis is the ideal session store because it provides O(1) session lookup, built-in TTL for automatic expiration, and horizontal scaling through replication and clustering. Store session data as Redis Hashes, refresh TTL on each request to implement sliding expiration, and maintain a per-user session set to support force-logout from all devices. For 10M sessions, a Redis Cluster with 3 shards handles memory and throughput requirements comfortably.
