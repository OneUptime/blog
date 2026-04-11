# How to Use GEOPOS in Redis to Get Coordinates of Members

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geo, GEOPOS, Geospatial, Location

Description: Learn how to use GEOPOS to retrieve the stored longitude and latitude coordinates of one or more members from a Redis geospatial index.

---

After storing locations with `GEOADD`, you can retrieve their coordinates with `GEOPOS`. This is useful for displaying location data, verifying stored coordinates, or passing them to other calculations.

## How GEOPOS Works

`GEOPOS` decodes the Geohash stored in the sorted set back into longitude/latitude pairs. Due to Geohash's fixed precision, the returned values may differ slightly from what was stored (by up to approximately 0.6 meters), but this is negligible for most practical use.

## Syntax

```redis
GEOPOS key member [member ...]
```

- `key` - sorted set with geo data
- `member` - one or more member names

Returns an array with one entry per requested member. Non-existent members return `nil`.

## Setup

```redis
GEOADD landmarks -73.9857 40.7484 "empire-state-building"
GEOADD landmarks -73.9654 40.7829 "central-park"
GEOADD landmarks -74.0445 40.6892 "statue-of-liberty"
```

## Examples

### Get Coordinates of One Member

```redis
GEOPOS landmarks empire-state-building
```

Output:

```text
1) 1) "-73.98570060729980469"
   2) "40.74840144948154994"
```

### Get Coordinates of Multiple Members

```redis
GEOPOS landmarks empire-state-building central-park statue-of-liberty
```

Output:

```text
1) 1) "-73.98570060729980469"
   2) "40.74840144948154994"
2) 1) "-73.96540045738220215"
   2) "40.78290545119667676"
3) 1) "-74.04450118541717529"
   2) "40.68920005488233543"
```

### Handling Non-Existent Members

```redis
GEOPOS landmarks empire-state-building nonexistent-place central-park
```

Output:

```text
1) 1) "-73.98570060729980469"
   2) "40.74840144948154994"
2) (nil)
3) 1) "-73.96540045738220215"
   2) "40.78290545119667676"
```

Non-existent members return `nil` - the response array always has one element per requested member.

## Precision Note

Geohash encoding introduces minor floating-point imprecision:

```redis
# Stored: -73.9857 40.7484
# Retrieved: -73.98570060729980469, 40.74840144948154994
```

The difference is less than 0.6 meters - safe for most real-world use cases.

## Use Cases

- **Display pins on a map** - retrieve coordinates to render markers in a front-end mapping library
- **Coordinate verification** - confirm what coordinates are actually stored for a member
- **Integration with external services** - pass stored coordinates to a routing or geocoding API
- **Data export** - export geo index contents with their coordinates

## Summary

`GEOPOS` is the straightforward retrieval command for Redis geospatial data. It accepts multiple member names in a single call and returns `nil` for missing entries, making it safe to use without pre-checking existence. The slight Geohash rounding is inherent to Redis geo storage and is negligible for all practical location-based applications.
