# How to Build Location-Based Services with ClickHouse Geo Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Location, geoDistance, pointInPolygon, H3, Geofencing

Description: Learn how to build location-based services with ClickHouse using geoDistance, pointInPolygon, H3 indexing, and polygon operations for real-world LBS use cases.

---

ClickHouse provides a rich set of geospatial primitives that enable you to build location-based services (LBS) entirely within your analytics database - from proximity searches to geofencing and spatial aggregations.

## Table Design for Location Data

A well-designed location events table includes pre-computed H3 indexes for fast spatial lookups:

```sql
CREATE TABLE location_events
(
    event_id    UUID            DEFAULT generateUUIDv4(),
    user_id     UInt64,
    longitude   Float64,
    latitude    Float64,
    h3_index    UInt64          DEFAULT geoToH3(latitude, longitude, 8),
    event_time  DateTime        DEFAULT now(),
    event_type  LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (h3_index, event_time);
```

## Finding Nearby Points with geoDistance()

`geoDistance(lon1, lat1, lon2, lat2)` returns the great-circle distance in meters:

```sql
SELECT
    user_id,
    event_time,
    round(geoDistance(37.6156, 55.7522, longitude, latitude) / 1000, 2) AS distance_km
FROM location_events
WHERE geoDistance(37.6156, 55.7522, longitude, latitude) < 5000
ORDER BY distance_km
LIMIT 20;
```

## Geofencing with pointInPolygon()

Check whether users are inside a defined zone:

```sql
SELECT
    user_id,
    count() AS visits_in_zone
FROM location_events
WHERE pointInPolygon(
    (longitude, latitude),
    [(37.60, 55.75), (37.63, 55.75), (37.63, 55.72), (37.60, 55.72), (37.60, 55.75)]
)
GROUP BY user_id
ORDER BY visits_in_zone DESC
LIMIT 10;
```

## Fast Proximity Lookup with H3

H3 indexes enable O(1) cell lookup instead of full-table distance scans:

```sql
SELECT count() AS nearby_events
FROM location_events
WHERE h3_index IN (
    SELECT arrayJoin(h3kRing(geoToH3(55.7522, 37.6156, 8), 2))
);
```

The resolution-8 hexagons have an average edge length of roughly 531 meters, so a 2-ring search covers approximately a 1.8 km radius.

## Heatmap Generation

Aggregate location density at a coarser H3 resolution for heatmap tiles:

```sql
SELECT
    h3ToParent(h3_index, 6) AS region,
    count()                  AS event_count
FROM location_events
WHERE event_time >= now() - INTERVAL 1 DAY
GROUP BY region
ORDER BY event_count DESC;
```

## Nearest Venue Search

Find the closest venue to each user event by joining on H3 neighbors:

```sql
SELECT
    e.user_id,
    e.event_time,
    v.name AS nearest_venue,
    round(geoDistance(e.longitude, e.latitude, v.longitude, v.latitude), 0) AS dist_m
FROM location_events AS e
JOIN venues AS v ON v.h3_index IN (
    SELECT arrayJoin(h3kRing(e.h3_index, 1))
)
ORDER BY dist_m
LIMIT 1
BY e.user_id, e.event_time;
```

## Time-of-Day Movement Patterns

Analyze where users spend time throughout the day:

```sql
SELECT
    user_id,
    toHour(event_time)              AS hour_of_day,
    h3ToParent(h3_index, 7)         AS neighborhood,
    count()                          AS dwell_events
FROM location_events
GROUP BY user_id, hour_of_day, neighborhood
ORDER BY user_id, hour_of_day;
```

## Summary

ClickHouse geo functions - `geoDistance()`, `pointInPolygon()`, `geoToH3()`, `h3kRing()`, and polygon operations - provide a complete toolkit for location-based services. Design tables with pre-computed H3 indexes as the primary key for fast spatial queries, use `geoDistance()` for precise distance calculations, and leverage H3 hierarchy for multi-resolution heatmaps.
