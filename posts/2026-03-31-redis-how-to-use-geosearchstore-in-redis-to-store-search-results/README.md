# How to Use GEOSEARCHSTORE in Redis to Store Search Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, GEOSEARCHSTORE, Caching, Location

Description: Learn how to use GEOSEARCHSTORE to save Redis geospatial search results into a new key for caching, paging, or further processing without re-running the query.

---

## What Is GEOSEARCHSTORE?

`GEOSEARCHSTORE` works exactly like `GEOSEARCH` but stores the results into a destination key instead of returning them to the client. This is useful for caching frequently-run geo queries, creating precomputed sorted sets for pagination, or feeding results into further Redis operations.

## Syntax

```text
GEOSEARCHSTORE destination source FROMMEMBER member | FROMLONLAT longitude latitude
                BYRADIUS radius m|km|ft|mi | BYBOX width height m|km|ft|mi
                [ASC | DESC]
                [COUNT count [ANY]]
                [STOREDIST]
```

- `destination` - key where results will be stored (as a sorted set)
- `source` - the source geospatial index to query
- `STOREDIST` - store distance as the score instead of the Geohash

Returns the number of elements stored in the destination key.

## Basic Usage

```bash
# Seed a geospatial index
GEOADD restaurants \
  -73.9857 40.7484 "Joe's Pizza" \
  -73.9851 40.7488 "Shake Shack" \
  -74.0059 40.7128 "Far Away Diner"

# Store restaurants within 1km of a point into a new key
GEOSEARCHSTORE nearby:restaurants:cache \
  restaurants \
  FROMLONLAT -73.9855 40.7490 \
  BYRADIUS 1 km \
  ASC \
  COUNT 20
# (integer) 2
```

## Reading the Stored Results

The destination key is a standard sorted set. You can read it with `ZRANGE`:

```bash
# Read all stored results (scores are Geohash integers, not human-readable)
ZRANGE nearby:restaurants:cache 0 -1 WITHSCORES
```

To get human-readable distances, use `STOREDIST`:

```bash
GEOSEARCHSTORE nearby:restaurants:dist \
  restaurants \
  FROMLONLAT -73.9855 40.7490 \
  BYRADIUS 1 km \
  ASC \
  STOREDIST

# Now ZRANGE returns distances as scores
ZRANGE nearby:restaurants:dist 0 -1 WITHSCORES
```

```text
1) "Shake Shack"
2) "0.025431"
3) "Joe's Pizza"
4) "0.087209"
```

## Caching Geo Query Results

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_nearby_restaurants(lon: float, lat: float, radius_km: float = 2) -> list:
    """Return nearby restaurants, using a cached sorted set."""
    cache_key = f"geo:cache:{lon:.4f}:{lat:.4f}:{radius_km}"

    # Check if cache exists
    if r.exists(cache_key):
        # Read from cached sorted set (with STOREDIST scores)
        results = r.zrange(cache_key, 0, -1, withscores=True)
        return [{"name": name, "distance_km": round(score, 3)} for name, score in results]

    # Run fresh geo search and store results
    count = r.geosearchstore(
        cache_key,
        "restaurants",
        longitude=lon,
        latitude=lat,
        radius=radius_km,
        unit="km",
        sort="ASC",
        count=50,
        storedist=True
    )

    # Set TTL on cache (expire after 5 minutes)
    r.expire(cache_key, 300)

    # Read and return
    results = r.zrange(cache_key, 0, -1, withscores=True)
    return [{"name": name, "distance_km": round(score, 3)} for name, score in results]

restaurants = get_nearby_restaurants(-73.9855, 40.7490, radius_km=1)
for r_item in restaurants:
    print(f"{r_item['name']}: {r_item['distance_km']} km")
```

## Pagination with GEOSEARCHSTORE

Since the results are stored in a sorted set, you can paginate without re-running the geo query:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def paginate_results(cache_key: str, page: int = 0, page_size: int = 10) -> list:
    """Paginate through stored geo search results."""
    start = page * page_size
    stop = start + page_size - 1
    results = r.zrange(cache_key, start, stop, withscores=True)
    return [{"name": name, "distance_km": round(score, 3)} for name, score in results]

# Store results once
r.geosearchstore(
    "nearby:page-cache",
    "restaurants",
    longitude=-73.9855,
    latitude=40.7490,
    radius=10,
    unit="km",
    sort="ASC",
    storedist=True
)
r.expire("nearby:page-cache", 600)

# Paginate through results
page_0 = paginate_results("nearby:page-cache", page=0, page_size=5)
page_1 = paginate_results("nearby:page-cache", page=1, page_size=5)
```

## GEOSEARCHSTORE vs GEOSEARCH

| Feature | GEOSEARCH | GEOSEARCHSTORE |
|---------|-----------|----------------|
| Output | Returns to client | Stores in a key |
| Caching | No | Yes (with TTL) |
| Pagination | Requires re-query | ZRANGE on stored key |
| STOREDIST | N/A | Stores distances as scores |

## Summary

`GEOSEARCHSTORE` runs a geospatial search and saves the results into a sorted set key, enabling caching of expensive geo queries, efficient pagination without re-running searches, and pipeline-style chaining of geo results into further Redis operations. Use `STOREDIST` to store human-readable distances as sorted set scores. Always set a `TTL` on the destination key to prevent stale cached results from accumulating.
