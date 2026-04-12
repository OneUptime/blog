# How to Use mysqlbinlog Command-Line Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Mysqlbinlog, Point-in-Time Recovery, Replication

Description: Learn how to use the mysqlbinlog tool to read, filter, and replay MySQL binary log files for auditing and point-in-time recovery.

---

## What Is mysqlbinlog

`mysqlbinlog` is a command-line utility that reads MySQL binary log files and outputs their contents as human-readable SQL or as raw events. It is essential for point-in-time recovery, auditing data changes, and debugging replication issues.

Binary logs record all data modification statements and are stored as binary files. `mysqlbinlog` converts them into readable format.

## Prerequisites

Binary logging must be enabled on the MySQL server:

```sql
SHOW VARIABLES LIKE 'log_bin';
-- Value should be ON

SHOW BINARY LOGS;
-- Lists all available binary log files
```

## Basic Usage - Read a Binary Log File

```bash
mysqlbinlog /var/lib/mysql/binlog.000001
```

This prints all events in the file as SQL statements.

## Read Multiple Files

```bash
mysqlbinlog /var/lib/mysql/binlog.000001 /var/lib/mysql/binlog.000002
```

Files are processed in order.

## Filter by Date and Time

Use `--start-datetime` and `--stop-datetime` to narrow down events:

```bash
mysqlbinlog \
  --start-datetime="2025-10-01 08:00:00" \
  --stop-datetime="2025-10-01 18:00:00" \
  /var/lib/mysql/binlog.000001
```

## Filter by Binary Log Position

Use `--start-position` and `--stop-position` to replay from specific positions:

```bash
mysqlbinlog \
  --start-position=4 \
  --stop-position=1234 \
  /var/lib/mysql/binlog.000001
```

Positions are byte offsets visible in `SHOW BINLOG EVENTS`:

```sql
SHOW BINLOG EVENTS IN 'binlog.000001' LIMIT 20;
```

## Point-in-Time Recovery

After restoring a backup, replay binary logs to bring the database forward to the desired point:

```bash
# Step 1 - restore the backup
mysql -u root -p myapp < myapp_backup.sql

# Step 2 - replay binary logs up to the point before a bad query
mysqlbinlog \
  --start-datetime="2025-10-01 09:00:00" \
  --stop-datetime="2025-10-01 10:29:00" \
  /var/lib/mysql/binlog.000001 \
  | mysql -u root -p myapp
```

## Filter by Database

Use `--database` to replay events for a specific database only:

```bash
mysqlbinlog --database=myapp /var/lib/mysql/binlog.000001 | mysql -u root -p
```

## Read Logs Directly from a Remote Server

Use `--read-from-remote-server` to stream logs from a running MySQL server without copying files:

```bash
mysqlbinlog \
  --read-from-remote-server \
  --host=db.example.com \
  --user=replication_user \
  --password \
  --raw \
  --result-file=/tmp/ \
  binlog.000001
```

## Save Output to a File

```bash
mysqlbinlog /var/lib/mysql/binlog.000001 > events.sql
```

Then review or replay later:

```bash
mysql -u root -p < events.sql
```

## Read Row-Based Logs in Verbose Mode

For row-based binary logging format, use `-v` or `-vv` to decode row images:

```bash
mysqlbinlog -v /var/lib/mysql/binlog.000001
```

Output includes `###` comments showing the row values:

```text
### UPDATE `myapp`.`orders`
### WHERE
###   @1=42
###   @2=100.00
### SET
###   @2=150.00
```

Use `-vv` for more verbose column type information.

## Filter by GTID

Use `--include-gtids` or `--exclude-gtids` to filter events when using GTID-based replication:

```bash
mysqlbinlog \
  --include-gtids="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:1-100" \
  /var/lib/mysql/binlog.000001
```

## Decode Base64 Output

In some log formats, event data is base64-encoded. Use `--base64-output=DECODE-ROWS` with `-v` to decode row events:

```bash
mysqlbinlog --base64-output=DECODE-ROWS -v /var/lib/mysql/binlog.000001
```

## Useful Options Summary

| Option | Purpose |
|--------|---------|
| `--start-datetime` | Start from this timestamp |
| `--stop-datetime` | Stop at this timestamp |
| `--start-position` | Start from this byte position |
| `--stop-position` | Stop at this byte position |
| `--database` | Filter for specific database |
| `-v` or `-vv` | Verbose row event decoding |
| `--base64-output=DECODE-ROWS` | Decode base64 row images |
| `--read-from-remote-server` | Stream from remote MySQL |
| `--raw` | Save logs as raw binary files |
| `--result-file` | Output directory for raw files |

## Audit Use Case - Find All DELETE Statements

```bash
mysqlbinlog /var/lib/mysql/binlog.000001 | grep -A 5 "DELETE FROM"
```

For a more targeted approach with row-based logging:

```bash
mysqlbinlog -v /var/lib/mysql/binlog.000001 | grep -B 2 "DELETE FROM myapp.orders"
```

## Summary

`mysqlbinlog` is an indispensable tool for MySQL database recovery and auditing. By combining date-time and position filters, you can replay exactly the events needed to recover from accidental data loss. For row-based binary logs, use the `-v` flag to decode row images and understand exactly what data changed.
