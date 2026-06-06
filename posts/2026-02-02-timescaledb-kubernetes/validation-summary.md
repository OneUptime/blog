# Validation Summary: How to Use TimescaleDB with Kubernetes

## Status
validated

## Post Type
Tutorial / Guide — step-by-step deployment of TimescaleDB on Kubernetes with HA, backups, monitoring and tuning examples.

## Technologies Covered
- TimescaleDB (hypertables, continuous aggregates, compression, retention policies)
- PostgreSQL (configuration, replication, `pg_stat_replication`, `pg_stat_activity`)
- Kubernetes (StatefulSet, Services, Secrets, StorageClass, NetworkPolicy, CronJob)
- Helm (Timescale Helm repository, `timescaledb-single` chart)
- Patroni (HA, automatic failover, REST API)
- Prometheus Operator (`ServiceMonitor`, `PrometheusRule`)
- Longhorn / GCE PD (storage provisioners)
- Node.js `pg` library (`Pool`)

## Sources Consulted
- TimescaleDB `timescaledb_information.dimensions` view: https://www.tigerdata.com/docs/api/latest/informational-views/dimensions
- TimescaleDB `hypertable_detailed_size`: https://www.tigerdata.com/docs/api/latest/hypertable/hypertable_detailed_size
- TimescaleDB `chunk_compression_stats`: https://github.com/timescale/docs/blob/latest/api/compression/chunk_compression_stats.md
- TimescaleDB `show_chunks`: https://www.tigerdata.com/docs/api/latest/hypertable/show_chunks
- TimescaleDB Helm Charts repo (status check): https://github.com/timescale/helm-charts
- timescale/timescaledb-ha Docker image tags: https://hub.docker.com/r/timescale/timescaledb-ha/tags

## Issues Found
1. **`timescaledb_information.dimensions` column name** — the post selected `chunk_interval`, but the actual column in that view is `time_interval`. Fixed by replacing `chunk_interval` with `time_interval` in the Performance Tuning SQL.
2. **`chunk_compression_stats` non-existent column** — the post selected `hypertable_name` from `chunk_compression_stats('sensor_data')`, but that function does not return a `hypertable_name` column (the hypertable is supplied as an argument). Replaced `hypertable_name` with `chunk_schema`, which is one of the actual returned columns.
3. **`hypertable_detailed_size` non-existent columns** — the post selected `hypertable_name`, `num_chunks`, `compression_enabled`, `total_bytes` from `hypertable_detailed_size('sensor_data')`. Only `total_bytes` (along with `table_bytes`, `index_bytes`, `toast_bytes`, `node_name`) is returned by that function; the metadata columns live in `timescaledb_information.hypertables`. Rewrote the query to join `timescaledb_information.hypertables` with a `LATERAL` call to `hypertable_detailed_size`, filtered to the `sensor_data` hypertable, so it actually runs.
4. **`pg_total_relation_size(query)` invalid usage** — the High Memory Usage troubleshooting query passed the `query` text column to `pg_total_relation_size`, which expects a regclass/relation name and would error at runtime. Removed the bogus size expression and adjusted the comment so the snippet correctly inspects active queries.

## Review Notes
- The upstream `timescale/helm-charts` repo (which provides the `timescaledb-single` chart used in the install steps) was archived in January 2024 and is no longer maintained. The chart still resolves from `https://charts.timescale.com`, so the instructions remain runnable, but readers deploying fresh clusters today should expect no upstream support. Not edited inline since the guide still works.
- The `timescale/timescaledb-ha:pg15-latest` image tag follows an older Timescale tagging convention; current tags on Docker Hub favor explicit version tags such as `pg15.x-ts2.x` (with optional `-oss`/`-all` modifiers). Left as-is because `pg15-latest`-style tags have historically been published and the chart defaults follow the same pattern.
- Patroni 3.x adds a `role=primary` label in addition to the legacy `role=master`; the selectors in this post use `role=master`, which still matches what the `timescaledb-single` chart applies. No change needed today, but worth revisiting if migrating to a chart based on Patroni 3.x with the new role label.
- The `pg_replication_lag_bytes`, `pg_stat_activity_count`, and `pg_settings_max_connections` PromQL expressions in the alerting rules depend on a specific postgres_exporter configuration; readers using a different exporter (e.g., the bundled `pgwatch` metrics in `timescaledb-ha`) may need to adjust metric names.
