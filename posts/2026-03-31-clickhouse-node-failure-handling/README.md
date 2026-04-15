# How to Handle Node Failures in ClickHouse Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, High Availability, Operation, Database

Description: Learn how ClickHouse behaves when a cluster node fails, how to keep queries running, and how to safely bring failed nodes back into the cluster.

Node failures are inevitable in any distributed system. ClickHouse is designed to handle them gracefully when configured correctly. A failed replica stops receiving new data but the healthy replicas in the same shard continue serving reads and writes. When the failed node comes back, it catches up automatically. This guide covers what happens at each stage and what actions you need to take.

## What Happens When a Node Fails

When a ClickHouse node goes down:

1. The ZooKeeper session for that node expires (after `session_timeout_ms`, default 30 seconds)
2. ZooKeeper marks the node's ephemeral znodes as gone
3. Other replicas in the shard detect the node is offline and stop trying to push data to it
4. New inserts succeed on the remaining replicas
5. Distributed table queries skip the failed node and route to healthy replicas

The failed node's data is still accessible through its replica peers. No writes are blocked unless you are using quorum inserts and the quorum cannot be met.

## Detecting a Failed Node

```sql
-- Check which replicas are currently active
SELECT
    database,
    table,
    replica_name,
    is_leader,
    is_readonly,
    active_replicas,
    total_replicas,
    absolute_delay,
    last_queue_update_exception
FROM system.replicas
ORDER BY active_replicas;

-- A healthy replica shows active_replicas = total_replicas
-- A cluster with a failed node shows active_replicas < total_replicas
```

```sql
-- Check ZooKeeper for replica liveness directly
SELECT
    name AS replica,
    value AS session_info
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/events/replicas'
ORDER BY name;
```

## Configuring Distributed Table Behavior During Failures

The `Distributed` table engine has several settings that control how it handles unavailable replicas:

```xml
<!-- config.d/distributed.xml -->
<clickhouse>
    <distributed_ddl>
        <path>/clickhouse/task_queue/ddl</path>
        <!-- How long to wait for all nodes during ON CLUSTER queries -->
        <task_max_lifetime>604800</task_max_lifetime>
        <cleanup_delay_period>60</cleanup_delay_period>
    </distributed_ddl>
</clickhouse>
```

```sql
-- Query settings for handling node failures
SET connect_timeout_with_failover_ms = 50;
SET receive_timeout = 300;

-- Skip unavailable shards instead of failing the query
SET skip_unavailable_shards = 1;

-- Limit the number of retries for failed connections
SET connections_with_failover_max_tries = 3;

-- Example Distributed table with failover settings
CREATE TABLE events_distributed ON CLUSTER production_cluster
AS events
ENGINE = Distributed(
    production_cluster,
    currentDatabase(),
    events,
    cityHash64(user_id)
);
```

## Querying During a Node Failure

With `skip_unavailable_shards = 1`, queries run against the available replicas:

```sql
-- This will succeed even if one replica is down
-- Results may be incomplete if a shard has no active replicas
SET skip_unavailable_shards = 1;

SELECT
    toDate(event_time) AS day,
    count() AS events
FROM events_distributed
GROUP BY day
ORDER BY day DESC
LIMIT 10;
```

If you have replicas and `internal_replication = true`, ClickHouse automatically routes to the healthy replica within the shard. The query returns complete results as long as at least one replica per shard is alive.

## Insert Behavior During a Node Failure

Inserts into a `Distributed` table go to one replica per shard when `internal_replication = true`. The failed replica will catch up when it comes back:

```sql
-- This insert succeeds even with one replica down
-- The healthy replica stores the data and the failed replica
-- fetches missing data parts from other replicas when it recovers
INSERT INTO events_distributed VALUES
    (now(), 1001, 'page_view', '{}');
```

If you use quorum inserts, a node failure can block writes if the quorum cannot be met:

```sql
-- With quorum = 2 and only 1 replica alive, this will timeout
SET insert_quorum = 2;
SET insert_quorum_timeout = 10000;  -- 10 seconds

INSERT INTO events VALUES (now(), 1001, 'page_view', '{}');
-- ERROR: Not enough replicas have acknowledged the block
```

Reduce the quorum or disable it during planned maintenance:

```sql
SET insert_quorum = 1;  -- or
SET insert_quorum = 0;  -- disable quorum (default)
```

## Fencing a Degraded Node

Before taking a node down intentionally, stop writes to it gracefully:

```sql
-- On the node you want to take down:
-- 1. Stop merges to reduce activity
SYSTEM STOP MERGES;

-- 2. Stop the replication queue processing
SYSTEM STOP REPLICATION QUEUES;

-- 3. Wait for in-flight queries to complete
SELECT count() FROM system.processes WHERE query != '';

-- 4. Now it is safe to stop the service
```

```bash
systemctl stop clickhouse-server
```

## Bringing a Node Back Up

When the failed node comes back, ClickHouse automatically re-establishes the ZooKeeper session and starts catching up:

```bash
systemctl start clickhouse-server
```

Monitor the recovery progress:

```sql
-- Watch the queue drain
SELECT
    table,
    queue_size,
    inserts_in_queue,
    absolute_delay
FROM system.replicas
ORDER BY queue_size DESC;

-- Watch for errors
SELECT
    event_time,
    level,
    message
FROM system.text_log
WHERE level IN ('Error', 'Warning')
  AND event_time > now() - INTERVAL 10 MINUTE
ORDER BY event_time DESC;
```

If the node does not start catching up automatically within a few minutes:

```sql
-- Force restart of replication threads
SYSTEM RESTART REPLICAS;

-- Or for a specific table
SYSTEM RESTART REPLICA database.table_name;
```

## When a Node Has Been Down Too Long

If a node was offline long enough that the ZooKeeper log has been trimmed (old log entries cleaned up), the replica may not be able to catch up incrementally. It needs a full resync:

```sql
-- Check if the replica can still catch up
SELECT
    table,
    log_pointer,
    log_max_index,
    (log_max_index - log_pointer) AS entries_behind
FROM system.replicas;
```

If `entries_behind` is very large and the replica is not making progress, drop the local table and recreate it so it re-clones all data from the peer replica:

```sql
-- Drop the local table on the stuck replica
DROP TABLE database.table_name SYNC;

-- Recreate it with the same DDL (it re-registers in ZooKeeper
-- and fetches all data parts from the healthy replica)
CREATE TABLE database.table_name ...  -- use the original CREATE TABLE statement
```

## Node Replacement (Permanent Failure)

If a node has permanently failed and needs to be replaced with new hardware:

```bash
# 1. Provision the new server with the same hostname or update DNS
# 2. Install ClickHouse with the same version
# 3. Copy config files from another node (config.d/, users.d/)
# 4. Set the SAME macros as the failed node (same shard and replica name)
# 5. Start ClickHouse - it will register the replica in ZooKeeper
#    and start downloading all data from the peer replica
systemctl start clickhouse-server
```

```sql
-- Monitor the replacement node catching up
SELECT
    table,
    queue_size,
    absolute_delay,
    active_replicas,
    total_replicas
FROM system.replicas
ORDER BY queue_size DESC;
```

The replacement node downloads all data parts from the peer replica. For large tables this can take hours - plan accordingly and keep the cluster in degraded mode (not taking the peer down) until the replacement is fully caught up.
