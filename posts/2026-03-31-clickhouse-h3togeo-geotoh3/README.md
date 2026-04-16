# How to Use h3ToGeo() and geoToH3() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, H3, Analytics, Location

Description: Learn how h3ToGeo() and geoToH3() convert between geographic coordinates and Uber's H3 hexagonal grid indexes in ClickHouse for scalable spatial analytics.

---

Uber's H3 library divides the globe into a hierarchy of hexagonal cells. Each cell is identified by a 64-bit integer index. ClickHouse provides native H3 functions: `geoToH3(lat, lon, resolution)` encodes a (latitude, longitude) pair into an H3 index at the given resolution (0 = coarsest, 15 = finest), and `h3ToGeo(index)` decodes an H3 index back to its center (latitude, longitude) as a tuple. Hexagonal grids have uniform adjacency (every hexagon has exactly six neighbors of equal distance), making H3 superior to geohash for analytics that require consistent neighbor relationships.

Note: ClickHouse v25.5 changed `geoToH3()` argument order from `(lon, lat)` to `(lat, lon)`, and v25.1 changed `h3ToGeo()` return order from `(lon, lat)` to `(lat, lon)`. The examples below use the current `(lat, lon)` convention. Legacy behavior can be restored per query via `geotoh3_argument_order = 'lon_lat'` and `h3togeo_lon_lat_result_order = 1`.

## Basic Usage

```sql
-- Encode San Francisco to H3 at resolution 9 (~174 m hexagons)
SELECT geoToH3(37.7749, -122.4194, 9) AS h3_index;
```

```text
h3_index
617700169958293503
```

```sql
-- Decode back to center coordinates
SELECT
    h3ToGeo(617700169958293503).1 AS center_lat,
    h3ToGeo(617700169958293503).2 AS center_lon;
```

```text
center_lat      center_lon
37.7748         -122.4195
```

## Argument Order: Latitude First

As of ClickHouse v25.5, `geoToH3()` takes `(latitude, longitude)`, matching the H3 reference library. This differs from ClickHouse geo functions like `geohashEncode()` which still take `(longitude, latitude)` — double-check argument order when porting queries.

```sql
-- Encode several cities at resolution 5 (~8 km edge, ~253 km² area)
SELECT
    city,
    geoToH3(lat, lon, 5) AS h3_r5
FROM (
    SELECT 'New York'   AS city, 40.7128 AS lat,  -74.0060 AS lon
    UNION ALL SELECT 'London',   51.5074,  -0.1276
    UNION ALL SELECT 'Tokyo',    35.6895, 139.6917
    UNION ALL SELECT 'Sydney',  -33.8688, 151.2093
);
```

## H3 Resolution Reference

```sql
-- Approximate cell edge lengths for each resolution
SELECT
    resolution,
    round(h3EdgeLengthM(resolution), 0) AS edge_length_m
FROM (SELECT arrayJoin(range(16)) AS resolution)
ORDER BY resolution;
```

```text
resolution  edge_length_m
0           1107712
1           418676
...
7           1220
8           461
9           174
10          66
11          25
12          9
```

## Grouping Events by H3 Cell

```sql
-- Aggregate events by H3 resolution-9 cell (neighborhood level)
SELECT
    geoToH3(latitude, longitude, 9)  AS h3_cell,
    count()                           AS event_count,
    uniq(user_id)                     AS unique_users,
    avg(duration_ms)                  AS avg_duration_ms
FROM location_events
WHERE event_time >= today() - 7
GROUP BY h3_cell
ORDER BY event_count DESC
LIMIT 20;
```

## Storing H3 as a Materialized Column

```sql
CREATE TABLE events_h3 (
    event_id    UUID DEFAULT generateUUIDv4(),
    event_time  DateTime,
    longitude   Float64,
    latitude    Float64,
    h3_r7       UInt64 MATERIALIZED geoToH3(latitude, longitude, 7),
    h3_r9       UInt64 MATERIALIZED geoToH3(latitude, longitude, 9)
) ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (h3_r7, event_time);
```

Ordering by `h3_r7` clusters spatially adjacent rows, improving compression and range scan performance.

## Decoding H3 Indexes for Map Export

```sql
-- Export cell centers for GeoJSON rendering
SELECT
    h3_cell,
    h3ToGeo(h3_cell).1 AS center_lat,
    h3ToGeo(h3_cell).2 AS center_lon,
    event_count
FROM (
    SELECT
        geoToH3(latitude, longitude, 8) AS h3_cell,
        count() AS event_count
    FROM location_events
    WHERE event_time >= today()
    GROUP BY h3_cell
)
ORDER BY event_count DESC
LIMIT 100;
```

## Multi-Resolution Hierarchy: Coarsen an H3 Cell

H3 supports exact parent-cell relationships. Use `h3ToParent()` to navigate up the hierarchy.

```sql
-- Show H3 parent cells at coarser resolutions
SELECT
    fine_cell,
    h3ToParent(fine_cell, 7) AS parent_r7,
    h3ToParent(fine_cell, 5) AS parent_r5,
    h3ToParent(fine_cell, 3) AS parent_r3
FROM (
    SELECT geoToH3(37.7749, -122.4194, 9) AS fine_cell
);
```

## Spatial Join: Assign Region to Each Event

```sql
-- Assign each event to a named region using H3 at resolution 5
CREATE TABLE regions_h3 (
    h3_cell  UInt64,
    region   String
) ENGINE = MergeTree ORDER BY h3_cell;

INSERT INTO regions_h3 VALUES
    (599686042433355775, 'bay-area'),
    (599686029922516991, 'la-metro'),
    (595539108797857791, 'new-york');

SELECT
    e.event_id,
    e.event_time,
    coalesce(r.region, 'unknown') AS region
FROM location_events e
LEFT JOIN regions_h3 r
    ON geoToH3(e.latitude, e.longitude, 5) = r.h3_cell
WHERE e.event_time >= today()
LIMIT 20;
```

## Coverage Comparison: geoToH3() vs geohashEncode()

```sql
-- Compare two spatial index schemes for the same dataset
SELECT
    'H3-9'  AS scheme,
    uniq(geoToH3(latitude, longitude, 9))           AS unique_cells,
    count() / uniq(geoToH3(latitude, longitude, 9)) AS avg_events_per_cell
FROM location_events
WHERE event_time >= today() - 7

UNION ALL

SELECT
    'Geohash-6',
    uniq(geohashEncode(longitude, latitude, 6)),
    count() / uniq(geohashEncode(longitude, latitude, 6))
FROM location_events
WHERE event_time >= today() - 7;
```

## Summary

`geoToH3(lat, lon, resolution)` encodes a geographic coordinate into an H3 hexagonal grid index, and `h3ToGeo(index)` decodes an index back to its cell center as `(lat, lon)`. Store H3 indexes as `UInt64` materialized columns ordered in the sort key to cluster spatially adjacent rows. Use resolution 7-9 for neighborhood-level analytics (~1 km to ~200 m cells). H3's uniform hexagonal adjacency makes it superior to geohash for neighbor-based analytics, and the exact parent-child hierarchy via `h3ToParent()` enables clean multi-resolution aggregation.
