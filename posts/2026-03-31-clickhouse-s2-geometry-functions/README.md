# How to Use S2 Geometry Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S2 Geometry, Geospatial, geoToS2, s2ToGeo, s2GetNeighbors, Location

Description: Learn how to use S2 geometry functions in ClickHouse including geoToS2(), s2ToGeo(), s2GetNeighbors(), and s2RectAdd() for spherical spatial indexing.

---

S2 is Google's spherical geometry library that maps the Earth's surface onto a unit sphere and subdivides it into hierarchical cells. ClickHouse includes a suite of S2 functions that allow you to encode coordinates as S2 cell IDs, find neighbours, build bounding regions, and convert back to latitude/longitude.

## Converting Coordinates to S2 Cell IDs

`geoToS2(longitude, latitude)` converts a WGS84 coordinate pair to an S2 cell ID at the finest resolution (level 30):

```sql
SELECT geoToS2(37.6156, 55.7522) AS s2_cell_id;
```

```text
s2_cell_id
-------------------
4836318965958897664
```

Note the argument order is `(longitude, latitude)`, matching most ClickHouse geo functions.

## Converting S2 IDs Back to Coordinates

`s2ToGeo(s2_id)` returns a tuple `(longitude, latitude)` for the center of the S2 cell:

```sql
SELECT
    s2_id,
    s2ToGeo(s2_id).1 AS longitude,
    s2ToGeo(s2_id).2 AS latitude
FROM locations
LIMIT 5;
```

## Finding Neighboring Cells

`s2GetNeighbors(s2_id)` returns an array of the 4 edge-adjacent S2 cells at the same level:

```sql
SELECT s2GetNeighbors(geoToS2(37.6156, 55.7522)) AS neighbors;
```

This is useful for proximity lookups - you can check whether a point's S2 cell is in the neighbor list of a target cell:

```sql
SELECT count() AS nearby_events
FROM events
WHERE has(s2GetNeighbors(geoToS2(37.6156, 55.7522)), geoToS2(longitude, latitude));
```

## Building a Bounding Rectangle

`s2RectAdd(s2PointLow, s2PointHigh, s2Point)` incrementally expands an S2 latitude/longitude rectangle to contain a given cell. It takes three UInt64 arguments — the low and high points of the existing rectangle and the new point to include — and returns a tuple `(s2PointLow, s2PointHigh)`:

```sql
SELECT s2RectAdd(
    4573898034058387968,       -- existing rect low
    4573898034058387968,       -- existing rect high
    geoToS2(37.6156, 55.7522) -- point to add
) AS expanded_rect;
```

`s2RectUnion(s2Rect1PointLow, s2Rect1PointHigh, s2Rect2PointLow, s2Rect2PointHigh)` computes the smallest rectangle containing two input rectangles:

```sql
SELECT s2RectUnion(
    4573898034058387968, 4574438030741498880,  -- rect 1 (low, high)
    4836318965958897664, 4836339599498100736   -- rect 2 (low, high)
) AS union_rect;
```

## Checking Cell Containment

`s2RectContains(s2PointLow, s2PointHigh, s2Point)` checks whether a bounding rectangle contains a given S2 cell. It takes three UInt64 arguments — the low and high points of the rectangle and the point to test:

```sql
SELECT s2RectContains(
    4573898034058387968,       -- rect low
    4836339599498100736,       -- rect high
    geoToS2(37.6156, 55.7522) -- point to check
) AS is_contained;
```

## Indexing with S2

Because S2 IDs are UInt64 values, you can create a primary or skip index on them for fast spatial range scans:

```sql
CREATE TABLE events_s2
(
    event_id    UInt64,
    s2_id       UInt64,
    event_time  DateTime,
    payload     String
)
ENGINE = MergeTree
ORDER BY (s2_id, event_time);
```

## Comparison with H3

| Feature | H3 | S2 |
|---------|----|----|
| Cell shape | Hexagonal | Quadrilateral |
| Neighbour count | 6 | 4 |
| Hierarchy levels | 16 | 31 |
| ClickHouse support | Full | Core functions |

## Summary

ClickHouse's S2 functions - `geoToS2()`, `s2ToGeo()`, `s2GetNeighbors()`, `s2RectAdd()`, and `s2RectContains()` - enable spherical spatial indexing using Google's S2 library. S2 cell IDs are UInt64 values that sort well, making them efficient primary key components for geospatial tables. Use S2 when you need quadrilateral cells or when your pipeline already produces S2 IDs.
