# How to Use h3ToChildren() and h3ToParent() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, H3, h3ToChildren, h3ToParent, Geospatial, Hexagonal Grid, Hierarchy

Description: Learn how to navigate the H3 hexagonal hierarchy in ClickHouse using h3ToChildren() to drill down and h3ToParent() to roll up spatial data.

---

H3 indexes are organized in a hierarchical grid where each cell at resolution `r` contains approximately 7 cells at resolution `r+1`. ClickHouse exposes `h3ToChildren()` and `h3ToParent()` to traverse this hierarchy, enabling multi-resolution spatial analysis.

## h3ToParent() - Roll Up to Coarser Resolution

`h3ToParent(index, resolution)` returns the parent H3 index at the specified coarser resolution:

```sql
SELECT
    h3_index,
    h3ToParent(h3_index, 5) AS parent_r5,
    h3ToParent(h3_index, 3) AS parent_r3
FROM events
LIMIT 5;
```

This is equivalent to spatial "zoom out" - grouping fine-grained events into larger hexagonal regions.

## Aggregating at Multiple Resolutions

A common pattern is to produce a resolution-independent heatmap by rolling up to a parent cell:

```sql
SELECT
    h3ToParent(geoToH3(latitude, longitude, 9), 6) AS region,
    count() AS event_count,
    avg(value) AS avg_value
FROM sensor_data
GROUP BY region
ORDER BY event_count DESC
LIMIT 20;
```

## h3ToChildren() - Drill Down to Finer Resolution

`h3ToChildren(index, resolution)` returns an array of all child cells at the given finer resolution:

```sql
SELECT h3ToChildren(geoToH3(55.7522, 37.6156, 5), 7) AS children;
```

Each resolution-5 cell contains about 49 resolution-7 children. The count grows by roughly 7x per resolution step.

## Expanding a Region for Point-in-Cell Lookup

If you have a set of coarse regions and want to check which fine-grained events fall within them, expand the regions to children first:

```sql
SELECT count() AS events_in_region
FROM events
WHERE geoToH3(latitude, longitude, 8) IN (
    SELECT arrayJoin(h3ToChildren(region_h3_index, 8))
    FROM campaign_regions
    WHERE campaign_id = 42
);
```

## Building a Zoom-Level Heatmap

By combining `h3ToParent()` with `GROUP BY`, you can generate heatmap data for multiple zoom levels in one query:

```sql
SELECT
    resolution,
    h3ToParent(geoToH3(latitude, longitude, 9), resolution) AS cell,
    count() AS hits
FROM page_views
CROSS JOIN (SELECT number + 4 AS resolution FROM numbers(5)) AS resolutions
GROUP BY resolution, cell
ORDER BY resolution, hits DESC;
```

## Consistency Checks

You can verify that `h3ToParent` and `h3ToChildren` are inverses of each other:

```sql
SELECT
    h3_index,
    h3ToParent(h3_index, 5) AS parent,
    has(h3ToChildren(h3ToParent(h3_index, 5), 7), h3_index) AS roundtrip_ok
FROM events
LIMIT 10;
```

## Summary

`h3ToParent()` rolls up any H3 index to a coarser resolution for spatial aggregation and heatmap generation. `h3ToChildren()` expands a cell to all its finer-resolution children, enabling coverage lookups and region expansion. Together they let you navigate the full H3 hierarchy in ClickHouse queries without any external library.
