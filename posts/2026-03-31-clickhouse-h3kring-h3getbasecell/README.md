# How to Use h3kRing() and h3GetBaseCell() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, H3, h3kRing, h3GetBaseCell, Geospatial, Hexagonal Grid, Location

Description: Learn how to use h3kRing() to find neighboring H3 cells and h3GetBaseCell() to identify the base cell index of any H3 index in ClickHouse.

---

ClickHouse's H3 library exposes the full Uber H3 API, including neighbour traversal with `h3kRing()` and base-cell lookup with `h3GetBaseCell()`. These functions are essential for proximity searches and hierarchical spatial grouping.

## h3kRing() - Disk of Neighbors

`h3kRing(index, k)` returns an array of all H3 cells within `k` grid steps (rings) of the given cell, including the cell itself.

```sql
SELECT h3kRing(geoToH3(55.7522, 37.6156, 7), 1) AS neighbors;
```

```text
neighbors
-----------
[617754910580965375, 617754910248189951, 617754910248714239, ...]
```

For `k = 1` you get 7 cells (the center plus its 6 immediate neighbors). For `k = 2` you get 19, and the count follows the formula `3k^2 + 3k + 1`.

## Finding All POIs Near a Cell

A typical use case is finding all events or points of interest within a radius expressed in grid steps:

```sql
SELECT
    poi_name,
    h3_index
FROM pois
WHERE h3_index IN (
    SELECT arrayJoin(h3kRing(geoToH3(55.7522, 37.6156, 7), 2))
);
```

## Counting Nearby Events per Ring

You can use `h3Distance()` combined with `h3kRing()` to segment results by ring distance:

```sql
SELECT
    h3Distance(geoToH3(55.7522, 37.6156, 7), h3_index) AS ring,
    count() AS event_count
FROM events
WHERE h3_index IN (
    SELECT arrayJoin(h3kRing(geoToH3(55.7522, 37.6156, 7), 3))
)
GROUP BY ring
ORDER BY ring;
```

## h3GetBaseCell() - Base Cell Lookup

Every H3 index belongs to one of 122 base cells. `h3GetBaseCell(index)` returns the integer ID of the base cell for any resolution:

```sql
SELECT
    h3_index,
    h3GetBaseCell(h3_index) AS base_cell
FROM locations
LIMIT 5;
```

Base cells are useful for coarse spatial partitioning - grouping data by base cell is much faster than full resolution grouping when you only need continent or large-region level analysis.

## Partitioning by Base Cell

```sql
SELECT
    h3GetBaseCell(geoToH3(latitude, longitude, 5)) AS region,
    count() AS visits
FROM web_events
GROUP BY region
ORDER BY visits DESC
LIMIT 10;
```

## Combining Both Functions

A real-world pattern is to find all base cells represented in a ring around a point:

```sql
SELECT DISTINCT h3GetBaseCell(neighbor) AS base_cell
FROM (
    SELECT arrayJoin(h3kRing(geoToH3(55.7522, 37.6156, 4), 5)) AS neighbor
);
```

## Summary

`h3kRing()` enables efficient disk-based neighbour lookups by returning all H3 cells within `k` steps of a given index, making it ideal for proximity searches. `h3GetBaseCell()` maps any H3 cell to one of 122 base cells, providing a fast coarse-grained spatial grouping key. Together they cover neighbourhood traversal and hierarchical spatial analysis in ClickHouse.
