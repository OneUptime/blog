# How to Monitor Active Sessions in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Session, Monitoring

Description: Learn how to monitor and report on active Redis sessions using keyspace scanning, counters, and expiration tracking.

---

Understanding how many active sessions exist in your Redis session store - and who they belong to - is important for capacity planning, security auditing, and detecting anomalies like session flooding. Redis provides several approaches to monitor active sessions without expensive full keyspace scans.

## Approach 1: Global Session Counter

Maintain an atomic counter that increments on session creation and decrements on deletion:

```python
import redis
import uuid
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
SESSION_COUNTER_KEY = "metrics:active_sessions"

def create_session(user_id: str, data: dict) -> str:
    session_id = str(uuid.uuid4())
    pipe = r.pipeline()
    pipe.setex(f"session:{session_id}", 3600, json.dumps({"user_id": user_id, **data}))
    pipe.incr(SESSION_COUNTER_KEY)
    pipe.execute()
    return session_id

def delete_session(session_id: str):
    if r.delete(f"session:{session_id}"):
        r.decr(SESSION_COUNTER_KEY)

def get_active_session_count() -> int:
    count = r.get(SESSION_COUNTER_KEY)
    return int(count) if count else 0
```

## Approach 2: Scan-Based Counting (Accurate but Slower)

For an accurate count that accounts for TTL expirations, use SCAN:

```python
def count_sessions_by_scan() -> int:
    count = 0
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match="session:*", count=100)
        count += len(keys)
        if cursor == 0:
            break
    return count
```

## Approach 3: Per-User Session Tracking

Track sessions per user for auditing:

```python
def get_sessions_per_user_report() -> dict:
    user_session_counts = {}
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match="user:sessions:*", count=100)
        for key in keys:
            user_id = key.split(":")[-1]
            count = r.scard(key)
            user_session_counts[user_id] = count
        if cursor == 0:
            break
    return user_session_counts
```

## Real-Time Session Dashboard

Expose a metrics endpoint that reports session counts:

```python
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/metrics/sessions')
def session_metrics():
    return jsonify({
        "active_sessions": get_active_session_count(),
        "redis_memory_used": r.info('memory')['used_memory_human'],
        "redis_connected_clients": r.info('clients')['connected_clients'],
    })
```

## Detecting Session Anomalies

Alert when session counts spike unexpectedly:

```python
import time

def check_session_spike(threshold_per_minute: int = 1000):
    count_key = "metrics:sessions_created_this_minute"
    count = r.incr(count_key)
    r.expire(count_key, 60)

    if count > threshold_per_minute:
        trigger_alert(f"Session spike detected: {count} sessions created this minute")
```

## Monitoring via Redis CLI

```bash
# Total key count in database (includes all keys, not just sessions)
redis-cli DBSIZE

# Estimate sessions only (not exact if mixed key types)
redis-cli --scan --pattern "session:*" | wc -l

# Server-wide memory diagnostics and advice
redis-cli MEMORY DOCTOR

# Connected clients (proxy for active web users)
redis-cli INFO clients | grep connected_clients
```

## Summary

A combination of atomic counters and periodic SCAN-based audits gives you an accurate, real-time view of session activity in Redis. Counters are O(1) for dashboards and alerts, while SCAN provides authoritative counts for auditing. Per-user tracking enables security investigations into accounts with abnormally high session counts.
