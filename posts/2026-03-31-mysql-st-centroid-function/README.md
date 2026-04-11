# How to Use ST_Centroid() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial, Geometry, Function, GIS

Description: Learn how to use MySQL's ST_Centroid() function to find the geometric center of polygons and other geometry collections.

---

## What is ST_Centroid()?

`ST_Centroid()` returns the geometric centroid of a geometry as a `POINT`. The centroid is the arithmetic mean position of all points in the shape - often described as the "center of mass". For a regular polygon, this is the same as the center. For irregular shapes, it is the weighted average of all coordinates.

The centroid is computed using Cartesian math. In MySQL 8.0+, `ST_Centroid()` only supports Cartesian (projected) spatial reference systems. Passing a geometry with a geographic SRID (such as 4326) raises an `ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS` error.

## Basic Syntax

```sql
ST_Centroid(geometry)
```

Returns a `POINT` geometry in the same SRID as the input.

## Finding the Centroid of a Polygon

```sql
SELECT ST_AsText(
  ST_Centroid(
    ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0))', 0)
  )
) AS centroid;
```

```text
+------------+
| centroid   |
+------------+
| POINT(2 2) |
+------------+
```

A 4x4 square centered at the origin has its centroid at (2, 2).

## Centroid of an Irregular Polygon

```sql
SELECT ST_AsText(
  ST_Centroid(
    ST_GeomFromText('POLYGON((0 0, 6 0, 6 2, 0 2, 0 0))', 0)
  )
) AS centroid;
```

```text
+------------+
| centroid   |
+------------+
| POINT(3 1) |
+------------+
```

## Practical Example: Zone Center Points

A common use case is labeling map zones with their center point for display:

```sql
CREATE TABLE districts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  boundary POLYGON NOT NULL SRID 0,
  SPATIAL INDEX (boundary)
);

INSERT INTO districts (name, boundary) VALUES
  ('Zone A', ST_GeomFromText('POLYGON((0 0, 10 0, 10 8, 0 8, 0 0))', 0)),
  ('Zone B', ST_GeomFromText('POLYGON((12 0, 20 0, 20 6, 12 6, 12 0))', 0));

SELECT
  name,
  ST_AsText(ST_Centroid(boundary)) AS center_point,
  ST_X(ST_Centroid(boundary)) AS center_x,
  ST_Y(ST_Centroid(boundary)) AS center_y
FROM districts;
```

```text
+--------+--------------+----------+----------+
| name   | center_point | center_x | center_y |
+--------+--------------+----------+----------+
| Zone A | POINT(5 4)   |        5 |        4 |
| Zone B | POINT(16 3)  |       16 |        3 |
+--------+--------------+----------+----------+
```

## Centroid with MultiPolygon

For multipolygons, the centroid is the area-weighted average of the centroids of the component polygons:

```sql
SELECT ST_AsText(
  ST_Centroid(
    ST_GeomFromText(
      'MULTIPOLYGON(((0 0, 2 0, 2 2, 0 2, 0 0)),
                    ((4 0, 6 0, 6 2, 4 2, 4 0)))',
      0
    )
  )
) AS centroid;
```

```text
+-----------+
| centroid  |
+-----------+
| POINT(3 1)|
+-----------+
```

## Combining with ST_Distance for Nearest Center

You can combine `ST_Centroid()` with `ST_Distance()` to find which zone center is closest to a given point:

```sql
SELECT
  name,
  ST_Distance(
    ST_Centroid(boundary),
    ST_GeomFromText('POINT(5 5)', 0)
  ) AS dist_to_center
FROM districts
ORDER BY dist_to_center
LIMIT 1;
```

## Summary

`ST_Centroid()` returns the geometric center point of a polygon or multipolygon. It is useful for labeling map regions, proximity calculations relative to zone centers, and data aggregation. Combine it with `ST_X()` and `ST_Y()` to extract the individual coordinate components of the returned point.
