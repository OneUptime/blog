# How to Use h3GetResolution() and h3EdgeLengthM() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, H3, Geospatial, H3GetResolution, H3EdgeLengthM, SQL

Description: Learn how to use h3GetResolution() and h3EdgeLengthM() in ClickHouse to inspect H3 cell resolutions and edge lengths for geospatial analysis.

---

## Overview

ClickHouse has built-in support for the H3 hierarchical geospatial indexing system. `h3GetResolution()` returns the resolution level of an H3 cell index, and `h3EdgeLengthM()` returns the average edge length in meters for a given resolution. Together they help you understand the geographic granularity of your H3 data.

## H3 Resolutions Overview

H3 divides the earth into hexagonal cells at 16 resolution levels (0 to 15). Lower resolutions cover larger areas; higher resolutions are more precise.

| Resolution | Approximate Edge Length |
|------------|-------------------------|
| 0          | ~1,107 km               |
| 3          | ~59 km                  |
| 6          | ~3.2 km                 |
| 9          | ~174 m                  |
| 12         | ~9 m                    |
| 15         | ~0.5 m                  |

## h3GetResolution()

Returns the resolution level of an H3 index:

```sql
SELECT
    h3GetResolution(617733153508982783)  AS resolution
-- Returns: 8 (for a resolution 8 cell)
```

Verify multiple cell resolutions:

```sql
SELECT
    h3_index,
    h3GetResolution(h3_index) AS resolution
FROM location_events
LIMIT 10
```

## Encoding Lat/Lon to H3

Use `geoToH3()` to get H3 indexes from coordinates, then check their resolution:

```sql
SELECT
    geoToH3(37.7749, -122.4194, 9) AS sf_cell_r9,
    h3GetResolution(geoToH3(37.7749, -122.4194, 9)) AS resolution
-- resolution: 9
```

## h3EdgeLengthM()

`h3EdgeLengthM(resolution)` returns the average edge length of a hexagonal cell at the given resolution in meters:

```sql
SELECT
    resolution,
    h3EdgeLengthM(resolution) AS edge_length_m
FROM numbers(16)
ORDER BY resolution
```

Output (approximate):

```text
resolution | edge_length_m
0          | 1107712.59
3          | 59810.85
6          | 3229.48
9          | 174.38
12         | 9.42
15         | 0.51
```

## h3EdgeLengthKm()

For distances in kilometers:

```sql
SELECT
    resolution,
    h3EdgeLengthKm(resolution) AS edge_length_km
FROM numbers(16)
ORDER BY resolution
```

## Practical Use Case - Filtering by Resolution

Ensure all H3 indexes in a table have a consistent resolution:

```sql
SELECT
    h3GetResolution(cell_id) AS res,
    count() AS cell_count
FROM trips
GROUP BY res
```

If you expect all cells to be resolution 9 but some are at different resolutions (perhaps from data ingestion issues), this query reveals the discrepancy.

## Computing Cell Coverage Area

The area of an H3 hexagonal cell can be approximated from the edge length:

```sql
SELECT
    resolution,
    h3EdgeLengthM(resolution)      AS edge_m,
    h3CellAreaM2(geoToH3(0, 0, resolution)) AS area_m2
FROM numbers(10)
ORDER BY resolution
```

## H3 Hierarchy Traversal

Get the parent cell at a lower resolution and verify:

```sql
SELECT
    cell                                   AS original_cell,
    h3GetResolution(cell)                  AS original_res,
    h3ToParent(cell, 6)                    AS parent_cell_r6,
    h3GetResolution(h3ToParent(cell, 6))   AS parent_res
FROM (SELECT geoToH3(37.7749, -122.4194, 9) AS cell)
```

## Querying by Geographic Radius

Use edge length to determine the appropriate resolution for a spatial query:

```sql
-- Want ~1 km radius: use resolution 8 (edge ~460m, so ~2 rings covers 1km)
SELECT
    h3kRing(geoToH3(37.7749, -122.4194, 8), 2) AS nearby_cells
```

## Summary

`h3GetResolution()` returns the resolution level of an H3 cell index (0-15), and `h3EdgeLengthM()` provides the average hexagon edge length in meters for a given resolution. These functions are essential for validating H3 data consistency, choosing appropriate resolution levels for spatial analysis, and computing geographic coverage areas in ClickHouse.
