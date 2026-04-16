# How to Use h3GetResolution() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, H3, Analytics, Query

Description: Learn how h3GetResolution() extracts the resolution level from an H3 index in ClickHouse, enabling validation, multi-resolution routing, and data quality checks.

---

`h3GetResolution(index)` returns the resolution level (an integer from 0 to 15) encoded in a given H3 index. This is useful when you receive H3 indexes from external systems at unknown or mixed resolutions, need to validate that stored indexes match an expected resolution, or want to route rows to different aggregation pipelines based on their resolution. The function accepts a `UInt64` H3 index and returns a `UInt8`.

Note: ClickHouse v25.5 changed `geoToH3()` argument order from `(lon, lat)` to `(lat, lon)`, and v25.1 changed `h3ToGeo()` return order from `(lon, lat)` to `(lat, lon)`. The examples below use the current `(lat, lon)` convention. Legacy behavior can be restored per query via `geotoh3_argument_order = 'lon_lat'` and `h3togeo_lon_lat_result_order = 1`.

## Basic Usage

```sql
-- Encode at different resolutions and verify with h3GetResolution
SELECT
    geoToH3(37.7749, -122.4194, 5) AS h3_r5,
    geoToH3(37.7749, -122.4194, 9) AS h3_r9,
    h3GetResolution(geoToH3(37.7749, -122.4194, 5)) AS res_5,
    h3GetResolution(geoToH3(37.7749, -122.4194, 9)) AS res_9;
```

```text
h3_r5                h3_r9                res_5  res_9
599686042433355775   617700169958293503   5      9
```

## Validating H3 Indexes in a Mixed-Resolution Table

```sql
-- Check that all H3 indexes in a table are at the expected resolution (9)
SELECT
    count()                                    AS total_rows,
    countIf(h3GetResolution(h3_index) = 9)     AS valid_r9,
    countIf(h3GetResolution(h3_index) != 9)    AS wrong_resolution,
    groupUniqArray(h3GetResolution(h3_index))  AS found_resolutions
FROM location_events_h3;
```

## Routing Mixed-Resolution Events

```sql
-- Process events differently based on their H3 resolution
SELECT
    h3_index,
    h3GetResolution(h3_index) AS resolution,
    CASE h3GetResolution(h3_index)
        WHEN 5 THEN 'city-level'
        WHEN 7 THEN 'district-level'
        WHEN 9 THEN 'neighborhood-level'
        WHEN 11 THEN 'building-level'
        ELSE 'unsupported'
    END AS granularity
FROM incoming_h3_events
LIMIT 20;
```

## Normalizing Indexes to a Standard Resolution

When a table contains a mix of resolutions, normalize to a target resolution using `h3ToParent()`.

```sql
-- Normalize all indexes to resolution 7
SELECT
    h3_index,
    h3GetResolution(h3_index)  AS original_res,
    -- If finer than 7, coarsen to 7; if already 7, keep as-is
    if(h3GetResolution(h3_index) > 7,
       h3ToParent(h3_index, 7),
       h3_index)               AS normalized_r7
FROM mixed_resolution_events
LIMIT 10;
```

## Data Quality Report: Resolution Distribution

```sql
-- Distribution of H3 resolution levels in an ingestion table
SELECT
    h3GetResolution(h3_index) AS resolution,
    count()                   AS row_count,
    round(100.0 * count() / sum(count()) OVER (), 2) AS pct
FROM location_events_h3
GROUP BY resolution
ORDER BY resolution;
```

## Verifying geoToH3() Output Resolution

When generating H3 indexes dynamically, confirm the resolution is what you expect.

```sql
-- Sanity check: geoToH3 at resolution 9 should always return resolution 9
SELECT
    count()                                          AS total,
    countIf(h3GetResolution(geoToH3(lat, lon, 9)) != 9) AS mismatches
FROM (
    SELECT
        longitude AS lon,
        latitude  AS lat
    FROM location_events
    LIMIT 100000
);
```

## Filtering by Resolution Range

```sql
-- Keep only fine-grained indexes (resolution 8 or higher)
SELECT
    h3_index,
    h3ToGeo(h3_index).1 AS lat,
    h3ToGeo(h3_index).2 AS lon
FROM external_h3_feed
WHERE h3GetResolution(h3_index) >= 8
ORDER BY h3_index
LIMIT 20;
```

## Using h3GetResolution() in Aggregation Pipelines

```sql
-- Separate coarse and fine resolution events into different aggregations
SELECT
    h3GetResolution(h3_index) AS res,
    count()                   AS events
FROM location_events_h3
WHERE event_time >= today()
GROUP BY res
ORDER BY res;
```

## Combining with h3IsValid() for Full Validation

```sql
-- Full H3 index validation: check both validity and resolution
SELECT
    h3_index,
    h3IsValid(h3_index)                          AS is_valid,
    h3GetResolution(h3_index)                    AS resolution,
    h3IsValid(h3_index) AND h3GetResolution(h3_index) = 9 AS passes_checks
FROM incoming_h3_indexes
LIMIT 20;
```

## Summary

`h3GetResolution(index)` extracts the resolution level (0-15) from an H3 `UInt64` index. Use it to validate that stored or received indexes match an expected resolution, to route mixed-resolution events to different processing pipelines, and to build data quality reports on H3-indexed tables. Pair it with `h3ToParent()` to normalize indexes of varying resolutions to a single target level, and with `h3IsValid()` for comprehensive index validation before downstream processing.
