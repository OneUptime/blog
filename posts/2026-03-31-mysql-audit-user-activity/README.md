# How to Audit User Activity in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Audit, Security, Monitoring, Compliance

Description: Learn how to audit MySQL user activity using the general query log, audit plugin, and Performance Schema to track who did what and when.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

Auditing user activity in MySQL is essential for security compliance, incident investigation, and detecting unauthorized access. MySQL provides multiple mechanisms for tracking database activity - from the simple general query log to the powerful Audit Plugin and Performance Schema views.

## Method 1: General Query Log

The general query log records every SQL statement sent to the server, including connections and disconnections.

```sql
-- Enable general log at runtime
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

Or in `my.cnf` for persistence:

```text
[mysqld]
general_log = ON
general_log_file = /var/log/mysql/general.log
```

View recent activity:

```bash
tail -f /var/log/mysql/general.log
```

The log format shows timestamp, connection ID, command type, and SQL:

```text
2026-03-31T10:15:30.123456Z    42 Connect   app_user@192.168.1.10 on mydb
2026-03-31T10:15:30.456789Z    42 Query     SELECT * FROM orders WHERE id = 5
2026-03-31T10:15:31.001234Z    42 Quit
```

## Method 2: MySQL Community Audit Plugin (McAfee/Percona)

Percona's audit plugin is a free alternative to MySQL Enterprise Audit:

```bash
# Install on Ubuntu
apt install percona-mysql-server

# Load the audit plugin
mysql -u root -p -e "INSTALL PLUGIN audit_log SONAME 'audit_log.so';"
```

Configure in `my.cnf`:

```text
[mysqld]
plugin-load-add=audit_log.so
audit_log_format=JSON
audit_log_file=/var/log/mysql/audit.log
audit_log_policy=ALL
```

## Method 3: Performance Schema for Login Monitoring

```sql
-- Enable statement instrumentation
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'statement/sql/%';

-- View recent statements with user info
SELECT esh.EVENT_NAME, esh.SQL_TEXT, t.PROCESSLIST_USER, esh.EVENT_ID, esh.THREAD_ID
FROM performance_schema.events_statements_history_long esh
JOIN performance_schema.threads t ON esh.THREAD_ID = t.THREAD_ID
ORDER BY esh.EVENT_ID DESC
LIMIT 20;
```

## Method 4: Failed-Login Tracking (MySQL 8.0.19+)

```sql
-- Track failed login attempts
ALTER USER 'app_user'@'%'
  FAILED_LOGIN_ATTEMPTS 3
  PASSWORD_LOCK_TIME 2;
```

## Querying Connection Events

```sql
-- Who is currently connected
SELECT id, user, host, db, command, time, state, info
FROM information_schema.processlist
WHERE command != 'Sleep'
ORDER BY time DESC;
```

## Auditing Specific User Queries via Triggers

For table-level DML auditing without Enterprise plugins:

```sql
-- Create an audit log table
CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(64),
  operation VARCHAR(10),
  old_value JSON,
  new_value JSON,
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Audit DELETE operations on orders
CREATE TRIGGER orders_audit_delete
AFTER DELETE ON orders
FOR EACH ROW
INSERT INTO audit_log (table_name, operation, old_value, changed_by)
VALUES ('orders', 'DELETE', JSON_OBJECT('id', OLD.id, 'total', OLD.total), CURRENT_USER());
```

## Checking the Error Log for Security Events

```bash
grep -i "access denied\|authentication\|failed" /var/log/mysql/error.log
```

## Summary

MySQL user activity auditing ranges from the simple general query log (good for development) to trigger-based DML auditing and full audit plugins (needed for compliance). For production environments with compliance requirements, the Percona Audit Plugin or MySQL Enterprise Audit provide structured JSON output suitable for SIEM ingestion. Combine query logging with Performance Schema and trigger-based auditing for comprehensive visibility.
