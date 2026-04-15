# Validation Summary: How to Use ClickHouse as a Prometheus Long-Term Storage Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (TimeSeries engine, MergeTree, TTL, Prometheus protocol handlers)
- Prometheus (remote_write, remote_read, queue_config)
- Grafana (Prometheus datasource, ClickHouse plugin)
- Docker

## Sources Consulted
- [ClickHouse Prometheus Protocols Documentation](https://clickhouse.com/docs/interfaces/prometheus)
- [ClickHouse TimeSeries Table Engine Documentation](https://clickhouse.com/docs/engines/table-engines/special/time_series)
- [ClickHouse Release 24.8 Blog Post](https://clickhouse.com/blog/clickhouse-release-24-08)
- [ClickHouse MergeTree Documentation](https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree)
- [ClickHouse Array Data Type Documentation](https://clickhouse.com/docs/sql-reference/data-types/array)
- [ClickHouse TTL Documentation](https://clickhouse.com/docs/guides/developer/ttl)
- [Prometheus Remote Write Configuration](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Configuration Documentation](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus Storage Documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Grafana ClickHouse Plugin Documentation](https://grafana.com/grafana/plugins/grafana-clickhouse-datasource/)
- [DoubleCloud Final Update (shutdown announcement)](https://double.cloud/blog/posts/2024/10/doublecloud-final-update/)
- [Percona-Lab/PromHouse on GitHub](https://github.com/Percona-Lab/PromHouse)
- [Percona-Lab/clickhouse_exporter (archived)](https://github.com/Percona-Lab/clickhouse_exporter)
- [grafana/metrictank on GitHub](https://github.com/grafana/metrictank)
- [jacksontj/promxy on GitHub](https://github.com/jacksontj/promxy)
- Docker Hub search for `doublecloud/prometheus-remote-storage-clickhouse` (returned 404)

## Issues Found

1. **DoubleCloud adapter does not exist**: The post recommended `doublecloud/prometheus-remote-storage-clickhouse` Docker image, which does not exist on Docker Hub. DoubleCloud shut down entirely in early 2025. Replaced the entire adapter installation section with ClickHouse's native Prometheus remote write/read support (available since ClickHouse 24.8), which is the current recommended approach.

2. **Adapter list was largely incorrect**:
   - "clickhouse_exporter with remote write" (described as Percona's stack) is actually a Prometheus *exporter* for monitoring ClickHouse's own metrics — it is not a remote write adapter. The Percona-Lab version is archived.
   - "Promxy + ClickHouse" — Promxy is a Prometheus proxy/federation tool, not a ClickHouse adapter.
   - "Grafana Metricstank" — misspelled (correct name: Metrictank), and it is a Graphite backend, not a ClickHouse adapter.
   - Replaced with accurate list: ClickHouse native support (recommended), PromHouse (experimental), prom2click (community).

3. **Array(String) in ORDER BY key**: The original schema used `ORDER BY (name, tags, timestamp)` where `tags` was `Array(String)`. ClickHouse does not support Array types in MergeTree sorting keys — this would fail at table creation. Replaced the custom MergeTree schema with the `TimeSeries` engine, which is the correct approach for native Prometheus support.

4. **Grafana variable syntax**: The post used `{from:DateTime}` and `{to:DateTime}`, which are not valid syntax for any current ClickHouse Grafana plugin. Replaced with `$__fromTime` and `$__toTime`, the correct Grafana ClickHouse datasource macros.

5. **All URLs updated**: Changed from non-existent adapter URLs (`prometheus-clickhouse:9201`) to ClickHouse's native Prometheus port (`clickhouse:9363`).

6. **Retention tuning updated**: Changed from `ALTER TABLE metrics.samples MODIFY TTL date + INTERVAL 2 YEAR` to target the TimeSeries engine's internal data table with `timestamp`-based TTL.

7. **Summary paragraph updated**: Removed reference to DoubleCloud and updated to reflect the native ClickHouse approach.

## Review Notes
- The `TimeSeries` engine is marked as experimental in ClickHouse and requires `SET allow_experimental_time_series_table = 1`. This is noted in the post. Users should be aware this may change in future ClickHouse releases.
- The Prometheus default retention claim (15 days) is correct per official Prometheus documentation.
- The `queue_config` fields (`max_samples_per_send`, `capacity`, `max_shards`) and `read_recent: true` are all valid Prometheus configuration options.
- The internal sub-table naming convention (`.inner_id.data.prometheus`) used in the Grafana query and retention tuning sections depends on the table name chosen during TimeSeries creation. Users should verify their actual internal table names via `SHOW TABLES FROM metrics`.
