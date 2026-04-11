# How to Use Redis Cuckoo Filters for Membership Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cuckoo Filter, Membership Testing, Probabilistic

Description: Use Redis Cuckoo Filters for membership testing with the added ability to delete items, unlike standard Bloom Filters that only support insertion.

---

Cuckoo Filters are a Bloom Filter variant that supports item deletion while maintaining the same memory efficiency and false-positive guarantee. Redis implements Cuckoo Filters as part of the RedisBloom module, making them ideal for applications that need to remove members from a set.

## When to Choose Cuckoo Over Bloom

- Use Bloom Filters when you only ever add items
- Use Cuckoo Filters when you need to delete items (e.g., expired tokens, revoked licenses, temporary bans)
- Cuckoo Filters also have slightly better performance at high occupancy

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis
```

## Creating a Cuckoo Filter

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_filter(filter_name: str, capacity: int = 1_000_000,
                   bucket_size: int = 2, max_iterations: int = 20,
                   expansion: int = 1):
    try:
        r.execute_command(
            'CF.RESERVE', filter_name, capacity,
            'BUCKETSIZE', bucket_size,
            'MAXITERATIONS', max_iterations,
            'EXPANSION', expansion
        )
    except Exception:
        pass  # already exists

# Token revocation list - items will be added and deleted
create_filter('revoked_tokens', capacity=5_000_000)

# Active session set
create_filter('active_sessions', capacity=2_000_000)
```

## Adding and Checking Members

```python
def add_member(filter_name: str, item: str) -> bool:
    result = r.execute_command('CF.ADD', filter_name, item)
    return bool(result)

def is_member(filter_name: str, item: str) -> bool:
    return bool(r.execute_command('CF.EXISTS', filter_name, item))

def remove_member(filter_name: str, item: str) -> bool:
    return bool(r.execute_command('CF.DEL', filter_name, item))

def add_batch(filter_name: str, items: list) -> list:
    if not items:
        return []
    return r.execute_command('CF.INSERT', filter_name, 'ITEMS', *items)

def check_batch(filter_name: str, items: list) -> list:
    if not items:
        return []
    return r.execute_command('CF.MEXISTS', filter_name, *items)
```

## Token Revocation Use Case

A common pattern: JWT tokens are added on logout and checked on every request:

```python
import time
import hashlib

def revoke_token(token: str):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    add_member('revoked_tokens', token_hash)
    # Track revocation timestamp for cleanup
    r.setex(f"revoked:ts:{token_hash}", 86400, int(time.time()))

def is_token_revoked(token: str) -> bool:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return is_member('revoked_tokens', token_hash)

def cleanup_expired_revocations(max_age_seconds: int = 86400):
    # Scan for old revocation records and remove from filter
    pattern = "revoked:ts:*"
    now = int(time.time())
    removed = 0
    for key in r.scan_iter(pattern):
        ts = r.get(key)
        if ts and (now - int(ts)) > max_age_seconds:
            token_hash = key.split(":")[-1]
            remove_member('revoked_tokens', token_hash)
            r.delete(key)
            removed += 1
    return removed
```

## Session Membership Tracking

Track active user sessions with deletion on logout:

```python
def create_session(session_id: str):
    add_member('active_sessions', session_id)

def is_session_active(session_id: str) -> bool:
    return is_member('active_sessions', session_id)

def destroy_session(session_id: str):
    remove_member('active_sessions', session_id)

# Batch session validation
def validate_sessions(session_ids: list) -> dict:
    results = check_batch('active_sessions', session_ids)
    return {sid: bool(active)
            for sid, active in zip(session_ids, results)}
```

## Filter Statistics

```python
def get_filter_stats(filter_name: str) -> dict:
    result = r.execute_command('CF.INFO', filter_name)
    info = dict(zip(result[0::2], result[1::2]))
    return {
        "size_bytes": info.get('Size'),
        "num_buckets": info.get('Number of buckets'),
        "items_inserted": info.get('Number of items inserted'),
        "items_deleted": info.get('Number of items deleted'),
        "num_filters": info.get('Number of filter'),
        "bucket_size": info.get('Bucket size'),
        "expansion_rate": info.get('Expansion rate'),
        "max_iterations": info.get('Max iteration')
    }

print(get_filter_stats('revoked_tokens'))
```

## Summary

Redis Cuckoo Filters extend the Bloom Filter pattern with item deletion support, making them suitable for dynamic membership sets like token revocation lists and session trackers. Use CF.DEL to remove expired items and free up capacity without rebuilding the filter. Batch operations with CF.INSERT and CF.MEXISTS keep your membership checks efficient even at high volumes.
