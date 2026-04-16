# Validation Summary: How to Use h3IndexesAreNeighbors() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL, H3 geospatial functions, window functions)
- Uber H3 hexagonal hierarchical geospatial indexing system
- Geospatial analytics (GPS tracking, routing, spatial clustering)

## Sources Consulted
- ClickHouse H3 functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/geo/h3
- ClickHouse other functions (neighbor): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- Uber H3 official documentation: https://h3geo.org/
- Sister posts in the same blog that use the new `geoToH3(lat, lon, resolution)` convention (e.g., `posts/2026-03-31-clickhouse-h3togeo-geotoh3/README.md`, `posts/2026-03-31-clickhouse-h3kring-h3getbasecell/README.md`)

## Issues Found

1. **`geoToH3` argument order (all code blocks)**
   - What was wrong: The post used `geoToH3(longitude, latitude, resolution)` and `geoToH3(lon, lat, res)`. As of ClickHouse v25.5, the argument order was changed to `(latitude, longitude, resolution)` to align with the upstream H3 reference library.
   - Fix: Swapped all coordinate pairs throughout the post to `(lat, lon, resolution)`. Added a clarifying note in the Basic Usage section. This also aligns with the convention already used by the sister posts in the blog.

2. **Deprecated/error-prone `neighbor()` function in "Detecting Implausible GPS Jumps" and "Verifying Routing Validity Between Zones"**
   - What was wrong: `neighbor(x, offset)` operates on the physical order of data blocks, not on the logical `ORDER BY` of the query, so it produces undefined results across block boundaries. ClickHouse now requires the `allow_deprecated_error_prone_window_functions` setting for this function and recommends proper window functions.
   - Fix: Replaced both `neighbor()` calls with `leadInFrame(...) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`, which is the supported and deterministic equivalent. Also switched the routing example from `rowNumberInAllBlocks()` to using `waypoint_sequence` directly (since `rowNumberInAllBlocks()` with an inner `ORDER BY` has similar ordering caveats).

3. **Misleading statement: "Use `h3kRing(index, 1)` to get all six neighbors"**
   - What was wrong: `h3kRing(index, 1)` actually returns 7 cells (the center cell plus its 6 neighbors), not 6.
   - Fix: Updated the sentence in the "Getting All Neighbors of a Cell" section to clarify the function returns 7 cells and that the center must be excluded (which the example already did).

4. **Incomplete claim: "every H3 hexagon has exactly six neighbors"**
   - What was wrong: While hexagons do have 6 neighbors, the H3 grid contains exactly 12 pentagon cells per resolution (one at each icosahedron vertex) which have only 5 neighbors. The original post ignored this.
   - Fix: Added the caveat about the 12 pentagon cells having 5 neighbors in the intro, summary, and the "Comparing H3 Adjacency" example comments — the code itself is unaffected since the sample location (San Francisco) is not on a pentagon.

5. **Potentially non-working correlated subquery in "Cluster Border Detection"**
   - What was wrong: The original `WHERE exists (SELECT ... arrayJoin(h3kRing(a.h3_cell, 1)) ... WHERE neighbor_cell NOT IN (SELECT h3_cell FROM active_cells))` used a correlated reference to the outer `a.h3_cell` inside an `arrayJoin`, which ClickHouse does not reliably support, and also contained a redundant `SELECT DISTINCT ... GROUP BY` combination.
   - Fix: Rewrote to materialize the active cell set once via `groupUniqArray`, then used `arrayExists` + `has()` (both native ClickHouse functions) to check if any neighbor of `a.h3_cell` is outside the active set. Removed the redundant `DISTINCT` since `GROUP BY h3_cell` already deduplicates. Logic is preserved.

## Review Notes
- The specific H3 index literal `617700169958293503` used in the "Getting All Neighbors of a Cell" example was not independently verified against a running ClickHouse instance, but it is within the valid H3 UInt64 range for resolution 9 and does not affect the syntactic correctness of the query.
- The two coordinate pairs in the Basic Usage example (~150 m apart) may resolve to either the same H3 resolution-9 cell (edge ~174 m) or to adjacent cells, depending on exact hex placement. The comment already hedges this with "should be neighbor". Left as-is.
- `leadInFrame` in ClickHouse requires the `allow_experimental_window_functions` setting in very old versions, but has been stable since v22.x and is the recommended replacement for `neighbor()`.
- The `h3kRing` function is retained in ClickHouse under that name; the upstream H3 C library renamed it to `gridDisk` in H3 v4, but ClickHouse has not mirrored the rename.
