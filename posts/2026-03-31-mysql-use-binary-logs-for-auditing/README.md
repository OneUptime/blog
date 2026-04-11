# How to Use Binary Logs for Auditing in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Audit, Security, Compliance

Description: Learn how to use MySQL binary logs for auditing data changes, tracking who changed what and when, for compliance and security purposes.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

MySQL binary logs record every data modification made to the database. While not designed specifically as an audit trail, they can serve as a valuable source of audit information - particularly for tracking data changes, detecting unauthorized modifications, and supporting compliance requirements.

## Prerequisites for Audit-Grade Binary Logging

For effective auditing, configure binary logging with maximum detail:

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
binlog_format = ROW
binlog_row_image = FULL
binlog_row_metadata = FULL
sync_binlog = 1
server_id = 1

# Retain logs long enough for audit requirements
binlog_expire_logs_seconds = 7776000  # 90 days
```

`binlog_row_metadata = FULL` includes column names and type information in the binary log, making events easier to read in audit tools.

## Reading Audit Events with mysqlbinlog

Extract all changes to a specific table for audit review:

```bash
mysqlbinlog \
  --base64-output=DECODE-ROWS \
  --verbose \
  --database=mydb \
  /var/lib/mysql/binlogs/mysql-bin.000003 \
  | grep -A 20 "Table_map.*orders"
```

Filter by date range for a compliance report:

```bash
mysqlbinlog \
  --start-datetime="2024-01-01 00:00:00" \
  --stop-datetime="2024-01-31 23:59:59" \
  --base64-output=DECODE-ROWS \
  --verbose \
  /var/lib/mysql/binlogs/mysql-bin.* \
  > /tmp/january_audit.txt
```

## Identifying the Source of Changes

Binary logs record the server_id of the originating server, which helps trace changes in replicated environments:

```bash
mysqlbinlog --verbose /var/lib/mysql/binlogs/mysql-bin.000003 | grep "server id"
```

## Parsing Binary Logs with a Script

A Python-based parser to extract audit events from `mysqlbinlog` output:

```python
import subprocess
import re

def extract_audit_events(binlog_file, table_name):
    result = subprocess.run([
        'mysqlbinlog', '--base64-output=DECODE-ROWS', '--verbose', binlog_file
    ], capture_output=True, text=True)

    events = []
    current_time = None

    for line in result.stdout.splitlines():
        # Capture timestamp
        ts_match = re.match(r'#(\d{6}\s+\d+:\d+:\d+)', line)
        if ts_match:
            current_time = ts_match.group(1)

        # Capture operation type
        if '### INSERT INTO' in line or '### UPDATE' in line or '### DELETE FROM' in line:
            op = 'INSERT' if 'INSERT' in line else ('UPDATE' if 'UPDATE' in line else 'DELETE')
            if table_name in line:
                events.append({'operation': op, 'timestamp': current_time, 'table': table_name})

    return events

events = extract_audit_events('/var/lib/mysql/binlogs/mysql-bin.000003', 'orders')
for e in events:
    print(f"{e['timestamp']} - {e['operation']} on {e['table']}")
```

## Limitations of Binary Log Auditing

Binary logs have important limitations for auditing:

- They do not record `SELECT` queries (only data modifications)
- They do not record which application user or IP address made the change (only the MySQL user who executed the statement)
- DDL changes (ALTER TABLE, DROP TABLE) are recorded but may be harder to parse
- STATEMENT format logs SQL statements, not actual row changes

For comprehensive SELECT auditing and user tracking, use MySQL's dedicated audit plugins:

```sql
-- Install the audit log plugin (MySQL Enterprise Edition only)
INSTALL PLUGIN audit_log SONAME 'audit_log.so';
```

> For MySQL Community Edition, consider Percona Server for MySQL, which includes an open-source audit log plugin. The MariaDB `server_audit` plugin is not compatible with MySQL 8.0+.

## Setting Up Binlog-Based Change Tracking

For a lightweight change detection system:

```bash
#!/bin/bash
# Daily audit report from binary logs
DATE_FROM=$(date -d "yesterday" +"%Y-%m-%d 00:00:00")
DATE_TO=$(date -d "yesterday" +"%Y-%m-%d 23:59:59")

echo "=== Daily Change Audit Report ==="
echo "Period: $DATE_FROM to $DATE_TO"
echo ""

mysqlbinlog \
  --start-datetime="$DATE_FROM" \
  --stop-datetime="$DATE_TO" \
  --base64-output=DECODE-ROWS \
  --verbose \
  /var/lib/mysql/binlogs/mysql-bin.* 2>/dev/null | \
  grep "^### " | sort | uniq -c | sort -rn | head -50
```

## Summary

MySQL binary logs provide a record of all data modification events and can serve as a lightweight audit trail for INSERT, UPDATE, and DELETE operations. Configure `binlog_format = ROW`, `binlog_row_image = FULL`, and `binlog_row_metadata = FULL` for maximum audit detail. Use `mysqlbinlog` with datetime filters to extract events for specific periods. For full compliance auditing including SELECT statements and user tracking, supplement binary logs with a dedicated audit plugin such as MySQL Enterprise Audit or the Percona audit log plugin.
