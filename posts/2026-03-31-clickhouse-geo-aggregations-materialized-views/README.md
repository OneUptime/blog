# How to Build Geo-Aggregations with Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Geospatial, Geo-Aggregation, H3

Description: Pre-aggregate geospatial event data in ClickHouse using materialized views and H3 grid cells to power real-time geographic heatmaps and regional analytics.

---

## The Geo-Aggregation Challenge

Geographic heatmaps and regional analytics require grouping millions of events by location cells or administrative regions. Computing these on raw event tables with lat/lon coordinates is slow. Materialized views can pre-aggregate events by H3 grid cells or region codes for instant map rendering.

## Base Events with Coordinates

```sql
CREATE TABLE location_events
(
    event_time DateTime,
    event_id UInt64,
    user_id UInt64,
    event_type LowCardinality(String),
    latitude Float64,
    longitude Float64,
    country LowCardinality(String),
    city LowCardinality(String),
    value Float32
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (country, event_time);
```

## H3 Cell Aggregation Materialized View

ClickHouse has native H3 functions for hexagonal grid indexing:

```sql
-- Pre-aggregate by H3 resolution 7 (~1.4km edge, ~5 km² cells) and day
CREATE TABLE geo_daily_counts
(
    event_date Date,
    h3_cell UInt64,
    event_type LowCardinality(String),
    event_count UInt64,
    unique_users UInt64,
    total_value Float64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type, h3_cell);

CREATE MATERIALIZED VIEW geo_daily_counts_mv
TO geo_daily_counts
AS
SELECT
    toDate(event_time) AS event_date,
    geoToH3(latitude, longitude, 7) AS h3_cell,
    event_type,
    count() AS event_count,
    uniqExact(user_id) AS unique_users,
    sum(value) AS total_value
FROM location_events
GROUP BY event_date, h3_cell, event_type;
```

## Query Heatmap Data

```sql
-- Event density for a bounding box, last 7 days
SELECT
    h3_cell,
    h3ToString(h3_cell) AS cell_id,
    sum(event_count) AS total_events,
    sum(unique_users) AS total_users
FROM geo_daily_counts
WHERE event_date >= today() - 7
  AND event_type = 'purchase'
GROUP BY h3_cell
ORDER BY total_events DESC
LIMIT 1000;
```

## Convert H3 to Lat/Lon for Map Rendering

```sql
-- Get cell center coordinates for map rendering.
-- h3ToGeo returns a (lat, lon) tuple.
SELECT
    h3_cell,
    h3ToGeo(h3_cell).1 AS cell_lat,
    h3ToGeo(h3_cell).2 AS cell_lon,
    sum(event_count) AS events
FROM geo_daily_counts
WHERE event_date = today() - 1
GROUP BY h3_cell
HAVING events >= 10;
```

## Country-Level Aggregation

For regional analytics without H3:

```sql
CREATE TABLE geo_country_monthly
(
    month Date,
    country LowCardinality(String),
    event_count UInt64,
    unique_users UInt64
)
ENGINE = SummingMergeTree
ORDER BY (month, country);

CREATE MATERIALIZED VIEW geo_country_monthly_mv
TO geo_country_monthly
AS
SELECT
    toStartOfMonth(event_time) AS month,
    country,
    count() AS event_count,
    uniqExact(user_id) AS unique_users
FROM location_events
GROUP BY month, country;
```

## Multi-Resolution Drilldown

For interactive maps that support zoom levels, create materialized views at multiple H3 resolutions:

```sql
-- Resolution 4 (~25km edge): regional overview
-- Resolution 7 (~1.4km edge): city level
-- Resolution 10 (~75m edge): neighborhood level

-- Each resolution gets its own MV target table
-- At query time, pick the appropriate table based on zoom level
```

## Summary

Geo-aggregations in ClickHouse use H3 grid functions to snap lat/lon coordinates to hexagonal grid cells, then SummingMergeTree materialized views pre-aggregate event counts per cell per day. This enables sub-second geographic heatmap queries without full table scans. Create views at multiple H3 resolutions (4, 7, 10) to support map drilldown at different zoom levels.
