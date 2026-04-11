# How MySQL Replication Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Binary Log, InnoDB, Internal

Description: Learn how MySQL replication works internally including the binary log, IO thread, SQL thread, GTID tracking, and how replicas stay synchronized with the primary.

---

## Overview of the Replication Architecture

MySQL replication is asynchronous by default. The primary (source) records all data-modifying statements or row changes to a binary log. Each replica connects to the primary and continuously reads and applies those log events. Three components drive this process.

## The Binary Log on the Primary

The binary log (`binlog`) is a sequential journal of all committed transactions that change data. It is written as part of a two-phase commit: InnoDB first prepares the transaction in the redo log, then the binary log entry is written, and finally InnoDB commits:

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
-- ROW format is recommended: records actual row changes, not SQL statements
```

```sql
SHOW BINARY LOGS;
SHOW BINLOG EVENTS IN 'binlog.000001' LIMIT 20;
```

Each event in the binary log has a position (an offset in the file). Replicas track their position to resume from the correct point after a restart.

## The IO Thread on the Replica

Each replica runs a dedicated IO thread that connects to the primary using a replication user and requests binary log events starting from a known position:

```sql
-- On the replica
SHOW REPLICA STATUS\G
-- Key fields:
-- Master_Log_File, Read_Master_Log_Pos: what the IO thread has received
-- Relay_Log_File, Relay_Log_Pos: what the SQL thread has applied
```

The IO thread writes received events to local relay log files on the replica's disk.

## The SQL Thread on the Replica

A separate SQL thread reads events from the relay logs and applies them to the replica's data files. In ROW format, it directly replays the row changes. In STATEMENT format, it re-executes the SQL statements.

```sql
-- Check replication lag
SHOW REPLICA STATUS\G
-- Key field: Seconds_Behind_Source  -- Seconds the replica is behind the primary
```

## GTID-Based Replication

Global Transaction Identifiers (GTIDs) replace file-position tracking with unique transaction IDs. Each transaction gets a GTID in the format `source_uuid:transaction_id`:

```sql
SHOW VARIABLES LIKE 'gtid_mode';
-- ON means GTID replication is active

SHOW VARIABLES LIKE 'gtid_executed';
-- Set of GTIDs applied on this server
```

With GTIDs, a replica can automatically find the correct position on any primary, making failover much simpler:

```sql
-- Set up GTID-based replication
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST     = '10.0.0.1',
  SOURCE_USER     = 'repl',
  SOURCE_PASSWORD = 'replpassword',
  SOURCE_AUTO_POSITION = 1;
START REPLICA;
```

## Parallel Replication

Modern MySQL supports parallel SQL threads to apply transactions faster:

```sql
SHOW VARIABLES LIKE 'replica_parallel_workers';
SHOW VARIABLES LIKE 'replica_parallel_type';
-- LOGICAL_CLOCK: transactions that overlapped on the primary can run in parallel on the replica
```

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf
replica_parallel_workers = 4
replica_parallel_type    = LOGICAL_CLOCK
```

## Semi-Synchronous Replication

Standard replication is asynchronous - the primary does not wait for replicas to confirm receipt. Semi-synchronous replication waits for at least one replica to acknowledge the transaction before returning success to the client:

```sql
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
SET GLOBAL rpl_semi_sync_source_enabled = ON;
SET GLOBAL rpl_semi_sync_source_timeout = 1000;  -- Milliseconds before falling back to async
```

## Summary

MySQL replication works by writing committed transactions to the binary log on the primary, streaming them to replica IO threads that write relay logs, and applying them via replica SQL threads. GTID mode simplifies failover by removing file-position tracking. Parallel replication reduces lag on high-throughput primaries. Semi-synchronous mode strengthens durability guarantees at the cost of write latency.
