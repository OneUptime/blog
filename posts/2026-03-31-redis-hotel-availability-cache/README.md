# How to Build a Hotel Availability Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Travel, Cache

Description: Cache hotel room availability in Redis using sorted sets and hashes to serve instant search results while preventing double-booking with atomic reservation locks.

---

Hotel search engines must return availability results in under a second, but querying room inventory across hundreds of properties and dozens of room types for every search request is unsustainable. Redis caches availability data, making search instant, while atomic locks prevent double-booking during checkout.

## Data Model

```bash
# Available rooms sorted set (score = price)
ZADD hotel:h123:rooms:2026-04-15 149.00 "room-101" 199.00 "room-201" 249.00 "suite-301"

# Room details hash
HSET room:h123:room-101 type standard beds 2 max_guests 2 amenities '["wifi","parking"]'

# Hotel metadata
HSET hotel:h123 name "Grand Hotel" rating 4.5 city "New York" stars 4
```

## Setup

```python
import redis
import json
import time
import uuid

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

HOTEL_PREFIX = "hotel"
ROOM_PREFIX = "room"
HOLD_PREFIX = "hold"
AVAIL_TTL = 900     # 15 minutes for search results
HOLD_TTL = 600      # 10 minutes to complete booking
```

## Loading Availability

```python
def load_hotel_availability(hotel_id: str, check_in: str, rooms: list[dict]):
    avail_key = f"{HOTEL_PREFIX}:{hotel_id}:rooms:{check_in}"
    pipe = r.pipeline()
    for room in rooms:
        room_id = room["id"]
        price = float(room["price"])
        # Add to availability sorted set (score = price)
        pipe.zadd(avail_key, {room_id: price})
        # Store room details
        pipe.hset(f"{ROOM_PREFIX}:{hotel_id}:{room_id}", mapping={
            "type": room["type"],
            "beds": room["beds"],
            "max_guests": room["max_guests"],
            "price": price,
            "amenities": json.dumps(room.get("amenities", []))
        })
    pipe.expire(avail_key, AVAIL_TTL)
    pipe.execute()
```

## Searching Available Rooms

```python
def search_rooms(hotel_id: str, check_in: str, max_price: float = 9999, limit: int = 10) -> list:
    avail_key = f"{HOTEL_PREFIX}:{hotel_id}:rooms:{check_in}"
    cached = r.exists(avail_key)

    if not cached:
        # Cache miss - load from inventory system
        rooms = fetch_availability_from_db(hotel_id, check_in)
        load_hotel_availability(hotel_id, check_in, rooms)

    # Query available rooms by price range
    room_ids = r.zrangebyscore(avail_key, 0, max_price, start=0, num=limit)

    if not room_ids:
        return []

    pipe = r.pipeline()
    for room_id in room_ids:
        pipe.hgetall(f"{ROOM_PREFIX}:{hotel_id}:{room_id}")
    room_details = pipe.execute()

    return [
        {**details, "room_id": rid, "hotel_id": hotel_id}
        for rid, details in zip(room_ids, room_details)
        if details
    ]

def search_hotels_by_city(city: str, check_in: str, max_price: float = 9999) -> list:
    hotel_ids = get_hotels_in_city(city)
    results = []
    for hotel_id in hotel_ids:
        rooms = search_rooms(hotel_id, check_in, max_price, limit=1)
        if rooms:
            hotel_meta = r.hgetall(f"{HOTEL_PREFIX}:{hotel_id}")
            results.append({
                **hotel_meta,
                "hotel_id": hotel_id,
                "lowest_price": float(rooms[0]["price"]),
                "available_room_count": r.zcard(f"{HOTEL_PREFIX}:{hotel_id}:rooms:{check_in}")
            })
    return sorted(results, key=lambda x: x["lowest_price"])
```

## Placing a Room Hold

```python
def hold_room(hotel_id: str, room_id: str, check_in: str, guest_id: str) -> str | None:
    hold_key = f"{HOLD_PREFIX}:{hotel_id}:{room_id}:{check_in}"

    # Atomic hold - SET NX prevents two guests claiming the same room
    hold_token = str(uuid.uuid4())
    claimed = r.set(hold_key, json.dumps({"guest_id": guest_id, "token": hold_token}),
                    ex=HOLD_TTL, nx=True)
    return hold_token if claimed else None
```

## Confirming a Booking

```python
CONFIRM_SCRIPT = """
local hold_key = KEYS[1]
local avail_key = KEYS[2]
local guest_id = ARGV[1]
local room_id = ARGV[2]
local hold_token = ARGV[3]

local hold_raw = redis.call('GET', hold_key)
if not hold_raw then
    return redis.error_reply('HOLD_EXPIRED')
end

local hold = cjson.decode(hold_raw)
if hold.guest_id ~= guest_id or hold.token ~= hold_token then
    return redis.error_reply('INVALID_HOLD')
end

redis.call('ZREM', avail_key, room_id)
redis.call('DEL', hold_key)
return 'CONFIRMED'
"""

confirm_booking = r.register_script(CONFIRM_SCRIPT)

def confirm_reservation(hotel_id: str, room_id: str, check_in: str, guest_id: str, token: str) -> bool:
    hold_key = f"{HOLD_PREFIX}:{hotel_id}:{room_id}:{check_in}"
    avail_key = f"{HOTEL_PREFIX}:{hotel_id}:rooms:{check_in}"

    try:
        result = confirm_booking(
            keys=[hold_key, avail_key],
            args=[guest_id, room_id, token]
        )
        return result == "CONFIRMED"
    except redis.exceptions.ResponseError:
        return False

def get_hotels_in_city(city: str) -> list:
    return r.smembers(f"hotels:city:{city}") or []

def fetch_availability_from_db(hotel_id: str, check_in: str) -> list:
    return [
        {"id": "room-101", "type": "standard", "beds": 2, "max_guests": 2, "price": 149.00},
        {"id": "room-201", "type": "deluxe", "beds": 2, "max_guests": 2, "price": 199.00}
    ]
```

## Summary

A Redis hotel availability cache stores room inventory in price-scored sorted sets for fast range queries, uses SET NX for atomic room holds with 10-minute TTLs, and confirms bookings with a Lua script that simultaneously validates the hold token and removes the room from availability. This prevents double-booking while supporting high-concurrency search traffic.
