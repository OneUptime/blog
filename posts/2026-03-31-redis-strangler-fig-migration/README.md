# How to Implement the Strangler Fig Pattern for Redis Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, Strangler Fig, Pattern, Architecture

Description: Migrate from a legacy data store to Redis incrementally using the Strangler Fig pattern, routing traffic gradually while keeping both systems in sync until the cutover is complete.

---

The Strangler Fig pattern lets you replace a legacy system incrementally by routing new requests to the replacement while old requests still reach the legacy system. Applied to Redis migrations, this means adding Redis alongside your existing database and progressively shifting read and write traffic until the legacy store can be decommissioned.

## Migration Phases

Phase 1: Write to both, read from legacy (legacy is authoritative)
Phase 2: Write to both, read from Redis (Redis is authoritative)
Phase 3: Write and read from Redis only (legacy decommissioned)

## Phase 1: Dual-Write Setup

Write to both the old store and Redis simultaneously:

```python
import redis
import json

r = redis.Redis()

def save_user(user: dict):
    user_id = user["id"]
    # Write to legacy database
    db.execute("UPDATE users SET name=%s, email=%s WHERE id=%s",
               user["name"], user["email"], user_id)
    # Write to Redis (shadow write)
    r.set(f"user:{user_id}", json.dumps(user), ex=3600)

def get_user(user_id):
    # Phase 1: still reads from legacy
    return db.query("SELECT * FROM users WHERE id = %s", user_id)
```

## Backfilling Existing Data

Populate Redis with data from the legacy store during migration:

```python
def backfill_users(batch_size=500):
    offset = 0
    while True:
        rows = db.query("SELECT * FROM users LIMIT %s OFFSET %s", batch_size, offset)
        if not rows:
            break
        pipe = r.pipeline()
        for row in rows:
            pipe.set(f"user:{row['id']}", json.dumps(dict(row)), ex=86400)
        pipe.execute()
        offset += batch_size
        print(f"Backfilled {offset} users")
```

## Phase 2: Traffic Shift with Feature Flag

Use a feature flag to gradually shift reads to Redis:

```python
def get_user(user_id):
    use_redis = is_feature_enabled("read_users_from_redis", user_id)
    if use_redis:
        cached = r.get(f"user:{user_id}")
        if cached:
            return json.loads(cached)
        # Fall back to legacy on miss
        user = db.query("SELECT * FROM users WHERE id = %s", user_id)
        r.set(f"user:{user_id}", json.dumps(user), ex=3600)
        return user
    return db.query("SELECT * FROM users WHERE id = %s", user_id)
```

Start at 5% of users, monitor error rates, then increase incrementally.

## Consistency Verification

Compare Redis and legacy responses to catch divergence before full cutover:

```python
import logging

def get_user_with_verification(user_id):
    redis_result = r.get(f"user:{user_id}")
    legacy_result = db.query("SELECT * FROM users WHERE id = %s", user_id)
    if redis_result:
        redis_data = json.loads(redis_result)
        if redis_data.get("email") != legacy_result.get("email"):
            logging.warning(f"Data divergence for user {user_id}")
    return legacy_result  # Still authoritative in Phase 1
```

## Phase 3: Decommission Legacy

Once Redis handles 100% of reads without errors, switch writes to Redis only:

```python
def save_user_redis_only(user: dict):
    user_id = user["id"]
    r.set(f"user:{user_id}", json.dumps(user))
    # Legacy write removed

def get_user_redis_only(user_id):
    raw = r.get(f"user:{user_id}")
    if raw is None:
        raise KeyError(f"User {user_id} not found")
    return json.loads(raw)
```

## Rollback Plan

If Redis issues are detected, flip the feature flag back to 0% instantly:

```bash
redis-cli HSET feature_flags read_users_from_redis rollout_pct 0
```

## Summary

The Strangler Fig pattern de-risks Redis migration by keeping the legacy store fully operational throughout the transition. Dual-writes, bulk backfills, and feature-flag-controlled traffic shifts let you verify Redis correctness at each percentage before increasing load, with instant rollback available at every step until final decommission.
