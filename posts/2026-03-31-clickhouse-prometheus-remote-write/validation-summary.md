# Validation Summary: How to Use ClickHouse as a Prometheus Remote Write Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, TTL, tiered storage, DateTime64, LowCardinality)
- Prometheus (remote_write, remote_read, queue_config)
- prom2click (ClickHouse-Prometheus adapter)
- Docker

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse MergeTree engine documentation (TTL, ORDER BY): https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse Prometheus Protocols documentation: https://clickhouse.com/docs/interfaces/prometheus
- ClickHouse TimeSeries Table Engine documentation: https://clickhouse.com/docs/engines/table-engines/special/time_series
- ClickHouse DateTime64 type documentation: https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse LowCardinality type documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse operators reference (IS NULL): https://clickhouse.com/docs/sql-reference/operators
- Prometheus remote_write configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning: https://prometheus.io/docs/practices/remote_write/
- prom2click GitHub repository: https://github.com/mindis/prom2click
- Docker Hub prometheuscommunity organization: https://hub.docker.com/u/prometheuscommunity
- Altinity TTL moves documentation: https://altinity.com/blog/2020-3-23-putting-things-where-they-belong-using-new-ttl-moves

## Issues Found
1. **Non-existent Docker image**: The post referenced `prometheuscommunity/prometheus-clickhouse-adapter` as a Docker image, but this image does not exist on Docker Hub and there is no such repository in the prometheus-community GitHub organization. The environment variables (`CH_ENDPOINT`, `CH_DATABASE`, `CH_USERNAME`, `CH_PASSWORD`) were also fabricated. Replaced the entire adapter section with a reference to the real `prom2click` adapter (github.com/mindis/prom2click) with its actual CLI flags (`--ch.dsn`, `--ch.db`, `--ch.table`, `--web.address`).

2. **Misleading claim about native ClickHouse integration**: The post stated ClickHouse has a "native ClickHouse Prometheus remote write integration built into recent ClickHouse versions" without noting it is experimental. Corrected to specify that ClickHouse 24.8+ includes an experimental TimeSeries table engine that requires `SET allow_experimental_time_series_table = 1`.

## Review Notes
- The `ORDER BY (name, tags, timestamp)` in the schema uses an `Array(String)` column (`tags`) in the sorting key. While syntactically valid, ClickHouse cannot use the primary index to filter on individual array elements — only on the entire array value. For a Prometheus-style workload where queries typically filter by individual label key-value pairs, this could result in full table scans on the tags column. A `Map(String, String)` type or separate label columns may perform better in practice. This is a design/performance concern rather than a correctness error, so the post was not modified for this.
- The Prometheus `remote_write` and `remote_read` configuration syntax is correct and uses valid field names.
- All ClickHouse SQL (CREATE TABLE, SELECT queries, ALTER TABLE TTL, JOIN with IS NULL) is syntactically correct.
- The tiered TTL syntax (`TO DISK 'cold_s3'` followed by `DELETE`) is valid ClickHouse syntax for tiered storage policies.
