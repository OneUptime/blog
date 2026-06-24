# How MySQL GTID Replication Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GTID, Replication, High Availability, Binary Log

Description: Learn how MySQL GTID replication assigns unique transaction identifiers, tracks executed transactions, and simplifies replica failover.

---

## What Is GTID Replication

GTID (Global Transaction Identifier) replication assigns a unique identifier to every transaction committed on a MySQL server. Replicas use GTIDs to track exactly which transactions they have applied, eliminating the need to track binary log file names and positions manually.

A GTID has the format:

```text
source_uuid:transaction_number
e.g., 3E11FA47-71CA-11E1-9E33-C80AA9429562:42
```

- `source_uuid` is the `server_uuid` of the server where the transaction originated.
- `transaction_number` is a monotonically increasing integer per source.

## Enabling GTID Mode

```text
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
log_bin = ON
server_id = 1
```

Verify:

```sql
SHOW VARIABLES LIKE 'gtid_mode';
SHOW VARIABLES LIKE 'enforce_gtid_consistency';
```

## How GTIDs Are Assigned

When a transaction commits on the source:
1. MySQL assigns the next GTID in the sequence: `source_uuid:N+1`.
2. The GTID is written to the binary log before the transaction events.
3. The GTID is added to `@@GLOBAL.gtid_executed` on the source.

When the replica receives and applies the transaction:
1. The replica adds the GTID to its own `@@GLOBAL.gtid_executed`.
2. The replica never applies the same GTID twice.

## Viewing GTID State

```sql
-- All GTIDs executed on this server
SELECT @@GLOBAL.gtid_executed;

-- GTIDs executed but whose binary log entries have been purged
SELECT @@GLOBAL.gtid_purged;

-- On replica: GTIDs received from the source
SELECT received_transaction_set
FROM performance_schema.replication_connection_status;
```

## Setting Up GTID-Based Replication

```sql
-- On the replica:
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'source_host',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPass!1',
  SOURCE_AUTO_POSITION = 1;  -- Use GTID auto-positioning

START REPLICA;
SHOW REPLICA STATUS\G
```

`SOURCE_AUTO_POSITION = 1` tells the replica to use GTIDs. The replica sends its `gtid_executed` set to the source, and the source sends only the missing transactions.

## GTID Sets and AUTO_POSITION

When the replica connects with `AUTO_POSITION = 1`:

1. The replica sends: "I have executed these GTIDs: `{uuid1:1-100, uuid2:1-50}`"
2. The source calculates what the replica is missing and starts streaming from that point.
3. No binary log file name or position is needed.

This makes failover simple - just point the replica at the new source and it will automatically request only the missing transactions.

## Failover with GTID Replication

With traditional position-based replication, failing over requires knowing the exact binary log file and position on the new primary. With GTID:

```sql
-- On the replica (after primary failure, promoting to new primary):
STOP REPLICA;
RESET REPLICA ALL;

-- The new primary just needs to know about the old primary's GTIDs
-- Group Replication or InnoDB Cluster handles this automatically
```

For manual failover:

```sql
-- On the new replica, point at the new primary
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'new_primary_host',
  SOURCE_AUTO_POSITION = 1;
START REPLICA;
```

The replica will resume from where it left off automatically.

## Skipping a Transaction with GTID

With position-based replication, skip counter: `SET GLOBAL SQL_REPLICA_SKIP_COUNTER = 1`.

With GTID, inject an empty transaction for the problematic GTID:

```sql
-- Get the failing GTID from SHOW REPLICA STATUS
-- e.g., Last_SQL_Error mentions: 3E11FA47-...:150
STOP REPLICA;
SET GTID_NEXT = '3E11FA47-71CA-11E1-9E33-C80AA9429562:150';
BEGIN;
COMMIT;
SET GTID_NEXT = 'AUTOMATIC';
START REPLICA;
```

## GTID Restrictions

Not all SQL is compatible with GTID mode:

```sql
SHOW VARIABLES LIKE 'enforce_gtid_consistency';
```

With `enforce_gtid_consistency = ON`, these are forbidden:
- Updates that mix transactional and non-transactional storage engines (for example, InnoDB and MyISAM) in the same statement or transaction.
- `CREATE TEMPORARY TABLE` / `DROP TEMPORARY TABLE` inside a transaction, procedure, function, or trigger **when `binlog_format = STATEMENT`**. With the default `binlog_format = ROW` (or `MIXED`), these are allowed inside transactions since MySQL 8.0.13 (the statements are simply not written to the binary log).
- `CREATE TABLE ... SELECT` was disallowed prior to MySQL 8.0.21. From 8.0.21 onward it is permitted on storage engines that support atomic DDL (such as InnoDB), where it is logged as a single transaction with one GTID. On older versions, use `CREATE TABLE` followed by `INSERT INTO ... SELECT` instead.

## Monitoring GTID Lag

```sql
-- On the replica: compare received GTIDs with executed GTIDs to find lag
SELECT GTID_SUBTRACT(
  received_transaction_set,
  @@GLOBAL.gtid_executed
) AS missing_transactions
FROM performance_schema.replication_connection_status;
```

## Summary

GTID replication eliminates the fragile binary log position tracking of traditional replication by assigning a unique ID to every committed transaction. Replicas automatically determine what they are missing by comparing their GTID set with the source, making failover and replica re-synchronization simple. Use `SOURCE_AUTO_POSITION = 1` to enable GTID-based replica setup, and use empty transaction injection to skip individual problematic GTIDs.
