# How to Handle Session Migration During Redis Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Session, High Availability

Description: Learn strategies to preserve sessions during Redis failover using replication, Sentinel, and graceful fallback handling.

---

Redis failover - whether planned maintenance or an unexpected crash - can invalidate all active user sessions if not handled carefully. With the right architecture, you can minimize or eliminate session loss during failover events.

## Why Sessions Break During Failover

When a Redis primary fails and a replica is promoted, any data that was written to the primary but not yet replicated is lost. Sessions written in that window are gone, forcing users to log in again.

## Approach 1: Redis Replication with Sentinel

Use Redis Sentinel to monitor your primary and automatically promote a replica on failure:

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
```

Configure your application to connect via Sentinel:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [('sentinel1', 26379), ('sentinel2', 26379), ('sentinel3', 26379)],
    socket_timeout=0.5
)

# Get the current primary automatically
master = sentinel.master_for('mymaster', socket_timeout=0.5)
slave = sentinel.slave_for('mymaster', socket_timeout=0.5)

def write_session(session_id: str, data: str, ttl: int = 3600):
    master.setex(f"session:{session_id}", ttl, data)

def read_session(session_id: str) -> str | None:
    return slave.get(f"session:{session_id}")
```

## Approach 2: Retry with Exponential Backoff

Handle connection errors gracefully during the brief failover window:

```python
import time
import redis

def get_session_with_retry(r, session_id: str, max_retries: int = 3) -> str | None:
    for attempt in range(max_retries):
        try:
            return r.get(f"session:{session_id}")
        except redis.ConnectionError:
            if attempt == max_retries - 1:
                raise
            wait = 0.1 * (2 ** attempt)
            time.sleep(wait)
    return None
```

## Approach 3: Dual-Write to Fallback Store

For critical sessions, write to both Redis and a fallback store (e.g., database):

```python
import json
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def save_session_dual(session_id: str, data: dict, ttl: int = 3600):
    serialized = json.dumps(data)

    # Primary: Redis
    try:
        r.setex(f"session:{session_id}", ttl, serialized)
    except redis.RedisError:
        pass  # Continue to DB write

    # Fallback: Database
    save_session_to_db(session_id, serialized, ttl)

def get_session_with_fallback(session_id: str) -> dict | None:
    try:
        data = r.get(f"session:{session_id}")
        if data:
            return json.loads(data)
    except redis.RedisError:
        pass

    # Fallback to database
    db_data = get_session_from_db(session_id)
    if db_data:
        # Re-warm Redis cache
        try:
            r.setex(f"session:{session_id}", 3600, db_data)
        except redis.RedisError:
            pass
        return json.loads(db_data)

    return None
```

## Approach 4: Graceful Re-Authentication

If session loss is unavoidable, give users a smooth re-login experience:

```python
def handle_missing_session(request, response):
    if not get_session(request.session_id):
        # Store the requested URL for post-login redirect
        response.set_cookie('redirect_after_login', request.path)
        return redirect('/login?reason=session_expired')
```

## Monitoring Failover Events

```bash
# Subscribe to Redis Sentinel events
redis-cli -p 26379 SUBSCRIBE +try-failover +failover-end +switch-master
```

## Summary

Protecting sessions during Redis failover requires layering multiple strategies: Sentinel for automatic primary promotion, retry logic with backoff for the brief failover window, and optional dual-write to a fallback store for zero-loss requirements. Graceful re-authentication handles the remaining edge cases, ensuring users experience at most a brief login prompt rather than data corruption.
