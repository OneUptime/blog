# How to Use serverUUID() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UUID, Server, Diagnostic, Replication

Description: Learn how serverUUID() returns the persistent unique identifier of a ClickHouse server instance, useful for multi-node diagnostics, sharding logic, and audit logging.

---

`serverUUID()` returns the `UUID` value that uniquely identifies the running ClickHouse server instance. This UUID is generated once when the server first starts and persisted in the `uuid` file inside the server's data directory. It remains stable across restarts and is referenced internally by ClickHouse in several subsystems such as cluster discovery, DDL workers, and replicated database coordination. The function takes no arguments and always returns a `UUID`.

## Basic Usage

```sql
-- Retrieve the current server's UUID
SELECT serverUUID() AS server_id;
```

```text
server_id
a5d4c3b2-e1f0-4a7b-8c9d-0e1f2a3b4c5d
```

## Identifying the Current Server

Use `serverUUID()` alongside `hostName()` to uniquely identify the current server in diagnostics.

```sql
-- Show the current server's UUID and hostname together
SELECT
    serverUUID()  AS server_uuid,
    hostName()    AS host;
```

## Tagging Rows with the Originating Server

In multi-node setups, stamping rows with the server UUID helps trace which node ingested each record.

```sql
CREATE TABLE ingestion_log (
    ingest_time DateTime DEFAULT now(),
    source_file String,
    row_count   UInt64,
    server_id   UUID DEFAULT serverUUID()
) ENGINE = MergeTree ORDER BY ingest_time;

INSERT INTO ingestion_log (source_file, row_count)
VALUES ('events_2024_06_15.csv', 1500000);

SELECT * FROM ingestion_log;
```

```text
ingest_time          source_file              row_count  server_id
2024-06-15 08:00:00  events_2024_06_15.csv    1500000    a5d4c3b2-...
```

## Audit Log: Track Which Server Ran a Mutation

```sql
-- Audit table for ALTER TABLE mutations
CREATE TABLE mutation_audit (
    mutation_time DateTime DEFAULT now(),
    table_name    String,
    mutation_cmd  String,
    executed_by   UUID DEFAULT serverUUID()
) ENGINE = MergeTree ORDER BY mutation_time;

-- Log a mutation event
INSERT INTO mutation_audit (table_name, mutation_cmd)
VALUES ('events', 'ALTER TABLE events DELETE WHERE event_time < ''2023-01-01''');
```

## Shard Identification in a Distributed Setup

In a cluster, use `serverUUID()` to identify which shard is responding to a query.

```sql
-- On a Distributed table, see which shards are active
SELECT
    hostName()    AS host,
    serverUUID()  AS shard_uuid,
    count()       AS local_rows
FROM distributed_events
GROUP BY host, shard_uuid;
```

## Tagging Replication Diagnostics

Each replica in a `ReplicatedMergeTree` cluster runs on a server with its own `serverUUID()`. You can include it in diagnostic queries to identify which server you are currently connected to.

```sql
-- Show the current server UUID alongside replication status
SELECT
    serverUUID()  AS my_server_uuid,
    table,
    is_leader,
    total_replicas,
    active_replicas
FROM system.replicas
WHERE table = 'events';
```

## System Table Reference

```sql
-- Check system.zookeeper for the server UUID path (Keeper/ZooKeeper clusters)
SELECT
    name,
    value
FROM system.zookeeper
WHERE path = '/clickhouse/tables'
LIMIT 5;
```

```sql
-- See all servers in a cluster
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    port
FROM system.clusters
ORDER BY cluster, shard_num, replica_num;
```

## Stable Seed for Node-Local Hashing

Because `serverUUID()` is stable within a server lifetime, it can seed node-local hash functions for consistent routing.

```sql
-- Route rows to this shard using the server UUID as part of a hash seed
SELECT
    event_id,
    cityHash64(toString(serverUUID()), event_id) % 8 AS local_bucket
FROM events
LIMIT 10;
```

## Monitoring Which Server Executes Long-Running Queries

```sql
-- Annotate slow query log with the server UUID
SELECT
    query_start_time,
    query_duration_ms,
    serverUUID() AS server_id,
    query
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND query_duration_ms > 5000
ORDER BY query_duration_ms DESC
LIMIT 20;
```

## Summary

`serverUUID()` returns the persistent, stable UUID of the current ClickHouse server instance. Use it to stamp ingestion records with their originating node, identify shards in distributed queries, audit mutations, and seed node-local hash functions. The UUID is generated once at first startup and never changes, making it a reliable node identity token across restarts, replication events, and rolling upgrades.
