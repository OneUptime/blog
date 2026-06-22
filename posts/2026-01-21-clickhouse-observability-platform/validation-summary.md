# Validation Summary: How to Build an Observability Platform with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree tables
- ClickHouse SQL
- OpenTelemetry observability data
- Metrics, logs, and traces
- Prometheus-style counters and histograms
- Mermaid diagrams

## Sources Consulted
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse data skipping indexes documentation: https://clickhouse.com/docs/optimize/skipping-indexes
- ClickHouse data skipping index examples: https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse full-text text indexes documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes
- ClickHouse DateTime64 documentation: https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse date and time functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse Map data type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse Enum data type documentation: https://clickhouse.com/docs/sql-reference/data-types/enum
- ClickHouse CREATE TABLE default and materialized column documentation: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse window functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse OpenTelemetry integration documentation: https://clickhouse.com/docs/observability/integrating-opentelemetry
- ClickHouse ClickStack schema documentation: https://clickhouse.com/docs/use-cases/observability/clickstack/ingesting-data/schemas

## Issues Found
- The log and trace schemas used `tokenbf_v1` for full-text search indexes. ClickHouse documentation marks `tokenbf_v1` full-text search usage as deprecated in ClickHouse 26.2 and newer in favor of `text` indexes. Updated the `body_idx` and `operation_idx` definitions to use `TYPE text(tokenizer = 'splitByNonAlpha')`.
- The trace `duration_ns` materialized column used arithmetic on `DateTime64` values. This worked in current ClickHouse, but `dateDiff('nanosecond', start_time, end_time)` is the documented function for expressing timestamp differences in nanoseconds. Updated the expression to use `dateDiff`.
- The histogram percentile query used `max(count)` directly for Prometheus-style cumulative histogram buckets over each minute. Updated it to use `max(count) - min(count)` so the per-minute percentile calculation is based on bucket deltas rather than process-lifetime cumulative counts.
- The service health dashboard computed error rate by summing cumulative counter samples, which overstates totals and does not produce a correct Prometheus-style rate. Reworked the query to calculate request and error deltas over the five-minute window, then derive request rate and error rate from those deltas.
- The trace reconstruction query labeled a start-time-based span count as `depth`, which is not a parent-child trace depth calculation. Replaced it with `display_order` using `row_number()` over `start_time` to avoid presenting an incorrect hierarchy depth.

## Review Notes
The SQL snippets are still illustrative and omit production concerns such as counter reset handling, shard-local versus distributed queries, sampling strategy, high-cardinality label governance, and rollup materialized views. The updated text indexes require ClickHouse 26.2 or newer; older ClickHouse deployments should use the previous Bloom-filter approach or upgrade before using `TYPE text`.
