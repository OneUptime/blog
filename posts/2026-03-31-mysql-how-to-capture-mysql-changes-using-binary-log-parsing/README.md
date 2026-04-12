# How to Capture MySQL Changes Using Binary Log Parsing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Change Data Capture, Replication, Mysqlbinlog

Description: Learn how to parse the MySQL binary log directly to capture row-level changes for auditing, CDC pipelines, and data synchronization.

---

## What Is Binary Log Parsing

MySQL's binary log records every data modification in a binary format. Binary log parsing reads these events directly - either from files on disk or from a live replication stream - and extracts the actual row changes. This is the foundation of all MySQL CDC tools including Debezium, Maxwell, and Canal.

## Prerequisites

Binary log parsing requires row-based binary logging:

```ini
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
binlog_row_image = FULL
```

With `binlog_row_image = FULL`, MySQL records the complete before and after images of every changed row. With `MINIMAL`, only the changed columns are recorded.

## Listing Binary Log Files

List all available binary log files:

```sql
SHOW BINARY LOGS;
```

```text
+------------------+-----------+-----------+
| Log_name         | File_size | Encrypted |
+------------------+-----------+-----------+
| mysql-bin.000001 |   1048576 | No        |
| mysql-bin.000002 |    524288 | No        |
| mysql-bin.000003 |     12345 | No        |
+------------------+-----------+-----------+
```

## Reading Binary Logs with mysqlbinlog

The `mysqlbinlog` utility decodes binary log files into human-readable SQL statements:

```bash
mysqlbinlog /var/log/mysql/mysql-bin.000003
```

For row-based format, use the verbose flag to decode the row data:

```bash
mysqlbinlog -v /var/log/mysql/mysql-bin.000003
```

With two verbose flags you get column data types as well:

```bash
mysqlbinlog -vv /var/log/mysql/mysql-bin.000003
```

Sample output showing an UPDATE:

```text
### UPDATE `myapp`.`orders`
### WHERE
###   @1=42 /* INT meta=0 nullable=0 */
###   @2='pending' /* VARSTRING(100) meta=100 nullable=1 */
### SET
###   @1=42 /* INT meta=0 nullable=0 */
###   @2='shipped' /* VARSTRING(100) meta=100 nullable=1 */
```

## Filtering by Time Range

Extract events between specific timestamps:

```bash
mysqlbinlog \
  --start-datetime="2026-03-31 10:00:00" \
  --stop-datetime="2026-03-31 11:00:00" \
  /var/log/mysql/mysql-bin.000003
```

Filter by database:

```bash
mysqlbinlog --database=myapp /var/log/mysql/mysql-bin.000003
```

## Reading from a Remote MySQL Server

`mysqlbinlog` can connect to a remote server and stream binary log events without needing direct file access:

```bash
mysqlbinlog \
  --host=mysql-host \
  --user=replication_user \
  --password=secret \
  --read-from-remote-server \
  --stop-never \
  mysql-bin.000001
```

The `--stop-never` flag keeps the connection open and streams new events as they are written, similar to `tail -f`.

## Parsing Binary Logs Programmatically with Python

The `mysql-replication` Python library implements the MySQL replication protocol:

```python
from pymysqlreplication import BinLogStreamReader
from pymysqlreplication.row_event import (
    DeleteRowsEvent, UpdateRowsEvent, WriteRowsEvent
)

mysql_settings = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'replication_user',
    'passwd': 'secret'
}

stream = BinLogStreamReader(
    connection_settings=mysql_settings,
    server_id=999,
    only_events=[DeleteRowsEvent, UpdateRowsEvent, WriteRowsEvent],
    only_tables=['orders']
)

for binlogevent in stream:
    for row in binlogevent.rows:
        if isinstance(binlogevent, WriteRowsEvent):
            print(f"INSERT: {row['values']}")
        elif isinstance(binlogevent, UpdateRowsEvent):
            print(f"UPDATE: {row['before_values']} -> {row['after_values']}")
        elif isinstance(binlogevent, DeleteRowsEvent):
            print(f"DELETE: {row['values']}")

stream.close()
```

## Tracking Binary Log Position

For reliable CDC, track the binary log position after each processed event:

```python
log_file = stream.log_file
log_pos = stream.log_pos
print(f"Processed up to {log_file}:{log_pos}")
```

Store this position in a persistent store. On restart, resume from the saved position to avoid processing events twice or missing events.

## Summary

MySQL binary log parsing is the core mechanism behind all MySQL CDC tools. By enabling row-based binary logging and reading events with `mysqlbinlog` or a library like `mysql-replication`, you can capture every insert, update, and delete in real time. Tracking the binary log position between runs ensures exactly-once or at-least-once delivery semantics for downstream consumers.
