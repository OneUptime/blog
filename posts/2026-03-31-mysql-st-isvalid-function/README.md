# How to Use ST_IsValid() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Spatial, Geometry, Function, GIS

Description: Learn how to use MySQL's ST_IsValid() function to check geometry validity and how to fix invalid geometries with ST_MakeValid().

---

## What is ST_IsValid()?

`ST_IsValid()` returns 1 if a geometry is valid according to the OGC standard, or 0 if it is not. Invalid geometries violate structural rules - for example, a polygon with self-intersecting edges, a ring that is not closed, or a multipolygon with overlapping components.

Operating on invalid geometries produces undefined results or errors in spatial functions like `ST_Area()`, `ST_Intersection()`, and `ST_Distance()`. Always validate imported geometry data.

## Basic Syntax

```sql
ST_IsValid(geometry)
```

Returns 1 (valid) or 0 (invalid). Returns NULL if the argument is NULL.

## Checking a Valid Geometry

```sql
-- A simple valid square
SELECT ST_IsValid(
  ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0))', 0)
) AS is_valid;
```

```text
+----------+
| is_valid |
+----------+
|        1 |
+----------+
```

## Detecting an Invalid Geometry

A self-intersecting (bowtie) polygon is invalid:

```sql
-- Figure-8 / bowtie polygon (self-intersecting)
SELECT ST_IsValid(
  ST_GeomFromText('POLYGON((0 0, 4 4, 4 0, 0 4, 0 0))', 0)
) AS is_valid;
```

```text
+----------+
| is_valid |
+----------+
|        0 |
+----------+
```

## Auditing a Table for Invalid Geometries

```sql
CREATE TABLE territories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  boundary POLYGON NOT NULL SRID 0,
  SPATIAL INDEX (boundary)
);

-- Find all invalid geometries
SELECT id, name
FROM territories
WHERE ST_IsValid(boundary) = 0;
```

## Checking Validity with ST_Validate()

MySQL also provides `ST_Validate()`, which returns the geometry itself if it is valid, or NULL if it is not:

```sql
-- Filter out rows with invalid geometries
SELECT id, name
FROM territories
WHERE ST_Validate(boundary) IS NOT NULL;
```

Note that `ST_Validate()` does not repair invalid geometries. Unlike PostGIS, which offers `ST_MakeValid()` for geometry repair, MySQL has no built-in function to fix invalid geometries. You must correct invalid geometry data at the source or rebuild it manually.

## Validating Before Insert

Use `ST_IsValid()` in application code or a trigger to prevent invalid data from entering the database:

```sql
DELIMITER //
CREATE TRIGGER validate_geometry
BEFORE INSERT ON territories
FOR EACH ROW
BEGIN
  IF ST_IsValid(NEW.boundary) = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid geometry detected';
  END IF;
END//
DELIMITER ;
```

## Common Causes of Invalid Geometries

- Self-intersecting polygon rings
- Polygon interior rings located outside the exterior ring
- Multipolygons with overlapping component polygons

Note: Some structural problems like unclosed rings or polygons with fewer than 4 points are caught earlier by MySQL as well-formedness errors. `ST_GeomFromText()` rejects these at parse time before `ST_IsValid()` is ever called.

## Testing Edge Cases

Some malformed geometries are rejected at parse time by `ST_GeomFromText()` before `ST_IsValid()` can evaluate them:

```sql
-- Unclosed ring (first != last point) - raises an error
SELECT ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4))', 0);
-- ERROR 3037 (22023): Invalid GIS data provided to function st_geomfromtext.

-- Too few points - raises an error
SELECT ST_GeomFromText('POLYGON((0 0, 1 1, 0 0))', 0);
-- ERROR 3037 (22023): Invalid GIS data provided to function st_geomfromtext.
```

These are **well-formedness** violations, not validity violations. MySQL distinguishes between the two: well-formedness is enforced at parse/storage time, while geometric validity (checked by `ST_IsValid()`) applies to structurally well-formed geometries that have geometric problems like self-intersection.

## Summary

`ST_IsValid()` checks whether a geometry conforms to OGC validity rules. Use it to audit imported spatial data, prevent invalid geometries from entering your database via triggers, and filter valid geometries with `ST_Validate()`. Always validate externally-sourced geometry data before running spatial analysis functions on it.
