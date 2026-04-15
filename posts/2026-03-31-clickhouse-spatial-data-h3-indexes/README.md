# How to Analyze Spatial Data with H3 Indexes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, H3, Spatial Analysis, geoToH3, Hexagonal Grid, Geospatial, Index

Description: Learn how to analyze spatial data using H3 hexagonal indexes in ClickHouse for efficient proximity queries, density maps, and multi-resolution aggregations.

---

H3 is Uber's hierarchical hexagonal spatial indexing system. By encoding latitude/longitude pairs as UInt64 cell IDs, H3 transforms expensive coordinate comparisons into fast integer lookups, making it ideal for analytics at scale in ClickHouse.

## Why H3?

Traditional geospatial queries rely on distance calculations that cannot be efficiently indexed. H3 converts coordinates to cell IDs that:
- Sort and compare as integers
- Form a natural primary key component
- Enable O(1) neighborhood lookups with `h3kRing()`
- Support multi-resolution analysis through the hierarchy

## Creating a Spatial Table

```sql
CREATE TABLE trips
(
    trip_id         UInt64,
    pickup_lon      Float64,
    pickup_lat      Float64,
    dropoff_lon     Float64,
    dropoff_lat     Float64,
    pickup_h3_r8    UInt64 DEFAULT geoToH3(pickup_lat, pickup_lon, 8),
    dropoff_h3_r8   UInt64 DEFAULT geoToH3(dropoff_lat, dropoff_lon, 8),
    fare            Decimal(10, 2),
    trip_time       DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(trip_time)
ORDER BY (pickup_h3_r8, trip_time);
```

## Density Heatmap at Multiple Resolutions

Use `h3ToParent()` to aggregate at different zoom levels without re-encoding coordinates:

```sql
SELECT
    h3ToParent(pickup_h3_r8, 5) AS cell_r5,
    count()                      AS trip_count,
    round(avg(fare), 2)          AS avg_fare
FROM trips
WHERE trip_time >= today() - 30
GROUP BY cell_r5
ORDER BY trip_count DESC
LIMIT 50;
```

## Proximity Join - Finding Nearby Trips

Find all trips that started within 2 H3 rings of a given location:

```sql
SELECT count() AS nearby_trips
FROM trips
WHERE pickup_h3_r8 IN (
    SELECT arrayJoin(h3kRing(geoToH3(40.7484, -73.9857, 8), 2))
);
```

## Origin-Destination Flow Analysis

H3 makes O-D matrix computation straightforward:

```sql
SELECT
    h3ToParent(pickup_h3_r8, 6)  AS origin,
    h3ToParent(dropoff_h3_r8, 6) AS destination,
    count()                        AS trip_count,
    round(avg(fare), 2)            AS avg_fare
FROM trips
GROUP BY origin, destination
ORDER BY trip_count DESC
LIMIT 20;
```

## Cell Resolution Reference

| Resolution | Avg Cell Area | Avg Edge Length |
|-----------|--------------|----------------|
| 5 | ~252 km2 | ~9.9 km |
| 7 | ~5.2 km2 | ~1.4 km |
| 8 | ~0.74 km2 | ~531 m |
| 9 | ~0.1 km2 | ~201 m |

Choose resolution based on your analysis granularity. Resolution 8 or 9 works well for city-level event data.

## Data Quality Check

Validate that all H3 indexes were correctly computed:

```sql
SELECT
    countIf(NOT h3IsValid(pickup_h3_r8))  AS invalid_pickup,
    countIf(NOT h3IsValid(dropoff_h3_r8)) AS invalid_dropoff,
    count()                                AS total
FROM trips;
```

## Materialized View for Real-Time Aggregation

Keep a running cell-level summary updated automatically:

```sql
CREATE MATERIALIZED VIEW trips_h3_summary_mv
ENGINE = SummingMergeTree
ORDER BY (cell, trip_date)
AS
SELECT
    h3ToParent(pickup_h3_r8, 7)  AS cell,
    toDate(trip_time)             AS trip_date,
    count()                       AS trip_count,
    sum(fare)                     AS total_fare
FROM trips
GROUP BY cell, trip_date;
```

## Summary

H3 indexes transform geospatial analysis in ClickHouse from expensive distance scans into fast integer operations. Store pre-computed H3 cell IDs as part of your primary key, use `h3kRing()` for proximity lookups, `h3ToParent()` for multi-resolution aggregation, and `h3IsValid()` for data quality checks. The result is sub-second spatial queries over billions of location events.
