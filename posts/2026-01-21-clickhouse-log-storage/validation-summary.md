# Validation Summary: How to Store and Query Logs in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse MergeTree tables, TTL, skip indexes, text indexes, SQL queries, HTTP inserts, and S3 table engine
- Vector log ingestion and ClickHouse sink configuration
- Fluent Bit tail input, parser filter, and HTTP output
- Grafana Loki Promtail configuration
- Python `requests`
- Grafana ClickHouse datasource macros and template variables

## Sources Consulted
- ClickHouse MergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse data skipping indexes documentation: https://clickhouse.com/docs/optimize/skipping-indexes
- ClickHouse text indexes documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes
- ClickHouse TTL documentation: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse S3 table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/s3
- ClickHouse WITH clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/with
- Vector ClickHouse sink documentation: https://vector.dev/docs/reference/configuration/sinks/clickhouse/
- Fluent Bit HTTP output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/http
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana ClickHouse datasource documentation: https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- Replaced the deprecated ClickHouse `tokenbf_v1` message index with the current `text` index syntax using `splitByNonAlpha` and `lower(message)`, because ClickHouse recommends text indexes for full-text workloads in current versions.
- Added Vector `date_time_best_effort = true` so RFC3339 timestamps emitted by `encoding.timestamp_format = "rfc3339"` are parsed correctly by ClickHouse.
- Corrected the Promtail example. Promtail clients send to the Loki push API and cannot write directly to ClickHouse's `JSONEachRow` HTTP insert endpoint, so the snippet now uses a Loki-compatible URL and explains that direct ClickHouse ingestion should use another collector or bridge.
- Replaced Python `datetime.utcnow()` with `datetime.now(timezone.utc)` to avoid the deprecated UTC datetime API.
- Updated the multiple-term ClickHouse text search query to use `hasAllTokens`, which is the recommended function for text indexes.
- Escaped ClickHouse regex string literals as `\\d+` in `match` and `replaceRegexpAll` examples so the regular expressions are interpreted correctly.
- Fixed the anomaly detection query by moving the window-function alias calculation into a subquery before filtering on `avg_24h`.

## Review Notes
The examples are intentionally schema-level and pipeline-level snippets. Production deployments should still validate storage policies for named disks such as `warm` and `cold`, configure authentication/TLS for ingestion endpoints, and benchmark ordering keys and skip indexes with representative log data.
