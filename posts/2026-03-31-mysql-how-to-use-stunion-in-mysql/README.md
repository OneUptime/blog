# How to Use ST_Union() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial Functions, GIS, Geospatial, Geometry Union

Description: Learn how to use MySQL's ST_Union() function to merge two or more geometries into a single geometry, with examples for polygons, points, and practical use cases.

---

## What Is ST_Union()?

`ST_Union()` is a MySQL spatial function that computes the geometric union of two geometry values - the combined area or shape that covers both input geometries. It removes any overlap between them and returns a single merged geometry.

Use `ST_Union()` when you need to:
- Combine overlapping or adjacent polygons into one shape
- Merge service areas or coverage zones
- Aggregate point clouds into a collection

## Syntax

```sql
ST_Union(g1, g2)
```

Returns a geometry that is the union of g1 and g2.

## Basic Example - Union of Two Polygons

```sql
SELECT ST_AsText(
  ST_Union(
    ST_GeomFromText('POLYGON((0 0, 2 0, 2 2, 0 2, 0 0))'),
    ST_GeomFromText('POLYGON((1 0, 3 0, 3 2, 1 2, 1 0))')
  )
) AS union_result;
```

The two overlapping rectangles are merged into one larger shape.

## Union of Non-Overlapping Polygons

When two polygons do not overlap or touch, `ST_Union()` returns a MULTIPOLYGON:

```sql
SELECT ST_AsText(
  ST_Union(
    ST_GeomFromText('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'),
    ST_GeomFromText('POLYGON((3 0, 4 0, 4 1, 3 1, 3 0))')
  )
) AS union_result;
-- Returns: MULTIPOLYGON(((0 0,1 0,1 1,0 1,0 0)),((3 0,4 0,4 1,3 1,3 0)))
```

## Union of Two Points

```sql
SELECT ST_AsText(
  ST_Union(
    ST_GeomFromText('POINT(1 1)'),
    ST_GeomFromText('POINT(3 3)')
  )
) AS union_result;
-- Returns: MULTIPOINT((1 1),(3 3))
```

## Practical Example - Merging Delivery Zones

```sql
CREATE TABLE delivery_zones (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100),
  area POLYGON NOT NULL,
  PRIMARY KEY (id)
);

INSERT INTO delivery_zones (name, area) VALUES
('Zone A', ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0))')),
('Zone B', ST_GeomFromText('POLYGON((3 0, 7 0, 7 4, 3 4, 3 0))'));

-- Get the combined coverage area of Zone A and Zone B
SELECT
  ST_AsText(ST_Union(a.area, b.area)) AS combined_zone
FROM delivery_zones a, delivery_zones b
WHERE a.name = 'Zone A'
  AND b.name = 'Zone B';
```

## Aggregating Multiple Zones Into One

MySQL does not have an aggregate `ST_Union()` function, but you can use nested calls or a subquery pattern. For three zones:

```sql
-- Add a third zone
INSERT INTO delivery_zones (name, area) VALUES
('Zone C', ST_GeomFromText('POLYGON((6 0, 10 0, 10 4, 6 4, 6 0))'));

-- Combine all zones using a self-join approach (works for small sets)
SELECT ST_AsText(
  ST_Union(z1.area, ST_Union(z2.area, z3.area))
) AS total_coverage
FROM delivery_zones z1, delivery_zones z2, delivery_zones z3
WHERE z1.id = 1 AND z2.id = 2 AND z3.id = 3;
```

## Checking the Area of the Union

Use `ST_Area()` to compute the total area after union:

```sql
SELECT ST_Area(
  ST_Union(
    ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0))'),  -- area = 16
    ST_GeomFromText('POLYGON((3 0, 7 0, 7 4, 3 4, 3 0))')   -- area = 16
  )
) AS union_area;
-- Returns: 28 (16 + 16 - 4 overlap = 28)
```

## ST_Union vs ST_GeomCollection

`ST_Union()` merges overlapping parts into a single geometry, while a `GEOMETRYCOLLECTION` just groups geometries without resolving overlaps:

```sql
-- ST_Union merges overlaps
SELECT ST_AsText(ST_Union(
  ST_GeomFromText('POLYGON((0 0, 3 0, 3 3, 0 3, 0 0))'),
  ST_GeomFromText('POLYGON((1 1, 4 1, 4 4, 1 4, 1 1))')
));
-- Returns a single merged POLYGON

-- GeomCollect just groups them
SELECT ST_AsText(ST_GeomCollFromText(
  'GEOMETRYCOLLECTION(POLYGON((0 0, 3 0, 3 3, 0 3, 0 0)), POLYGON((1 1, 4 1, 4 4, 1 4, 1 1)))'
));
-- Returns two separate polygons in a collection
```

## Related Spatial Functions

| Function | Purpose |
|----------|---------|
| `ST_Union(g1, g2)` | Union - all area covered by either geometry |
| `ST_Intersection(g1, g2)` | Intersection - only overlapping area |
| `ST_Difference(g1, g2)` | Difference - area in g1 but not in g2 |
| `ST_SymDifference(g1, g2)` | Symmetric difference - area in either but not both |

## Checking Union Result Type

```sql
SELECT ST_GeometryType(
  ST_Union(
    ST_GeomFromText('POLYGON((0 0, 2 0, 2 2, 0 2, 0 0))'),
    ST_GeomFromText('POLYGON((1 0, 3 0, 3 2, 1 2, 1 0))')
  )
) AS geom_type;
-- Returns: POLYGON (merged into one shape)

SELECT ST_GeometryType(
  ST_Union(
    ST_GeomFromText('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'),
    ST_GeomFromText('POLYGON((5 0, 6 0, 6 1, 5 1, 5 0))')
  )
) AS geom_type;
-- Returns: MULTIPOLYGON (separate, non-touching polygons)
```

## Summary

`ST_Union()` in MySQL computes the geometric union of two geometry values, merging overlapping areas into a single shape. It returns a POLYGON when inputs overlap or touch, and a MULTIPOLYGON when they are separate. Use it to combine coverage zones, calculate total service areas, or merge adjacent regions. Pair it with `ST_Area()` to measure the resulting coverage and with `ST_Intersection()` to identify the overlapping portion.
