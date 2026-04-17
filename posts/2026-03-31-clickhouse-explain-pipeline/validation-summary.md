# Validation Summary: How to Use EXPLAIN PIPELINE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- EXPLAIN PIPELINE statement
- ClickHouse query pipeline / processors framework

## Sources Consulted
- ClickHouse official docs — EXPLAIN statement: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse source — JoiningTransform: https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/Transforms/JoiningTransform.cpp
- ClickHouse source — ResizeProcessor: https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/ResizeProcessor.h
- ClickHouse source — MergeTreeSelectProcessor: https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/MergeTreeSelectProcessor.cpp
- ClickHouse source — MergeTreeSelectAlgorithms: https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/MergeTreeSelectAlgorithms.h

## Issues Found

1. **Incorrect processor name `JoinTransform`.** In the "Unnecessary Serialization" section, the sample output listed `JoinTransform × 8`. The actual ClickHouse processor class is `JoiningTransform` (see `src/Processors/Transforms/JoiningTransform.cpp`). Fixed the sample output to use `JoiningTransform × 8`.

2. **Incorrect description of `graph = 1` option.** The post stated that `graph = 1` "renders the pipeline in a compact single-line-per-step format". According to the official EXPLAIN docs, `graph = 1` prints a graph described in DOT graph description language (for use with Graphviz), not a compact text format. Rewrote the section heading and body so it correctly describes DOT output.

3. **Incorrect standalone use of `compact = 1`.** The post showed `EXPLAIN PIPELINE compact = 1 SELECT ...` as if it modified the default text output. Per the docs, `compact` only takes effect when `graph` is also enabled (and is `1` by default in that case). Updated the example to `EXPLAIN PIPELINE graph = 1, compact = 1 SELECT ...` and clarified that compact collapses parallel processors in the DOT graph, not the default text output.

4. **Updated the summary paragraph** to reflect the corrected understanding of `graph = 1` (producing DOT output) rather than the misleading "compact = 1 for verbose output" guidance.

## Review Notes

- The transform name `MergeTreeThread` shown in examples is consistent with ClickHouse's own documentation examples. In modern ClickHouse versions (23.x+) the unified `MergeTreeSelectProcessor` may report a compound name such as `MergeTreeSelect(pool: ..., algorithm: Thread)`, so users testing against very recent builds may see slightly different strings. The post's naming matches the official docs so it was left unchanged.
- Sample outputs are representative rather than literal — the exact transform graph depends on table engine, query settings, and ClickHouse version. This is a reasonable teaching approach for a tutorial post.
- The `max_threads` setting example is correct; `SETTINGS max_threads = N` is a valid per-query override and will change the number of `MergeTreeThread × N` instances.
- The general explanation of pipeline reading direction (bottom to top), `Resize M -> N` semantics (fan-in / fan-out), and parallelism bottleneck patterns is accurate.
