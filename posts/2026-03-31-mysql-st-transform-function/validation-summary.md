# Validation Summary: How to Use ST_Transform() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ spatial functions
- ST_Transform()
- ST_Distance()
- ST_Distance_Sphere()
- Spatial Reference Systems (SRID 4326, 3857, 3395)
- Web Mercator projection

## Sources Consulted
- MySQL 8.0 Reference Manual: ST_Transform() — https://dev.mysql.com/doc/refman/8.0/en/spatial-operator-functions.html#function_st-transform
- MySQL 8.0 Reference Manual: ST_Distance() — https://dev.mysql.com/doc/refman/8.0/en/spatial-relation-functions-object-shapes.html#function_st-distance
- MySQL 8.0 Reference Manual: ST_Distance_Sphere() — https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html#function_st-distance-sphere
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ST_SPATIAL_REFERENCE_SYSTEMS — https://dev.mysql.com/doc/refman/8.0/en/information-schema-st-spatial-reference-systems-table.html
- EPSG.io documentation for SRID 3857 (Web Mercator) — https://epsg.io/3857
- Web Mercator projection formulas for output verification

## Issues Found

### 1. Incorrect claim: ST_Distance() returns degrees for SRID 4326 (MAJOR)
**What was wrong:** The "Practical Example: Computing Accurate Distances" section stated "Distances computed in SRID 4326 (degrees) are not accurate for long distances" and labeled the ST_Distance() result as `dist_degrees`. In MySQL 8.0+, ST_Distance() on geometries with a geographic SRID (like 4326) automatically computes geodesic distances on the ellipsoid and returns the result in **meters**, not degrees.

**What was changed:** Rewrote the section header and introduction to accurately explain that ST_Distance() with SRID 4326 returns geodesic distances in meters. Renamed the alias from `dist_degrees` to `dist_geodesic_meters` and reframed the comparison to show the three methods (geodesic, spherical, projected Euclidean) with accurate descriptions of what each returns.

**Why:** This was the most critical error — it fundamentally mischaracterized MySQL 8.0+ spatial distance behavior and gave readers the wrong impression that projecting to Web Mercator was necessary for metric distances.

### 2. Misleading claim: Web Mercator (3857) for "accurate distance and area calculations" (MODERATE)
**What was wrong:** The post recommended converting to SRID 3857 (Web Mercator) for "accurate distance and area calculations in meters." Web Mercator is not suitable for accurate measurements — it distorts distances significantly, especially at higher latitudes. At NYC's latitude (~40.7°), distances are stretched by approximately 31%.

**What was changed:** Reframed the SRID 4326 to 3857 conversion section to focus on its actual use case: preparing data for web mapping tools (Google Maps, OpenStreetMap). Removed the inaccurate claim about accurate distance calculations.

**Why:** Web Mercator (EPSG:3857) is explicitly described by EPSG as "not a recognised geodetic system" with "errors of 0.7 percent in scale." Recommending it for accurate measurements is incorrect.

### 3. Misleading `dist_projected_meters` alias (MINOR)
**What was wrong:** The alias `dist_projected_meters` implied that Euclidean distance in Web Mercator gives accurate real-world meters.

**What was changed:** Renamed to `dist_mercator_meters` and added a note that Web Mercator values are distorted by the projection.

**Why:** Readers would assume the projected distance is accurate when it includes significant Mercator distortion.

### 4. Summary section referenced inaccurate distance advice (MINOR)
**What was wrong:** The summary recommended using ST_Transform() to "compute accurate metric distances by converting geographic coordinates to a projected system."

**What was changed:** Updated to recommend ST_Distance() directly on SRID 4326 for accurate distances, and reframed ST_Transform() use cases to focus on data unification and interoperability with mapping tools.

**Why:** Consistency with the corrections made to the body of the post.

## Review Notes
- The coordinate order `POINT(40.7128 -74.0060)` with SRID 4326 is correct for MySQL — SRID 4326 uses (latitude, longitude) axis order, which matches the values used (latitude 40.7128, longitude -74.0060 for NYC). However, this could confuse readers accustomed to the (longitude, latitude) convention common in many GIS tools. A brief note about MySQL's axis order for SRID 4326 could be helpful in a future revision.
- The projected output `POINT(-8238310.2 4970071.6)` was verified mathematically against the Web Mercator projection formulas and is correct.
- ST_Transform() was introduced in MySQL 8.0 with expanding SRS support in 8.0.30 and 8.0.32. The post does not mention version requirements, which could be noted in a future revision.
- The syntax, INFORMATION_SCHEMA table name, ST_SRID() vs ST_Transform() distinction, and SRID reference table are all correct.
