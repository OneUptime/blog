# How to Build Geospatial Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Analytics, H3, Location

Description: Learn how to build a complete geospatial analytics pipeline in ClickHouse combining distance functions, polygon containment, geohash, and H3 indexing for production workloads.

---

ClickHouse includes a rich geospatial function library covering distance calculations, polygon containment tests, geohash encoding, and Uber H3 hexagonal indexing. Combining these functions with ClickHouse's columnar storage, materialized columns, and partition pruning produces a high-throughput analytics stack capable of processing billions of location events. This guide demonstrates end-to-end patterns: schema design, spatial indexing, proximity queries, zone aggregation, and heatmap generation.

## Production Schema Design

```sql
CREATE TABLE location_events (
    event_id     UUID     DEFAULT generateUUIDv4(),
    event_time   DateTime,
    user_id      UUID,
    longitude    Float64,
    latitude     Float64,
    event_type   LowCardinality(String),
    device_type  LowCardinality(String),
    -- Precomputed spatial indexes
    geohash6     String  MATERIALIZED geohashEncode(longitude, latitude, 6),
    geohash8     String  MATERIALIZED geohashEncode(longitude, latitude, 8),
    h3_r7        UInt64  MATERIALIZED geoToH3(latitude, longitude, 7),
    h3_r9        UInt64  MATERIALIZED geoToH3(latitude, longitude, 9),
    -- Skip index for UUID point lookups
    INDEX idx_user_id user_id TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (h3_r7, event_time, user_id);
```

Ordering by `h3_r7` groups spatially nearby rows in contiguous blocks, improving compression by 30-50% and speeding up spatial aggregations.

## Inserting Data

```sql
-- Bulk insert with automatic spatial index computation
INSERT INTO location_events (event_time, user_id, longitude, latitude, event_type, device_type)
SELECT
    now() - toIntervalSecond(rand() % 86400) AS event_time,
    generateUUIDv4()                          AS user_id,
    -- Random coordinates around NYC
    -74.0060 + (rand() % 1000 - 500) / 10000.0 AS longitude,
    40.7128  + (rand() % 1000 - 500) / 10000.0 AS latitude,
    ['click','view','purchase','scroll'][rand() % 4 + 1] AS event_type,
    ['mobile','desktop','tablet'][rand() % 3 + 1] AS device_type
FROM numbers(1000000);
```

## Pattern 1: Proximity Search (Distance-Based)

```sql
-- Find all events within 500 m of a specific location (Empire State Building)
SELECT
    event_id,
    longitude,
    latitude,
    round(greatCircleDistance(longitude, latitude, -73.9857, 40.7484), 0) AS distance_m,
    event_type
FROM location_events
WHERE
    -- Bounding box pre-filter (~0.01 degree ~ 1 km)
    longitude BETWEEN -73.9957 AND -73.9757
    AND latitude  BETWEEN 40.7384 AND 40.7584
    -- Exact distance filter
    AND greatCircleDistance(longitude, latitude, -73.9857, 40.7484) <= 500
    AND event_time >= today() - 7
ORDER BY distance_m
LIMIT 20;
```

## Pattern 2: Polygon Geo-Fence Filtering

```sql
-- Events within Manhattan (simplified polygon)
SELECT
    count()         AS events,
    uniq(user_id)   AS unique_users,
    event_type
FROM location_events
WHERE
    pointInPolygon(
        (longitude, latitude),
        [
            (-74.0479, 40.6829),
            (-73.9067, 40.6829),
            (-73.9067, 40.8820),
            (-74.0479, 40.8820)
        ]
    )
    AND event_time >= today() - 30
GROUP BY event_type
ORDER BY events DESC;
```

## Pattern 3: H3 Tile Aggregation (Heatmap)

```sql
-- Build a heatmap at H3 resolution 9 for the last 24 hours
SELECT
    h3_r9                         AS h3_cell,
    h3ToGeo(h3_r9).1             AS center_lat,
    h3ToGeo(h3_r9).2             AS center_lon,
    count()                       AS events,
    uniq(user_id)                 AS unique_users,
    countIf(event_type = 'purchase') AS purchases
FROM location_events
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY h3_cell
ORDER BY events DESC
LIMIT 200;
```

## Pattern 4: Geohash-Based Spatial Join

```sql
-- Join events with a venue table using shared geohash prefix
SELECT
    e.event_id,
    v.venue_name,
    v.category,
    greatCircleDistance(e.longitude, e.latitude, v.longitude, v.latitude) AS dist_m
FROM location_events e
JOIN venues v ON e.geohash8 = geohashEncode(v.longitude, v.latitude, 8)
WHERE
    e.event_time >= today()
    AND dist_m <= 200
ORDER BY dist_m
LIMIT 20;
```

## Pattern 5: Multi-Resolution Aggregation

Aggregate at multiple resolutions in a single pass using materialized H3 columns.

```sql
-- Summarize traffic at city, district, and neighborhood levels
SELECT 'city (r5)'         AS level, geoToH3(latitude, longitude, 5) AS cell, count() AS events FROM location_events WHERE event_time >= today() - 7 GROUP BY cell
UNION ALL
SELECT 'district (r7)',   h3_r7, count() FROM location_events WHERE event_time >= today() - 7 GROUP BY h3_r7
UNION ALL
SELECT 'neighborhood (r9)', h3_r9, count() FROM location_events WHERE event_time >= today() - 7 GROUP BY h3_r9;
```

## Pattern 6: Movement Corridor Analysis

```sql
-- For each user, find the most common origin-destination H3 pair
-- by pairing each checkout event with the user's next checkout event.
SELECT
    user_id,
    origin_cell,
    dest_cell,
    count() AS trip_count
FROM (
    SELECT
        user_id,
        h3_r7 AS origin_cell,
        leadInFrame(h3_r7, 1, 0) OVER (
            PARTITION BY user_id
            ORDER BY event_time
            ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
        ) AS dest_cell
    FROM location_events
    WHERE event_type = 'checkout'
      AND event_time >= today() - 30
)
WHERE dest_cell != 0
  AND origin_cell != dest_cell
GROUP BY user_id, origin_cell, dest_cell
ORDER BY trip_count DESC
LIMIT 20;
```

## Pattern 7: Service Coverage Audit

```sql
-- Which H3-7 cells in the service area have no drivers available?
WITH
    -- All cells in the service bounding box
    service_cells AS (
        SELECT arrayJoin(geohashesInBox(-74.05, 40.68, -73.90, 40.85, 6)) AS gh_cell
    ),
    -- Cells with active drivers in the last 5 minutes
    covered AS (
        SELECT DISTINCT geohash6 AS gh_cell
        FROM location_events
        WHERE
            event_time > now() - INTERVAL 5 MINUTE
            AND event_type = 'driver_ping'
    )
SELECT
    s.gh_cell,
    geohashDecode(s.gh_cell).1 AS lon,
    geohashDecode(s.gh_cell).2 AS lat,
    c.gh_cell IS NULL           AS uncovered
FROM service_cells s
LEFT JOIN covered c USING (gh_cell)
ORDER BY uncovered DESC;
```

## Pattern 8: IP Geolocation + Spatial Analysis

```sql
-- Combine IP geolocation with H3 spatial indexing for web traffic analysis
SELECT
    geoToH3(g.latitude, g.longitude, 5)  AS region_cell,
    h3ToGeo(geoToH3(g.latitude, g.longitude, 5)).1 AS region_lat,
    h3ToGeo(geoToH3(g.latitude, g.longitude, 5)).2 AS region_lon,
    g.country_code,
    count()                              AS sessions,
    uniq(w.session_id)                   AS unique_sessions
FROM web_sessions w
LEFT JOIN geoip_ranges g
    ON toUInt32(toIPv4OrZero(w.client_ip)) BETWEEN g.ip_start AND g.ip_end
WHERE w.session_date >= today() - 7
  AND g.longitude IS NOT NULL
GROUP BY region_cell, region_lat, region_lon, g.country_code
ORDER BY sessions DESC
LIMIT 50;
```

## Performance Checklist

```sql
-- Verify sort key alignment for spatial queries
SELECT
    table,
    sorting_key
FROM system.tables
WHERE name = 'location_events';

-- Check partition pruning is working
EXPLAIN SELECT count() FROM location_events
WHERE event_time >= today() - 7
  AND h3_r7 = geoToH3(40.7484, -73.9857, 7);

-- Monitor granule reads for a spatial query
SELECT
    query,
    read_rows,
    read_bytes,
    query_duration_ms
FROM system.query_log
WHERE query LIKE '%location_events%'
  AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 5;
```

## Summary

Building geospatial analytics in ClickHouse requires combining the right functions with schema choices that exploit columnar ordering. Store longitude and latitude as `Float64`, precompute spatial indexes (geohash6, geohash8, h3_r7, h3_r9) as materialized columns, and include the primary spatial tile in the ORDER BY key to cluster nearby rows. For proximity queries, apply a bounding-box pre-filter before calling `greatCircleDistance()`. Use `pointInPolygon()` for geo-fence filtering, H3 aggregations for heatmaps and coverage audits, and geohash prefixes for fast approximate spatial joins. This combination scales to billions of events while maintaining sub-second query latency.
