# Validation Summary: ClickHouse vs InfluxDB for Metrics Storage

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, DateTime64, LowCardinality, TTL, Materialized Views, AggregatingMergeTree)
- InfluxDB (Line Protocol, Flux, InfluxQL, InfluxDB 3.0/IOx)
- TICK stack (Telegraf, InfluxDB, Chronograf, Kapacitor)
- Grafana
- Prometheus remote write
- OpenTelemetry
- Apache Arrow / Parquet

## Sources Consulted
- ClickHouse documentation: DateTime64 type, MergeTree engine, TTL expressions, Materialized Views, AggregatingMergeTree, aggregate function combinators (avgState) — https://clickhouse.com/docs
- InfluxDB documentation: Line Protocol specification, Flux language, InfluxQL — https://docs.influxdata.com
- InfluxDB 3.0 / IOx architecture (Apache Arrow + Parquet storage engine) — https://www.influxdata.com/blog/influxdb-3-0/
- ClickHouse SQL reference: toStartOfMinute, toStartOfHour, now(), INTERVAL syntax — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

## Review Notes
- Flux was placed in maintenance mode by InfluxData and is not available in InfluxDB 3.x, which uses SQL (via Apache DataFusion) and InfluxQL instead. The post correctly scopes Flux to InfluxDB 2.x, but the "When to Choose InfluxDB" recommendation of "Teams preferring purpose-built tooling with Flux" may be misleading for readers evaluating InfluxDB today, since Flux is deprecated and not carried forward to 3.x.
- InfluxDB 3.0 is referenced at the end of the Scale section and in the recommendation list, but the Query Language section does not mention that 3.x uses SQL/InfluxQL rather than Flux. A future update could clarify the 3.x query language story.
- All ClickHouse SQL examples use correct syntax and current functions. The use of `DateTime64(9)` for nanosecond precision correctly matches the InfluxDB Line Protocol timestamp granularity.
- The `avgState()` combinator with `AggregatingMergeTree` is the correct pattern for incremental aggregation in ClickHouse materialized views.
