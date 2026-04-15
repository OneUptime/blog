# Validation Summary: How to Track Virtual Currency Flow in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine family, materialized views)
- SummingMergeTree engine
- ClickHouse aggregate functions: sumIf, argMax, uniqExact, quantile, multiIf, count

## Sources Consulted
- ClickHouse official documentation: CREATE TABLE statement and data types (https://clickhouse.com/docs/en/sql-reference/statements/create/table)
- ClickHouse MergeTree engine family (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse SummingMergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree)
- ClickHouse materialized views (https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view)
- ClickHouse aggregate functions: sumIf, argMax, uniqExact, quantile (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/)
- ClickHouse LowCardinality type (https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality)
- ClickHouse multiIf function (https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions#multiif)

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is valid ClickHouse and uses current, non-deprecated functions and types.
- The signed `Int64` approach for credits/debits is a well-established ledger pattern and is correctly applied throughout all queries.
- The `net_flow` calculation (`sumIf(amount, amount > 0) + sumIf(amount, amount < 0)`) is correct: it sums positive inflows and negative outflows, yielding the net change.
- The `argMax(balance_after, occurred_at)` usage to retrieve each player's latest balance is idiomatic ClickHouse.
- The materialized view omits a `TO` clause, which is valid — ClickHouse will create an implicit inner target table. For production use, an explicit `TO` table is sometimes preferred for easier management, but both approaches are correct.
- The scalar subquery in the `HAVING` clause of the suspicious accumulation query computes the quantile over all historical data (not just the last 7 days), which is a reasonable design choice for comparing recent activity against a broader baseline.
