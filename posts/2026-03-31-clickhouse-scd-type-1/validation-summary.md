# Validation Summary: How to Handle Slowly Changing Dimensions Type 1 in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplacingMergeTree engine
- SQL (ClickHouse dialect)
- Slowly Changing Dimensions (SCD Type 1)
- Change Data Capture (CDC) patterns

## Sources Consulted
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse FINAL modifier documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- ClickHouse argMax aggregate function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse OPTIMIZE statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse LowCardinality type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found
- **`HAVING` instead of `WHERE` in argMax query**: The argMax point-lookup query used `HAVING user_id = 42` after `GROUP BY user_id`. Since `user_id` is not an aggregate expression, this should be a `WHERE` clause so that ClickHouse filters rows *before* aggregation. Using `HAVING` forces the engine to scan and group the entire table before discarding unwanted groups, which directly contradicts the stated goal of efficient point lookups for high-throughput serving. Changed to `WHERE user_id = 42` before the `GROUP BY user_id` clause.

## Review Notes
- The summary section refers to "the same primary key" when ReplacingMergeTree actually deduplicates on the sorting key (ORDER BY). In this post the two are identical since no separate PRIMARY KEY is specified, so the statement is correct in context. A future revision could use the more precise term "sorting key" to avoid confusion in cases where ORDER BY and PRIMARY KEY diverge.
- The advice to avoid `FINAL` on large tables was historically strong guidance. Recent ClickHouse versions (23.2+) have significantly improved `FINAL` performance, so this advice is becoming less critical, though still reasonable as a general caution.
