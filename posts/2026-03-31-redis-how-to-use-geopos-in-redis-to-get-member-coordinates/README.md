# How to Use GEOPOS in Redis to Get Member Coordinates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, GEOPOS, Location, Coordinates

Description: Learn how to use GEOPOS to retrieve the stored longitude and latitude coordinates of geospatial members from a Redis geospatial index.

---

## What Is GEOPOS?

After storing geospatial members with `GEOADD`, `GEOPOS` lets you retrieve their stored longitude and latitude. Because Redis encodes coordinates as a Geohash, the returned values may differ very slightly from what was originally stored - but the precision is typically within 0.6 meters, which is negligible for almost all applications.

## Syntax

```text
GEOPOS key member [member ...]
```

- `key` - the geospatial index key
- `member [member ...]` - one or more member names

Returns an array of [longitude, latitude] pairs. If a member does not exist, its entry in the result array is `nil`.

## Basic Usage

```bash
# Add some locations
GEOADD stations \
  -0.1276 51.5074 "London Waterloo" \
  -0.0755 51.5040 "London Bridge" \
  2.3522 48.8566 "Paris Nord"

# Get coordinates for one member
GEOPOS stations "London Waterloo"
```

```text
1) 1) "-0.12760013341903687"
   2) "51.50739830401801"
```

## Getting Multiple Members

```bash
GEOPOS stations "London Waterloo" "London Bridge" "Paris Nord"
```

```text
1) 1) "-0.12760013341903687"
   2) "51.50739830401801"
2) 1) "-0.07550060749053955"
   2) "51.50399821093163"
3) 1) "2.35219955444335938"
   2) "48.85660013436531"
```

## Non-Existent Members Return nil

```bash
GEOPOS stations "London Waterloo" "Edinburgh Waverley"
```

```text
1) 1) "-0.12760013341903687"
   2) "51.50739830401801"
2) (nil)
```

This allows you to safely check a batch of members and handle missing ones gracefully.

## Using GEOPOS in Application Code

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_member_location(key: str, member: str):
    """Get coordinates for a single member, return None if not found."""
    positions = r.geopos(key, member)
    if positions and positions[0] is not None:
        lon, lat = positions[0]
        return {"longitude": float(lon), "latitude": float(lat)}
    return None

def get_all_locations(key: str, members: list):
    """Get coordinates for multiple members."""
    positions = r.geopos(key, *members)
    result = {}
    for member, pos in zip(members, positions):
        if pos is not None:
            result[member] = {"longitude": float(pos[0]), "latitude": float(pos[1])}
        else:
            result[member] = None
    return result

locations = get_all_locations("stations", ["London Waterloo", "London Bridge", "Unknown Station"])
for name, coords in locations.items():
    print(f"{name}: {coords}")
```

## Combining GEOPOS with Other Geo Commands

`GEOPOS` is often used alongside other geo commands:

```bash
# Get distance between two members
GEODIST stations "London Waterloo" "London Bridge" km
# "3.6414"

# Get coordinates of a member before computing a custom bounding box
GEOPOS stations "London Waterloo"
```

### Example: Building a Location API Response

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_station_details(station_name: str) -> dict:
    """Return full station info including coordinates and nearby stations."""
    pos = r.geopos("stations", station_name)

    if not pos or pos[0] is None:
        return {"error": f"Station '{station_name}' not found"}

    lon, lat = map(float, pos[0])

    # Find nearby stations within 5km
    nearby = r.geosearch(
        "stations",
        longitude=lon,
        latitude=lat,
        radius=5,
        unit="km",
        withcoord=True,
        withdist=True,
        sort="ASC",
        count=5
    )

    return {
        "name": station_name,
        "longitude": lon,
        "latitude": lat,
        "nearby_stations": [
            {"name": n[0], "distance_km": n[1]}
            for n in nearby
            if n[0] != station_name
        ]
    }

print(get_station_details("London Waterloo"))
```

## Precision Note

Redis stores coordinates internally as a 52-bit Geohash integer. When you retrieve them with `GEOPOS`, there is a small rounding error in the least significant decimal digits. For example:

- Input: `-0.1276, 51.5074`
- Stored: `-0.12760013341903687, 51.50739830401801`

This error is at most about 0.6 meters and is acceptable for all practical geospatial use cases.

## Summary

`GEOPOS` retrieves the stored longitude and latitude of one or more members from a Redis geospatial index. It handles missing members gracefully by returning `nil` for those entries, making it safe for batch lookups. The returned coordinates may differ very slightly from the input due to Geohash encoding, but the precision (within 0.6 meters) is sufficient for real-world applications including navigation, store finders, and location tracking.
