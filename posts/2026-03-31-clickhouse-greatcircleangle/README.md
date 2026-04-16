# How to Use greatCircleAngle() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Distance, Analytics, Location

Description: Learn how greatCircleAngle() computes the central angle in degrees between two geographic points in ClickHouse, useful for angular distance comparisons and celestial calculations.

---

`greatCircleAngle(lon1, lat1, lon2, lat2)` returns the central angle in degrees subtended by the arc between two points on a sphere. It is the angular equivalent of `greatCircleDistance()`: where `greatCircleDistance()` multiplies the central angle by Earth's radius to produce meters, `greatCircleAngle()` returns just the angle. The result is a `Float64` in degrees between 0 and 180. It uses the same `(lon, lat)` argument order as other ClickHouse geographic functions.

## Basic Usage

```sql
-- Central angle between New York and London
SELECT
    greatCircleAngle(-74.0060, 40.7128, -0.1276, 51.5074) AS angle_degrees;
```

```text
angle_degrees
50.09
```

## Relationship to greatCircleDistance()

```sql
-- greatCircleDistance = greatCircleAngle * (pi/180) * Earth_radius
SELECT
    greatCircleAngle(-74.0060, 40.7128, -0.1276, 51.5074)   AS angle_deg,
    greatCircleDistance(-74.0060, 40.7128, -0.1276, 51.5074) AS distance_m,
    -- Verify: angle_deg * (pi/180) * 6371000 should match distance_m
    round(
        greatCircleAngle(-74.0060, 40.7128, -0.1276, 51.5074)
        * (pi() / 180)
        * 6371000,
        1
    ) AS derived_distance_m;
```

```text
angle_deg  distance_m    derived_distance_m
50.09      5570224.98    5570224.9
```

## Comparing Angular Distances Without Unit Conversion

When comparing relative distances and meters are not needed, `greatCircleAngle()` avoids the multiplication overhead.

```sql
-- Rank cities by angular distance from Tokyo without computing meters
SELECT
    city_name,
    greatCircleAngle(longitude, latitude, 139.6917, 35.6895) AS angle_from_tokyo_deg
FROM cities
ORDER BY angle_from_tokyo_deg
LIMIT 10;
```

## Finding Points Within an Angular Radius

```sql
-- Points within 1 degree of arc (~111 km) from a center
SELECT
    poi_id,
    name,
    greatCircleAngle(longitude, latitude, -122.4194, 37.7749) AS angle_deg
FROM points_of_interest
WHERE greatCircleAngle(longitude, latitude, -122.4194, 37.7749) < 1.0
ORDER BY angle_deg;
```

## Antipodal Points: Maximum Angle

Two points on exactly opposite sides of the Earth have a central angle of 180 degrees.

```sql
-- Antipodal point of New York is roughly in the Indian Ocean
SELECT
    greatCircleAngle(-74.0060, 40.7128, 106.0, -40.7128) AS expected_180_deg;
```

```text
expected_180_deg
180.0
```

## Angular Distance Between Satellite Ground Tracks

```sql
-- Angular separation between two satellite positions (lat/lon on Earth's surface)
SELECT
    sat_id,
    toStartOfMinute(observed_at) AS minute,
    greatCircleAngle(
        longitude,
        latitude,
        neighbor(longitude, 1),
        neighbor(latitude,  1)
    ) AS angular_step_deg
FROM satellite_positions
WHERE sat_id = 'NOAA-20'
  AND observed_at >= today()
ORDER BY minute
LIMIT 20;
```

## Using greatCircleAngle() for Clustering

Group locations by their angular distance to seed points.

```sql
-- Assign each event to the nearest of three seed cities using angular distance
SELECT
    event_id,
    argMin(seed_city, angle_dist) AS nearest_city,
    min(angle_dist)               AS min_angle_deg
FROM (
    SELECT
        e.event_id,
        s.city_name AS seed_city,
        greatCircleAngle(e.longitude, e.latitude, s.longitude, s.latitude) AS angle_dist
    FROM location_events e
    CROSS JOIN (
        SELECT 'New York'    AS city_name, -74.0060 AS longitude, 40.7128 AS latitude
        UNION ALL SELECT 'London',      -0.1276, 51.5074
        UNION ALL SELECT 'Tokyo',      139.6917, 35.6895
    ) s
)
GROUP BY event_id
ORDER BY event_id
LIMIT 20;
```

## Astronomy: Angular Separation of Celestial Objects

`greatCircleAngle()` works for any spherical coordinate system - not just geography. For right ascension / declination on the celestial sphere, use the same function with RA (as longitude, 0-360) and Dec (as latitude, -90 to 90).

```sql
-- Angular separation between two stars (RA/Dec in degrees)
SELECT
    greatCircleAngle(
        88.7929, 7.4071,   -- Betelgeuse (RA, Dec)
        81.2828, 6.3497    -- Bellatrix  (RA, Dec)
    ) AS separation_deg;
```

```text
separation_deg
7.53
```

## Summary

`greatCircleAngle(lon1, lat1, lon2, lat2)` returns the central angle in degrees between two spherical points. It is the angular analogue of `greatCircleDistance()` and is useful when you need to compare distances without unit conversion, filter by degree-radius thresholds, or apply the function to non-geographic spherical coordinate systems like celestial RA/Dec. For Earth distances in meters or kilometers, `greatCircleDistance()` or `geoDistance()` are more direct choices.
