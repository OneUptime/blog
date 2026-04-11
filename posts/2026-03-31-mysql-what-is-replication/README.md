# What Is MySQL Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Primary, Replica, High Availability

Description: MySQL replication is a process where data changes on a source server are automatically copied to one or more replica servers for scalability and high availability.

---

## Overview

MySQL replication is a mechanism that allows data changes on one MySQL server (the source, or primary) to be automatically propagated to one or more other MySQL servers (the replicas). The source records all data-modifying statements or row changes to its binary log. Each replica connects to the source, retrieves the binary log events, and applies them to its own data.

Replication is foundational to most production MySQL architectures, enabling read scaling, high availability, and disaster recovery without complex distributed transactions.

## How Replication Works

The replication flow involves three key components:

1. **Binary log on the source** - records all changes as events
2. **Relay log on the replica** - a local copy of source binary log events waiting to be applied
3. **Replication threads** - the IO thread fetches events from the source; the SQL thread applies them

```text
Source:
  Application writes --> Binary log (binlog)

Replica:
  IO Thread --> connects to source --> reads binlog --> writes to relay log
  SQL Thread --> reads relay log --> applies changes to replica data
```

## Setting Up Basic Replication

```sql
-- On the SOURCE server:
-- Ensure binary logging is enabled in my.cnf:
-- [mysqld]
-- server-id = 1
-- log_bin = /var/log/mysql/mysql-bin.log

-- Create a dedicated replication user
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'repl_password';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
FLUSH PRIVILEGES;

-- Get the current binary log position (for position-based replication)
SHOW BINARY LOG STATUS\G
```

```sql
-- On the REPLICA server:
-- Set a unique server ID in my.cnf:
-- [mysqld]
-- server-id = 2

-- Configure replica to connect to the source (GTID-based)
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'repl_password',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;

-- Verify replication is running
SHOW REPLICA STATUS\G
```

## Types of Replication

MySQL supports multiple replication approaches:

```sql
-- Check replication format
SHOW VARIABLES LIKE 'binlog_format';
```

```text
STATEMENT - replicates the SQL statement itself (space-efficient, but can be non-deterministic)
ROW       - replicates the actual row changes (deterministic, larger binlog)
MIXED     - uses STATEMENT normally, falls back to ROW for non-deterministic operations
```

## Monitoring Replication

```sql
-- Check replication status and lag
SHOW REPLICA STATUS\G
-- Key fields:
-- Replica_IO_Running: Yes  (IO thread running)
-- Replica_SQL_Running: Yes (SQL thread running)
-- Seconds_Behind_Source: 0 (replication lag in seconds)
-- Last_Error: (empty = no errors)

-- Check replica lag from performance_schema (more accurate)
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  LAST_ERROR_MESSAGE,
  LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP,
  APPLYING_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP
FROM performance_schema.replication_applier_status_by_worker;
```

## Common Replication Topologies

```text
Simple primary-replica (most common):
  Primary --> Replica 1
           --> Replica 2

Chain replication:
  Primary --> Relay Replica --> Downstream Replica

Fan-out with relay:
  Primary --> Relay (BLACKHOLE) --> Replica 1
                                --> Replica 2
                                --> Replica 3
```

## Read Scaling with Replication

A primary driver for replication is distributing read queries to replicas:

```sql
-- Direct write traffic to the primary
-- application_primary_conn.execute("INSERT INTO orders ...")

-- Direct read traffic to a replica
-- application_replica_conn.execute("SELECT * FROM orders WHERE ...")

-- MySQL Router can automate this routing based on read/write detection
```

## Summary

MySQL replication copies data changes from a source server to one or more replicas via the binary log, relay log, and replication threads. It supports statement-based, row-based, and mixed formats. Replication enables read scaling by distributing queries to replicas, provides high availability by allowing failover to a replica if the primary fails, and supports disaster recovery through geographically distributed replicas. It is the foundation of most production MySQL architectures and is extended by technologies like Group Replication, InnoDB Cluster, and NDB Cluster.
