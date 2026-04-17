# Validation Summary: How to Configure ClickHouse for Edge Computing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server config, MergeTree family, materialized views, Buffer/Distributed engines, remote() table function)
- Edge computing / IoT data pipelines
- SQL (DDL, materialized views)
- XML server configuration

## Sources Consulted
- ClickHouse SummingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Buffer engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/buffer
- ClickHouse Distributed engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse remote() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/remote
- ClickHouse server configuration parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings

## Issues Found

1. **Materialized view used `SummingMergeTree` with `avg`/`min`/`max`/`count` aggregations.**
   - SummingMergeTree only sums numeric columns during background merges, so `avg`, `min`, `max` would be silently corrupted across merges (e.g., merged rows would store the sum of mins, not a true min).
   - Fix: switched the engine to `AggregatingMergeTree` and changed the aggregations to `-State` combinators (`avgState`, `minState`, `maxState`, `countState`). Added a one-line note explaining why.

2. **Sync query used `SELECT *` from a materialized view that now stores partial AggregateFunction states.**
   - With the engine change, `SELECT *` would ship opaque binary state blobs whose schema must match exactly on the destination. Updated the sync query to use `-Merge` combinators (`avgMerge`, `minMerge`, `maxMerge`, `countMerge`) with an explicit `GROUP BY`, so the central cluster receives finalized scalar values.
   - Also added the more idiomatic `INSERT INTO FUNCTION remote(...)` form and quoted `'prod.sensor_hourly'` as a string literal (the documented form).

3. **"Handling Intermittent Connectivity" section recommended the `Buffer` engine.**
   - The Buffer engine flushes to a *local* destination table; if the destination is unreachable (or is a Distributed table that fails to deliver), buffered data can be lost (Buffer is in-memory, non-persistent across restarts and flush failures). It does not solve the stated problem of an unreachable central cluster.
   - Fix: replaced the Buffer example with a `Distributed` engine table. Distributed automatically spools inserts to disk under `<path>/distributed/` when remote shards are unreachable and retries delivery, which is the canonical ClickHouse pattern for intermittent connectivity.

## Review Notes
- Server config keys (`max_server_memory_usage`, `max_concurrent_queries`, `background_pool_size`, `background_move_pool_size`) are valid top-level server settings. Note: `background_pool_size` and related background pool settings have evolved across ClickHouse versions; on very recent versions they are also exposed via MergeTree settings, but the top-level form shown here remains accepted.
- The `MergeTree` definition with `PARTITION BY toYYYYMMDD(ts)` and a 7-day TTL is reasonable for an edge node; daily partitions keep partition count low (~7) which is a good practice.
- The `LowCardinality(String)` choice for `device_id`/`metric` is appropriate for sensor telemetry where the cardinality of these dimensions is low.
- The Distributed engine example assumes `central_cluster` is defined in `remote_servers` configuration — readers unfamiliar with ClickHouse cluster setup may need to consult the cluster docs.
