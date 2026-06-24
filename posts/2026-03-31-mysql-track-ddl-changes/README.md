# How to Track DDL Changes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Audit

Description: Learn how to track DDL changes in MySQL using the general query log, performance schema, triggers on metadata tables, and Percona Audit Plugin.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

DDL (Data Definition Language) changes - `CREATE`, `ALTER`, `DROP`, `TRUNCATE` - modify the structure of a database rather than its data. Tracking these changes is critical for compliance, debugging production incidents, and understanding how a schema evolved over time.

## What Counts as a DDL Change

DDL statements include:

```text
CREATE TABLE / VIEW / INDEX / PROCEDURE / FUNCTION / EVENT / TRIGGER
ALTER TABLE / VIEW / PROCEDURE
DROP TABLE / VIEW / INDEX / PROCEDURE / FUNCTION / EVENT / TRIGGER
RENAME TABLE
TRUNCATE TABLE
```

## Method 1: General Query Log

The general query log captures all statements including DDL:

```sql
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

Filter DDL from the log:

```bash
grep -iE "(CREATE|ALTER|DROP|RENAME|TRUNCATE)\s+(TABLE|VIEW|INDEX|PROCEDURE)" \
  /var/log/mysql/general.log
```

The general log includes timestamp, connection ID, and the full SQL statement.

## Method 2: Binary Log

The MySQL binary log records all DDL statements in statement format:

```bash
# List DDL events from binary log
mysqlbinlog /var/log/mysql/mysql-bin.000001 | \
  grep -iE "^(CREATE|ALTER|DROP|RENAME|TRUNCATE)"
```

Use `mysqlbinlog` with date filters to find DDL in a specific window:

```bash
mysqlbinlog \
  --start-datetime="2026-03-31 00:00:00" \
  --stop-datetime="2026-03-31 23:59:59" \
  /var/log/mysql/mysql-bin.000001 | \
  grep -iE "(CREATE|ALTER|DROP)\s+TABLE"
```

## Method 3: Querying INFORMATION_SCHEMA

Track table creation and modification times via `INFORMATION_SCHEMA`:

```sql
SELECT
  table_schema,
  table_name,
  create_time,
  update_time,
  table_comment
FROM information_schema.tables
WHERE table_schema = 'myapp'
ORDER BY create_time DESC
LIMIT 20;
```

Note that `update_time` only reflects DML changes to InnoDB tables, not `ALTER TABLE` operations.

## Method 4: DDL Audit Table with Schema Snapshots

Create a DDL change log table and a stored event to snapshot schema state:

```sql
CREATE TABLE ddl_change_log (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  detected_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  table_schema VARCHAR(64),
  table_name   VARCHAR(64),
  create_time  DATETIME,
  table_type   VARCHAR(64),
  event_type   VARCHAR(20)
);

-- Populate initial snapshot
INSERT INTO ddl_change_log (table_schema, table_name, create_time, table_type, event_type)
SELECT table_schema, table_name, create_time, table_type, 'SNAPSHOT'
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys');
```

## Method 5: Percona Audit Plugin

The Percona Audit Log Plugin filters and logs DDL events to a structured file:

```ini
[mysqld]
plugin-load-add = audit_log.so
audit_log_policy = QUERIES
audit_log_format = JSON
audit_log_file = /var/log/mysql/audit.json
```

Filter DDL from the JSON audit log:

```bash
jq 'select(.audit_record.command_class | test("create|alter|drop|rename"))' \
  /var/log/mysql/audit.json
```

## Alerting on Unexpected DDL

Set up an alert if DDL is executed outside a maintenance window:

```bash
#!/bin/bash
# Check for DDL in the last 5 minutes outside 02:00-03:00 UTC
HOUR=$(date -u +%H)

if [[ "$HOUR" -ne 2 ]]; then
  RECENT_DDL=$(mysqlbinlog --start-datetime="$(date -u -d '5 minutes ago' +%Y-%m-%d\ %H:%M:%S)" \
    /var/log/mysql/mysql-bin.000001 2>/dev/null | \
    grep -icE "(CREATE|ALTER|DROP)\s+TABLE")

  if [[ "$RECENT_DDL" -gt 0 ]]; then
    echo "ALERT: $RECENT_DDL DDL statement(s) detected outside maintenance window"
  fi
fi
```

## Summary

DDL changes in MySQL can be tracked through the general query log, binary log, `INFORMATION_SCHEMA` polling, or the Percona Audit Plugin. The binary log is the most reliable source as it captures all DDL with precise timestamps. For structured logging and alerting, the Percona Audit Plugin provides JSON output that is easy to query and integrate with monitoring systems.
