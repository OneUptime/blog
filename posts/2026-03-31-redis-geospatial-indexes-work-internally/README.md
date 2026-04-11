# How Redis Geospatial Indexes Work Internally (Sorted Sets + Geohash)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, Geohash, Sorted Set, Internal

Description: Learn how Redis geospatial commands use a sorted set with geohash scores to enable efficient radius and bounding-box proximity queries.

---

Redis does not have a separate geospatial data type. `GEOADD`, `GEODIST`, `GEORADIUS` (deprecated since 6.2 in favor of `GEOSEARCH`), and `GEOSEARCH` all operate on a regular sorted set under the hood, using 52-bit geohash integers as scores. Understanding this lets you use sorted set commands directly on geo keys.

## Geohash as a Score

When you call `GEOADD`, Redis encodes the latitude/longitude into a 52-bit integer using a geohash algorithm and stores it as the score in a sorted set:

```bash
GEOADD locations 13.361389 38.115556 "Palermo"
GEOADD locations 15.087269 37.502669 "Catania"
GEOADD locations 2.349014 48.864716 "Paris"

# Because it's a sorted set, ZRANGE works on geo keys
ZRANGE locations 0 -1 WITHSCORES
# Shows members with their geohash integer scores
```

## How Geohash Works

Geohash divides the world into a hierarchical grid by interleaving bits of the latitude and longitude:

```text
Longitude -180..+180            -> 26 bits
Latitude  -85.05112878..+85.05112878 -> 26 bits
Interleaved -> 52-bit integer (score in sorted set)
```

Nearby locations have numerically close geohash scores, which is why sorted set range queries translate naturally into proximity queries.

## Encoding and Decoding

```bash
# Get the base32 geohash string for a member
GEOHASH locations Palermo
# Returns: "sqc8b59zny0"

# Get decoded lat/lon (approximate due to rounding)
GEOPOS locations Palermo
# Returns: [[13.36138933897018433, 38.11555639549629859]]
```

## GEOSEARCH: Radius Queries

```bash
# Find all locations within 200km of a point
GEOSEARCH locations FROMMEMBER Palermo BYRADIUS 200 km ASC
# Returns: Palermo, Catania

# Or from a longitude/latitude
GEOSEARCH locations FROMLONLAT 15.0 37.5 BYRADIUS 100 km ASC COUNT 5
```

## Distance Calculation

```bash
GEODIST locations Palermo Catania km
# Returns: 166.2742 (km)

GEODIST locations Palermo Paris m
# Returns: 1855732.9620 (meters)
```

## Practical Example: Store Locator

```python
import redis

r = redis.Redis()

# Load store locations
stores = [
    ("store_1", -73.935242, 40.730610),   # New York
    ("store_2", -118.243683, 34.052235),  # Los Angeles
    ("store_3", -87.623177, 41.881832),   # Chicago
    ("store_4", -122.431297, 37.773972),  # San Francisco
]
for name, lon, lat in stores:
    r.geoadd("stores", (lon, lat, name))

# Find stores within 500km of a user
user_lon, user_lat = -74.0, 40.7   # Near NYC

nearby = r.geosearch(
    "stores",
    longitude=user_lon,
    latitude=user_lat,
    radius=500,
    unit="km",
    sort="ASC",
    count=5,
    withcoord=True,
    withdist=True
)

for store in nearby:
    print(f"{store[0].decode()}: {store[1]:.1f} km away")
```

## Memory and Limitations

Since geo keys are sorted sets, they benefit from the same `listpack` to `skiplist` transition:

```bash
# Check encoding
OBJECT ENCODING locations
# "listpack" if small, "skiplist" if large
```

Limitations:
- Precision: ~0.6mm at the equator (52 bits)
- No native polygon queries (use BYBOX for bounding box)
- No altitude support (2D only)

```bash
# Bounding box query (Redis 6.2+)
GEOSEARCH locations FROMLONLAT 14.0 38.0 BYBOX 400 300 km ASC
```

## Summary

Redis geospatial commands are built on top of sorted sets, encoding latitude/longitude pairs as 52-bit geohash integers used as scores. Point operations like `GEOADD` run in O(log N), while search commands like `GEOSEARCH` run in O(N+log M) where N is the number of elements scanned in the bounding box and M is the number of items in the set. Because geo keys are sorted sets, you can freely mix `GEO*` and `Z*` commands on the same key to combine proximity queries with custom scoring or member filtering.
