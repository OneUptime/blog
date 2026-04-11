# How to Use GEOSEARCH in Redis to Search by Radius or Box

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, GEOSEARCH, Radius Search, Location

Description: Learn how to use GEOSEARCH in Redis 6.2+ to find geospatial members within a circular radius or rectangular bounding box from a point or member.

---

## What Is GEOSEARCH?

`GEOSEARCH` is a unified geo query command introduced in Redis 6.2 that replaces the older `GEORADIUS` and `GEORADIUSBYMEMBER` commands. It searches a geospatial index for members within a given area - either a circle (radius) or a rectangle (box) - starting from either a coordinate pair or an existing member name.

## Syntax

```text
GEOSEARCH key FROMMEMBER member | FROMLONLAT longitude latitude
               BYRADIUS radius m|km|ft|mi | BYBOX width height m|km|ft|mi
               [ASC | DESC]
               [COUNT count [ANY]]
               [WITHCOORD]
               [WITHDIST]
               [WITHHASH]
```

## Search by Radius from Coordinates

```bash
# Find all restaurants within 300 meters of Times Square
GEOADD restaurants \
  -73.9857 40.7484 "Joe's Pizza" \
  -73.9851 40.7488 "Shake Shack" \
  -73.9711 40.7599 "Distant Diner"

GEOSEARCH restaurants FROMLONLAT -73.9855 40.7490 BYRADIUS 300 m ASC WITHDIST
```

```text
1) 1) "Shake Shack"
   2) "25.4312"
2) 1) "Joe's Pizza"
   2) "87.2091"
```

## Search by Radius from an Existing Member

```bash
# Find drivers within 2km of a specific pickup point
GEOSEARCH active-drivers FROMMEMBER "pickup:42" BYRADIUS 2 km ASC WITHDIST COUNT 5
```

## Search by Rectangular Box

```bash
# Find locations within a 1km wide x 2km tall box centered on a coordinate
GEOSEARCH restaurants FROMLONLAT -73.9855 40.7490 BYBOX 1 2 km ASC
```

Rectangular searches are useful for map viewport queries - finding everything visible in the user's current map view.

## Result Options

| Option | Description |
|--------|-------------|
| `WITHCOORD` | Include longitude and latitude of each result |
| `WITHDIST` | Include distance from the search center |
| `WITHHASH` | Include raw Geohash score |
| `ASC` / `DESC` | Sort by distance ascending or descending |
| `COUNT n` | Limit to n results |
| `COUNT n ANY` | Return n results without guaranteed sort order (faster) |

## Full Example with All Options

```bash
GEOSEARCH restaurants \
  FROMLONLAT -73.9855 40.7490 \
  BYRADIUS 1 km \
  ASC \
  COUNT 3 \
  WITHCOORD \
  WITHDIST
```

```text
1) 1) "Shake Shack"
   2) "0.0254"
   3) 1) "-73.98510068655014038"
      2) "40.74879965612266965"
2) 1) "Joe's Pizza"
   2) "0.0872"
   3) 1) "-73.98569911718368530"
      2) "40.74840001032424405"
```

## Building a Nearby Store Finder

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def find_nearby_stores(user_lon: float, user_lat: float, radius_km: float = 5, limit: int = 10):
    """Return stores near a user's coordinates."""
    results = r.geosearch(
        "stores",
        longitude=user_lon,
        latitude=user_lat,
        radius=radius_km,
        unit="km",
        sort="ASC",
        count=limit,
        withcoord=True,
        withdist=True
    )

    stores = []
    for item in results:
        name = item[0]
        distance_km = item[1]
        lon, lat = item[2]
        stores.append({
            "name": name,
            "distance_km": round(distance_km, 2),
            "longitude": lon,
            "latitude": lat
        })
    return stores

# Seed some stores
r.geoadd("stores", [
    -73.9857, 40.7484, "Downtown Store",
    -74.0059, 40.7128, "West Side Store",
    -73.9712, 40.7614, "Midtown Store",
])

user_location = (-73.9855, 40.7490)
nearby = find_nearby_stores(*user_location, radius_km=2)
for store in nearby:
    print(f"{store['name']}: {store['distance_km']} km away")
```

## Viewport Search (Box Mode)

```python
import math

def search_in_viewport(min_lon: float, min_lat: float, max_lon: float, max_lat: float):
    """Search for stores within a map viewport bounding box."""
    # Compute center and dimensions
    center_lon = (min_lon + max_lon) / 2
    center_lat = (min_lat + max_lat) / 2
    width_km = abs(max_lon - min_lon) * 111 * math.cos(math.radians(center_lat))  # km per degree longitude
    height_km = abs(max_lat - min_lat) * 111  # km per degree latitude

    return r.geosearch(
        "stores",
        longitude=center_lon,
        latitude=center_lat,
        width=width_km,
        height=height_km,
        unit="km",
        sort="ASC"
    )
```

## GEOSEARCH vs Deprecated GEORADIUS

`GEORADIUS` and `GEORADIUSBYMEMBER` are deprecated as of Redis 6.2. Key improvements in `GEOSEARCH`:

- Supports both radius and box searches
- Does not require writing results to another key (use `GEOSEARCHSTORE` for that)
- Cleaner, more consistent API

## Summary

`GEOSEARCH` is Redis's modern geospatial query command supporting both circular radius searches and rectangular bounding box searches from either a coordinate pair or an existing member. Its `WITHDIST`, `WITHCOORD`, and `COUNT` options make it flexible for building store finders, nearby feature searches, and map viewport queries. Use it in preference to the deprecated `GEORADIUS` family of commands.
