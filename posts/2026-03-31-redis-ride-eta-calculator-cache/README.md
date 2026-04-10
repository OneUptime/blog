# How to Build a Ride ETA Calculator Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rideshare, Cache

Description: Cache ride ETA calculations in Redis using geospatial indexes for driver proximity and short-TTL route caches to deliver instant ETA estimates at scale.

---

Ridesharing apps compute ETAs thousands of times per second - every time a user opens the app, requests a ride, or checks a driver's progress. Calling routing APIs for every request is too slow and too expensive. Redis geospatial commands and route caching bring ETA delivery to sub-10ms.

## Architecture

1. Driver positions are updated in a Redis geo index every 5-10 seconds.
2. When a user requests an ETA, find nearby drivers using `GEOSEARCH`.
3. Check the route cache for a pre-computed ETA for that origin-destination pair.
4. If no cached route, call the routing API and cache the result for 5 minutes.

## Setup

```python
import redis
import json
import time
import math
import hashlib

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

DRIVERS_GEO_KEY = "drivers:geo"
DRIVER_PREFIX = "driver"
ROUTE_PREFIX = "route:cache"
ETA_PREFIX = "eta:cache"

ROUTE_CACHE_TTL = 300    # 5 minutes - route conditions change
DRIVER_TTL = 30          # 30 seconds - stale driver if no heartbeat
```

## Updating Driver Location

```python
def update_driver_location(driver_id: str, lat: float, lon: float, status: str = "available"):
    pipe = r.pipeline()
    # Update geo index
    pipe.geoadd(DRIVERS_GEO_KEY, [lon, lat, driver_id])

    # Update driver metadata
    pipe.hset(f"{DRIVER_PREFIX}:{driver_id}", mapping={
        "lat": lat,
        "lon": lon,
        "status": status,
        "last_updated": int(time.time())
    })
    pipe.expire(f"{DRIVER_PREFIX}:{driver_id}", DRIVER_TTL)
    pipe.execute()
```

## Finding Nearby Available Drivers

```python
def find_nearby_drivers(lat: float, lon: float, radius_km: float = 5, count: int = 10) -> list:
    nearby = r.geosearch(
        DRIVERS_GEO_KEY,
        longitude=lon,
        latitude=lat,
        radius=radius_km,
        unit="km",
        count=count,
        sort="ASC",
        withcoord=True,
        withdist=True
    )

    drivers = []
    for item in nearby:
        driver_id, distance, coords = item[0], item[1], item[2]
        meta = r.hgetall(f"{DRIVER_PREFIX}:{driver_id}")

        if meta.get("status") == "available":
            last_updated = int(meta.get("last_updated", 0))
            if time.time() - last_updated < DRIVER_TTL:
                drivers.append({
                    "driver_id": driver_id,
                    "distance_km": float(distance),
                    "lat": float(coords[1]),
                    "lon": float(coords[0]),
                    "status": meta.get("status")
                })

    return drivers
```

## Caching Route ETAs

```python
def route_cache_key(origin_lat: float, origin_lon: float,
                    dest_lat: float, dest_lon: float) -> str:
    # Round to 3 decimal places (~100m precision) for better cache hits
    key = f"{round(origin_lat,3)},{round(origin_lon,3)}->{round(dest_lat,3)},{round(dest_lon,3)}"
    return f"{ROUTE_PREFIX}:{hashlib.md5(key.encode()).hexdigest()}"

def get_route_eta(origin_lat: float, origin_lon: float,
                  dest_lat: float, dest_lon: float) -> dict:
    key = route_cache_key(origin_lat, origin_lon, dest_lat, dest_lon)
    cached = r.get(key)

    if cached:
        data = json.loads(cached)
        return {**data, "cached": True}

    # Cache miss - call routing API
    route = call_routing_api(origin_lat, origin_lon, dest_lat, dest_lon)
    r.setex(key, ROUTE_CACHE_TTL, json.dumps(route))
    return {**route, "cached": False}

def call_routing_api(o_lat, o_lon, d_lat, d_lon) -> dict:
    # Replace with actual OSRM / Google Maps / Mapbox call
    # Simple straight-line estimate as placeholder
    lat_diff = abs(d_lat - o_lat)
    lon_diff = abs(d_lon - o_lon)
    distance_km = math.sqrt(lat_diff**2 + lon_diff**2) * 111
    duration_min = distance_km / 30 * 60  # Assume 30 km/h avg city speed
    return {
        "distance_km": round(distance_km, 2),
        "duration_minutes": round(duration_min, 1),
        "generated_at": int(time.time())
    }
```

## Full ETA Estimation

```python
def estimate_eta(user_lat: float, user_lon: float, dest_lat: float, dest_lon: float) -> dict:
    # Step 1: Find closest available driver
    nearby = find_nearby_drivers(user_lat, user_lon, radius_km=5, count=5)
    if not nearby:
        return {"available": False, "message": "No drivers nearby"}

    closest = nearby[0]

    # Step 2: Get driver-to-user ETA
    pickup_route = get_route_eta(closest["lat"], closest["lon"], user_lat, user_lon)

    # Step 3: Get user-to-destination ETA
    trip_route = get_route_eta(user_lat, user_lon, dest_lat, dest_lon)

    return {
        "available": True,
        "driver_id": closest["driver_id"],
        "driver_distance_km": closest["distance_km"],
        "pickup_eta_minutes": pickup_route["duration_minutes"],
        "trip_duration_minutes": trip_route["duration_minutes"],
        "total_eta_minutes": round(pickup_route["duration_minutes"] + trip_route["duration_minutes"], 1),
        "trip_distance_km": trip_route["distance_km"]
    }
```

## Summary

A Redis ride ETA calculator caches two things: driver positions in a geospatial index updated every 5-10 seconds for proximity queries, and route ETAs keyed on rounded coordinates for reuse across nearby origin-destination pairs. The coordinate rounding (3 decimal places) dramatically improves cache hit rates while keeping precision within 100 meters - sufficient for ETA estimation.
