# Validation Summary: How to Implement Event Sourcing with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, ReplacingMergeTree engines)
- Materialized Views
- SQL (DDL and DML)
- Event Sourcing architectural pattern
- JSON functions (JSONExtractFloat)

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- SummingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ReplacingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- Materialized View docs: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- UUID functions: https://clickhouse.com/docs/en/sql-reference/functions/uuid-functions
- DateTime64 data type: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- LowCardinality data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- Date/time functions (now64, today, toYYYYMM): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- JSON functions (JSONExtractFloat): https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- Aggregate combinators (-If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found
No technical issues found.

All SQL is syntactically valid ClickHouse:
- `generateUUIDv4()`, `now64()` (default precision 3/ms), `toYYYYMM()`, `JSONExtractFloat()`, `countIf()`, `sumIf()` all have correct signatures.
- `LowCardinality(String)` and `DateTime64(3)` data types are used correctly.
- `ReplacingMergeTree(sequence_num)` correctly designates `sequence_num` as the version column (must be `UInt*`/`Date`/`DateTime*`, which `UInt64` satisfies).
- `SummingMergeTree()` without an explicit column list sums all non-ORDER-BY numeric columns — consistent with how the materialized view's `order_count` and `total_revenue` are expected to aggregate.
- The `PARTITION BY toYYYYMM(event_time)` combined with `ORDER BY (aggregate_type, aggregate_id, sequence_num)` is an appropriate layout for the described access patterns (per-aggregate replay and time-bounded analytics).

## Review Notes
- SummingMergeTree and ReplacingMergeTree deduplicate/aggregate only at merge time (eventual). Production queries over these projections should still apply `SUM(...) GROUP BY ...` or `FINAL` / deduplication logic at read time for up-to-the-moment correctness. The post's summary focuses on the projection pattern rather than read-time semantics, which is acceptable for an introductory guide but worth calling out for readers.
- The `event_time >= today() - 30` filter compares `Date` to `DateTime64` via implicit conversion; this works, but users with multi-timezone data may prefer an explicit `toDateTime64(today() - 30, 3)` to avoid timezone surprises.
- `JSONExtractFloat` returns 0 for missing/invalid keys rather than NULL — fine for the illustrative materialized view, but readers building production projections may want `JSONExtract(payload, 'amount', 'Float64')` or the newer `JSON` data type for stricter semantics.
- `sequence_num` is presented as an externally-provided monotonic counter per aggregate. The post does not (and need not) discuss how to generate it concurrently, but readers should understand that ClickHouse does not guarantee uniqueness — that responsibility lies with the producer/application.
