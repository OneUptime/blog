# Validation Summary: How to Migrate from InfluxDB to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, DateTime64, materialized views, TTL, window functions)
- InfluxDB 1.x (influx_inspect CLI, HTTP query API, continuous queries, InfluxQL)
- InfluxDB 2.x (influx CLI, Flux query language, HTTP API v2)
- Python (line protocol parser, datetime handling)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse documentation on AggregatingMergeTree and AggregateFunction types: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation on -State/-Merge combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation on DateTime64 type: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation on WITH FILL: https://clickhouse.com/docs/en/sql-reference/statements/select/order-by#order-by-expr-with-fill
- InfluxDB 2.x API documentation for /api/v2/query: https://docs.influxdata.com/influxdb/v2/api/#operation/PostQuery
- InfluxDB 1.x documentation on influx_inspect export: https://docs.influxdata.com/influxdb/v1/tools/influx_inspect/
- InfluxDB line protocol specification: https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/

## Issues Found

### Issue 1: InfluxDB 2.x HTTP API curl command used GET instead of POST
- **What was wrong:** The curl command used `-G` flag with `--data-urlencode`, making it a GET request. The InfluxDB 2.x `/api/v2/query` endpoint only accepts POST requests and would return a 405 Method Not Allowed error.
- **What was changed:** Replaced `-G` with `--request POST`, moved the `org` parameter to the URL query string, added the required `Content-Type: application/vnd.flux` header, and passed the Flux query directly in `--data`.
- **Why:** The InfluxDB 2.x query API requires POST with the Flux query in the request body, not as a URL-encoded query parameter.

### Issue 2: Misleading comment on InfluxDB 2.x CLI export
- **What was wrong:** The code comment said "Export a bucket to line protocol" but `influx query --raw` outputs annotated CSV, not InfluxDB line protocol format.
- **What was changed:** Changed the comment from "Export a bucket to line protocol" to "Export a bucket to CSV".
- **Why:** Line protocol is a specific InfluxDB format (`measurement,tags fields timestamp`). The `influx query --raw` command outputs CSV. The misleading comment could confuse readers trying to pipe this output into the line protocol parser shown in Step 3.

### Issue 3: SummingMergeTree incorrectly used for avg/max aggregations
- **What was wrong:** The destination table for the materialized view used `SummingMergeTree((mean_idle, max_user, cnt))` with plain `Float64`/`UInt64` columns, and the materialized view used `avg()` and `max()` directly. When ClickHouse merges data parts in the background, SummingMergeTree sums the specified columns. Summing pre-computed averages and maximums produces mathematically incorrect results (e.g., avg(10) + avg(20) = 30, not avg(10,20) = 15).
- **What was changed:** Replaced `SummingMergeTree` with `AggregatingMergeTree`, changed columns to `AggregateFunction(avg, Float64)`, `AggregateFunction(max, Float64)`, and `AggregateFunction(count)` types. Updated the materialized view to use `-State` combinators (`avgState`, `maxState`, `countState`). Added a query example showing the required `-Merge` combinators (`avgMerge`, `maxMerge`, `countMerge`).
- **Why:** AggregatingMergeTree with AggregateFunction columns stores intermediate aggregate states that can be correctly merged during background compaction. This is the standard ClickHouse pattern for incremental aggregation via materialized views.

## Review Notes
- The Python line protocol parser uses `rstrip("i")` to strip the integer suffix from field values. This is a simplified approach that could incorrectly strip trailing 'i' characters from string field values in edge cases, but is acceptable for a tutorial script focused on numeric metrics.
- The `strftime("%Y-%m-%d %H:%M:%S.%f")` format produces microsecond precision (6 digits) while the ClickHouse table uses `DateTime64(9)` (nanosecond). This is an inherent limitation of Python's `datetime` module. ClickHouse will accept the format and zero-pad to nanoseconds. Not an error, but worth noting for readers who need nanosecond fidelity.
- The `lagInFrame` window function usage for derivative computation will produce a meaningless value for the first row in each partition (division by zero or undefined lag). This is a common limitation of lag-based rate calculations and is acceptable for a tutorial.
- The InfluxDB 1.x `influx_inspect export` command and HTTP API commands are correct for InfluxDB 1.x.
- All ClickHouse SQL functions used (`toYYYYMMDD`, `toStartOfFiveMinutes`, `toStartOfHour`, `toIntervalHour`, `dateDiff`, `lagInFrame`, `WITH FILL`) are valid ClickHouse functions.
- The comparison table values are accurate. The ~10M series cardinality limit for InfluxDB is a widely cited practical limit.
