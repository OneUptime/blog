# Validation Summary: How to Design a Fact Table in ClickHouse

## Status
validated

## Post Type
Guide / Tutorial on schema design

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ReplacingMergeTree table engine
- SummingMergeTree table engine
- Data warehouse / dimensional modeling concepts (fact/dimension tables, additive/semi-additive/non-additive facts)
- SQL DDL (CREATE TABLE, PARTITION BY, ORDER BY, TTL)

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SummingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse ReplacingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse data types (Decimal, LowCardinality, Nullable, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse TTL for tables and columns: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
1. **Incorrect SummingMergeTree column argument syntax.** The post had `ENGINE = SummingMergeTree(total_revenue, total_quantity, order_count)`, passing three separate engine parameters. Per the ClickHouse docs, the optional `columns` parameter of SummingMergeTree must be a tuple of column names (or a single column name for one column). Multiple columns must be wrapped in a tuple. Fixed to `ENGINE = SummingMergeTree((total_revenue, total_quantity, order_count))` (double parentheses — one pair for the engine call, one for the tuple).

## Review Notes
- The `ReplacingMergeTree(snapshot_date)` example is syntactically valid (a `Date` is accepted as the optional version column), but functionally a no-op for deduplication here: because `snapshot_date` is part of the `ORDER BY (account_id, snapshot_date)` sort key, every `(account_id, snapshot_date)` pair is already unique, so nothing is ever replaced. A plain `MergeTree` would behave identically for this snapshot use case. This is a stylistic/semantic note, not a technical error, so the code was left unchanged.
- The `JOIN` in the INSERT uses unqualified `product_category` with table aliases `f` and `p`. ClickHouse accepts this because the column only exists on one side, but fully qualifying (`p.product_category`) would be more robust against future schema changes. Not changed — author style preserved.
- `GROUP BY 1, 2, 3` positional syntax is supported by ClickHouse (with `enable_positional_arguments` on, which is the default in modern versions). Valid as-is.
- `TTL ordered_at + INTERVAL 5 YEAR`, `Decimal64(2)`, `LowCardinality(String)`, `Nullable(DateTime)`, `PARTITION BY toYYYYMM(...)`, and `DEFAULT 0` on numeric columns are all correct current ClickHouse syntax.
