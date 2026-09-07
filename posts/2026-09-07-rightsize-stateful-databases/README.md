# Rightsizing Stateful Databases with Workload Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Rightsizing, Capacity Planning, Performance

Description: Size stateful databases from connection concurrency, working-set cache behavior, IOPS, queue depth, latency, and recovery requirements.

---

A database with low average CPU is not necessarily oversized. Memory may hold the working set, storage latency may bound throughput, and spare capacity may be required for vacuum, checkpoints, replication catch-up, or failover. Database rightsizing must preserve both foreground latency and background health.

## Begin with workload and service objectives

Segment reads, writes, transactions, analytical queries, maintenance, backups, and replication. Record:

- transactions or queries per second;
- p50, p95, and p99 query and transaction latency;
- active and waiting sessions;
- connection attempts and pool saturation;
- rows, bytes, and temporary data per operation;
- replication lag and recovery objectives;
- maintenance duration and missed deadlines.

Measure through at least one full operational cycle. A quiet weekday window that excludes a weekly vacuum, backup, or month-end report is incomplete.

## Analyze connection pressure

Total connections are not the same as concurrently active work. A large idle pool consumes memory and process or thread resources without proving that the database needs more CPU.

Track:

```text
configured maximum connections
open connections
active sessions
sessions waiting by wait event
connection creation rate
pool queue time and rejection
```

Reduce idle pool fan-out before buying a larger instance. Bound each application pool so failover or horizontal application scaling cannot create a connection storm. Preserve administrative and replication connections outside the application budget.

## Interpret cache hit rate with I/O

For PostgreSQL, `pg_stat_database` reports blocks read and buffer hits. A simple database-buffer hit ratio is:

```sql
SELECT datname,
       blks_hit::numeric / NULLIF(blks_hit + blks_read, 0) AS shared_hit_ratio
FROM pg_stat_database;
```

This covers PostgreSQL shared-buffer hits and does not account for the operating-system cache. A lower ratio is not automatically bad for sequential scans, and a high ratio does not prove memory can be removed. Correlate it with query latency, physical reads, working-set churn, and execution plans.

These counters are cumulative since the statistics were reset. Record `stats_reset` and compare counter deltas over equivalent workload windows. PostgreSQL preserves these statistics across clean restarts, but resets them after an unclean shutdown or recovery from a base backup. Do not calculate counter deltas across a statistics reset; compare windows with equivalent workload and cache conditions.

MySQL exposes InnoDB buffer-pool statistics including reads, logical read requests, free and dirty pages, and a hit rate. Its documentation warns that some detailed buffer-pool information queries can affect production performance. Use low-impact counters and test intrusive analysis elsewhere.

## Determine the actual bottleneck

### CPU

Inspect saturation, run queue, query parallelism, compilation, encryption, and background work. Per-core saturation can matter even when instance-wide CPU is low.

### Memory

Account for buffer caches, per-connection or per-query memory, sorts, hashes, maintenance, engine overhead, and the operating-system cache. Test cold and warm cache behavior. A downsize often restarts or fails over the database, so its first hours can be the riskiest.

### Storage

Measure read and write IOPS, throughput, average I/O size, queue depth, and latency together. AWS RDS publishes `ReadIOPS`, `WriteIOPS`, `ReadLatency`, `WriteLatency`, `DiskQueueDepth`, and `FreeableMemory`, among other metrics. The acceptable value depends on the engine and workload; avoid universal threshold folklore.

### Network and replicas

Measure client traffic, replication throughput, lag, and cross-zone behavior. A smaller instance family can have a lower network ceiling even when CPU and memory fit.

## Preserve background and recovery capacity

Include checkpoints, compaction, vacuum, statistics, backups, schema changes, replica rebuilds, and failover. A configuration that serves foreground traffic but lets maintenance debt grow is undersized.

Define gates such as:

```yaml
foreground:
  p99_transaction_ms: 120
  pool_queue_p99_ms: 20
background:
  replica_lag_seconds: 30
  backup_finish_hours: 2
  maintenance_deadline_hours: 4
recovery:
  failover_rto_seconds: 90
  cache_warm_slo_minutes: 20
```

Use workload-owned targets rather than copying these example values.

## Test a realistic candidate

Clone a recent sanitized dataset or use a provider-supported restore. Replay representative concurrency and query mix against the target shape, including cold cache, maintenance, and a storage burst. Compare plans because reduced memory can change sort, hash, and cache behavior.

For a managed database, verify that changing instance class does not also change storage bandwidth, network, high-availability support, processor architecture, or licensing. Confirm downtime and rollback behavior from the provider documentation for that engine.

Roll out to a replica or low-risk shard first where the topology permits. Promote only after replication, failover, and data-integrity procedures have been tested. Keep a validated rollback target and enough quota and capacity to restore it.

## Calculate savings honestly

Include instance, storage performance, replicas, licenses, data transfer, backups, and longer job runtime. A smaller database that needs more provisioned IOPS or causes applications to retry may not save money.

Measure cost per transaction at comparable load and service quality. Revisit after data growth, new indexes, query changes, or connection topology changes.

## Conclusion

Rightsize a stateful database from concurrency, cache and working-set behavior, I/O latency, and recovery work. Validate foreground and background objectives with realistic data and cold-cache tests. Treat provider instance changes as topology and performance changes, not merely smaller CPU and memory numbers.

## Official Documentation

- [PostgreSQL cumulative statistics views](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL I/O statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-IO-VIEW)
- [MySQL InnoDB buffer pool tables](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-buffer-pool-tables.html)
- [Amazon RDS CloudWatch metrics](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html)
- [Amazon RDS best practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
