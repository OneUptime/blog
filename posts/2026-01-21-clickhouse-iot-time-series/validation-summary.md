# Validation Summary: How to Set Up ClickHouse for IoT Time-Series Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- MergeTree, AggregatingMergeTree, ReplacingMergeTree, and Buffer table engines
- ClickHouse materialized views
- ClickHouse async inserts
- ClickHouse TTL and tiered storage
- ClickHouse data skipping indexes and compression codecs
- SQL time-series queries and window functions
- Mermaid architecture diagrams

## Sources Consulted
- ClickHouse asynchronous inserts documentation: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse query-level settings documentation: https://clickhouse.com/docs/operations/settings/query-level
- ClickHouse session settings documentation: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse configuration files documentation: https://clickhouse.com/docs/operations/configuration-files
- ClickHouse Buffer table engine documentation: https://clickhouse.com/docs/engines/table-engines/special/buffer
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse SimpleAggregateFunction documentation: https://clickhouse.com/docs/sql-reference/data-types/simpleaggregatefunction
- ClickHouse minSimpleState example: https://clickhouse.com/docs/examples/aggregate-function-combinators/minSimpleState
- ClickHouse partitioning best practices: https://clickhouse.com/docs/best-practices/choosing-a-partitioning-key
- ClickHouse custom partitioning key documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse DateTime64 documentation: https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse interval conversion functions: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse Map data type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse window functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse TTL documentation: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse compression documentation: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse data skipping indexes documentation: https://clickhouse.com/docs/optimize/skipping-indexes

## Issues Found
- The high-frequency raw table partitioned by `(device_id, toYYYYMMDD(timestamp))`, which can create high-cardinality partitions and too many parts. Changed it to daily time partitioning with `device_id` retained in `ORDER BY`.
- The batch insert example subtracted a numeric expression from `DateTime64` while describing 100 ms intervals. Changed it to `toIntervalMillisecond(number * 100)` for explicit millisecond interval arithmetic.
- The async insert XML placed query/user settings directly under `<clickhouse>` and included `async_insert_threads`, which is not a current documented async insert setting. Moved settings under a settings profile and removed the unsupported setting.
- The async insert examples used `wait_for_async_insert = 0` without noting its data-loss/error-reporting tradeoff. Changed examples to `wait_for_async_insert = 1`, matching ClickHouse's recommended durable acknowledgement mode.
- The rollup examples used `SummingMergeTree` with `avg`, `min`, `max`, first, and last values. This can silently produce incorrect results because `SummingMergeTree` sums numeric columns during merges. Reworked the rollups to use `AggregatingMergeTree` with `SimpleAggregateFunction` columns for `min`, `max`, `sum`, and `count`, and derived averages from sum/count.
- The 1-hour rollup had placeholder `0` values for standard deviation and percentiles, which would produce misleading query results. Removed those placeholder columns from the example rollup.
- The automatic table-selection query read aggregate tables without grouping, which can return incomplete results before background merges finish. Updated aggregate-table branches to group and re-aggregate at query time.
- The z-score anomaly query divided by `stddevPop(value)` directly, which can divide by zero for constant readings. Wrapped the denominator with `nullIf(..., 0)`.
- The gap-detection query filtered a window-function alias with `HAVING`. Rewrote it as a subquery and filtered with `WHERE`.
- The tiered-storage TTL moved data to the `hot` volume after seven days, even though the first storage-policy volume is already the hot tier. Changed the TTL moves to warm after 7 days, cold after 30 days, and delete after 365 days.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Future improvements could include adding a tested percentile/stddev rollup example using `AggregateFunction` state columns, but that would be a larger addition beyond this validation pass.
