# How to Build a Travel Itinerary Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Travel, Cache

Description: Cache complex multi-segment travel itineraries in Redis to deliver instant itinerary rendering, enable real-time status updates, and sync changes across devices.

---

Travel itineraries are read far more often than they are written. A traveler checks their itinerary dozens of times before a trip, on multiple devices. Caching itineraries in Redis eliminates repeated database joins across flights, hotels, and car reservations while enabling real-time status updates when booking details change.

## Data Model

An itinerary is a hash with the full itinerary JSON, plus a sorted set of component IDs ordered by departure time for partial reads:

```bash
# Full itinerary hash
HSET itinerary:itn-xyz123 traveler_id u42 title "NYC to Paris" created_at 1711900000

# Components sorted by datetime (score = Unix timestamp)
ZADD itinerary:itn-xyz123:components 1712000000 "flight:UA123" 1712086400 "hotel:h456" 1712259200 "flight:AF789"

# Full component data
SET itinerary:comp:flight:UA123 '{"type":"flight","flight_number":"UA123","depart":"JFK","arrive":"CDG",...}'
```

## Setup

```python
import redis
import json
import time
import uuid

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

ITIN_PREFIX = "itinerary"
COMP_PREFIX = "itinerary:comp"
ITIN_TTL = 7776000    # 90 days
COMP_TTL = 7776000    # 90 days
```

## Creating an Itinerary

```python
def create_itinerary(traveler_id: str, title: str, components: list[dict]) -> str:
    itin_id = f"itn-{str(uuid.uuid4())[:8]}"
    itin_key = f"{ITIN_PREFIX}:{itin_id}"
    components_key = f"{ITIN_PREFIX}:{itin_id}:components"

    pipe = r.pipeline()
    pipe.hset(itin_key, mapping={
        "id": itin_id,
        "traveler_id": traveler_id,
        "title": title,
        "created_at": int(time.time()),
        "status": "confirmed"
    })
    pipe.expire(itin_key, ITIN_TTL)

    for comp in components:
        comp_id = f"{comp['type']}:{comp['ref_id']}"
        departure_ts = comp.get("departure_ts", int(time.time()))

        # Add to timeline sorted set
        pipe.zadd(components_key, {comp_id: departure_ts})

        # Store component details
        comp_key = f"{COMP_PREFIX}:{comp_id}"
        pipe.setex(comp_key, COMP_TTL, json.dumps({**comp, "comp_id": comp_id}))

    pipe.expire(components_key, ITIN_TTL)
    pipe.execute()

    # Index by traveler for lookup
    r.zadd(f"{ITIN_PREFIX}:traveler:{traveler_id}", {itin_id: int(time.time())})
    r.expire(f"{ITIN_PREFIX}:traveler:{traveler_id}", ITIN_TTL)

    return itin_id
```

## Reading an Itinerary

```python
def get_itinerary(itin_id: str) -> dict | None:
    itin_key = f"{ITIN_PREFIX}:{itin_id}"
    components_key = f"{ITIN_PREFIX}:{itin_id}:components"

    meta = r.hgetall(itin_key)
    if not meta:
        return None

    # Get components in chronological order
    comp_ids = r.zrange(components_key, 0, -1)

    if comp_ids:
        comp_keys = [f"{COMP_PREFIX}:{cid}" for cid in comp_ids]
        raw_components = r.mget(comp_keys)
        components = [json.loads(c) for c in raw_components if c]
    else:
        components = []

    return {
        **meta,
        "components": components,
        "component_count": len(components)
    }
```

## Updating a Component Status

```python
def update_component_status(itin_id: str, comp_id: str, status: str, details: dict = None):
    comp_key = f"{COMP_PREFIX}:{comp_id}"
    comp_raw = r.get(comp_key)

    if not comp_raw:
        raise ValueError(f"Component {comp_id} not found")

    comp = json.loads(comp_raw)
    comp["status"] = status
    comp["status_updated_at"] = int(time.time())
    if details:
        comp.update(details)

    r.setex(comp_key, COMP_TTL, json.dumps(comp))

    # Notify traveler of status change
    r.publish(f"{ITIN_PREFIX}:{itin_id}:updates", json.dumps({
        "event": "status_changed",
        "comp_id": comp_id,
        "status": status,
        "details": details or {}
    }))
```

## Getting Upcoming Segments

```python
def get_upcoming_segments(itin_id: str, hours_ahead: int = 48) -> list:
    components_key = f"{ITIN_PREFIX}:{itin_id}:components"
    now = int(time.time())
    future = now + (hours_ahead * 3600)

    comp_ids = r.zrange(components_key, now, future, byscore=True)
    if not comp_ids:
        return []

    raw = r.mget([f"{COMP_PREFIX}:{cid}" for cid in comp_ids])
    return [json.loads(c) for c in raw if c]
```

## Syncing to a New Device

```python
def get_traveler_itineraries(traveler_id: str) -> list:
    itin_ids = r.zrange(f"{ITIN_PREFIX}:traveler:{traveler_id}", 0, -1, rev=True)
    itineraries = []
    for itin_id in itin_ids:
        itin = get_itinerary(itin_id)
        if itin:
            itineraries.append(itin)
    return itineraries
```

## Summary

A Redis travel itinerary cache stores itinerary metadata in hashes, organizes components in time-ordered sorted sets for efficient chronological reads, and persists individual component details as separate keys for targeted updates. Real-time status changes (gate changes, delays) are broadcast via Pub/Sub and can be written to component keys without invalidating the entire itinerary.
