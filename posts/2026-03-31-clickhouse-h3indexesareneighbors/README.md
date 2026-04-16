# How to Use h3IndexesAreNeighbors() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Geospatial, H3, Analytics, Location

Description: Learn how h3IndexesAreNeighbors() checks whether two H3 hexagonal cells are adjacent in ClickHouse, enabling spatial adjacency analysis and network graph construction.

---

`h3IndexesAreNeighbors(index1, index2)` returns `1` if the two H3 cells share an edge (i.e., are directly adjacent), and `0` otherwise. Both arguments must be `UInt64` H3 indexes at the same resolution. Unlike geohash, every H3 hexagon has exactly six neighbors at the same resolution (12 pentagon cells globally have five), making adjacency checks consistent and predictable. This function is useful for building spatial adjacency graphs, detecting cluster boundaries, and validating that two recorded positions represent a plausible movement.

## Basic Usage

```sql
-- Check adjacency between two H3 cells at resolution 9
-- Note: as of ClickHouse v25.5, geoToH3 takes (lat, lon, resolution)
SELECT
    h3IndexesAreNeighbors(
        geoToH3(37.7749, -122.4194, 9),   -- San Francisco cell A
        geoToH3(37.7760, -122.4205, 9)    -- Nearby cell (should be neighbor)
    ) AS are_neighbors;
```

```text
are_neighbors
1
```

```sql
-- Non-adjacent cells (far apart)
SELECT
    h3IndexesAreNeighbors(
        geoToH3(37.7749, -122.4194, 9),
        geoToH3(34.0522, -118.2437, 9)    -- Los Angeles
    ) AS are_neighbors;
```

```text
are_neighbors
0
```

## Getting All Neighbors of a Cell

`h3kRing(index, 1)` returns 7 cells: the cell itself plus its 6 neighbors. Exclude the center to check each neighbor for adjacency.

```sql
-- List all six neighbors of a cell and verify each with h3IndexesAreNeighbors
SELECT
    neighbor_cell,
    h3IndexesAreNeighbors(
        617700169958293503,
        neighbor_cell
    ) AS confirmed_neighbor
FROM (
    SELECT arrayJoin(h3kRing(617700169958293503, 1)) AS neighbor_cell
)
WHERE neighbor_cell != 617700169958293503;  -- exclude the center cell itself
```

## Detecting Implausible GPS Jumps

If two consecutive GPS pings are not from neighboring cells, the movement may be invalid (GPS error or teleportation).

```sql
-- Flag GPS events where consecutive positions are non-adjacent
SELECT
    device_id,
    event_time,
    current_cell,
    next_cell,
    NOT h3IndexesAreNeighbors(current_cell, next_cell) AS suspicious_jump
FROM (
    SELECT
        device_id,
        event_time,
        geoToH3(latitude, longitude, 9) AS current_cell,
        leadInFrame(geoToH3(latitude, longitude, 9)) OVER (
            PARTITION BY device_id
            ORDER BY event_time
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS next_cell
    FROM gps_track
    WHERE device_id = 'device_001'
      AND event_time >= today()
)
WHERE next_cell != 0
ORDER BY event_time;
```

## Building a Spatial Adjacency Graph

```sql
-- Create edges between pairs of H3 cells that are neighbors
SELECT
    a.h3_cell AS cell_a,
    b.h3_cell AS cell_b,
    h3IndexesAreNeighbors(a.h3_cell, b.h3_cell) AS adjacent
FROM (
    SELECT DISTINCT geoToH3(latitude, longitude, 7) AS h3_cell
    FROM location_events
    WHERE event_time >= today() - 7
) a
CROSS JOIN (
    SELECT DISTINCT geoToH3(latitude, longitude, 7) AS h3_cell
    FROM location_events
    WHERE event_time >= today() - 7
) b
WHERE
    a.h3_cell < b.h3_cell   -- avoid duplicate pairs
    AND h3IndexesAreNeighbors(a.h3_cell, b.h3_cell) = 1;
```

## Cluster Border Detection

Cells that are in a cluster but adjacent to cells outside the cluster form the border.

```sql
-- Find H3 cells on the border of a hotspot cluster
WITH active_cells AS (
    SELECT geoToH3(latitude, longitude, 9) AS h3_cell
    FROM location_events
    WHERE event_time >= today()
    GROUP BY h3_cell
    HAVING count() > 100
),
active_set AS (
    SELECT groupUniqArray(h3_cell) AS cells FROM active_cells
)
SELECT
    a.h3_cell AS border_cell
FROM active_cells a
CROSS JOIN active_set s
WHERE arrayExists(
    c -> c != a.h3_cell AND NOT has(s.cells, c),
    h3kRing(a.h3_cell, 1)
);
```

## Verifying Routing Validity Between Zones

```sql
-- Check if consecutive delivery zones are adjacent (valid routing)
SELECT
    route_id,
    waypoint_sequence AS step,
    zone_cell,
    next_zone_cell,
    h3IndexesAreNeighbors(zone_cell, next_zone_cell) AS valid_step
FROM (
    SELECT
        route_id,
        waypoint_sequence,
        geoToH3(latitude, longitude, 7) AS zone_cell,
        leadInFrame(geoToH3(latitude, longitude, 7)) OVER (
            PARTITION BY route_id
            ORDER BY waypoint_sequence
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS next_zone_cell
    FROM delivery_routes
    WHERE route_id = 'R-12345'
)
WHERE next_zone_cell != 0
ORDER BY waypoint_sequence;
```

## Comparing H3 Adjacency with Geohash Proximity

```sql
-- H3 hexagons have 6 neighbors (12 pentagon cells globally have 5); geohash neighbors vary
SELECT
    -- Count H3 neighbors (6 for hexagons, 5 for the 12 pentagon cells)
    length(arrayFilter(c -> h3IndexesAreNeighbors(
        geoToH3(37.7749, -122.4194, 9),
        c
    ), h3kRing(geoToH3(37.7749, -122.4194, 9), 1))) AS h3_neighbor_count;
```

```text
h3_neighbor_count
6
```

## Summary

`h3IndexesAreNeighbors(index1, index2)` returns `1` if two H3 cells at the same resolution share an edge. Use it to validate GPS movement continuity by checking consecutive cell adjacency, build spatial adjacency graphs for network analysis, detect cluster borders where active cells meet inactive ones, and verify routing plans. H3's hexagonal grid gives six neighbors per hexagon at the same resolution (the 12 pentagon cells per resolution have five), making adjacency semantics consistent and predictable compared to square or geohash grids.
