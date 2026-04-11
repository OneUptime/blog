# How to Model Booking/Reservation Systems in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Booking Systems, Reservation, Lua Script, Distributed Lock

Description: Learn how to model a booking and reservation system in Redis with atomic slot management, conflict prevention, and TTL-based holds.

---

## Core Challenges in Booking Systems

Booking systems must solve three problems:

1. Prevent double-booking (two users reserving the same slot simultaneously)
2. Handle temporary holds (reservations that expire if not confirmed)
3. Provide fast availability lookups across date ranges

Redis handles all three through atomic operations, TTLs, and Lua scripting.

## Data Model for Availability

Model available slots as a Redis set and reserved slots as a hash:

```bash
# Available slots for a resource (e.g., hotel room 101)
SADD room:101:available 2024-04-01 2024-04-02 2024-04-03 2024-04-04 2024-04-05

# Reserved slots: date -> booking_id
HSET room:101:bookings 2024-04-02 "booking:abc123"
HSET room:101:bookings 2024-04-03 "booking:abc123"
```

Check availability:

```bash
# Is a specific date available?
SISMEMBER room:101:available 2024-04-02

# Get all available dates
SMEMBERS room:101:available
```

## Atomic Reservation with Lua Script

The core booking operation must be atomic to prevent race conditions:

```lua
-- reserve_slot.lua
-- KEYS[1]: available set key (e.g., "room:101:available")
-- KEYS[2]: bookings hash key (e.g., "room:101:bookings")
-- ARGV[1]: date
-- ARGV[2]: booking_id
-- ARGV[3]: ttl for hold (seconds)

local available = redis.call('SISMEMBER', KEYS[1], ARGV[1])
if available == 0 then
    return redis.error_reply('SLOT_NOT_AVAILABLE')
end

redis.call('SREM', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])

-- Set a hold expiry key
local hold_key = 'hold:' .. ARGV[2] .. ':' .. ARGV[1]
redis.call('SET', hold_key, '1', 'EX', ARGV[3])

return redis.status_reply('OK')
```

```python
import redis
import uuid

r = redis.Redis(host='localhost', port=6379)

with open('reserve_slot.lua', 'r') as f:
    reserve_script = r.register_script(f.read())

def reserve_slot(room_id: str, date: str, hold_ttl: int = 600) -> str:
    booking_id = f"booking:{uuid.uuid4().hex[:12]}"
    available_key = f"room:{room_id}:available"
    bookings_key = f"room:{room_id}:bookings"
    try:
        reserve_script(
            keys=[available_key, bookings_key],
            args=[date, booking_id, hold_ttl]
        )
        return booking_id
    except redis.ResponseError as e:
        if 'SLOT_NOT_AVAILABLE' in str(e):
            raise ValueError(f"Date {date} is not available for room {room_id}")
        raise
```

## Temporary Holds with TTL

When a user starts a booking flow, create a temporary hold that expires if they don't complete payment:

```python
import redis
import uuid
import time

r = redis.Redis(host='localhost', port=6379)

HOLD_TTL = 600  # 10 minutes

def create_hold(room_id: str, dates: list, user_id: str) -> str:
    hold_id = f"hold:{uuid.uuid4().hex[:12]}"

    pipe = r.pipeline()
    for date in dates:
        hold_key = f"room:{room_id}:hold:{date}"
        # NX = only set if not exists (prevent overwriting another hold)
        pipe.set(hold_key, f"{user_id}:{hold_id}", ex=HOLD_TTL, nx=True)
    results = pipe.execute()

    if not all(results):
        # Some dates were already held - release any we did acquire
        release_hold(room_id, dates, hold_id, user_id)
        raise ValueError("One or more dates are currently held by another user")

    return hold_id

def release_hold(room_id: str, dates: list, hold_id: str, user_id: str):
    pipe = r.pipeline()
    for date in dates:
        hold_key = f"room:{room_id}:hold:{date}"
        value = r.get(hold_key)
        if value and f"{user_id}:{hold_id}".encode() == value:
            pipe.delete(hold_key)
    pipe.execute()

def confirm_booking(room_id: str, dates: list, hold_id: str, user_id: str) -> str:
    booking_id = f"booking:{uuid.uuid4().hex[:12]}"
    pipe = r.pipeline()
    for date in dates:
        hold_key = f"room:{room_id}:hold:{date}"
        booking_key = f"room:{room_id}:bookings"
        pipe.delete(hold_key)
        pipe.srem(f"room:{room_id}:available", date)
        pipe.hset(booking_key, date, booking_id)
    pipe.execute()
    return booking_id
```

## Multi-Day Booking Availability Check

Check if all dates in a range are available efficiently using a pipeline:

```python
def check_availability(room_id: str, dates: list) -> bool:
    available_key = f"room:{room_id}:available"
    pipe = r.pipeline()
    for date in dates:
        pipe.sismember(available_key, date)
    results = pipe.execute()
    return all(results)

def find_available_rooms(rooms: list, dates: list) -> list:
    available = []
    for room_id in rooms:
        if check_availability(room_id, dates):
            available.append(room_id)
    return available
```

## Cancellation and Slot Release

```python
def cancel_booking(room_id: str, booking_id: str, dates: list):
    pipe = r.pipeline()
    bookings_key = f"room:{room_id}:bookings"
    available_key = f"room:{room_id}:available"
    for date in dates:
        # Only release if it matches this booking
        current = r.hget(bookings_key, date)
        if current and current.decode() == booking_id:
            pipe.hdel(bookings_key, date)
            pipe.sadd(available_key, date)
    pipe.execute()
```

## Booking Metadata Storage

Store booking details as a hash:

```bash
HSET booking:abc123 room_id 101 user_id 456 check_in 2024-04-02 check_out 2024-04-04 status confirmed total_price 299.00

# Set expiry for cancelled/expired bookings
EXPIRE booking:abc123 2592000  # Keep for 30 days
```

## Concurrency Protection with Distributed Locks

For very high-traffic resources, add a distributed lock around the booking operation:

```python
import redis
import time
import uuid

r = redis.Redis(host='localhost', port=6379)

def book_with_lock(room_id: str, dates: list, user_id: str):
    lock_key = f"lock:room:{room_id}"
    lock_value = str(uuid.uuid4())
    lock_acquired = r.set(lock_key, lock_value, ex=5, nx=True)

    if not lock_acquired:
        raise Exception("Resource is busy, please try again")

    try:
        if not check_availability(room_id, dates):
            raise ValueError("Dates not available")
        return confirm_booking(room_id, dates, "hold", user_id)
    finally:
        # Release lock only if we own it
        release_lua = """
        if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('DEL', KEYS[1])
        end
        return 0
        """
        r.eval(release_lua, 1, lock_key, lock_value)
```

## Summary

Modeling a booking system in Redis combines sets for availability tracking, hashes for reservation metadata, TTL-based keys for temporary holds, and Lua scripts for atomic operations. The key is ensuring that availability checks and slot reservations are atomic to prevent double-booking. Use temporary hold keys with TTLs to support multi-step booking flows where users may abandon checkout, and use distributed locks when contention is very high for a single resource.
