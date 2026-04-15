# How to Use system.zookeeper Table in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.zookeeper, ZooKeeper, Replication, Metadata, System Table

Description: Use system.zookeeper to browse and inspect the ZooKeeper or ClickHouse Keeper metadata tree that manages ClickHouse replication and distributed coordination.

---

ClickHouse uses ZooKeeper (or the built-in ClickHouse Keeper) to coordinate replication, distributed DDL, and cluster membership. The `system.zookeeper` table lets you query the ZooKeeper/Keeper metadata tree directly from SQL, making it invaluable for debugging replication issues without needing external ZooKeeper clients.

## What is system.zookeeper?

`system.zookeeper` is a virtual table that exposes the ZooKeeper node tree. Unlike regular system tables, it requires a `WHERE path = '...'` clause to specify which node to inspect. Each row represents one child node at that path.

Columns include:
- `name` - node name
- `path` - full path
- `value` - node data (as string)
- `dataLength` - byte length of value
- `numChildren` - number of child nodes
- `pzxid`, `ctime`, `mtime` - metadata

## Browsing the Root

```sql
SELECT name, value, numChildren
FROM system.zookeeper
WHERE path = '/';
```

## Inspecting Replication Nodes

Browse replication metadata for a table:

```sql
SELECT name, value, numChildren
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/mydb/events';
```

## Checking the Log

View the replication log for a table:

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/mydb/events/log'
LIMIT 20;
```

## Replica Status

Check which replicas are registered:

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/mydb/events/replicas';
```

## Checking Leader Election

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/mydb/events/leader_election';
```

## Distributed DDL Queue

Inspect the distributed DDL task queue:

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/task_queue/ddl';
```

View a specific DDL task:

```sql
SELECT value
FROM system.zookeeper
WHERE path = '/clickhouse/task_queue/ddl/query-XXXX';
```

## Checking Insert Quorum Status

```sql
SELECT name, value
FROM system.zookeeper
WHERE path = '/clickhouse/tables/01/mydb/events/quorum';
```

## Important Notes

- This table only works when ClickHouse is connected to ZooKeeper/Keeper
- On ClickHouse Keeper (built-in), the same paths apply
- Heavy use of `system.zookeeper` queries can increase load on the Keeper cluster - use judiciously in production
- The `path` must exactly match an existing ZooKeeper node; non-existent paths return no rows

## Summary

`system.zookeeper` provides direct SQL access to ClickHouse's coordination metadata stored in ZooKeeper or ClickHouse Keeper. Use it to debug replication state, inspect log contents, check insert quorum status, and trace distributed DDL task execution without needing external ZooKeeper tooling.
