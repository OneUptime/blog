# What Is GTID-Based Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, GTID, High Availability, Source Replica

Description: GTID-based replication in MySQL assigns a unique global transaction ID to every committed transaction, enabling automatic replica positioning and simpler failover.

---

## Overview

GTID (Global Transaction Identifier) replication is a MySQL replication mode where every committed transaction receives a unique identifier that is consistent across the entire replication topology. Unlike traditional binary log position-based replication, GTID replication lets replicas automatically locate where to resume replication after a failover or restart without requiring you to specify a binary log file and position.

## What a GTID Looks Like

A GTID has the format `source_uuid:transaction_number`:

```text
3E11FA47-71CA-11E1-9E33-C80AA9429562:1
3E11FA47-71CA-11E1-9E33-C80AA9429562:2-100
```

The UUID identifies the originating server and the number identifies the transaction on that server. A GTID set is a range of GTIDs representing all transactions applied on a server.

## Enabling GTID Replication

In `my.cnf` on both source and replicas:

```ini
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
log_bin = mysql-bin
binlog_format = ROW
server_id = 1   # Must be unique on each server (e.g., 1 on source, 2 on replica)
```

After restarting MySQL, configure the replica:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'source-host',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'secret',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

The key difference from position-based replication is `SOURCE_AUTO_POSITION = 1`, which tells the replica to use GTIDs to automatically determine which transactions it still needs.

## How GTID Tracking Works

MySQL tracks GTIDs in several system variables:

```sql
-- All GTIDs executed on this server (local and replicated)
SHOW VARIABLES LIKE 'gtid_executed';

-- GTIDs that have been purged from binary logs
SHOW VARIABLES LIKE 'gtid_purged';

-- Check replica status
SHOW REPLICA STATUS\G
```

When a replica connects to the source, it sends its `gtid_executed` set. The source computes the difference and streams only the missing transactions.

## Advantages Over Position-Based Replication

- **Automatic positioning**: No need to find binary log files and positions after a failover.
- **Simplified topology changes**: Promoting a replica to source or adding new replicas is simpler.
- **Idempotency**: Each transaction has a globally unique ID, so it is never applied twice.
- **Better tooling support**: MySQL Shell's `dba.rebootClusterFromCompleteOutage()` and InnoDB Cluster rely on GTIDs.

## GTID Restrictions

Certain operations are not allowed with GTID mode enabled:

```sql
-- These will produce errors with GTIDs enabled (MySQL 5.6–8.0.20)
CREATE TABLE ... SELECT ...;
-- Note: CREATE TABLE ... SELECT is allowed starting in MySQL 8.0.21

-- Not allowed inside a transaction with enforce_gtid_consistency = ON
CREATE TEMPORARY TABLE inside a transaction;
```

Mixing updates to transactional (InnoDB) and non-transactional (MyISAM) tables within a single transaction is also not allowed. These restrictions exist because GTID consistency requires that each transaction be fully replayable.

## Monitoring Replication Lag with GTIDs

```sql
-- On the replica, check received vs applied transactions
SELECT
  RECEIVED_TRANSACTION_SET,
  LAST_QUEUED_TRANSACTION
FROM performance_schema.replication_connection_status\G

SELECT
  LAST_APPLIED_TRANSACTION
FROM performance_schema.replication_applier_status_by_worker\G
```

## Summary

GTID-based replication simplifies MySQL replication management by assigning a unique identifier to every transaction. This enables automatic replica positioning, faster failover, and easier topology changes. It is the recommended replication mode for new deployments and is required for features like InnoDB Cluster and Group Replication.
