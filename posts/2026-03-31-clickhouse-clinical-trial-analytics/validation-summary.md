# Validation Summary: How to Build Clinical Trial Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide (SQL schema and query recipes for a domain use case)

## Technologies Covered
- ClickHouse (MergeTree engine, DDL, aggregate combinators, window functions)
- SQL (analytical queries over clinical trial event data)

## Sources Consulted
- ClickHouse data types: https://clickhouse.com/docs/sql-reference/data-types
- ClickHouse MergeTree / custom partitioning: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse date/time functions (`toYear`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse aggregate combinators (`-If`): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse `uniqExact`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse window functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse `LowCardinality`: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality

## Issues Found
- **Primary Endpoint Event Rate by Arm**: the `events` column filtered to `event_type = 'endpoint' AND endpoint_name = 'primary_remission'`, but `event_rate_pct` computed the numerator from `countIf(event_type = 'endpoint')` — i.e., all endpoints, not just `primary_remission`. This is inconsistent with the section heading and with the `events` figure. Fixed by matching the numerator filter in `event_rate_pct` to the same `event_type = 'endpoint' AND endpoint_name = 'primary_remission'` condition.

## Review Notes
- Data types (`UUID`, `UInt32`, `UInt64`, `LowCardinality(String)`, `Date`, `UInt8`) are all valid native ClickHouse types.
- `PARTITION BY toYear(event_date)` is syntactically valid (`toYear` returns `UInt16`). Yearly partitioning is coarse; teams often prefer `toYYYYMM(event_date)` for more granular pruning, but the chosen partitioning is acceptable for trial-scale data.
- The cumulative-enrollment query uses `sum(countIf(...)) OVER (ORDER BY event_date ROWS UNBOUNDED PRECEDING)` alongside `GROUP BY event_date`. ClickHouse supports aggregate-as-window over grouped rows, and `ROWS UNBOUNDED PRECEDING` is accepted shorthand for `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Leaving as-is; the explicit `BETWEEN ... AND CURRENT ROW` form could be used for clarity in older versions, but the shorthand is valid.
- The denominator `uniqExact(subject_id)` in the endpoint-rate query counts *all* subjects in the arm across *any* event type (not just those with an endpoint record). That matches the typical clinical definition of event rate (events per enrolled subject in arm), so the denominator is left unchanged.
- Protocol deviation query scopes to `event_type = 'dosing'`, which aligns with the `is_per_protocol` flag being dosing-specific; reasonable modeling choice.
