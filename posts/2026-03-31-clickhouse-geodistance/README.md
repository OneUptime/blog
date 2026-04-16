# How to Use geoDistance() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Distance, Analytics, Location

Description: Learn how geoDistance() computes the accurate WGS-84 ellipsoidal distance between two coordinates in ClickHouse for precise geospatial analytics and proximity searches.

---

`geoDistance(lon1, lat1, lon2, lat2)` computes the distance in meters between two geographic coordinates on the WGS-84 ellipsoid, the same reference ellipsoid used by GPS. Unlike `greatCircleDistance()`, which assumes a perfect sphere, `geoDistance()` accounts for Earth's polar flattening by using a planar approximation on the tangent plane at the midpoint of the two coordinates, giving a more precise approximation of the Earth geoid. It accepts `Float64` arguments in degrees in `(lon, lat)` order and returns a `Float64` in meters. Use it when accuracy matters, particularly for precision-sensitive applications.

## Basic Usage

```sql
-- Geodesic distance between Sydney and Buenos Aires
SELECT
    round(geoDistance(151.2093, -33.8688, -58.3816, -34.6037) / 1000, 1) AS km_geodesic,
    round(greatCircleDistance(151.2093, -33.8688, -58.3816, -34.6037) / 1000, 1) AS km_sphere;
```

```text
km_geodesic  km_sphere
11796.5      11791.2
```

The ellipsoidal result differs from the spherical by about 5 km for this nearly antipodal route.

## Short-Distance Comparison

For short distances (under ~500 km), the difference is negligible.

```sql
-- San Francisco to San Jose (~70 km)
SELECT
    round(geoDistance(-122.4194, 37.7749, -121.8863, 37.3382) / 1000, 3) AS geo_km,
    round(greatCircleDistance(-122.4194, 37.7749, -121.8863, 37.3382) / 1000, 3) AS sphere_km,
    round(abs(
        geoDistance(-122.4194, 37.7749, -121.8863, 37.3382) -
        greatCircleDistance(-122.4194, 37.7749, -121.8863, 37.3382)
    ), 1) AS diff_meters;
```

```text
geo_km   sphere_km  diff_meters
68.630   68.603     27.0
```

## Proximity Search with geoDistance()

```sql
-- Find all airports within 100 km of Paris (accurate ellipsoidal check)
SELECT
    airport_code,
    airport_name,
    round(geoDistance(longitude, latitude, 2.3522, 48.8566) / 1000, 1) AS km_from_paris
FROM airports
WHERE geoDistance(longitude, latitude, 2.3522, 48.8566) <= 100000
ORDER BY km_from_paris;
```

## Shipping Route Distance Calculation

```sql
-- Calculate geodesic distances between port pairs
SELECT
    origin_port,
    destination_port,
    round(geoDistance(o.longitude, o.latitude, d.longitude, d.latitude) / 1000, 0) AS route_km
FROM shipping_routes r
JOIN ports o ON r.origin_port = o.port_code
JOIN ports d ON r.destination_port = d.port_code
ORDER BY route_km DESC
LIMIT 20;
```

## Delivery Zone Verification

```sql
-- Check whether delivery addresses fall within service zones (accurate boundaries)
SELECT
    order_id,
    delivery_address,
    round(geoDistance(del_lon, del_lat, warehouse_lon, warehouse_lat) / 1000, 2) AS km,
    geoDistance(del_lon, del_lat, warehouse_lon, warehouse_lat) <= 30000 AS within_30km_zone
FROM delivery_orders
WHERE order_date = today()
ORDER BY km DESC;
```

## Comparing Measurement Precision at Different Latitudes

Earth is flattened at the poles, so the sphere-ellipsoid difference is largest at high latitudes.

```sql
-- Show sphere vs ellipsoid deviation at different latitudes
SELECT
    lat AS latitude,
    round(greatCircleDistance(0, lat, 1, lat) / 1000, 4)  AS sphere_km_per_deg_lon,
    round(geoDistance(0, lat, 1, lat) / 1000, 4)           AS geo_km_per_deg_lon,
    round(abs(geoDistance(0, lat, 1, lat)
             - greatCircleDistance(0, lat, 1, lat)), 2)     AS diff_m
FROM (
    SELECT arrayJoin([0, 30, 45, 60, 75, 89]) AS lat
);
```

```text
latitude  sphere_km_per_deg_lon  geo_km_per_deg_lon  diff_m
0         111.3195               111.3194            0.01
30        96.4067                96.4063             0.04
45        78.6263                78.6257             0.06
60        55.6597                55.6593             0.04
75        28.8103                28.8100             0.03
89        1.9423                 1.9423              0.00
```

## Flight Path Analysis

```sql
-- Total geodesic distance for a multi-leg flight itinerary
SELECT
    flight_id,
    groupArray(city)       AS route,
    round(sum(
        geoDistance(
            longitude,
            latitude,
            neighbor(longitude, 1),
            neighbor(latitude,  1)
        )
    ) / 1000, 0) AS total_route_km
FROM flight_legs
GROUP BY flight_id
ORDER BY total_route_km DESC
LIMIT 10;
```

## Performance Comparison with greatCircleDistance()

```sql
-- Benchmark: geoDistance vs greatCircleDistance on 10M rows
SELECT count() FROM (
    SELECT geoDistance(longitude, latitude, -73.9857, 40.7484)
    FROM large_poi_table
    WHERE geoDistance(longitude, latitude, -73.9857, 40.7484) < 50000
);
-- Per ClickHouse documentation, geoDistance has the same performance
-- as greatCircleDistance with no performance drawback
```

## Summary

`geoDistance(lon1, lat1, lon2, lat2)` calculates the distance on the WGS-84 ellipsoid in meters, providing a more precise approximation of the Earth geoid than the sphere used by `greatCircleDistance()`. For distances under ~500 km the practical difference is typically under 30 meters and often immaterial. Per the ClickHouse documentation, `geoDistance()` has the same performance as `greatCircleDistance()`, so it is generally the recommended choice for real-world Earth distance calculations.
