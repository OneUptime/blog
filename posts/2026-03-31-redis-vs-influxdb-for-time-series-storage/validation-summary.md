# Validation Summary: Redis vs InfluxDB for Time-Series Storage

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Redis (RedisTimeSeries module / Redis Stack)
- InfluxDB v2 (TSM engine, Flux query language)
- Python redis-py client library
- Python influxdb-client library
- Grafana (data source integration)

## Sources Consulted
- Redis TS.CREATE documentation: https://redis.io/docs/latest/commands/ts.create/
- Redis TS.ADD documentation: https://redis.io/docs/latest/commands/ts.add/
- Redis TS.RANGE documentation: https://redis.io/docs/latest/commands/ts.range/
- Redis TS.CREATERULE documentation: https://redis.io/docs/latest/commands/ts.createrule/
- redis-py TimeSeries source: https://github.com/redis/redis-py/blob/master/redis/commands/timeseries/commands.py
- InfluxDB v2 write API docs: https://docs.influxdata.com/influxdb/v2/write-data/developer-tools/api/
- InfluxDB v2 Flux query docs: https://docs.influxdata.com/influxdb/v2/query-data/flux/
- influxdb-client-python: https://github.com/influxdata/influxdb-client-python
- InfluxDB v2 storage engine: https://docs.influxdata.com/influxdb/v2/reference/internals/storage-engine/
- InfluxDB v2 data retention: https://docs.influxdata.com/influxdb/v2/reference/internals/data-retention/
- InfluxDB v2 alerting: https://docs.influxdata.com/influxdb/v2/monitor-alert/
- Grafana InfluxDB data source: https://grafana.com/docs/grafana/latest/datasources/influxdb/
- Redis Data Source plugin for Grafana: https://grafana.com/grafana/plugins/redis-datasource/
- Redis blog on Grafana plugin: https://redis.io/blog/introducing-the-redis-data-source-plug-in-for-grafana/

## Issues Found

### 1. Invalid `COMPACTION_POLICY` parameter in `TS.CREATE` (Critical)
**What was wrong:** The `TS.CREATE` command used a `COMPACTION_POLICY avg:60000:1800000` parameter, which does not exist. `TS.CREATE` only accepts `RETENTION`, `ENCODING`, `CHUNK_SIZE`, `DUPLICATE_POLICY`, `IGNORE`, and `LABELS`.
**What was changed:** Replaced the single `TS.CREATE` with the correct two-step approach: create the source series, create a destination series for compacted data, then link them with `TS.CREATERULE metrics:cpu:server1 metrics:cpu:server1:avg AGGREGATION avg 60000`.
**Why:** The `COMPACTION_POLICY` syntax was likely confused with the server-wide `ts-compaction-policy` redis.conf option, which uses a similar colon-delimited format but cannot be applied per-series via CLI commands.

### 2. Incorrect curl flag `--data-raw` for InfluxDB write (Minor)
**What was wrong:** The curl command used `--data-raw` instead of `--data-binary`.
**What was changed:** Changed `--data-raw` to `--data-binary`.
**Why:** The official InfluxDB v2 documentation specifies `--data-binary` for line protocol writes. While functionally similar for single-line writes, `--data-binary` correctly preserves newlines in multi-line batches and matches the documented best practice.

### 3. Redis Grafana integration described as "Via custom adapter" (Minor)
**What was wrong:** The comparison table listed Redis's Grafana integration as "Via custom adapter," implying users must build something custom.
**What was changed:** Changed to "Via plugin (Redis Data Source)."
**Why:** There is an official Redis Data Source plugin for Grafana (listed on the Grafana plugin catalog) that provides first-class RedisTimeSeries support including `TS.RANGE` and `TS.MRANGE` queries. It is not a custom adapter.

### 4. Overstated InfluxDB ingestion throughput claim (Minor)
**What was wrong:** The post claimed InfluxDB supports "millions of data points per second" for IoT ingestion.
**What was changed:** Changed to "hundreds of thousands of data points per second."
**Why:** Independent benchmarks show single-node InfluxDB typically achieves ~100K points/second. The "millions" figure is a marketing claim that only applies to large-scale InfluxDB 3 Enterprise clusters, not general deployments.

## Review Notes
- The post's code examples and feature comparison are specific to InfluxDB v2 (TSM engine, Flux query language, Flux-based Tasks). In InfluxDB 3.x, the TSM engine was replaced by an Apache Arrow/Parquet-based engine, and Flux is no longer supported (replaced by SQL and InfluxQL). The post remains accurate for v2 but readers should be aware of this version distinction.
- The Python InfluxDB client example omits `org` in the `write_api.write()` call, but this is not an error since `org` is inherited from the `InfluxDBClient` constructor. It is a valid pattern.
- The comparison table's "Automatic downsampling: Manual rules" for Redis is accurate — `TS.CREATERULE` requires manual configuration of each compaction rule.
