# Validation Summary: How to Use ST_IsValid() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- ST_IsValid()
- ST_Validate()
- ST_GeomFromText()
- OGC geometry validity standards

## Sources Consulted
- MySQL 8.0 Reference Manual: Spatial Convenience Functions — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html
- MySQL 8.0 Reference Manual: Geometry Well-Formedness and Validity — https://dev.mysql.com/doc/refman/8.0/en/geometry-well-formedness-validity.html
- MySQL 8.0.24 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-24.html
- MySQL 8.4 Reference Manual: Spatial Convenience Functions — https://dev.mysql.com/doc/refman/8.4/en/spatial-convenience-functions.html

## Issues Found

### 1. ST_MakeValid() does not exist in MySQL (Critical)
**What was wrong:** The post claimed "MySQL 8.0.24 introduced ST_MakeValid() to repair invalid geometries" and included an UPDATE example using it. ST_MakeValid() is a PostGIS function; it does not exist in any version of MySQL.
**What was changed:** Replaced the entire "Fixing Invalid Geometries with ST_MakeValid()" section with a "Checking Validity with ST_Validate()" section that correctly describes MySQL's ST_Validate() function (returns the geometry if valid, NULL if not) and notes that MySQL has no built-in geometry repair function.
**Why:** ST_MakeValid() would produce an error if run in MySQL. The description of its behavior (splitting self-intersecting polygons into multipolygons) describes PostGIS, not MySQL.

### 2. Unclosed ring edge case would error, not return 0 (Significant)
**What was wrong:** The post showed `ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4))', 0)` as an example that ST_IsValid() would evaluate as invalid. In reality, ST_GeomFromText() rejects unclosed rings at parse time with ERROR 3037.
**What was changed:** Rewrote the edge case to show that this is a well-formedness error caught at parse time, not a validity issue checked by ST_IsValid().
**Why:** MySQL distinguishes well-formedness (enforced at parse/storage time) from geometric validity (checked by ST_IsValid()). Unclosed rings violate well-formedness rules.

### 3. Too-few-points polygon edge case would error, not return 0 (Significant)
**What was wrong:** The post showed `ST_GeomFromText('POLYGON((0 0, 1 1, 0 0))', 0)` as returning 0 from ST_IsValid(). This polygon has only 3 points, violating the well-formedness rule requiring at least 4 points. ST_GeomFromText() raises an error.
**What was changed:** Rewrote alongside the unclosed ring example to correctly show the error behavior and explain well-formedness vs. validity.
**Why:** Same reason as issue #2 — this is a well-formedness violation, not a validity violation.

### 4. Incorrect items in "Common Causes of Invalid Geometries" list
**What was wrong:** Listed "Rings that are not closed" and "Polygons with fewer than 4 points" as causes of invalid geometries. These are well-formedness violations caught at parse time, not validity issues. Also listed "duplicate consecutive points" which is not explicitly documented as a validity violation in MySQL.
**What was changed:** Replaced with accurate validity violations (self-intersecting rings, interior rings outside exterior ring, overlapping multipolygon components) and added a note explaining that well-formedness issues are caught earlier.
**Why:** Accuracy — the distinction between well-formedness and validity is important in MySQL's spatial model.

### 5. Description and summary referenced ST_MakeValid()
**What was wrong:** The post description and summary section mentioned ST_MakeValid(), which does not exist in MySQL.
**What was changed:** Updated to reference ST_Validate() and the well-formedness/validity distinction instead.
**Why:** Consistency with the corrected content.

## Review Notes
- The valid square example and bowtie/self-intersecting polygon example are both correct — self-intersecting polygons are syntactically well-formed but geometrically invalid, so ST_GeomFromText() accepts them and ST_IsValid() correctly returns 0.
- The trigger example for validating before insert is correct and idiomatic MySQL.
- The auditing query pattern is correct.
- Users looking for geometry repair functionality in MySQL may need to use application-level logic or consider PostGIS, which does offer ST_MakeValid().
