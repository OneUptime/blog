# How to View Binary Log Files in MySQL with SHOW BINARY LOGS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Monitoring, Administration, Database

Description: Learn how to use SHOW BINARY LOGS in MySQL to list binary log files, check their sizes, and manage binary log storage.

---

`SHOW BINARY LOGS` is one of the most frequently used commands when managing MySQL replication and recovery. It gives you a complete list of binary log files on the server along with their sizes and encryption status. Understanding this output is fundamental to replication administration and point-in-time recovery.

## Basic Usage

```sql
SHOW BINARY LOGS;
```

Sample output:

```text
+------------------+-----------+-----------+
| Log_name         | File_size | Encrypted |
+------------------+-----------+-----------+
| mysql-bin.000001 |       177 | No        |
| mysql-bin.000002 |  10485760 | No        |
| mysql-bin.000003 |   5242880 | No        |
| mysql-bin.000004 |      1234 | No        |
+------------------+-----------+-----------+
```

The most recent file in the list is the currently active binary log.

## Checking If Binary Logging Is Enabled

Before running `SHOW BINARY LOGS`, verify binary logging is active:

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'log_bin_basename';
```

If `log_bin` returns `OFF`, the command will return an error. Enable it in `my.cnf`:

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
server_id = 1
```

## Checking Total Binary Log Size

`SHOW BINARY LOGS` output cannot be queried directly with SQL. Use a shell command to calculate total disk usage:

```bash
mysql -u root -p -e "SHOW BINARY LOGS;" | awk 'NR>1 {sum += $2} END {print "Total:", sum/1024/1024, "MB"}'
```

## Finding the Current Active Binary Log

The current binary log is always the last entry:

```sql
SHOW BINARY LOG STATUS;
```

```text
+------------------+----------+--------------+------------------+-------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set |
+------------------+----------+--------------+------------------+-------------------+
| mysql-bin.000004 |     1234 |              |                  |                   |
+------------------+----------+--------------+------------------+-------------------+
```

In MySQL versions before 8.2, use `SHOW MASTER STATUS` instead. That command was deprecated in MySQL 8.2 and removed in MySQL 8.4.

## Checking Binary Log Location on Disk

```sql
SHOW VARIABLES LIKE 'log_bin_basename';
SHOW VARIABLES LIKE 'datadir';
```

```bash
ls -lh /var/lib/mysql/binlogs/
```

## Correlating Binary Logs with Time

To find which binary log file contains events from a specific time period, check the index file:

```bash
# The index file lists all binary logs
cat /var/lib/mysql/binlogs/mysql-bin.index
```

Then use `mysqlbinlog` to check timestamps:

```bash
mysqlbinlog --start-datetime="2024-03-15 00:00:00" \
            --stop-datetime="2024-03-15 01:00:00" \
            /var/lib/mysql/binlogs/mysql-bin.000003 | head -20
```

## Monitoring Binary Log Growth

Create a shell script to alert when binary logs grow too large:

```bash
#!/bin/bash
THRESHOLD=500 # MB
TOTAL=$(mysql -u root -p"$MYSQL_PASS" -e "SHOW BINARY LOGS;" | awk 'NR>1 {sum += $2} END {print int(sum/1024/1024)}')
if [ "$TOTAL" -gt "$THRESHOLD" ]; then
  echo "WARNING: Binary logs total ${TOTAL}MB exceeds threshold"
fi
```

## Rotating Binary Logs

Force the creation of a new binary log file:

```sql
FLUSH BINARY LOGS;
```

After flushing, `SHOW BINARY LOGS` will show a new file with an incremented sequence number.

## Summary

`SHOW BINARY LOGS` provides a quick inventory of all binary log files and their sizes. Pair it with `SHOW BINARY LOG STATUS` (or `SHOW MASTER STATUS` on MySQL before 8.2) to identify the active log file and current write position. Monitor total binary log disk usage with shell scripts to prevent disk exhaustion. Use `FLUSH BINARY LOGS` to force rotation when needed, and cross-reference binary log files with timestamps using `mysqlbinlog` for recovery operations.
