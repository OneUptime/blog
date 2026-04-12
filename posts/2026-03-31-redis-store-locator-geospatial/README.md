# How to Implement Store Locator with Redis Geospatial

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, Store Locator, Location, Search

Description: Implement a high-performance store locator using Redis Geospatial commands with filtering by open hours, services, and distance.

---

Store locators are a fundamental feature for retail and service businesses. Redis Geo handles the spatial queries; Hashes hold store metadata. Together they power sub-10ms store searches even with thousands of locations.

## Loading Store Data

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def add_store(store_id: str, lat: float, lon: float, metadata: dict):
    pipe = r.pipeline()
    # Geo index - one per chain for partitioning
    pipe.geoadd("stores:geo", [lon, lat, store_id])
    # Store metadata
    pipe.hset(f"store:{store_id}", mapping={
        "id": store_id,
        "name": metadata.get("name", ""),
        "address": metadata.get("address", ""),
        "phone": metadata.get("phone", ""),
        "open_hours": json.dumps(metadata.get("open_hours", {})),
        "services": ",".join(metadata.get("services", [])),
        "lat": lat,
        "lon": lon,
    })
    pipe.execute()
```

## Basic Store Search

```python
def find_stores(lat: float, lon: float, radius_km: float = 25,
                max_results: int = 10) -> list:
    results = r.geosearch(
        "stores:geo",
        longitude=lon, latitude=lat,
        radius=radius_km, unit="km",
        sort="ASC", count=max_results,
        withdist=True,
    )

    stores = []
    pipe = r.pipeline()
    for store_id, _ in results:
        pipe.hgetall(f"store:{store_id}")
    metas = pipe.execute()

    for (store_id, dist), meta in zip(results, metas):
        stores.append({
            "id": store_id,
            "name": meta.get("name"),
            "address": meta.get("address"),
            "distance_km": round(float(dist), 2),
            "services": meta.get("services", "").split(","),
        })
    return stores
```

## Service-Filtered Search

```python
def find_stores_with_service(lat: float, lon: float, service: str,
                              radius_km: float = 25) -> list:
    all_stores = find_stores(lat, lon, radius_km, max_results=50)
    return [s for s in all_stores if service in s["services"]]
```

## Currently Open Stores

```python
import datetime

def is_store_open(store_id: str) -> bool:
    raw = r.hget(f"store:{store_id}", "open_hours")
    if not raw:
        return True  # Assume open if no hours data

    open_hours = json.loads(raw)
    now = datetime.datetime.now()
    day_name = now.strftime("%A").lower()
    hours = open_hours.get(day_name)
    if not hours:
        return False

    current_time = now.hour * 60 + now.minute
    open_time = int(hours["open"].split(":")[0]) * 60 + int(hours["open"].split(":")[1])
    close_time = int(hours["close"].split(":")[0]) * 60 + int(hours["close"].split(":")[1])
    return open_time <= current_time <= close_time

def find_open_stores(lat: float, lon: float, radius_km: float = 10) -> list:
    stores = find_stores(lat, lon, radius_km, max_results=50)
    return [s for s in stores if is_store_open(s["id"])]
```

## Getting Store Coordinates

```python
def get_store_coordinates(store_id: str) -> dict:
    pos = r.geopos("stores:geo", store_id)
    if pos and pos[0]:
        lon, lat = pos[0]
        return {"lat": float(lat), "lon": float(lon)}
    return {}
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your store locator API - a slow or downed store finder directly impacts in-store foot traffic for brick-and-mortar businesses.

```bash
redis-cli ZCARD stores:geo
redis-cli GEOSEARCH stores:geo FROMLONLAT -73.9857 40.7484 BYRADIUS 10 km ASC COUNT 5 WITHDIST
```

## Summary

Redis Geo stores all store coordinates in a single key and returns sorted-by-distance results with GEOSEARCH. Pipelining metadata lookups alongside geo results avoids N+1 query patterns. Client-side filtering for open hours and services is efficient when candidate sets are small (under 50 results), keeping Redis commands simple.
