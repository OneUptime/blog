# Validation Summary: How to Handle Stale Replicas in Distributed Queries

## Status
validated

## Post Type
Guide / Reference (ClickHouse operational tuning for distributed reads)

## Technologies Covered
- ClickHouse Distributed table engine
- ClickHouse ReplicatedMergeTree replication
- `system.replicas` system table
- ClickHouse built-in Prometheus `/metrics` endpoint / `system.asynchronous_metrics`

## Sources Consulted
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- Replicated table engines: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- `system.replicas`: https://clickhouse.com/docs/en/operations/system-tables/replicas
- `system.asynchronous_metrics`: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- Parallel replicas guide: https://clickhouse.com/docs/deployment-guides/parallel-replicas
- ClickHouse discussion on `select_sequential_consistency` semantics: https://github.com/ClickHouse/ClickHouse/discussions/66569

## Issues Found

1. **Incorrect section heading for the consistency section.** The heading read "Forcing Consistency with allow_experimental_parallel_reading_from_replicas", but `allow_experimental_parallel_reading_from_replicas` is an unrelated performance feature (splits a query across replicas of a shard), not a consistency control. The body of the section correctly discusses `select_sequential_consistency`. Renamed the heading to "Forcing Consistency with select_sequential_consistency" so it matches the setting actually being described.

2. **Inaccurate description of `select_sequential_consistency`.** The post claimed it "forces the replica to wait until it has processed all mutations and inserts that the quorum has acknowledged." Per the official docs, this setting only restricts SELECTs to replicas that contain data from previous INSERTs executed with `insert_quorum`; it is tied specifically to `insert_quorum` writes and does not cover `ALTER` mutations. Reworded to reflect the real semantics and noted that it requires `insert_quorum` writes to have any effect.

3. **Non-existent Prometheus metric shape.** The post showed `ClickHouseAsyncMetrics_ReplicaDelay{database="default",table="events"} 12` as if the built-in `/metrics` endpoint exposed per-table replica-lag labels. ClickHouse's async metrics (from `system.asynchronous_metrics`) are global aggregates with no `database`/`table` labels. Replaced the example with the actual metric name `ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay` and added a note that per-table visibility requires scraping `system.replicas` via a custom exporter query. Updated the alert-target name in the trailing sentence to match.

## Review Notes
- The `load_balancing` option list (random, nearest_hostname, in_order, first_or_random, round_robin) is correct but not exhaustive: recent ClickHouse versions also support `hostname_levenshtein_distance`. Not an error, so it was left as-is.
- `max_replica_delay_for_distributed_queries` is verified — unit is seconds, default 300. The example value of 300 in the post equals the default and is fine for illustration.
- `fallback_to_stale_replicas_for_distributed_queries` defaults to `1` in ClickHouse; the post correctly describes the 0/1 semantics.
- `system.replicas` column names (`database`, `table`, `replica_name`, `absolute_delay`, `queue_size`) are correct; `absolute_delay` is in seconds as stated.
