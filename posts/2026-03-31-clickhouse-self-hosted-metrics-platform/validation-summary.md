# Validation Summary: How to Build a Self-Hosted Metrics Platform with ClickHouse

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- ClickHouse (MergeTree engine, codecs, DateTime64, LowCardinality, Map types, TTL)
- Prometheus (remote_write, write_relabel_configs, queue_config)
- Grafana (mentioned as visualization layer)
- SQL (ClickHouse dialect: toStartOfHour, toStartOfDay, toDate, correlated subqueries)

## Sources Consulted
- ClickHouse documentation on codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse documentation on DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation on Map type: https://clickhouse.com/docs/en/sql-reference/data-types/map
- ClickHouse documentation on TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- Prometheus remote_write configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write
- Prometheus queue_config reference: https://prometheus.io/docs/practices/remote_write/
- Facebook Gorilla paper on time-series compression (used by both Prometheus TSDB and ClickHouse)

## Issues Found

### 1. Invalid `max_retries` field in Prometheus `queue_config`
- **What was wrong:** The Prometheus remote_write `queue_config` section included `max_retries: 3`. This field does not exist in current Prometheus versions (2.x). Prometheus handles remote write retries automatically with exponential backoff, controlled by `min_backoff` and `max_backoff`.
- **What was changed:** Replaced `max_retries: 3` with `min_backoff: 30ms` and `max_backoff: 5s`, which are the correct fields for controlling retry behavior.
- **Why:** Using a non-existent config field would cause Prometheus to fail to load or silently ignore the setting, misleading readers into thinking retry limits are enforced.

### 2. Misleading Gorilla codec compression claim
- **What was wrong:** The Cost Benefits section stated "ClickHouse's Gorilla codec achieves 3-4x compression on floating-point metrics compared to Prometheus TSDB format." This is misleading because Prometheus TSDB also uses Gorilla-style (XOR-based) compression for float values. The compression advantage is not from the Gorilla codec itself.
- **What was changed:** Reworded to attribute the compression benefit to ClickHouse's columnar storage format combined with codecs (Gorilla, Delta) and secondary ZSTD compression, which is the actual source of the storage improvement.
- **Why:** The original claim incorrectly implied the Gorilla codec itself was the differentiator, when both systems use similar float compression algorithms. The real benefit comes from ClickHouse's columnar architecture and layered compression strategy.

## Review Notes
- The Prometheus config code block is labeled as `text` rather than `yaml`. This works but `yaml` would provide better syntax highlighting for readers.
- The anomaly detection query uses ClickHouse's non-standard alias referencing feature (referencing `current_rate` and `baseline_rate` aliases in the same SELECT clause to define `ratio`). This works in ClickHouse but readers should be aware this is not standard SQL.
- The correlated subquery for `baseline_rate` includes the last hour of data (which overlaps with the `current_rate` window). For stricter anomaly detection, the baseline window could exclude the current period, but this is a design choice rather than a technical error.
- The `GROUP BY timestamp` in the aggregation query is potentially ambiguous since `timestamp` is both a column name and a SELECT alias. With ClickHouse's default `prefer_column_name_to_alias = 0` setting, the alias takes precedence, so it works correctly. However, using `GROUP BY toStartOfHour(timestamp)` explicitly would be clearer.
