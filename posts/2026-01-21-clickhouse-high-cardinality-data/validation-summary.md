# Validation Summary: How to Handle High-Cardinality Data in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse MergeTree and MergeTree-family table engines
- ClickHouse LowCardinality, UUID, IPv4, IPv6, and integer data types
- ClickHouse primary/sorting keys, partitioning, projections, and data skipping indexes
- ClickHouse aggregate functions and aggregate states (`uniq`, `uniqCombined64`, `uniqState`, `uniqMerge`, `groupBitmapState`)
- ClickHouse sampling with `SAMPLE` and `SAMPLE BY`
- ClickHouse dictionaries and `dictGet`
- ClickHouse bitmap functions

## Sources Consulted
- ClickHouse `LowCardinality(T)` data type documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse MergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse primary key best practices: https://clickhouse.com/docs/best-practices/choosing-a-primary-key
- ClickHouse data skipping indexes documentation: https://clickhouse.com/docs/optimize/skipping-indexes
- ClickHouse `SAMPLE` clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/sample
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse `AggregateFunction` type documentation: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse `uniq` aggregate function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse `uniqHLL12` aggregate function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse `uniqCombined64` aggregate function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqcombined64
- ClickHouse `groupBitmap` aggregate function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse bitmap functions documentation: https://clickhouse.com/docs/sql-reference/functions/bitmap-functions
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse dictionary documentation: https://clickhouse.com/docs/dictionary
- ClickHouse `CREATE DICTIONARY` documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse projection documentation: https://clickhouse.com/docs/data-modeling/projections
- ClickHouse partitioning best practices: https://clickhouse.com/docs/best-practices/choosing-a-partitioning-key

## Issues Found
- The post recommended `uniqHLL12` as a faster, more approximate option with `< 4%` error. ClickHouse documentation says `uniqHLL12` is not recommended in most cases and can be very inaccurate for small and extremely large cardinalities, so the example was changed to `uniqCombined64` for very large `UInt64` cardinalities.
- The sampling example used `SAMPLE 0.1` without explaining that MergeTree tables must define a `SAMPLE BY` expression included in the primary key. A minimal `events_sampled` table definition was added to show the required `SAMPLE BY intHash32(user_id)` pattern.
- The "HyperLogLog sketches" section used `AggregateFunction(uniq, UInt64)` and `uniqState`, which are aggregate states but not specifically HLL sketches. The wording was corrected to describe pre-computed unique-count states.
- The bitmap section was titled "Bitmap Indexes" even though the example uses bitmap aggregate states, not a ClickHouse index. The heading was changed to "Bitmaps for Set Operations."
- The bitmap retention query contained a placeholder inside `bitmapAnd(...)` and would not run as written. It was replaced with a concrete two-day join using `groupBitmapMergeState` and `bitmapAndCardinality`.
- The partitioning section recommended partitioning by a high-cardinality prefix and claimed it creates sub-partitions with better pruning. ClickHouse documentation recommends low-cardinality partition keys and warns that too many partitions can hurt performance or cause "too many parts" errors, so the section was reframed as a bounded hash bucket with a warning and a note that `ORDER BY user_id` is usually more important for user-specific lookups.
- The "Use LIMIT Early" example claimed to use `LIMIT BY`, but the query actually uses `max_rows_to_group_by` with `group_by_overflow_mode = 'any'`. The comment was corrected to describe bounded memory for an approximate top-N.

## Review Notes
- `clickhouse-local` is not installed in this environment, so SQL examples were not executed locally. The review was performed against official ClickHouse documentation.
- The XML dictionary snippet is still valid as a configuration-file style example, but ClickHouse documentation recommends DDL-created dictionaries for new deployments.
- SummingMergeTree examples are valid for incremental aggregation, but production queries against SummingMergeTree targets should aggregate with `GROUP BY` and `sum()` when duplicate sorting keys may still exist across active parts.
