# How to Set Up Semi-Synchronous Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Semi-Synchronous, Durability, High Availability

Description: Learn how to configure MySQL semi-synchronous replication to ensure at least one replica acknowledges each transaction before the source commits, reducing data loss risk.

---

## What Is Semi-Synchronous Replication?

In standard asynchronous replication, the source commits transactions and writes to the binary log without waiting for any replica to receive the events. If the source crashes before a replica receives the latest events, those transactions are lost.

Semi-synchronous replication is a middle ground:
- The source waits for at least one replica to acknowledge receipt of the binary log events before returning the commit to the client.
- This guarantees that committed transactions exist on at least two servers.
- If no replica acknowledges within a timeout, the source falls back to asynchronous mode.

## Installing the Plugins

Semi-synchronous replication requires plugins on both the source and replica.

On the source:

```sql
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
-- or for MySQL 5.7:
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
```

On the replica:

```sql
INSTALL PLUGIN rpl_semi_sync_replica SONAME 'semisync_replica.so';
-- or for MySQL 5.7:
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';
```

Verify the plugins are loaded:

```sql
SHOW PLUGINS WHERE Name LIKE '%semi%';
```

## Enabling Semi-Synchronous on the Source

```sql
SET GLOBAL rpl_semi_sync_source_enabled = ON;
```

Or in `my.cnf` for automatic loading at startup:

```text
[mysqld]
rpl_semi_sync_source_enabled = ON
rpl_semi_sync_source_timeout = 10000
```

`rpl_semi_sync_source_timeout` is in milliseconds. After this timeout with no replica acknowledgment, the source falls back to async mode. Default is 10 seconds.

## Enabling Semi-Synchronous on the Replica

```sql
SET GLOBAL rpl_semi_sync_replica_enabled = ON;
```

Or in `my.cnf`:

```text
[mysqld]
rpl_semi_sync_replica_enabled = ON
```

## Restarting Replication Threads

After enabling semi-sync, restart the replication I/O thread on the replica to begin semi-sync operation:

```sql
STOP REPLICA IO_THREAD;
START REPLICA IO_THREAD;
```

## Verifying Semi-Synchronous Is Active

On the source:

```sql
SHOW STATUS LIKE 'Rpl_semi_sync_source_status';
```

```text
+-----------------------------+-------+
| Variable_name               | Value |
+-----------------------------+-------+
| Rpl_semi_sync_source_status | ON    |
+-----------------------------+-------+
```

On the replica:

```sql
SHOW STATUS LIKE 'Rpl_semi_sync_replica_status';
```

```text
+------------------------------+-------+
| Variable_name                | Value |
+------------------------------+-------+
| Rpl_semi_sync_replica_status | ON    |
+------------------------------+-------+
```

## Monitoring Semi-Sync Activity

```sql
-- On source: check how many replicas are semi-sync enabled
SHOW STATUS LIKE 'Rpl_semi_sync_source_clients';

-- Number of times source waited for replica acknowledgment
SHOW STATUS LIKE 'Rpl_semi_sync_source_yes_tx';

-- Number of times source fell back to async (replica too slow)
SHOW STATUS LIKE 'Rpl_semi_sync_source_no_tx';
```

A high `Rpl_semi_sync_source_no_tx` count indicates replicas are not keeping up and the source frequently falls back to async mode.

## Configuring Wait for N Replicas (MySQL 8.0 - After-Sync)

In MySQL 8.0, configure how many replicas must acknowledge before the source returns to the client:

```sql
SET GLOBAL rpl_semi_sync_source_wait_for_replica_count = 2;
```

The default is 1. Setting to 2 requires at least 2 replicas to acknowledge each transaction.

## After-Commit vs. After-Sync Mode (MySQL 5.7.2+)

| Mode | When Replica Acknowledged | Durability |
|---|---|---|
| `AFTER_COMMIT` (old default) | After source commits but before returning to client | Phantom reads possible on source; data loss risk on failover |
| `AFTER_SYNC` (recommended) | After writing to relay log, before source commits | No phantom reads; true loss-less replication |

```sql
SET GLOBAL rpl_semi_sync_source_wait_point = AFTER_SYNC;
```

Use `AFTER_SYNC` (also called "lossless semi-sync") for the strongest durability guarantees.

## Fallback to Async Mode

When the timeout is exceeded:

```sql
SHOW STATUS LIKE 'Rpl_semi_sync_source_status';
-- Returns: OFF  (fallen back to async)
```

Once a replica catches up and acknowledges:

```sql
-- Returns: ON  (reverted to semi-sync)
```

## Summary

Semi-synchronous replication reduces data loss by requiring at least one replica to acknowledge receipt of binary log events before the source commits. Install the `semisync_source` and `semisync_replica` plugins, enable them on both servers, and use `AFTER_SYNC` mode for lossless replication. Monitor `Rpl_semi_sync_source_no_tx` to detect when the source falls back to async due to slow replicas.
