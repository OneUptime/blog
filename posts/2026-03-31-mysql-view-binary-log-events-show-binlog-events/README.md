# How to View Binary Log Events in MySQL with SHOW BINLOG EVENTS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Event, Replication, Recovery

Description: Learn how to use SHOW BINLOG EVENTS in MySQL to inspect individual events in binary log files for recovery and replication debugging.

---

`SHOW BINLOG EVENTS` lets you browse the individual events recorded inside a MySQL binary log file. Each event represents a database change, transaction boundary, or server action. This command is essential for replication debugging, point-in-time recovery planning, and auditing database changes.

## Basic Syntax

```sql
SHOW BINLOG EVENTS
  [IN 'log_name']
  [FROM pos]
  [LIMIT [offset,] row_count];
```

## Viewing Events in the Current Binary Log

```sql
-- Show first events in the first binary log
SHOW BINLOG EVENTS;
```

## Viewing Events in a Specific Binary Log File

```sql
SHOW BINLOG EVENTS IN 'mysql-bin.000003';
```

Sample output:

```text
+------------------+-----+----------------+-----------+-------------+--------------------------------------------+
| Log_name         | Pos | Event_type     | Server_id | End_log_pos | Info                                       |
+------------------+-----+----------------+-----------+-------------+--------------------------------------------+
| mysql-bin.000003 |   4 | Format_desc    |         1 |         126 | Server ver: 8.0.32, Binlog ver: 4          |
| mysql-bin.000003 | 126 | Previous_gtids |         1 |         157 |                                            |
| mysql-bin.000003 | 157 | Gtid           |         1 |         234 | SET @@SESSION.GTID_NEXT= '...'             |
| mysql-bin.000003 | 234 | Query          |         1 |         334 | BEGIN                                      |
| mysql-bin.000003 | 334 | Table_map      |         1 |         395 | table_id: 66 (mydb.orders)                 |
| mysql-bin.000003 | 395 | Write_rows     |         1 |         455 | table_id: 66 flags: STMT_END_F             |
| mysql-bin.000003 | 455 | Xid            |         1 |         486 | COMMIT /* xid=42 */                        |
+------------------+-----+----------------+-----------+-------------+--------------------------------------------+
```

## Limiting Results with FROM and LIMIT

For large binary logs, use position and row limits to navigate:

```sql
-- Show 20 events starting at position 500
SHOW BINLOG EVENTS IN 'mysql-bin.000003' FROM 500 LIMIT 20;

-- Skip the first 10 events and show the next 20
SHOW BINLOG EVENTS IN 'mysql-bin.000003' LIMIT 10, 20;
```

## Understanding Event Types

Key event types you will encounter:

```text
Format_desc    - First event in every binary log file, describes the server version
Rotate         - Points to the next binary log file
Gtid           - GTID for the following transaction (when GTID mode is ON)
Query          - SQL statement (BEGIN, DDL statements, or full SQL in STATEMENT mode)
Table_map      - Maps table ID to schema.table name (ROW format)
Write_rows     - INSERT operations (ROW format)
Update_rows    - UPDATE operations (ROW format)
Delete_rows    - DELETE operations (ROW format)
Xid            - COMMIT event for transactional changes
```

## Finding Events for a Specific Table

You cannot filter by table directly in `SHOW BINLOG EVENTS`, but you can use `mysqlbinlog` for targeted searches:

```bash
mysqlbinlog --verbose \
  --database=mydb \
  /var/lib/mysql/binlogs/mysql-bin.000003 | grep -A 10 "orders"
```

## Locating Events by Time

Use `mysqlbinlog` with datetime filters to find events in a time range:

```bash
mysqlbinlog --start-datetime="2024-03-15 14:00:00" \
            --stop-datetime="2024-03-15 14:30:00" \
            --verbose \
            /var/lib/mysql/binlogs/mysql-bin.000003
```

## Using Binary Log Positions for Point-in-Time Recovery

Once you identify the log position just before an unwanted change:

```sql
-- Find the DROP TABLE event
SHOW BINLOG EVENTS IN 'mysql-bin.000003' FROM 1000 LIMIT 50;
-- Identify the position: say 2450

-- Restore up to but not including position 2450
mysqlbinlog --stop-position=2450 /var/lib/mysql/binlogs/mysql-bin.000003 | mysql -u root -p
```

## Summary

`SHOW BINLOG EVENTS` provides a quick way to browse binary log contents directly from the MySQL client. Use `IN`, `FROM`, and `LIMIT` clauses to navigate large files efficiently. For time-based searches or complex filtering, use the `mysqlbinlog` command-line tool instead. Understanding event types - especially `Write_rows`, `Update_rows`, `Delete_rows`, and `Xid` - enables precise point-in-time recovery and replication debugging.
