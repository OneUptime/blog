# Validation Summary: How to Use Count-Min Sketch in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree)
- Count-Min Sketch (as a column statistics type)
- Column statistics (`CountMin`, `TDigest`, `MinMax`)
- Bloom filter skip indexes

## Sources Consulted
- ClickHouse aggregate functions reference: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference
- ClickHouse MergeTree documentation (column statistics section): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse `ALTER TABLE ... STATISTICS` statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/statistics
- GitHub PR #65521 "Add count-min sketches as statistics type": https://github.com/ClickHouse/ClickHouse/pull/65521
- GitHub PR #89332 "Enable allow_statistics_optimize by default": https://github.com/ClickHouse/ClickHouse/pull/89332

## Issues Found
The original post was built around a fabricated API. ClickHouse does **not** provide a `countMinSketch` aggregate function, nor the `-State` / `-Merge` combinators implied by the post (`countMinSketchState`, `countMinSketchMerge`). Count-Min Sketch in ClickHouse is implemented as a column-level **statistics type** (`CountMin`) used by the query planner for selectivity estimation of equality predicates. Because nearly every code example referenced the non-existent aggregate function, the post required substantial rewrites:

- "What Is Count-Min Sketch?" — Corrected the claim that ClickHouse implements CMS "via the `countMinSketch` aggregate function"; updated to describe the `CountMin` statistics type.
- "Basic Frequency Estimation" — Replaced with "Attaching Count-Min Statistics to a Column" showing the actual syntax: `STATISTICS(CountMin)` inline and `ALTER TABLE ... ADD STATISTICS ... TYPE CountMin` plus `MATERIALIZE STATISTICS`. Also added the required `allow_experimental_statistics = 1` setting.
- "Sketching with Parameters" — The `countMinSketch(depth, width)(expr)` parameterized form is fabricated; the ClickHouse `CountMin` statistics type does not accept width/depth arguments. Replaced with a section on supported data types and supported operations (equality only).
- "Persisting Sketch State" — The `AggregateFunction(countMinSketch, String)` type and `countMinSketchState` / `countMinSketchMerge` functions do not exist. Replaced with "Enabling the Planner to Use Statistics" (covering `allow_statistics_optimize = 1`) and "Managing Statistics" (covering `DROP`, `CLEAR`, `MATERIALIZE STATISTICS`).
- "Combining Count-Min Sketch with Bloom Filters" — The Bloom filter skip-index DDL was correct; rewrote the surrounding narrative so that the `CountMin` side describes the statistics type rather than a runtime sketch.
- "Practical Use Cases" — Replaced the SQL example that used the non-existent `countMinSketchState`/`countMinSketchMerge` with a realistic example using `ALTER TABLE ... ADD STATISTICS ... TYPE CountMin` and `MATERIALIZE STATISTICS`.
- "Summary" — Rewrote to describe the actual feature (query-plan selectivity estimation) instead of mergeable runtime sketches.

## Review Notes
- Column statistics remain experimental (`allow_experimental_statistics = 1` is required to create them) and are not supported in ClickHouse Cloud at the time of writing - users on Cloud should verify availability.
- `allow_statistics_optimize` has had reported planning-overhead issues for some `GROUP BY` workloads (see issue #96068). This is version-sensitive and worth rechecking periodically.
- The post keeps the author's original section flow and tone as closely as possible given that the underlying API the post described does not exist.
