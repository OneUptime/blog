# How to Model Booking and Reservation Systems in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Booking, Reservation, Lua, Concurrency, Data Modeling

Description: Model booking and reservation systems in Redis using sorted sets, hashes, and Lua scripts to handle slot availability, conflict detection, and atomic booking.

---

## Core Challenges in Booking Systems

Booking systems must handle simultaneous requests for the same slot, prevent double-booking, enforce cancellation windows, and provide fast availability queries. Redis addresses all these with sorted sets for time-based slot tracking and Lua scripts for atomic conflict detection.

## Slot Availability with Sorted Sets

Model time slots as members of a sorted set, with start time as the score:

```bash
# Available slots for resource "room:101" (timestamps as scores)
ZADD slots:available:room:101 1712000000 "slot:2024-04-01T10:00"
ZADD slots:available:room:101 1712003600 "slot:2024-04-01T11:00"
ZADD slots:available:room:101 1712007200 "slot:2024-04-01T12:00"
ZADD slots:available:room:101 1712010800 "slot:2024-04-01T13:00"
```

Find available slots in a time window:

```bash
# Slots available between 10am and 12pm
ZRANGEBYSCORE slots:available:room:101 1712000000 1712007200 WITHSCORES
```

## Booking a Slot Atomically

Use a Lua script to atomically check availability and create a booking:

```lua
local avail_key = KEYS[1]
local booked_key = KEYS[2]
local booking_key = KEYS[3]
local slot = ARGV[1]
local user_id = ARGV[2]
local score = ARGV[3]
local ttl = tonumber(ARGV[4])

-- Check slot is available
if redis.call('ZSCORE', avail_key, slot) == false then
    return 0
end

-- Move from available to booked
redis.call('ZREM', avail_key, slot)
redis.call('ZADD', booked_key, score, slot)

-- Store booking details
redis.call('HSET', booking_key, 'user_id', user_id, 'slot', slot, 'status', 'confirmed')
if ttl > 0 then
    redis.call('EXPIRE', booking_key, ttl)
end
return 1
```

## Hash-Based Booking Records

```bash
HSET booking:bk001 user_id "user:101" resource "room:101" slot "2024-04-01T10:00" start_ts "1712000000" end_ts "1712003600" status "confirmed" created_at "1711900000"
```

## Python Example - Booking Service

```python
import redis
import time

r = redis.Redis(decode_responses=True)

BOOK_SLOT_SCRIPT = """
local avail_key = KEYS[1]
local booked_key = KEYS[2]
local booking_key = KEYS[3]
local user_bookings_key = KEYS[4]
local slot = ARGV[1]
local user_id = ARGV[2]
local score = ARGV[3]
local booking_id = ARGV[4]

if redis.call('ZSCORE', avail_key, slot) == false then
    return 0
end
redis.call('ZREM', avail_key, slot)
redis.call('ZADD', booked_key, score, slot)
redis.call('HSET', booking_key,
    'user_id', user_id,
    'slot', slot,
    'status', 'confirmed',
    'created_at', tostring(redis.call('TIME')[1])
)
redis.call('SADD', user_bookings_key, booking_id)
return 1
"""

book_slot = r.register_script(BOOK_SLOT_SCRIPT)

def add_available_slots(resource_id: str, slots: list):
    for slot_name, start_ts in slots:
        r.zadd(f"slots:available:{resource_id}", {slot_name: start_ts})

def get_available_slots(resource_id: str, from_ts: float, to_ts: float):
    return r.zrangebyscore(f"slots:available:{resource_id}", from_ts, to_ts, withscores=True)

def book_slot_for_user(booking_id: str, resource_id: str, slot: str, start_ts: float, user_id: str):
    return book_slot(
        keys=[
            f"slots:available:{resource_id}",
            f"slots:booked:{resource_id}",
            f"booking:{booking_id}",
            f"user:{user_id}:bookings"
        ],
        args=[slot, user_id, str(start_ts), booking_id]
    ) == 1

def cancel_booking(booking_id: str, resource_id: str, slot: str, start_ts: float):
    booking = r.hgetall(f"booking:{booking_id}")
    if not booking:
        return False
    r.zrem(f"slots:booked:{resource_id}", slot)
    r.zadd(f"slots:available:{resource_id}", {slot: start_ts})
    r.hset(f"booking:{booking_id}", "status", "cancelled")
    return True

def get_user_bookings(user_id: str):
    booking_ids = r.smembers(f"user:{user_id}:bookings")
    return [r.hgetall(f"booking:{bid}") for bid in booking_ids]

# Setup example
add_available_slots("room:101", [
    ("slot:10am", 1712000000),
    ("slot:11am", 1712003600),
    ("slot:12pm", 1712007200),
])

success = book_slot_for_user("bk001", "room:101", "slot:10am", 1712000000, "user:101")
print("Booking result:", success)
print("Available:", get_available_slots("room:101", 1712000000, 1712010800))
```

## Provisional Bookings with TTL

Hold a slot temporarily while the user completes payment:

```bash
# Hold slot for 10 minutes
SET hold:room:101:slot:10am "user:101" EX 600
```

Confirm on payment completion:

```python
def confirm_provisional_hold(resource_id: str, slot: str, booking_id: str, user_id: str, start_ts: float):
    hold_key = f"hold:{resource_id}:{slot}"
    held_by = r.get(hold_key)
    if held_by != user_id:
        return False
    r.delete(hold_key)
    return book_slot_for_user(booking_id, resource_id, slot, start_ts, user_id)
```

## Viewing Booked Slots

```bash
# Get all booked slots for a resource on a given day
ZRANGEBYSCORE slots:booked:room:101 1712000000 1712086400 WITHSCORES
```

## Summary

Redis booking systems use sorted sets for time-ordered slot availability and Lua scripts for atomic slot reservation that prevents double-booking under concurrent load. Provisional holds with TTLs allow a two-phase booking flow where a slot is temporarily locked during payment processing. Cancellations move slots back to the available set by removing them from the booked sorted set and re-adding them to the available set.
