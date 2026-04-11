# How to Use GEOADD in Redis to Add Geospatial Members

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, GEOADD, Location, Sorted Set

Description: Learn how to use GEOADD to store geospatial coordinates in Redis, enabling fast location-based queries for applications like ride-sharing and store finders.

---

## What Is GEOADD?

`GEOADD` adds geospatial members (longitude, latitude, name) to a Redis key backed by a sorted set. Redis encodes coordinates as a 52-bit Geohash stored as the sorted set score, enabling efficient distance calculations and radius searches with commands like `GEODIST`, `GEOPOS`, and `GEOSEARCH`.

## Syntax

```text
GEOADD key [NX | XX] [CH] longitude latitude member [longitude latitude member ...]
```

- `key` - the name of the geospatial index
- `NX` - only add new members, do not update existing
- `XX` - only update existing members, do not add new
- `CH` - return the number of elements added or updated (default is only added)
- `longitude latitude member` - one or more location entries

Returns the number of new members added.

## Adding Single and Multiple Members

```bash
# Add a single location
GEOADD restaurants -73.9857 40.7484 "Joe's Pizza"

# Add multiple locations at once
GEOADD restaurants \
  -73.9851 40.7488 "Shake Shack" \
  -73.9844 40.7476 "Whole Foods Market" \
  -73.9901 40.7505 "Starbucks 8th Ave"
# (integer) 3
```

## Coordinate Precision and Valid Ranges

Redis stores coordinates with approximately 0.6m precision. Valid ranges are:

- Longitude: -180 to 180 degrees
- Latitude: -85.05112878 to 85.05112878 degrees (close to but not exactly the poles)

```bash
# This will error - latitude out of range
GEOADD locations 0 90 "north-pole"
# ERR invalid longitude,latitude pair
```

## Using NX and XX Options

```bash
# Only add if member does not exist
GEOADD restaurants NX -73.9857 40.7484 "Joe's Pizza"
# (integer) 0 - already exists, not updated

# Only update existing members
GEOADD restaurants XX -73.9860 40.7490 "Joe's Pizza"
# (integer) 0 with CH, returns 1 (updated)

# Use CH to count updates as well as additions
GEOADD restaurants CH XX -73.9860 40.7490 "Joe's Pizza"
# (integer) 1
```

## Real-World Example: Ride-Sharing Driver Tracking

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def update_driver_location(driver_id: str, lon: float, lat: float):
    """Update driver position in the geospatial index."""
    added = r.geoadd("active-drivers", [lon, lat, driver_id])
    return added

def register_drivers():
    drivers = [
        ("driver:101", -73.9857, 40.7484),
        ("driver:102", -74.0059, 40.7128),
        ("driver:103", -73.9712, 40.7614),
        ("driver:104", -73.9442, 40.6782),
    ]
    for driver_id, lon, lat in drivers:
        update_driver_location(driver_id, lon, lat)
    print(f"Registered {len(drivers)} drivers")

register_drivers()

# Update position as driver moves
update_driver_location("driver:101", -73.9870, 40.7490)
```

## Verifying Stored Coordinates

After adding members, use `GEOPOS` to verify the stored coordinates:

```bash
GEOPOS restaurants "Joe's Pizza"
# 1) 1) "-73.98569911718368530"
#    2) "40.74840001032424405"
```

Note that the returned coordinates may differ slightly from what was stored due to Geohash encoding precision.

## Checking the Underlying Sorted Set

Since geospatial data is stored as a sorted set, you can use `ZCARD` to count members:

```bash
ZCARD restaurants
# (integer) 4
```

You can also use `ZRANGE` to see raw scores (Geohash values), though these are not human-readable.

## Bulk Loading with Pipeline

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

locations = [
    (-73.9701, 40.7589, "Times Square"),
    (-73.9857, 40.7484, "Madison Square Garden"),
    (-74.0445, 40.6892, "Statue of Liberty"),
    (-73.9965, 40.7306, "Washington Square Park"),
    (-73.9494, 40.6501, "Coney Island"),
]

# Use pipeline for bulk insertion
with r.pipeline() as pipe:
    for lon, lat, name in locations:
        pipe.geoadd("nyc-landmarks", [lon, lat, name])
    results = pipe.execute()

print(f"Loaded {sum(results)} new landmarks")
```

## Summary

`GEOADD` stores longitude/latitude pairs in a Redis sorted set using Geohash encoding, enabling fast geospatial queries without a dedicated spatial database. It supports bulk inserts, conditional updates with `NX`/`XX`, and integrates with `GEOSEARCH`, `GEODIST`, and `GEOPOS` for building location-aware features. The coordinate precision of approximately 0.6m makes it suitable for most real-world use cases including ride-sharing, store finders, and asset tracking.
