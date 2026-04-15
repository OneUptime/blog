# Validation Summary: How to Track Deployment Frequency and DORA Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, partitioning)
- DORA metrics (Deployment Frequency, Lead Time for Changes, Mean Time to Restore, Change Failure Rate)

## Sources Consulted
- ClickHouse official documentation for SQL functions: `toDate`, `toYYYYMM`, `countIf`, `quantile`, `dateDiff`, `multiIf`, `avg`, `now` — https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse official documentation for `MergeTree` engine, `PARTITION BY`, `ORDER BY` — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation for data types: `UInt64`, `DateTime`, `LowCardinality`, `FixedString`, `Nullable` — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse official documentation for `INTERVAL` syntax — https://clickhouse.com/docs/en/sql-reference/operators#interval
- DORA metrics definitions and benchmarks — https://dora.dev/research/

## Issues Found
No technical issues found.

## Review Notes
- The DORA classification thresholds (Elite >= 1/day, High >= 0.14/day, Medium >= 0.03/day) are reasonable approximations of the standard DORA benchmarks. The exact thresholds vary across DORA State of DevOps reports by year, but these values are commonly used in practice.
- The MTTR query computes average time-to-restore across all resolved incidents per service without joining to the `deployments` table. This is a valid and common approach, though the `deploy_id` foreign key in the `incidents` table could be used for deployment-correlated MTTR if desired.
- The Change Failure Rate denominator includes all deployments (successes, failures, and rollbacks), which matches the standard DORA definition.
