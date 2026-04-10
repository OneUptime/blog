# How to Build a Real-Time Map with Redis Geospatial Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, Real-Time Map, WebSocket, Visualization

Description: Build a real-time map powered by Redis Geospatial data that streams live position updates to connected browsers via WebSocket.

---

Real-time maps need a backend that accepts position updates at high frequency and broadcasts changes to connected clients. Redis Geo stores current positions while Redis Pub/Sub pushes updates to WebSocket connections.

## Position Update Ingestion

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def update_entity_position(entity_type: str, entity_id: str,
                            lat: float, lon: float, metadata: dict = None):
    now = time.time()
    geo_key = f"map:{entity_type}:geo"

    pipe = r.pipeline()
    pipe.geoadd(geo_key, [lon, lat, entity_id])
    pipe.hset(f"map:{entity_type}:{entity_id}", mapping={
        "lat": lat, "lon": lon,
        "last_update": now,
        **(metadata or {}),
    })
    # Publish update for WebSocket fan-out
    update_msg = json.dumps({
        "type": entity_type,
        "id": entity_id,
        "lat": lat, "lon": lon,
        "ts": now,
        **(metadata or {}),
    })
    pipe.publish(f"map:updates:{entity_type}", update_msg)
    pipe.execute()
```

## Getting All Entities for Initial Map Load

```python
def get_all_entities(entity_type: str) -> list:
    geo_key = f"map:{entity_type}:geo"
    entity_ids = r.zrange(geo_key, 0, -1)

    if not entity_ids:
        return []

    pipe = r.pipeline()
    for eid in entity_ids:
        pipe.hgetall(f"map:{entity_type}:{eid}")
    metas = pipe.execute()

    return [
        {"id": eid, **meta}
        for eid, meta in zip(entity_ids, metas)
        if meta
    ]
```

## Viewport-Bounded Query

Only load entities visible in the current map viewport:

```python
def get_entities_in_viewport(entity_type: str, center_lat: float,
                              center_lon: float, radius_km: float) -> list:
    geo_key = f"map:{entity_type}:geo"
    results = r.geosearch(
        geo_key,
        longitude=center_lon, latitude=center_lat,
        radius=radius_km, unit="km",
        sort="ASC",
        withdist=True,
    )

    if not results:
        return []

    pipe = r.pipeline()
    for eid, _ in results:
        pipe.hgetall(f"map:{entity_type}:{eid}")
    metas = pipe.execute()

    return [
        {"id": eid, "distance_km": round(float(dist), 2), **meta}
        for (eid, dist), meta in zip(results, metas)
        if meta
    ]
```

## WebSocket Server (Async)

```python
import asyncio
import redis.asyncio as aioredis

async_r = aioredis.Redis(host='localhost', port=6379, decode_responses=True)

async def websocket_handler(websocket, entity_type: str):
    pubsub = async_r.pubsub()
    await pubsub.subscribe(f"map:updates:{entity_type}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send(message["data"])
    finally:
        await pubsub.unsubscribe()
```

## Removing Stale Entities

```python
def remove_stale_entities(entity_type: str, max_age_seconds: int = 300):
    geo_key = f"map:{entity_type}:geo"
    entity_ids = r.zrange(geo_key, 0, -1)
    now = time.time()

    pipe = r.pipeline()
    for eid in entity_ids:
        last = r.hget(f"map:{entity_type}:{eid}", "last_update")
        if last and now - float(last) > max_age_seconds:
            pipe.zrem(geo_key, eid)
            pipe.delete(f"map:{entity_type}:{eid}")
    pipe.execute()
```

## Monitoring

Monitor WebSocket connection counts and Redis Pub/Sub subscriber counts with [OneUptime](https://oneuptime.com) to ensure your real-time map scales with connected clients.

```bash
redis-cli PUBSUB NUMSUB map:updates:vehicle
redis-cli ZCARD map:vehicle:geo
```

## Summary

Redis Geo stores current entity positions for initial map load and viewport queries; Redis Pub/Sub delivers live updates to WebSocket handlers for real-time movement rendering. Viewport-bounded GEOSEARCH queries prevent over-fetching when zoomed in, and periodic stale-entity cleanup keeps the geo index accurate.
