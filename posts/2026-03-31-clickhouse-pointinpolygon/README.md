# How to Use pointInPolygon() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Analytics, Location, Query

Description: Learn how pointInPolygon() tests whether a geographic point falls inside a polygon in ClickHouse, enabling geo-fencing, service area filtering, and spatial aggregation.

---

`pointInPolygon((x, y), [(x1, y1), (x2, y2), ...])` returns `1` if the 2D point `(x, y)` is inside the polygon defined by the array of vertices and `0` otherwise. The polygon is automatically closed - you do not need to repeat the first vertex at the end. The function handles convex and concave polygons. Avoid self-intersecting polygons as results become unreliable. If the point is on the polygon boundary, the function may return either `0` or `1`. It also accepts holes (inner rings) as additional array arguments. Coordinates are Euclidean; for geographic use, pass longitude as x and latitude as y.

## Basic Usage

```sql
-- Is point (2, 2) inside a simple square?
SELECT pointInPolygon(
    (2, 2),
    [(0,0), (4,0), (4,4), (0,4)]
) AS inside;
```

```text
inside
1
```

```sql
-- Point outside the polygon
SELECT pointInPolygon(
    (5, 2),
    [(0,0), (4,0), (4,4), (0,4)]
) AS inside;
```

```text
inside
0
```

## Geographic Polygon: Is a Point in New York City?

```sql
-- Simplified NYC bounding polygon (longitude, latitude)
SELECT pointInPolygon(
    (-73.9857, 40.7484),     -- Times Square
    [
        (-74.2591, 40.4774),
        (-73.7004, 40.4774),
        (-73.7004, 40.9176),
        (-74.2591, 40.9176)
    ]
) AS in_nyc_bbox;
```

```text
in_nyc_bbox
1
```

## Filtering Rows by Polygon Membership

```sql
-- Count delivery orders within a custom service area polygon
SELECT
    count()              AS orders_in_zone,
    sum(order_value)     AS total_revenue
FROM delivery_orders
WHERE pointInPolygon(
    (delivery_longitude, delivery_latitude),
    [
        (-122.45, 37.81),
        (-122.39, 37.81),
        (-122.37, 37.77),
        (-122.39, 37.74),
        (-122.45, 37.74),
        (-122.47, 37.77)
    ]
)
AND order_date = today();
```

## Using Polygons with Holes (Exclusion Zones)

Pass additional arrays for holes (inner rings that are excluded from the polygon).

```sql
-- Outer ring: city limits; inner ring: airport exclusion zone
SELECT pointInPolygon(
    (lon, lat),
    -- outer polygon
    [(-122.50, 37.70), (-122.35, 37.70), (-122.35, 37.85), (-122.50, 37.85)],
    -- hole: airport (points where delivery is not available)
    [(-122.40, 37.78), (-122.37, 37.78), (-122.37, 37.80), (-122.40, 37.80)]
) AS deliverable
FROM delivery_zones
LIMIT 10;
```

## Storing Polygon Definitions in a Reference Table

```sql
CREATE TABLE service_zones (
    zone_id   UInt32,
    zone_name String,
    polygon   Array(Tuple(Float64, Float64))
) ENGINE = MergeTree ORDER BY zone_id;

INSERT INTO service_zones VALUES
    (1, 'downtown', [(-73.99, 40.74), (-73.97, 40.74), (-73.97, 40.76), (-73.99, 40.76)]),
    (2, 'midtown',  [(-74.00, 40.75), (-73.97, 40.75), (-73.97, 40.78), (-74.00, 40.78)]);

-- Join events with service zones
SELECT
    e.event_id,
    e.longitude,
    e.latitude,
    z.zone_name
FROM location_events e
JOIN service_zones z
    ON pointInPolygon((e.longitude, e.latitude), z.polygon)
WHERE e.event_time >= today()
LIMIT 20;
```

## Geo-Fencing: Alert on Boundary Crossing

```sql
-- Detect assets that have left their assigned geofence
SELECT
    asset_id,
    longitude,
    latitude,
    event_time,
    'geofence_exit' AS alert_type
FROM asset_positions
WHERE
    event_time >= now() - INTERVAL 5 MINUTE
    AND NOT pointInPolygon(
        (longitude, latitude),
        [(-73.99, 40.74), (-73.97, 40.74), (-73.97, 40.76), (-73.99, 40.76)]
    );
```

## Spatial Aggregation: Events per Zone

```sql
-- Count events per zone using a pre-defined zone table
SELECT
    z.zone_name,
    count()          AS event_count,
    uniq(e.user_id)  AS unique_users
FROM location_events e
CROSS JOIN service_zones z
WHERE pointInPolygon((e.longitude, e.latitude), z.polygon)
  AND e.event_time >= today() - 7
GROUP BY z.zone_name
ORDER BY event_count DESC;
```

## Performance Tip: Bounding Box Pre-Filter

For large tables and complex polygons, apply a bounding box filter first to limit the rows evaluated by `pointInPolygon()`.

```sql
-- Pre-filter to the polygon's bounding box, then apply exact test
SELECT
    event_id,
    longitude,
    latitude
FROM location_events
WHERE
    -- bounding box of the polygon
    longitude BETWEEN -74.00 AND -73.97
    AND latitude  BETWEEN 40.74 AND 40.76
    -- exact polygon test
    AND pointInPolygon(
        (longitude, latitude),
        [(-73.99, 40.74), (-73.97, 40.74), (-73.97, 40.76), (-73.99, 40.76)]
    );
```

## Materialized Column for Zone Assignment

```sql
-- Precompute zone membership at insert time
CREATE TABLE events_zoned (
    event_id    UUID,
    event_time  DateTime,
    longitude   Float64,
    latitude    Float64,
    in_downtown UInt8 MATERIALIZED pointInPolygon(
        (longitude, latitude),
        [(-73.99, 40.74), (-73.97, 40.74), (-73.97, 40.76), (-73.99, 40.76)]
    )
) ENGINE = MergeTree ORDER BY (event_time, event_id);
```

## Summary

`pointInPolygon((x, y), polygon_array)` tests whether a point is inside a polygon using ray-casting. It handles convex and concave polygons, supports holes via additional array arguments, and works naturally with geographic (longitude, latitude) coordinates. For best performance on large tables, combine a bounding-box WHERE filter with the `pointInPolygon()` call to minimize the number of rows evaluated. For circular and elliptical zones, `pointInEllipses()` is simpler; use `pointInPolygon()` for arbitrary shapes such as city boundaries, service territories, and census regions.
