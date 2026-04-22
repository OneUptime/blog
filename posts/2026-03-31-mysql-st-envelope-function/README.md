# How to Use ST_Envelope() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial, Geometry, Function, GIS

Description: Learn how to use MySQL's ST_Envelope() function to compute the minimum bounding rectangle of any geometry for spatial indexing and filtering.

---

## What is ST_Envelope()?

`ST_Envelope()` returns the minimum bounding rectangle (MBR) of a geometry - the smallest axis-aligned rectangle that completely contains the geometry. For non-degenerate geometries, the result is a `POLYGON` with five points (four corners plus the closing point). For degenerate cases such as a single point or a horizontal/vertical line segment, the function returns the point or line segment itself.

The MBR is the foundation of MySQL's spatial index (R-tree). Understanding `ST_Envelope()` helps you write more efficient spatial queries.

## Basic Syntax

```sql
ST_Envelope(geometry)
```

Returns a `POLYGON` representing the bounding box of the input geometry.

## Bounding Box of a Linestring

```sql
SELECT ST_AsText(
  ST_Envelope(
    ST_GeomFromText('LINESTRING(1 3, 5 1, 9 7)', 0)
  )
) AS envelope;
```

```text
+--------------------------------------+
| envelope                             |
+--------------------------------------+
| POLYGON((1 1,9 1,9 7,1 7,1 1))      |
+--------------------------------------+
```

The bounding box spans from (1,1) at the lower-left to (9,7) at the upper-right.

## Bounding Box of a Polygon

```sql
SELECT ST_AsText(
  ST_Envelope(
    ST_GeomFromText('POLYGON((2 2, 8 2, 5 8, 2 2))', 0)
  )
) AS envelope;
```

```text
+--------------------------------------+
| envelope                             |
+--------------------------------------+
| POLYGON((2 2,8 2,8 8,2 8,2 2))      |
+--------------------------------------+
```

## Practical Use: Bounding Box Filtering

`ST_Envelope()` is useful for quick pre-filtering before expensive exact spatial tests. An MBR check is much faster than a full `ST_Within()` or `ST_Intersects()` check:

```sql
CREATE TABLE regions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  boundary POLYGON NOT NULL SRID 0,
  SPATIAL INDEX (boundary)
);

-- Fast bounding-box pre-filter
SELECT name
FROM regions
WHERE MBRIntersects(
  boundary,
  ST_Envelope(ST_GeomFromText('POLYGON((3 3, 7 3, 7 7, 3 7, 3 3))', 0))
);
```

## Extracting MBR Coordinates

Combine `ST_Envelope()` with `ST_X()` and `ST_Y()` to extract bounding box coordinates:

```sql
SELECT
  name,
  ST_X(ST_PointN(ST_ExteriorRing(ST_Envelope(boundary)), 1)) AS min_x,
  ST_Y(ST_PointN(ST_ExteriorRing(ST_Envelope(boundary)), 1)) AS min_y,
  ST_X(ST_PointN(ST_ExteriorRing(ST_Envelope(boundary)), 3)) AS max_x,
  ST_Y(ST_PointN(ST_ExteriorRing(ST_Envelope(boundary)), 3)) AS max_y
FROM regions;
```

## Generating Bounding Boxes for Export

When exporting data to GeoJSON or other formats, bounding boxes are often required:

```sql
SELECT
  id,
  name,
  ST_AsGeoJSON(ST_Envelope(boundary)) AS bbox_geojson
FROM regions;
```

## Envelope of a Point

For a single `POINT`, the envelope is degenerate - MySQL returns the point itself rather than a polygon:

```sql
SELECT ST_AsText(
  ST_Envelope(ST_GeomFromText('POINT(5 5)', 0))
) AS envelope;
-- Returns POINT(5 5) - degenerate case
```

## Envelope vs MBR Functions

MySQL also has `MBRContains()`, `MBRIntersects()`, and related functions that operate on minimum bounding rectangles directly without calling `ST_Envelope()` explicitly. These are optimized for index use and preferred for filtering queries.

## Summary

`ST_Envelope()` returns the minimum bounding rectangle of any geometry as a polygon. Use it to understand the spatial extent of geometries, build bounding-box pre-filters for performance optimization, and extract coordinate ranges for data export or visualization. For direct bounding-box spatial queries, use the `MBR*` family of functions which leverage the spatial index automatically.
