# Validation Summary: How to Use ST_X() and ST_Y() in MySQL to Extract Coordinates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- SQL (DDL, DML, spatial queries)
- SRID 4326 (WGS 84) geographic coordinate system
- OpenGIS / EPSG spatial reference system conventions

## Sources Consulted
- MySQL 8.0 Reference Manual — Spatial Function Reference: https://dev.mysql.com/doc/refman/8.0/en/spatial-function-reference.html
- MySQL 8.0 Reference Manual — ST_X(): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html#function_st-x
- MySQL 8.0 Reference Manual — ST_Y(): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html#function_st-y
- MySQL 8.0 Reference Manual — ST_Longitude(): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html#function_st-longitude
- MySQL 8.0 Reference Manual — ST_Latitude(): https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html#function_st-latitude
- MySQL 8.0 Reference Manual — ST_GeomFromText(): https://dev.mysql.com/doc/refman/8.0/en/gis-wkt-functions.html#function_st-geomfromtext
- MySQL 8.0 Reference Manual — Spatial Reference System Support: https://dev.mysql.com/doc/refman/8.0/en/spatial-reference-systems.html
- EPSG:4326 (WGS 84) axis order definition (latitude, longitude): https://epsg.io/4326

## Issues Found

### 1. Critical: ST_X/ST_Y axis mapping completely inverted for SRID 4326
**What was wrong:** The post claimed that `ST_X()` returns longitude and `ST_Y()` returns latitude for geographic (WGS 84 / SRID 4326) coordinate systems. This is backwards. As of MySQL 8.0.12, `ST_X()` returns the value of the **first axis** defined in the SRS. For EPSG:4326, the first axis is **latitude** and the second axis is **longitude**. Therefore `ST_X()` = latitude and `ST_Y()` = longitude for SRID 4326.

**What was changed:** Corrected all descriptions, column aliases, comments, the Mermaid diagram, the Syntax section, the Best Practices section, and the Summary to accurately reflect that ST_X = latitude and ST_Y = longitude for SRID 4326.

**Why:** This is the core technical claim of the article and affects every code example and explanation. The MySQL 8.0.12 release notes explicitly state: "the X coordinate is considered to refer to the axis that appears first in the Point spatial reference system (SRS) definition." For EPSG:4326, that first axis is latitude.

### 2. Critical: WKT coordinate order wrong for SRID 4326 — would cause runtime errors
**What was wrong:** All `ST_GeomFromText()` calls used `POINT(longitude latitude)` order, e.g., `POINT(-73.7781 40.6413)` for JFK. For SRID 4326 with the default `axis-order=srid-defined`, MySQL interprets the first value as latitude (first axis). This means -73.7781 would be treated as latitude, and critically, the LAX insert `POINT(-118.4085 33.9425)` would **fail with ER_LATITUDE_OUT_OF_RANGE** because -118.4085 exceeds the valid latitude range of [-90, 90].

**What was changed:** Reversed the coordinate order in all WKT strings to `POINT(latitude longitude)`, e.g., `POINT(40.6413 -73.7781)` for JFK, matching the SRID 4326 axis order.

**Why:** Without this fix, the INSERT statement would error on the LAX row, and any rows that did insert (where the swapped values happened to fall within valid ranges) would store geographically incorrect data.

### 3. ST_Longitude/ST_Latitude incorrectly described as aliases for ST_X/ST_Y
**What was wrong:** The Syntax section stated `ST_Longitude(point) -- alias for ST_X on geographic SRS` and `ST_Latitude(point) -- alias for ST_Y on geographic SRS`. For SRID 4326, `ST_Longitude` is equivalent to `ST_Y` (second axis = longitude), and `ST_Latitude` is equivalent to `ST_X` (first axis = latitude) — the opposite of what was claimed.

**What was changed:** Updated the syntax comments and the ST_Longitude/ST_Latitude section description to correctly state the equivalences: `ST_Longitude` = `ST_Y` and `ST_Latitude` = `ST_X` for SRID 4326. Changed the section description from "named aliases" to "semantic accessors that return coordinates by geographic meaning rather than axis position."

**Why:** Calling them "aliases for ST_X/ST_Y" is misleading. They are semantically distinct — ST_Longitude always returns longitude and ST_Latitude always returns latitude, regardless of which axis position those correspond to in the SRS.

### 4. Filter query conditions inverted
**What was wrong:** The "Northern Hemisphere, West of Greenwich" filter used `ST_X(location) < 0` (for "west") and `ST_Y(location) > 0` (for "north"). With the corrected axis mapping (ST_X = latitude, ST_Y = longitude), "north" requires `ST_X > 0` (positive latitude) and "west" requires `ST_Y < 0` (negative longitude).

**What was changed:** Corrected the WHERE clause to `ST_X(location) > 0 AND ST_Y(location) < 0`. Also swapped the column aliases in the SELECT to `ST_X(location) AS lat, ST_Y(location) AS lon`.

**Why:** The original conditions would have selected points with negative latitude (Southern Hemisphere) and positive longitude (East of Greenwich) — the opposite of the stated intent.

### 5. Bounding box filter conditions inverted
**What was wrong:** The bounding box query used `ST_X(location) BETWEEN -130 AND -60` (intended for longitude range) and `ST_Y(location) BETWEEN 25 AND 50` (intended for latitude range). With the corrected axis mapping, ST_X = latitude and ST_Y = longitude.

**What was changed:** Corrected to `ST_X(location) BETWEEN 25 AND 50` (latitude) and `ST_Y(location) BETWEEN -130 AND -60` (longitude).

**Why:** The original conditions would filter by the wrong coordinate dimensions.

### 6. Update example had swapped coordinate corrections
**What was wrong:** The update section used `ST_X(location, -73.7790)` to "correct a longitude" and `ST_Y(location, 40.6420)` to "correct a latitude." With ST_X = latitude and ST_Y = longitude for SRID 4326, these are backwards.

**What was changed:** Changed to `ST_X(location, 40.6420)` for correcting latitude and `ST_Y(location, -73.7790)` for correcting longitude. Updated comments and output table accordingly.

**Why:** Using ST_X to set a longitude value would overwrite the latitude with a longitude value, corrupting the stored coordinate.

## Review Notes
- The EPSG:4326 axis order (latitude-first) is a common source of confusion in spatial programming. Many libraries and older conventions use longitude-first (x, y) order, but MySQL 8.0.12+ follows the SRS-defined axis order by default. The `ST_GeomFromText()` function accepts an optional `axis-order=long-lat` parameter if developers prefer longitude-first WKT input, but `ST_X()`/`ST_Y()` will still return values based on the SRS axis order regardless.
- The `ST_Longitude()` and `ST_Latitude()` functions (added in MySQL 8.0.12) are strongly recommended over `ST_X()`/`ST_Y()` when working with geographic SRS, as they eliminate axis-order confusion entirely.
- The midpoint calculation shown is a rough approximation that works for nearby points but becomes inaccurate over large distances due to Earth's curvature. The post correctly qualifies this as a "rough average."
- All computed output values (midpoints, filter results, bounding box results) were manually verified against the corrected data and are arithmetically correct.
