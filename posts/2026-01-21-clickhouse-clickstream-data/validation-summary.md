# Validation Summary: How to Store and Analyze Clickstream Data in ClickHouse

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL
- MergeTree tables
- Data skipping indexes
- Materialized views
- Window functions
- Aggregate functions
- Clickstream analytics

## Sources Consulted
- ClickHouse CREATE VIEW / materialized view documentation: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse refreshable materialized view documentation: https://clickhouse.com/docs/materialized-view/refreshable-materialized-view
- ClickHouse materialized view best practices: https://clickhouse.com/docs/best-practices/use-materialized-views
- ClickHouse window functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse groupArray aggregate function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse type conversion functions documentation: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse Map data type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse data skipping index documentation: https://clickhouse.com/docs/optimize/skipping-indexes

## Issues Found
- The sessions materialized view used a regular incremental materialized view with `GROUP BY session_id`, which would aggregate only each inserted block and append partial rows to the target table. Changed it to a refreshable materialized view with `REFRESH EVERY 5 MINUTE` so the target sessions table is periodically rebuilt from the full source query.
- Purchase value parsing used `toDecimal64(properties['value'], 2)` and `toFloat64(properties['value'])`. Because missing Map keys return the value type default and malformed values can throw conversion exceptions, changed these to `toDecimal64OrZero(..., 2)` and `toFloat64OrZero(...)`.
- Session reconstruction did not explicitly treat the first event for each visitor as a new session and relied on a window lookup without a nullable default. Added a nullable previous-event expression and marked null previous events as new sessions.
- Navigation transition queries used `leadInFrame` without a frame that includes following rows. Added explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` frames and nullable expressions so the final row is filtered correctly.
- Path and touchpoint arrays used plain `groupArray`, whose ordering is documented as indeterminate. Changed those examples to sort arrays by event order before extracting the page or channel values.
- Attribution examples used `coalesce(utm_source, referrer_domain, 'direct')` even though the schema defines those columns as non-null strings, so empty UTM values would not fall back. Changed the expressions to use `nullIf(..., '')` before `coalesce`.

## Review Notes
ClickHouse was not installed in the local environment, so SQL validation was documentation-based rather than executed with a local parser. The schema and queries remain illustrative and may need tuning for very large production workloads, especially around session refresh cadence, target table size, and index selectivity.
