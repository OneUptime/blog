# How to Use greatCircleDistance() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Distance, Analytics, Location

Description: Learn how greatCircleDistance() calculates the shortest spherical distance between two geographic coordinates in ClickHouse for proximity searches and geospatial analytics.

---

`greatCircleDistance(lon1, lat1, lon2, lat2)` computes the arc length in meters between two points on the surface of the Earth modeled as a sphere (using the WGS84 authalic radius, ~6,371,007 m). Internally it uses a flat-ellipsoid tangent-plane approximation for nearby points and the Haversine formula for distant ones. All arguments are `Float64` in degrees (longitude, latitude order), with longitude in `[-180°, 180°]` and latitude in `[-90°, 90°]`. The result is in meters (`Float32` by default; `Float64` when arguments are `Float64` and the `geo_distance_returns_float64_on_float64_arguments` setting is enabled). It is fast enough for use in WHERE clauses on large tables and is the most common distance function in ClickHouse for proximity filtering.

## Basic Usage

```sql
-- Distance between New York and London
SELECT
    greatCircleDistance(-74.0060, 40.7128, -0.1276, 51.5074) AS distance_m,
    round(greatCircleDistance(-74.0060, 40.7128, -0.1276, 51.5074) / 1000, 1) AS distance_km;
```

```text
distance_m         distance_km
5570224.98         5570.2
```

## Argument Order: Longitude First

ClickHouse uses `(lon, lat)` order, which differs from many geographic standards. Always double-check.

```sql
-- (longitude, latitude) - NOT (latitude, longitude)
SELECT
    greatCircleDistance(
        -122.4194, 37.7749,   -- San Francisco: lon, lat
        -118.2437, 34.0522    -- Los Angeles:   lon, lat
    ) / 1000 AS km_sf_to_la;
```

```text
km_sf_to_la
559.1
```

## Finding Points Within a Radius

```sql
-- Stores within 5 km of a given location (37.7749, -122.4194)
SELECT
    store_id,
    store_name,
    latitude,
    longitude,
    round(greatCircleDistance(longitude, latitude, -122.4194, 37.7749) / 1000, 2) AS distance_km
FROM stores
WHERE greatCircleDistance(longitude, latitude, -122.4194, 37.7749) <= 5000
ORDER BY distance_km;
```

## Nearest Neighbor: Top K Closest Points

```sql
-- 10 nearest restaurants to a given coordinate
SELECT
    restaurant_id,
    name,
    cuisine,
    round(greatCircleDistance(longitude, latitude, -73.9857, 40.7484) / 1000, 3) AS km
FROM restaurants
ORDER BY greatCircleDistance(longitude, latitude, -73.9857, 40.7484)
LIMIT 10;
```

## Distance-Based Aggregation: Coverage by Zone

```sql
-- Count how many events occurred within each distance ring from a center point
SELECT
    CASE
        WHEN greatCircleDistance(longitude, latitude, -73.9857, 40.7484) <= 1000  THEN '0-1 km'
        WHEN greatCircleDistance(longitude, latitude, -73.9857, 40.7484) <= 5000  THEN '1-5 km'
        WHEN greatCircleDistance(longitude, latitude, -73.9857, 40.7484) <= 10000 THEN '5-10 km'
        ELSE '>10 km'
    END AS ring,
    count() AS event_count
FROM location_events
GROUP BY ring
ORDER BY ring;
```

## Compute Driver-to-Passenger Distance for Ride Matching

```sql
-- Find available drivers within 2 km of each passenger request
SELECT
    p.request_id,
    d.driver_id,
    d.name AS driver_name,
    round(greatCircleDistance(d.longitude, d.latitude,
                               p.longitude, p.latitude) / 1000, 2) AS km
FROM passenger_requests p
CROSS JOIN available_drivers d
WHERE
    greatCircleDistance(d.longitude, d.latitude,
                         p.longitude, p.latitude) <= 2000
ORDER BY p.request_id, km
LIMIT 20;
```

## Bounding Box Pre-Filter for Performance

For very large tables, a bounding-box pre-filter on indexed lat/lon columns dramatically reduces the rows passed to `greatCircleDistance()`.

```sql
-- 1 degree of latitude ~ 111 km; 1 degree of longitude varies by latitude
-- Pre-filter to a 0.1-degree bounding box (~11 km), then apply exact radius
SELECT
    store_id,
    store_name,
    round(greatCircleDistance(longitude, latitude, -122.4194, 37.7749) / 1000, 2) AS km
FROM stores
WHERE
    latitude  BETWEEN 37.7749 - 0.1 AND 37.7749 + 0.1   -- bounding box
    AND longitude BETWEEN -122.4194 - 0.15 AND -122.4194 + 0.15
    AND greatCircleDistance(longitude, latitude, -122.4194, 37.7749) <= 10000  -- exact radius
ORDER BY km;
```

## Tracking Total Distance Traveled by a Vehicle

```sql
-- Sum of segment distances along an ordered GPS track
SELECT
    vehicle_id,
    round(sum(
        greatCircleDistance(
            longitude,
            latitude,
            neighbor(longitude, 1),
            neighbor(latitude,  1)
        )
    ) / 1000, 2) AS total_km
FROM gps_track
WHERE event_time >= today() - 1
GROUP BY vehicle_id
ORDER BY total_km DESC;
```

## Accuracy Note

`greatCircleDistance()` assumes a perfect sphere. For distances under ~1,000 km the error versus the WGS-84 ellipsoid is below 0.5%. Use `geoDistance()` for higher accuracy over long distances.

```sql
-- Compare greatCircleDistance vs geoDistance for a transatlantic route
SELECT
    round(greatCircleDistance(-74.0060, 40.7128, -0.1276, 51.5074) / 1000, 1) AS sphere_km,
    round(geoDistance(-74.0060, 40.7128, -0.1276, 51.5074) / 1000, 1)         AS ellipsoid_km;
```

## Summary

`greatCircleDistance(lon1, lat1, lon2, lat2)` computes the spherical arc distance in meters between two geographic points. Use it for proximity filters in WHERE clauses, nearest-neighbor ORDER BY LIMIT queries, and ring-based distance aggregations. For large tables, combine a bounding-box pre-filter on indexed lat/lon columns with an exact radius check using `greatCircleDistance()`. For higher precision over long distances, prefer `geoDistance()`, which accounts for Earth's ellipsoidal shape.
