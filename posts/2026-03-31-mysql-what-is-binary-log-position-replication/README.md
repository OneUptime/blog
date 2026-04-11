# What Is Binary Log Position-Based Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Binary Log, Source Replica, High Availability

Description: Binary log position-based replication is MySQL's classic replication method where replicas track a specific file and offset in the source's binary log.

---

## Overview

Binary log position-based replication is the traditional MySQL replication method. Each replica maintains a pointer to a specific binary log file and byte offset on the source server, representing the last transaction it applied. When the replica reconnects, it resumes reading from that exact position. This approach has been available since MySQL's early versions and is still widely used, though GTID-based replication has become the modern preference.

## How It Works

The source server writes every committed transaction to its binary log files (e.g., `mysql-bin.000001`, `mysql-bin.000002`). Each event in the log has a byte offset. The replica's I/O thread stores the current source log file name and read position in a file called `master.info` (or in the `mysql.slave_master_info` table in MySQL 8.0+).

When the replica SQL thread applies a transaction, it advances the stored position. If the replica disconnects and reconnects, it sends the stored file name and position to the source, which begins streaming from that point.

## Setting Up Position-Based Replication

On the source server, take a consistent snapshot and note the binary log coordinates:

```sql
FLUSH TABLES WITH READ LOCK;
SHOW MASTER STATUS;
-- Returns: File = 'mysql-bin.000003', Position = 154
```

Export the data and unlock:

```bash
mysqldump --single-transaction --master-data=2 -u root -p mydb > dump.sql
```

On the replica, import the dump and configure replication:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'secret',
  SOURCE_LOG_FILE = 'mysql-bin.000003',
  SOURCE_LOG_POS = 154;

START REPLICA;
```

## Checking Replication Status

```sql
SHOW REPLICA STATUS\G
```

Key fields to monitor:
- `Relay_Source_Log_File` and `Exec_Source_Log_Pos`: position the replica has applied
- `Seconds_Behind_Source`: replication lag in seconds
- `Replica_IO_Running` and `Replica_SQL_Running`: should both be `Yes`

## The Challenge with Failover

The main drawback of position-based replication is failover complexity. If the source fails and you promote a replica, other replicas must be reconfigured to point to the new source with the correct binary log file and position. Since each server has its own binary log files with different names and positions, this coordination is manual and error-prone.

```sql
-- After failover, each remaining replica needs:
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'new-source-host',
  SOURCE_LOG_FILE = 'mysql-bin.000001',  -- different from old source
  SOURCE_LOG_POS = 107;
```

This is why GTID-based replication (which uses `SOURCE_AUTO_POSITION = 1`) is preferred for high-availability setups.

## When to Use Position-Based Replication

Position-based replication remains appropriate when:
- Your MySQL version is older than 5.6 where GTIDs were introduced
- You run statements that are incompatible with GTID enforcement (note that MySQL 8.0.21 lifted many prior restrictions, including `CREATE TABLE ... SELECT`)
- You need fine-grained control over exactly which transactions to replicate (e.g., skipping specific events)

## Summary

Binary log position-based replication uses a file-and-offset pointer to track replication progress. It is the oldest and most compatible replication method in MySQL, but requires manual reconfiguration after failover. For new deployments, GTID-based replication is generally preferred for its simpler failover and topology management.
