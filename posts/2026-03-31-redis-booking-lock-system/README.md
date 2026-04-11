# How to Implement Booking Lock System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Travel, Lock

Description: Prevent double-booking in travel and ticketing systems using Redis distributed locks with atomic SET NX, auto-expiring holds, and Lua-based confirm flows.

---

Double-booking is a catastrophic failure in travel systems. When multiple users try to book the last available seat, room, or car at the same time, the system must guarantee only one succeeds. Redis distributed locks with short TTLs prevent this without the overhead of database-level row locking.

## The Problem

Without locking:
1. User A queries: "Is seat 12A available?" - Yes
2. User B queries: "Is seat 12A available?" - Yes
3. User A books seat 12A - Succeeds
4. User B books seat 12A - Also "succeeds" - Double booking!

With Redis locks:
1. User A acquires lock on seat 12A (SET NX)
2. User B tries to acquire lock - fails, gets "item held"
3. User A completes booking - lock released, seat removed from inventory
4. User B retries - seat no longer available

## Setup

```python
import redis
import json
import time
import uuid

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

LOCK_PREFIX = "lock:booking"
INVENTORY_PREFIX = "inventory"
HOLD_TTL = 600       # 10 minutes to complete checkout
```

## Acquiring a Booking Lock

```python
def acquire_lock(resource_id: str, session_id: str, hold_minutes: int = 10) -> str | None:
    lock_key = f"{LOCK_PREFIX}:{resource_id}"
    lock_token = f"{session_id}:{str(uuid.uuid4())[:8]}"
    lock_data = json.dumps({
        "session_id": session_id,
        "token": lock_token,
        "acquired_at": int(time.time())
    })

    acquired = r.set(lock_key, lock_data, ex=hold_minutes * 60, nx=True)
    return lock_token if acquired else None

RELEASE_LOCK_SCRIPT = """
local lock_key = KEYS[1]
local token = ARGV[1]

local raw = redis.call('GET', lock_key)
if not raw then
    return 0
end

local data = cjson.decode(raw)
if data.token == token then
    redis.call('DEL', lock_key)
    return 1
end

return 0
"""

release_lock_script = r.register_script(RELEASE_LOCK_SCRIPT)

def release_lock(resource_id: str, lock_token: str) -> bool:
    lock_key = f"{LOCK_PREFIX}:{resource_id}"
    result = release_lock_script(
        keys=[lock_key],
        args=[lock_token]
    )
    return result == 1
```

## Extending a Lock

For checkout flows that may take longer than the initial hold:

```python
EXTEND_LOCK_SCRIPT = """
local lock_key = KEYS[1]
local token = ARGV[1]
local extension_seconds = tonumber(ARGV[2])

local raw = redis.call('GET', lock_key)
if not raw then
    return redis.error_reply('LOCK_NOT_FOUND')
end

local data = cjson.decode(raw)
if data.token ~= token then
    return redis.error_reply('INVALID_TOKEN')
end

redis.call('EXPIRE', lock_key, extension_seconds)
return tostring(redis.call('TTL', lock_key))
"""

extend_lock = r.register_script(EXTEND_LOCK_SCRIPT)

def refresh_lock(resource_id: str, lock_token: str, extra_seconds: int = 300) -> int:
    return int(extend_lock(
        keys=[f"{LOCK_PREFIX}:{resource_id}"],
        args=[lock_token, extra_seconds]
    ))
```

## Multi-Resource Booking (e.g., Flight + Hotel)

When booking multiple items together, acquire all locks before confirming any:

```python
def acquire_multi_lock(resource_ids: list[str], session_id: str) -> dict:
    tokens = {}
    acquired = []

    for resource_id in sorted(resource_ids):  # Sort to prevent deadlock
        token = acquire_lock(resource_id, session_id)
        if token:
            tokens[resource_id] = token
            acquired.append(resource_id)
        else:
            # Release all acquired locks and fail
            for rid in acquired:
                release_lock(rid, tokens[rid])
            return {"success": False, "failed_on": resource_id, "tokens": {}}

    return {"success": True, "tokens": tokens}
```

## Atomic Confirm and Remove from Inventory

```python
CONFIRM_BOOKING_SCRIPT = """
local lock_key = KEYS[1]
local inventory_key = KEYS[2]
local resource_id = ARGV[1]
local lock_token = ARGV[2]
local booking_id = ARGV[3]

local lock_raw = redis.call('GET', lock_key)
if not lock_raw then
    return redis.error_reply('LOCK_EXPIRED')
end

local lock = cjson.decode(lock_raw)
if lock.token ~= lock_token then
    return redis.error_reply('INVALID_LOCK_TOKEN')
end

-- Remove from available inventory
redis.call('SREM', inventory_key, resource_id)

-- Release lock
redis.call('DEL', lock_key)

return booking_id
"""

confirm_booking = r.register_script(CONFIRM_BOOKING_SCRIPT)

def confirm_reservation(resource_type: str, resource_id: str, lock_token: str) -> str:
    lock_key = f"{LOCK_PREFIX}:{resource_id}"
    inventory_key = f"{INVENTORY_PREFIX}:{resource_type}"
    booking_id = str(uuid.uuid4())

    result = confirm_booking(
        keys=[lock_key, inventory_key],
        args=[resource_id, lock_token, booking_id]
    )
    return result
```

## Checking Lock Status

```python
def get_lock_status(resource_id: str) -> dict:
    lock_key = f"{LOCK_PREFIX}:{resource_id}"
    lock_raw = r.get(lock_key)
    ttl = r.ttl(lock_key)

    if not lock_raw:
        return {"status": "available"}

    lock = json.loads(lock_raw)
    return {
        "status": "held",
        "session_id": lock["session_id"],
        "seconds_remaining": ttl,
        "acquired_at": lock["acquired_at"]
    }
```

## Summary

A Redis booking lock system uses SET NX to atomically claim a resource in a single operation, token-validated Lua scripts to ensure only the lock holder can confirm or release, and sorted resource-ID ordering to prevent multi-resource deadlocks. Auto-expiring TTLs release abandoned holds without any cleanup job, keeping inventory accurate even when users abandon checkout.
