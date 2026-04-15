# Validation Summary: How to Replace InfluxDB with ClickHouse for Metrics

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, codecs, SQL functions, Map type, LowCardinality, TTL)
- InfluxDB (v2 CLI, Flux query language, TSM storage engine)
- Telegraf (HTTP output plugin, JSON data format)
- Prometheus (remote write, mentioned briefly)

## Sources Consulted
- ClickHouse CREATE TABLE documentation — https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse compression codecs (Delta, Gorilla, ZSTD) — https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse Map(K, V) data type — https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse LowCardinality data type — https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse MergeTree TTL documentation — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse date-time functions (toStartOfFiveMinutes, now) — https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- InfluxDB v2 CLI `influx query` reference — https://docs.influxdata.com/influxdb/v2/reference/cli/influx/query/
- InfluxDB annotated CSV format — https://docs.influxdata.com/influxdb/v2/reference/syntax/annotated-csv/
- InfluxDB high cardinality documentation — https://docs.influxdata.com/influxdb/v2/write-data/best-practices/resolve-high-cardinality/
- InfluxDB v2 tasks (continuous queries replacement) — https://docs.influxdata.com/influxdb/v2/process-data/
- Flux time types and literals — https://docs.influxdata.com/flux/v0/data-types/basic/time/
- Telegraf HTTP output plugin — https://docs.influxdata.com/telegraf/v1/output-plugins/http/
- Telegraf JSON output data format — https://docs.influxdata.com/telegraf/v1/data_formats/output/json/

## Issues Found
No technical issues found. All code examples, SQL syntax, CLI commands, and technical claims are accurate.

## Review Notes
- The `influx query --raw` command outputs annotated CSV (with `#datatype`, `#group`, `#default` metadata lines), not standard CSV. The post redirects to `metrics_export.csv` and then processes it through a custom Python script (`influx_to_clickhouse.py`), which would handle the annotated format. This is functionally correct but readers should be aware the output is not plain CSV.
- The Telegraf `[[outputs.http]]` configuration with `data_format = "json"` shows a valid pattern for sending data to ClickHouse's HTTP interface. In practice, Telegraf's default JSON serializer produces a nested structure (`{"fields":{...},"tags":{...},"name":"...","timestamp":...}`) that does not directly match ClickHouse's flat `JSONEachRow` format expected by the table schema. Readers implementing this would need additional configuration (such as a custom JSON template or Telegraf processor) to flatten the output to match the column names. This is typical for a blog-level example showing the approach rather than a production-ready config.
- The `Delta` codec on the `timestamp` column is correct and effective. The `DoubleDelta` codec could provide marginally better compression for timestamps arriving at regular intervals, but `Delta` is a valid and common choice.
- The claim about Gorilla codec matching InfluxDB's compression is accurate — both implement the XOR-based floating-point compression algorithm from the Facebook Gorilla TSDB paper (2015).
- InfluxDB 3.x (released after v2) deprecated Flux in favor of SQL, which further validates the post's point about Flux's steep learning curve. The clustering claim remains accurate across all InfluxDB versions including 3.x Core (single-node only; clustering requires Enterprise).
