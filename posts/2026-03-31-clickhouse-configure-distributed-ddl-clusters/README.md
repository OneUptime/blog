# How to Configure Distributed DDL in ClickHouse Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed DDL, ON CLUSTER, DDL, Cluster Management, ZooKeeper

Description: Learn how to configure and manage distributed DDL in ClickHouse clusters, including task queues, timeouts, and cleanup settings.

---

Distributed DDL in ClickHouse allows you to run schema changes on all nodes in a cluster with a single statement. Understanding how it works and how to configure it helps you avoid stuck DDL tasks and schema inconsistencies across shards and replicas.

## How Distributed DDL Works

When you run `CREATE TABLE ... ON CLUSTER`, ClickHouse:

1. Writes a DDL task to ZooKeeper/Keeper at `/clickhouse/task_queue/ddl`
2. Each node in the cluster polls Keeper for new tasks
3. Each node executes the DDL locally and writes its completion status
4. The initiating node waits for all nodes to confirm or times out

## Key Configuration Parameters

Add to `/etc/clickhouse-server/config.d/distributed_ddl.xml`:

```xml
<clickhouse>
  <distributed_ddl>
    <path>/clickhouse/task_queue/ddl</path>
    <cleanup_delay_period>60</cleanup_delay_period>
    <task_max_lifetime>604800</task_max_lifetime>
    <max_tasks_in_queue>1000</max_tasks_in_queue>
  </distributed_ddl>
</clickhouse>
```

- `cleanup_delay_period`: seconds between DDL task cleanup runs (default 60)
- `task_max_lifetime`: seconds before completed DDL tasks are deleted (default 7 days)
- `max_tasks_in_queue`: maximum number of tasks allowed in the queue (default 1000)

## Set DDL Timeout

```sql
SET distributed_ddl_task_timeout = 300; -- 5 minutes
```

This controls how long the initiating node waits for all cluster nodes to complete the DDL task. If a node is down, the task will time out and the initiating node returns an error - but the other nodes still complete the task when they come back online.

## Run a Distributed DDL Statement

```sql
CREATE TABLE metrics ON CLUSTER my_cluster (
    ts     DateTime,
    host   String,
    value  Float64
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/metrics', '{replica}')
PARTITION BY toYYYYMMDD(ts)
ORDER BY (host, ts);
```

## Monitor DDL Task Status

```sql
SELECT
    entry, status, query, host, exception_text
FROM system.distributed_ddl_queue
ORDER BY entry DESC
LIMIT 20;
```

Entries with `status = 'Inactive'` indicate nodes that have loaded the task but not yet executed the DDL.

## Clean Up Stuck DDL Tasks

If a node fails mid-cluster and leaves tasks stuck:

```bash
# List tasks in Keeper
clickhouse-keeper-client -h localhost -p 9181 -q "ls /clickhouse/task_queue/ddl"

# Remove a stuck entry recursively
clickhouse-keeper-client -h localhost -p 9181 \
  -q "rmr /clickhouse/task_queue/ddl/query-0000001234"
```

## Disable DDL on Specific Nodes

To prevent a node from picking up distributed DDL tasks (e.g., during maintenance):

```xml
<distributed_ddl>
  <pool_size>0</pool_size>
</distributed_ddl>
```

Setting `pool_size` to 0 disables the DDL worker on that node.

## Summary

Distributed DDL in ClickHouse is managed via a Keeper task queue. Tune `distributed_ddl_task_timeout` to match your cluster's response time, monitor `system.distributed_ddl_queue` for stuck tasks, and configure `task_max_lifetime` to keep the task queue from growing unbounded.
