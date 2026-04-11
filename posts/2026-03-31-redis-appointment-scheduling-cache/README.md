# How to Build an Appointment Scheduling Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Healthcare, Scheduling

Description: Cache appointment availability and prevent double-booking in healthcare scheduling systems using Redis locks, sorted sets, and atomic slot reservation.

---

Healthcare scheduling systems face a classic concurrency problem: multiple patients or staff members may attempt to book the same appointment slot simultaneously. Redis provides distributed locks for slot reservation, sorted sets for fast availability queries, and TTL-based holding patterns to prevent ghost bookings.

## Data Model

```bash
# Available slots stored in a sorted set (score = datetime as Unix timestamp)
ZADD provider:dr-smith:slots 1711962000 "2024-04-01T09:00"
ZADD provider:dr-smith:slots 1711965600 "2024-04-01T10:00"

# Appointment details stored in a hash
HSET appt:abc123 provider_id dr-smith patient_id pt-99 datetime 1711962000 type checkup status confirmed

# Temporary hold key (expires if patient doesn't complete booking)
SET hold:dr-smith:2024-04-01T09:00 pt-99 EX 300
```

## Setup

```python
import redis
import json
import time
import uuid

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

SLOTS_PREFIX = "provider"
APPT_PREFIX = "appt"
HOLD_PREFIX = "hold"
HOLD_TTL = 300  # 5 minutes to complete booking
```

## Loading Provider Availability

```python
def load_provider_slots(provider_id: str, slots: list[dict]):
    key = f"{SLOTS_PREFIX}:{provider_id}:slots"
    pipe = r.pipeline()
    for slot in slots:
        pipe.zadd(key, {slot["datetime_str"]: slot["unix_ts"]})
    pipe.execute()

def get_available_slots(provider_id: str, start_ts: int, end_ts: int) -> list:
    key = f"{SLOTS_PREFIX}:{provider_id}:slots"
    slots = r.zrangebyscore(key, start_ts, end_ts)
    return [{"datetime": s, "ts": float(r.zscore(key, s))} for s in slots]
```

## Placing a Hold on a Slot

```python
def hold_slot(provider_id: str, datetime_str: str, patient_id: str) -> str | None:
    hold_key = f"{HOLD_PREFIX}:{provider_id}:{datetime_str}"

    # Use SET NX to atomically claim the hold
    claimed = r.set(hold_key, patient_id, ex=HOLD_TTL, nx=True)
    if not claimed:
        # Slot is already held by someone else
        return None

    hold_id = str(uuid.uuid4())[:8]
    r.setex(f"{HOLD_PREFIX}:meta:{hold_id}", HOLD_TTL, json.dumps({
        "provider_id": provider_id,
        "datetime_str": datetime_str,
        "patient_id": patient_id,
        "held_at": int(time.time())
    }))
    return hold_id
```

## Confirming an Appointment

```python
CONFIRM_SCRIPT = """
local hold_key = KEYS[1]
local slots_key = KEYS[2]
local hold_id_key = KEYS[3]
local patient_id = ARGV[1]
local datetime_str = ARGV[2]
local appt_id = ARGV[3]
local provider_id = ARGV[4]
local now = ARGV[5]

local holder = redis.call('GET', hold_key)
if holder ~= patient_id then
    return redis.error_reply('HOLD_EXPIRED_OR_INVALID')
end

redis.call('ZREM', slots_key, datetime_str)
redis.call('DEL', hold_key, hold_id_key)

return 'OK'
"""

confirm_appt = r.register_script(CONFIRM_SCRIPT)

def confirm_appointment(hold_id: str, patient_id: str) -> str:
    meta_raw = r.get(f"{HOLD_PREFIX}:meta:{hold_id}")
    if not meta_raw:
        raise ValueError("Hold expired or not found")

    meta = json.loads(meta_raw)
    provider_id = meta["provider_id"]
    datetime_str = meta["datetime_str"]

    appt_id = str(uuid.uuid4())[:8]
    hold_key = f"{HOLD_PREFIX}:{provider_id}:{datetime_str}"
    slots_key = f"{SLOTS_PREFIX}:{provider_id}:slots"
    hold_id_key = f"{HOLD_PREFIX}:meta:{hold_id}"

    result = confirm_appt(
        keys=[hold_key, slots_key, hold_id_key],
        args=[patient_id, datetime_str, appt_id, provider_id, int(time.time())]
    )

    if result == "OK":
        r.hset(f"{APPT_PREFIX}:{appt_id}", mapping={
            "provider_id": provider_id,
            "patient_id": patient_id,
            "datetime": datetime_str,
            "status": "confirmed",
            "confirmed_at": int(time.time())
        })
    return appt_id
```

## Cancelling an Appointment

```python
def cancel_appointment(appt_id: str) -> bool:
    appt_raw = r.hgetall(f"{APPT_PREFIX}:{appt_id}")
    if not appt_raw:
        return False

    provider_id = appt_raw["provider_id"]
    datetime_str = appt_raw["datetime"]

    # Restore slot to availability
    slot_ts = int(time.mktime(time.strptime(datetime_str, "%Y-%m-%dT%H:%M")))
    pipe = r.pipeline()
    pipe.zadd(f"{SLOTS_PREFIX}:{provider_id}:slots", {datetime_str: slot_ts})
    pipe.hset(f"{APPT_PREFIX}:{appt_id}", "status", "cancelled")
    pipe.execute()
    return True
```

## Summary

A Redis appointment scheduling cache uses sorted sets for fast availability queries, SET NX for atomic slot holds with auto-expiring TTLs, and Lua scripts for atomic confirmation that simultaneously removes the hold and the available slot. This prevents double-booking under concurrent load while automatically releasing uncompleted holds after the hold window expires.
