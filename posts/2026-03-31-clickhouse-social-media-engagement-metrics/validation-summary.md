# Validation Summary: How to Analyze Social Media Engagement Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, Materialized Views, TTL policies)
- SQL (aggregation, window functions, JOINs, subqueries)
- LowCardinality and Map column types
- DateTime64 with millisecond precision

## Sources Consulted
- ClickHouse documentation: CREATE TABLE / MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: SummingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation: Materialized Views — https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse documentation: TTL expressions — https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse documentation: LowCardinality type — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation: DateTime64 type — https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation: Aggregate functions (countIf, multiIf) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if
- ClickHouse documentation: nullIf function — https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#nullif
- ClickHouse documentation: Arithmetic operators and division by zero behavior — https://clickhouse.com/docs/en/sql-reference/operators#arithmetic

## Issues Found
- **Funnel Analysis query: missing nullIf division-by-zero guard.** The `ctr_pct` and `like_rate_pct` calculations divided by `countIf(...)` directly without wrapping the divisor in `nullIf(..., 0)`. In ClickHouse, dividing by zero returns `inf` (positive infinity) rather than raising an error, which would produce misleading dashboard values. Every other division in the post correctly used `nullIf` for this purpose. Fixed both expressions to use `nullIf(countIf(...), 0)` for consistency and correctness.

## Review Notes
- The Campaign Performance query uses `sum(e.event_type = 'impression')` (summing boolean expressions) rather than `countIf`, which is a valid ClickHouse idiom but stylistically different from the rest of the post. Not an error — both approaches produce identical results.
- The Viral Coefficient query references column aliases (`shares`, `impressions`) in the same SELECT clause. This is valid in ClickHouse but would fail in standard SQL databases. Acceptable for a ClickHouse-specific tutorial.
- The SummingMergeTree materialized view is correctly paired with `sum()` aggregation in the read query, which is necessary because background part merges are not guaranteed to have completed.
- The TTL policy references `TO DISK 'cold_storage'`, which assumes a pre-configured storage policy. This is reasonable for a blog post but readers would need to set up the storage policy separately.
