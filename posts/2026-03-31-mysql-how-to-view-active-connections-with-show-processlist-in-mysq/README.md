# How to View Active Connections with SHOW PROCESSLIST in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Monitoring, SHOW PROCESSLIST, Active Connections

Description: Learn how to use SHOW PROCESSLIST in MySQL to view active connections, identify long-running queries, and kill problematic processes.

---

## What Is SHOW PROCESSLIST

`SHOW PROCESSLIST` displays a list of all active connections and their current state. Each row represents one connection or thread, including what query it is running and how long it has been running.

This is the go-to command for diagnosing:
- Locked or blocking queries
- Stuck connections
- Runaway queries consuming resources
- Connection pile-up under load

## Running SHOW PROCESSLIST

```sql
SHOW PROCESSLIST;
```

For the full query text (not truncated to 100 characters):

```sql
SHOW FULL PROCESSLIST;
```

## Understanding the Output Columns

```text
+-----+------+-----------+--------+---------+------+----------+-------------------+
| Id  | User | Host      | db     | Command | Time | State    | Info              |
+-----+------+-----------+--------+---------+------+----------+-------------------+
| 12  | app  | 10.0.0.5  | orders | Query   |  142 | executing| SELECT * FROM ... |
| 13  | root | localhost | NULL   | Sleep   |  300 | NULL     | NULL              |
| 14  | rep  | 10.0.0.10 | NULL   | Binlog Dump |  0 |          | NULL              |
+-----+------+-----------+--------+---------+------+----------+-------------------+
```

| Column | Description |
|---|---|
| `Id` | Thread/connection ID |
| `User` | MySQL user |
| `Host` | Client host and port |
| `db` | Current database |
| `Command` | Thread type: Query, Sleep, Binlog Dump |
| `Time` | Seconds in current state |
| `State` | What the thread is doing |
| `Info` | The SQL query (truncated unless FULL) |

## Common State Values

| State | Meaning |
|---|---|
| `executing` | Actively running a query |
| `Waiting for lock` | Blocked waiting for a table/row lock |
| `Sending data` | Reading data and sending results |
| `Sorting result` | Performing a file sort |
| `init` | Initializing a statement |

## Using information_schema.processlist

For a more query-friendly interface:

```sql
SELECT id, user, host, db, command, time, state, info
FROM information_schema.processlist
WHERE command != 'Sleep'
  AND time > 10
ORDER BY time DESC;
```

## Using performance_schema.processlist (MySQL 8.0.22+)

```sql
SELECT id, user, host, db, command, time, state, info
FROM performance_schema.processlist
WHERE command != 'Sleep'
ORDER BY time DESC;
```

## Finding Long-Running Queries

```sql
SELECT id, user, host, db, time, state, LEFT(info, 200) AS query
FROM information_schema.processlist
WHERE command = 'Query'
  AND time > 30
ORDER BY time DESC;
```

## Killing a Connection

If you need to stop a runaway query or stuck connection:

```sql
KILL 12;          -- Kill the connection (both query and connection)
KILL QUERY 12;    -- Kill only the current query, keep connection
```

## Automated Kill Script

```bash
#!/bin/bash
# Kill all queries running longer than 120 seconds
mysql -u root -p"$MYSQL_PASS" -N -e "
  SELECT CONCAT('KILL ', id, ';')
  FROM information_schema.processlist
  WHERE command = 'Query'
    AND time > 120
    AND user != 'replication'
" | mysql -u root -p"$MYSQL_PASS"
```

## Summary

`SHOW FULL PROCESSLIST` shows all active MySQL connections with their current query and duration. Focus on threads with high `Time` values and states like `Waiting for lock`. Use `KILL QUERY <id>` to terminate specific runaway queries without dropping the connection. For scripted monitoring, query `information_schema.processlist` or `performance_schema.processlist` (MySQL 8.0.22+).
