# How to Use system.zookeeper in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, System, ZooKeeper, Replication, Monitoring

Description: Learn how to use system.zookeeper in ClickHouse to browse ZooKeeper nodes, inspect replication metadata, and troubleshoot replica coordination issues.

---

`system.zookeeper` provides direct SQL access to the ZooKeeper (or ClickHouse Keeper) node tree used by ClickHouse for distributed coordination. ReplicatedMergeTree tables, distributed DDL, and cluster configuration are all stored in ZooKeeper. This table lets you browse, inspect, and diagnose the ZooKeeper state without needing a separate ZooKeeper client tool.

## How It Works

`system.zookeeper` is a virtual table that proxies queries to ZooKeeper. You must always provide a `WHERE path = ...` filter to specify which ZooKeeper path to inspect. Without a path filter, the query returns an error.

## Basic Usage

```sql
-- List children at the ClickHouse root
SELECT name, path, value, numChildren
FROM system.zookeeper
WHERE path = '/clickhouse';
```

## Key Columns

| Column | Type | Description |
|--------|------|-------------|
| `name` | String | Node name |
| `path` | String | Full ZooKeeper path |
| `value` | String | Node data value |
| `dataLength` | Int32 | Length of the value in bytes |
| `numChildren` | Int32 | Number of child nodes |
| `czxid` | Int64 | Transaction ID when node was created |
| `mzxid` | Int64 | Transaction ID of last modification |
| `ctime` | DateTime | Creation time |
| `mtime` | DateTime | Last modification time |
| `version` | Int32 | Data version (increments on each write) |
| `cversion` | Int32 | Children version |
| `aversion` | Int32 | ACL version |
| `ephemeralOwner` | Int64 | Session ID if ephemeral node, 0 otherwise |
| `pzxid` | Int64 | Transaction ID of last child modification |

## Exploring the ZooKeeper Tree

```sql
-- List all ClickHouse tables registered in ZooKeeper
SELECT name
FROM system.zookeeper
WHERE path = '/clickhouse/tables';
```

```sql
-- Inspect a specific replicated table
SELECT name, numChildren
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events';
```

## ZooKeeper Path Structure for ReplicatedMergeTree

```mermaid
flowchart TD
    A[/clickhouse] --> B[/clickhouse/tables]
    B --> C[/clickhouse/tables/shard-id/db/table]
    C --> D[/log: replication log entries]
    C --> E[/replicas: registered replicas]
    C --> F[/blocks: recently inserted block IDs]
    C --> G[/mutations: pending mutations]
    C --> H[/quorum: insert quorum state]
    E --> I[/replicas/replica1]
    E --> J[/replicas/replica2]
```

## Viewing Replication Log for a Table

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events/log'
ORDER BY name
LIMIT 20;
```

## Checking Registered Replicas

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events/replicas';
```

## Inspecting a Specific Replica's State

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events/replicas/replica1';
```

## Reading the Quorum State

```sql
SELECT value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events/quorum';
```

## Listing Pending Mutations in ZooKeeper

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events/mutations'
ORDER BY name;
```

## Checking Block Deduplication Keys

```sql
SELECT name
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events/blocks'
ORDER BY name DESC
LIMIT 10;
```

Block nodes are how ClickHouse implements exactly-once INSERT deduplication for replicated tables. Each INSERT creates a node here; duplicate inserts find the node already exists.

## Counting ZooKeeper Nodes for a Table

```sql
SELECT
    name,
    numChildren
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/default/events'
ORDER BY name;
```

## Using system.zookeeper vs system.replicas

| Table | Use Case |
|-------|----------|
| `system.replicas` | Summary of replica health for all tables on this server |
| `system.replication_queue` | Pending replication tasks on this server |
| `system.zookeeper` | Raw ZooKeeper state, shared coordination data |

## Summary

`system.zookeeper` is a direct SQL interface to the ZooKeeper node tree used for ClickHouse distributed coordination. Use it to explore the replication log, check registered replicas, inspect mutation state, and browse block deduplication keys. Always provide a `WHERE path = ...` filter, as the table performs a ZooKeeper read for every query. For routine replication monitoring, prefer `system.replicas` and `system.replication_queue`; use `system.zookeeper` for deep-dive investigation and debugging of coordination issues.
