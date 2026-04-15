# How to Use polygonsSymDifference() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, Polygon, polygonsSymDifference, Geo Function

Description: Learn how to use polygonsSymDifference() in ClickHouse to compute the symmetric difference between two polygons for geospatial analysis.

---

The `polygonsSymDifferenceCartesian()` and `polygonsSymDifferenceSpherical()` functions in ClickHouse compute the symmetric difference between two polygons - returning the area that belongs to one polygon or the other, but not both. This is the geospatial equivalent of an XOR operation. Use the `Cartesian` variant for planar coordinates and the `Spherical` variant for geographic (longitude/latitude) coordinates.

## What is Symmetric Difference?

The symmetric difference of two polygons A and B contains all points that are in A but not B, plus all points that are in B but not A. If the polygons overlap, the overlap region is excluded from the result. This is useful for identifying non-overlapping portions between two regions.

## Basic Syntax

```sql
SELECT polygonsSymDifferenceCartesian(polygon1, polygon2)
-- or for geographic coordinates:
SELECT polygonsSymDifferenceSpherical(polygon1, polygon2)
```

Both arguments must be arrays of arrays of coordinate pairs (arrays of rings), where the first ring is the outer boundary and subsequent rings are holes.

## Example: Symmetric Difference of Two Regions

```sql
SELECT polygonsSymDifferenceCartesian(
    [[(0., 0.), (10., 0.), (10., 10.), (0., 10.), (0., 0.)]],
    [[(5., 5.), (15., 5.), (15., 15.), (5., 15.), (5., 5.)]]
) AS sym_diff
```

This returns the combined area of both squares minus their overlapping 5x5 region in the center.

## Practical Use Case: Service Area Exclusion

Suppose you have two delivery zones and want to find the parts of each zone that are not shared:

```sql
WITH
    [[(37.6, 55.7), (37.7, 55.7), (37.7, 55.8), (37.6, 55.8), (37.6, 55.7)]] AS zone_a,
    [[(37.65, 55.72), (37.75, 55.72), (37.75, 55.82), (37.65, 55.82), (37.65, 55.72)]] AS zone_b
SELECT
    polygonsSymDifferenceSpherical(zone_a, zone_b) AS exclusive_areas,
    length(exclusive_areas) AS num_rings
```

This identifies portions of each delivery zone that are exclusively served by one provider and not the other.

## Change Detection Between Two Time Periods

```sql
SELECT
    region_id,
    polygonsSymDifferenceCartesian(
        boundary_2023,
        boundary_2024
    ) AS changed_area
FROM region_boundaries
WHERE region_id = 'downtown_district'
```

This query highlights which parts of a district boundary changed between years - useful for urban planning analytics.

## Combining with polygonArea()

```sql
SELECT
    region_id,
    polygonAreaCartesian(polygonsSymDifferenceCartesian(region_2023, region_2024)) AS changed_area_size
FROM district_boundaries
ORDER BY changed_area_size DESC
```

By wrapping the result in `polygonAreaCartesian()` (or `polygonAreaSpherical()` for geographic coordinates), you can quantify how much area changed between two versions of a region.

## Handling Empty Results

When two polygons do not overlap at all, the symmetric difference returns the union of both polygons. When they are identical, it returns an empty polygon. You can check the result with:

```sql
SELECT
    empty(polygonsSymDifferenceCartesian(poly_a, poly_b)) AS are_identical
FROM polygon_pairs
```

## Performance Considerations

- Polygons with many vertices are more expensive to compute. Simplify polygons before storing them if exact boundaries are not required.
- Store polygon data using the `Array(Array(Tuple(Float64, Float64)))` type for efficient processing.
- Use materialized views to precompute symmetric differences for frequently compared region pairs.

## Summary

`polygonsSymDifferenceCartesian()` and `polygonsSymDifferenceSpherical()` are powerful geospatial functions in ClickHouse for computing non-overlapping portions between two polygon regions. They are ideal for change detection, territory exclusion analysis, and identifying unique coverage areas. Combined with `polygonAreaCartesian()` or `polygonAreaSpherical()`, they enable quantitative spatial comparison at scale.
