# How to Use SHOW RELAYLOG EVENTS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Relay Log, Administration

Description: Learn how to use SHOW RELAYLOG EVENTS in MySQL to inspect relay log contents on a replica server and troubleshoot replication issues.

---

## What Is SHOW RELAYLOG EVENTS?

On a MySQL replica server, the relay log stores binary log events received from the source. The `SHOW RELAYLOG EVENTS` statement lets you read these events directly, making it easier to debug replication lag, skipped transactions, or data inconsistencies.

This statement is analogous to `SHOW BINLOG EVENTS` but operates on relay log files rather than the source's binary logs.

## Basic Syntax

```sql
SHOW RELAYLOG EVENTS
  [IN 'log_name']
  [FROM pos]
  [LIMIT [offset,] row_count];
```

- `IN 'log_name'` - specifies the relay log file to read. If omitted, MySQL reads the first relay log.
- `FROM pos` - start reading from a specific byte position.
- `LIMIT` - controls how many events are returned.

## Find the Current Relay Log File

Before reading events, identify the active relay log:

```sql
SHOW REPLICA STATUS\G
```

Look for:

```text
Relay_Log_File: mysql-relay-bin.000003
Relay_Log_Pos:  1456
```

## Reading Events from a Relay Log

```sql
-- Read events from the current relay log
SHOW RELAYLOG EVENTS IN 'mysql-relay-bin.000003';

-- Read starting from a specific position
SHOW RELAYLOG EVENTS IN 'mysql-relay-bin.000003' FROM 1456;

-- Limit output to 20 events
SHOW RELAYLOG EVENTS IN 'mysql-relay-bin.000003' FROM 4 LIMIT 20;
```

## Understanding the Output

The result set contains these columns:

```text
Log_name     | Pos  | Event_type      | Server_id | End_log_pos | Info
-------------|------|-----------------|-----------|-------------|---------------------------
mysql-relay  | 4    | Format_desc     | 1         | 126         | Server ver: 8.0.33
mysql-relay  | 126  | Previous_gtids  | 1         | 197         |
mysql-relay  | 197  | Gtid            | 1         | 262         | SET @@SESSION.GTID_NEXT= '...'
mysql-relay  | 262  | Query           | 1         | 380         | BEGIN
mysql-relay  | 380  | Table_map       | 1         | 435         | table_id: 91 (mydb.orders)
mysql-relay  | 435  | Write_rows      | 1         | 499         | table_id: 91 flags: STMT_END_F
mysql-relay  | 499  | Xid             | 1         | 530         | COMMIT /* xid=88 */
```

## Troubleshooting Replication with Relay Log Events

When replication stops, inspect the relay log near the error position:

```sql
-- Check replication status for the error position
SHOW REPLICA STATUS\G

-- Read events around the failing position
SHOW RELAYLOG EVENTS IN 'mysql-relay-bin.000003' FROM 380 LIMIT 10;
```

If you need to skip a specific event due to an error:

```sql
-- Skip one transaction (GTID mode)
SET GTID_NEXT = 'source_uuid:transaction_id';
BEGIN; COMMIT;
SET GTID_NEXT = 'AUTOMATIC';
START REPLICA;
```

## Listing All Relay Log Files

To see all relay log files on the replica:

```sql
SHOW REPLICA STATUS\G
-- Check: Relay_Log_File and the relay log index
```

Or check the data directory directly:

```bash
ls -lh /var/lib/mysql/mysql-relay-bin.*
```

## Summary

`SHOW RELAYLOG EVENTS` is an essential diagnostic tool for MySQL replication administrators. It lets you inspect exactly what events a replica has received and applied, making it straightforward to identify and resolve replication errors, data drift, or transaction failures. Pair it with `SHOW REPLICA STATUS` to get a full picture of replication health.
