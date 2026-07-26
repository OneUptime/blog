# How to Size the InnoDB Buffer Pool Without Causing Swap or OOM on Percona Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, InnoDB, MySQL, Memory Tuning, Performance

Description: Size the InnoDB buffer pool from a host memory budget, then tune it with workload evidence while preserving headroom for connections, caches, and the operating system.

---

The familiar advice to assign 70% or 80% of RAM to `innodb_buffer_pool_size` is a starting hypothesis for a dedicated server, not a capacity calculation. MySQL's 8.4 manual notes that a dedicated database server might use 80%, but it also warns that InnoDB allocates roughly 10% more than the configured pool for buffers and control structures.

Percona Server also needs memory for connections, joins and sorts, Performance Schema, table metadata, replication, backup activity, the operating system, and every co-located agent. Containers add a cgroup limit that may be much lower than host RAM.

## Build a Memory Budget First

Use:

```text
safe buffer pool =
  effective memory limit
  - OS and filesystem headroom
  - measured mysqld non-buffer-pool peak
  - other processes and agents
  - burst safety margin
```

The effective limit is the smallest of physical RAM, VM/container limit, and any service manager limit.

Collect the host view:

```bash
free -h
swapon --show
systemctl show mysql -p MemoryMax -p MemoryHigh

# cgroup v2; use the paths for the mysql service/container.
cat /sys/fs/cgroup/memory.max
cat /sys/fs/cgroup/memory.current
```

On a 64 GiB dedicated host, a defensible initial budget might be:

```text
64 GiB physical
- 8 GiB OS, filesystem, monitoring, emergency headroom
- 8 GiB measured/estimated mysqld overhead and concurrency burst
= 48 GiB initial buffer pool
```

On a shared host or container, the percentage should usually be lower. Do not size from dataset size alone; a 2 TiB database can run with a 48 GiB cache if its hot working set and I/O SLO permit it.

## Measure the Current Database Footprint

```sql
SELECT
  @@innodb_buffer_pool_size AS configured_bytes,
  @@innodb_buffer_pool_chunk_size AS chunk_bytes,
  @@innodb_buffer_pool_instances AS instances;

SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_pages_%';
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%';
SHOW GLOBAL STATUS LIKE 'Created_tmp%';
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Max_used_connections';
```

At the OS level, monitor RSS, anonymous memory, page faults, swap-in/out, and cgroup `memory.events`. `VmRSS` is more useful for physical pressure than virtual address size:

```bash
pid=$(pidof mysqld)
grep -E 'VmRSS|VmSwap|VmSize' "/proc/$pid/status"
cat /sys/fs/cgroup/memory.events
```

Any sustained swap activity on a latency-sensitive database is a strong signal to reduce pressure. A past cgroup `oom_kill` means the budget already failed, even if the process looks healthy after restart.

## Estimate Non-Pool Memory Under Real Concurrency

Do not multiply every per-session maximum by `max_connections`; most buffers are allocated only when an operation needs them. Conversely, do not ignore them. A burst of joins, sorts, temporary tables, or large network packets across many active sessions can create a sharp peak.

Review:

```sql
SELECT
  @@max_connections,
  @@sort_buffer_size,
  @@join_buffer_size,
  @@read_buffer_size,
  @@read_rnd_buffer_size,
  @@tmp_table_size,
  @@max_heap_table_size,
  @@performance_schema;
```

Use Performance Schema memory summaries and PMM to observe actual allocation instead of relying on a worst-case multiplication:

```sql
SELECT event_name, current_alloc, high_alloc
FROM sys.memory_global_by_current_bytes
ORDER BY current_alloc DESC
LIMIT 20;
```

Account separately for:

- adaptive hash and change-buffer structures;
- Performance Schema instrumentation;
- table/open-file caches and dictionary metadata;
- replication appliers and binary/relay log caches;
- thread stacks and connection buffers;
- backup, encryption, and compression work;
- sidecars, exporters, and security agents.

## Set a Conservative Initial Pool

In configuration:

```ini
[mysqld]
innodb_buffer_pool_size=48G
```

MySQL 8.4 resizes in chunks. The effective pool must be a multiple of:

```text
innodb_buffer_pool_chunk_size * innodb_buffer_pool_instances
```

If the requested size is not aligned, MySQL adjusts it. Query the effective value after startup rather than assuming the file value was used.

The pool can also be changed online:

```sql
SET GLOBAL innodb_buffer_pool_size = 51539607552;
```

Online resize is not impact-free. MySQL may wait for active transactions before starting, and some phases block operations that need the buffer pool. Perform changes in steps during a controlled window.

Monitor progress:

```sql
SELECT variable_name, variable_value
FROM performance_schema.global_status
WHERE LOWER(variable_name) LIKE 'innodb_buffer_pool_resize%';
```

Persist an accepted value through configuration management; a runtime-only `SET GLOBAL` does not necessarily survive restart.

## Tune from Miss Cost, Not Hit Ratio Alone

Calculate reads over a representative interval, not since an arbitrary server start:

```text
logical requests delta = Innodb_buffer_pool_read_requests delta
physical reads delta   = Innodb_buffer_pool_reads delta
```

A high hit rate can coexist with a painful volume of random physical reads, and a lower hit rate may be fine for a scan-heavy warehouse. Correlate the deltas with storage latency, query SLOs, and the hot working set.

If the server has ample headroom and physical reads are hurting latency, increase the pool gradually. If the workload already fits and the pool has persistently unused pages, more cache may offer no value. If RSS approaches the limit, swap rises, or the OOM killer acts, reduce it even when the hit rate falls slightly.

Test the peak workload:

- normal application concurrency;
- large reports and temporary tables;
- replication catch-up;
- XtraBackup;
- compaction-like maintenance and DDL;
- monitoring scrapes and failover warmup.

Leave headroom for an abnormal but plausible combination. The last few GiB of cache rarely justify an OOM restart.

## Avoid Common Sizing Mistakes

- **Copying the 80% rule into Kubernetes.** Size from the container limit, not node RAM.
- **Counting Linux page cache as wasted.** The OS still needs memory for binaries, logs, networking, and non-InnoDB files.
- **Setting huge global per-session buffers.** Tune problematic queries and concurrency before raising defaults.
- **Disabling swap as the only fix.** That changes the failure mode from slow paging to faster OOM; correct the memory budget.
- **Making one large online resize.** Step changes and watch latency and resize status.
- **Ignoring startup and warmup.** Large pools take longer to initialize; use buffer-pool dump/load features where appropriate and rehearse restart behavior.

The safe size is the largest pool that improves the workload while preserving measured headroom under peak concurrency. Treat that value as capacity data and revisit it when connection counts, schema, queries, or co-located services change.

## Official Documentation

- [MySQL 8.4 `innodb_buffer_pool_size`](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_buffer_pool_size)
- [Configure and resize the InnoDB buffer pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-resize.html)
- [InnoDB buffer pool configuration](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)
- [Save and restore buffer pool state](https://dev.mysql.com/doc/refman/8.4/en/innodb-preload-buffer-pool.html)
- [Percona Server 8.4 system variables](https://docs.percona.com/percona-server/8.4/percona-server-system-variables.html)
