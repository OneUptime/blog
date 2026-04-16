# How to Use h3IsValid() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, H3, h3IsValid, Geospatial, Data Validation, Hexagonal Grid

Description: Learn how to use h3IsValid() in ClickHouse to validate H3 indexes before using them in geospatial queries, preventing errors and bad data.

---

Before running geospatial calculations with H3 indexes, it is important to validate that the stored values are legitimate H3 cell indexes. ClickHouse provides `h3IsValid(index)` for exactly this purpose - it returns 1 if the UInt64 value is a valid H3 cell index and 0 otherwise.

## Basic Usage

```sql
SELECT
    h3IsValid(635714569676956671) AS valid_index,
    h3IsValid(0)                  AS zero_is_invalid,
    h3IsValid(12345)              AS random_invalid;
```

```text
valid_index | zero_is_invalid | random_invalid
------------+-----------------+---------------
1           | 0               | 0
```

## Filtering Out Invalid Rows

When ingesting data from external sources, H3 indexes may be corrupt or missing. Use `h3IsValid()` in a `WHERE` clause to exclude bad rows:

```sql
SELECT count() AS clean_rows
FROM location_events
WHERE h3IsValid(h3_index) = 1;
```

Or to see how many invalid rows exist:

```sql
SELECT
    h3IsValid(h3_index) AS is_valid,
    count()             AS row_count
FROM location_events
GROUP BY is_valid;
```

## Validating During Ingestion with a Materialized View

A reliable pattern is to route invalid rows to a separate table for inspection:

```sql
CREATE TABLE location_events_invalid AS location_events;

CREATE MATERIALIZED VIEW location_events_bad_mv
TO location_events_invalid
AS
SELECT *
FROM location_events
WHERE h3IsValid(h3_index) = 0;
```

## Combining with h3GetResolution()

After confirming an index is valid, you can safely call other H3 functions such as `h3GetResolution()`:

```sql
SELECT
    h3_index,
    h3GetResolution(h3_index) AS resolution
FROM location_events
WHERE h3IsValid(h3_index) = 1
LIMIT 10;
```

Calling `h3GetResolution()` on an invalid index returns undefined behavior, so always validate first.

## Checking Validity After geoToH3()

`geoToH3()` can return 0 for out-of-range coordinates. Validating the result guards against these edge cases:

```sql
SELECT
    latitude,
    longitude,
    geoToH3(latitude, longitude, 7) AS h3_index,
    h3IsValid(geoToH3(latitude, longitude, 7)) AS valid
FROM raw_locations
WHERE latitude BETWEEN -90 AND 90
  AND longitude BETWEEN -180 AND 180
LIMIT 10;
```

## Alerting on Data Quality

You can surface data quality metrics to a monitoring tool by counting invalid H3 indexes over time:

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    countIf(h3IsValid(h3_index) = 0) AS invalid_count,
    count() AS total_count,
    round(100.0 * invalid_count / total_count, 2) AS invalid_pct
FROM location_events
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;
```

## Summary

`h3IsValid()` is a lightweight guard function that returns 1 for valid H3 cell indexes and 0 for everything else. Use it to filter rows before H3 calculations, route bad data to quarantine tables during ingestion, and build data quality dashboards to monitor H3 index health over time.
