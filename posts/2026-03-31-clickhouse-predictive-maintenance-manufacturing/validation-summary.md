# Validation Summary: How to Build Predictive Maintenance Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, aggregate combinators)
- SQL (window functions, CTEs, JOINs, conditional aggregation)
- Predictive maintenance concepts (MTBF, anomaly detection, health scoring)

## Sources Consulted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse HAVING clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/having
- ClickHouse QUALIFY clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/qualify
- ClickHouse Syntax / alias resolution documentation: https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse Custom Partitioning Key documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse LIMIT BY documentation: https://clickhouse.com/docs/sql-reference/statements/select/limit-by

## Issues Found
- **HAVING without GROUP BY on window function results**: The "Rolling Statistics for Anomaly Detection" query used `HAVING z_score > 3` without a `GROUP BY` clause to filter rows based on a window-function-derived alias. ClickHouse docs state "HAVING can't be used if aggregation is not performed." Additionally, window functions are computed after WHERE/HAVING, so the alias cannot be resolved at that stage. Fixed by wrapping the window function query in a subquery and applying `WHERE z_score > 3` in the outer query, which is the standard ClickHouse pattern for filtering on window function results.

## Review Notes
- The post relies on ClickHouse-specific alias resolution (referencing aliases defined earlier in the same SELECT list, e.g., `rolling_24h_mean` used in the `z_score` expression). This is valid in ClickHouse but would not work in standard SQL databases like PostgreSQL.
- The `toYYYYMMDD` partitioning creates daily partitions. ClickHouse docs recommend monthly partitioning (`toYYYYMM`) in most cases to avoid excessive partition counts. Daily partitioning is acceptable for high-volume IoT/sensor data with TTL-based expiration, which fits this use case.
- The Failure Event Correlation JOIN between `work_orders` and `equipment_sensors` could be expensive at scale since it joins on `equipment_id` alone, with the time range filter only inside `avgIf`. For production use, adding a time-range condition to the JOIN's ON clause or WHERE clause would improve performance significantly.
