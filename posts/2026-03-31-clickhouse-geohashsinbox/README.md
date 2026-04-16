# How to Use geohashesInBox() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Geohash, Analytics, Location

Description: Learn how geohashesInBox() returns all geohash cells covering a bounding box in ClickHouse, enabling efficient spatial coverage queries and tile-based analytics.

---

`geohashesInBox(lon_min, lat_min, lon_max, lat_max, precision)` returns an `Array(String)` containing all geohash cells at the given precision level that overlap with the specified bounding box. It is the standard way to enumerate spatial tiles for a region in ClickHouse. The result can be used with `arrayJoin()` or `IN` to filter rows, drive map tile generation, or check spatial coverage. Precision ranges from 1 to 12; higher precision means smaller cells and potentially large result arrays.

## Basic Usage

```sql
-- Get all geohash-6 cells covering a small bounding box around San Francisco
SELECT geohashesInBox(
    -122.52, 37.70,   -- min lon, min lat (SW corner)
    -122.35, 37.82,   -- max lon, max lat (NE corner)
    6                 -- precision
) AS cells;
```

```text
cells
['9q8yy9','9q8yyu','9q8yym','9q8yyj',...] (dozens of cells)
```

```sql
-- Count how many cells cover the area
SELECT length(geohashesInBox(
    -122.52, 37.70,
    -122.35, 37.82,
    6
)) AS cell_count;
```

```text
cell_count
42
```

## Exploding Cells with arrayJoin()

Use `arrayJoin()` to turn the array into individual rows for filtering or joining.

```sql
-- Expand the bounding-box cells into rows
SELECT arrayJoin(geohashesInBox(
    -122.52, 37.70,
    -122.35, 37.82,
    6
)) AS cell;
```

## Spatial Proximity Query Using geohashesInBox()

This is the primary pattern: enumerate cells covering a radius, then filter the event table by those cells.

```sql
-- Events within a bounding box around San Francisco (using geohash-6 cells ~1.2 x 0.6 km)
WITH geohashesInBox(
    -122.52, 37.68,
    -122.35, 37.87,
    6
) AS region_cells
SELECT
    event_id,
    longitude,
    latitude,
    geohashEncode(longitude, latitude, 6) AS cell
FROM location_events
WHERE geohashEncode(longitude, latitude, 6) IN region_cells
  AND event_time >= today()
LIMIT 20;
```

## Tile Inventory for Map Rendering

```sql
-- List all geohash-7 tiles for a city bounding box with event counts
SELECT
    cell,
    geohashDecode(cell).1 AS center_lon,
    geohashDecode(cell).2 AS center_lat,
    coalesce(event_count, 0) AS event_count
FROM (
    SELECT arrayJoin(geohashesInBox(
        -74.05, 40.68,
        -73.90, 40.85,
        7
    )) AS cell
)
LEFT JOIN (
    SELECT geohashEncode(longitude, latitude, 7) AS cell, count() AS event_count
    FROM location_events
    WHERE event_time >= today()
    GROUP BY cell
) USING (cell)
ORDER BY event_count DESC;
```

## Coverage Analysis: Are All Expected Tiles Present?

```sql
-- Which expected geohash-6 tiles have zero events today?
WITH geohashesInBox(-74.05, 40.68, -73.90, 40.85, 6) AS expected_cells
SELECT
    cell,
    coalesce(cnt, 0) AS event_count,
    coalesce(cnt, 0) = 0 AS no_coverage
FROM (SELECT arrayJoin(expected_cells) AS cell)
LEFT JOIN (
    SELECT geohashEncode(longitude, latitude, 6) AS cell, count() AS cnt
    FROM location_events
    WHERE event_time >= today()
    GROUP BY cell
) USING (cell)
ORDER BY no_coverage DESC, cell;
```

## Choosing the Right Precision

```sql
-- See cell dimensions and count at each precision for a fixed bounding box
SELECT
    precision,
    length(geohashesInBox(-74.05, 40.68, -73.90, 40.85, precision)) AS cell_count
FROM (
    SELECT arrayJoin([3, 4, 5, 6, 7, 8]) AS precision
)
ORDER BY precision;
```

```text
precision  cell_count
3          1
4          6
5          30
6          182
7          1300
8          9100
```

## Geofence Coverage Check

```sql
-- Verify that every geohash-6 tile in a service zone has at least one driver
WITH geohashesInBox(-122.45, 37.75, -122.40, 37.80, 6) AS zone_cells
SELECT
    arrayFilter(c ->
        NOT has(
            groupArray(geohashEncode(driver_lon, driver_lat, 6)),
            c
        ),
        zone_cells
    ) AS uncovered_cells
FROM available_drivers
WHERE last_ping > now() - INTERVAL 5 MINUTE
HAVING length(uncovered_cells) > 0;
```

## Combining with geohashesInBox() for Multi-Region Queries

```sql
-- Events from either of two regions
WITH
    geohashesInBox(-122.52, 37.70, -122.35, 37.82, 6) AS sf_cells,
    geohashesInBox(-118.30, 34.00, -118.15, 34.10, 6) AS la_cells
SELECT
    geohashEncode(longitude, latitude, 6) AS cell,
    count() AS events
FROM location_events
WHERE geohashEncode(longitude, latitude, 6) IN arrayConcat(sf_cells, la_cells)
  AND event_time >= today() - 7
GROUP BY cell
ORDER BY events DESC
LIMIT 20;
```

## Summary

`geohashesInBox(lon_min, lat_min, lon_max, lat_max, precision)` returns an array of all geohash cells at the specified precision that intersect a bounding box. Use `arrayJoin()` to expand cells into rows, or pass the array to an `IN` clause for spatial filtering. This function is the foundation of tile-based analytics, map rendering queries, proximity search via cell enumeration, and service coverage checks. Keep precision at 6 or below for region-scale queries to avoid arrays with thousands of cells.
