# How to Use MySQL Enterprise Audit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Enterprise, Audit, Security

Description: Learn how to configure and use MySQL Enterprise Audit to log database activity, filter events, and produce compliance-ready audit trails for your MySQL server.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## What Is MySQL Enterprise Audit?

MySQL Enterprise Audit is a plugin included with MySQL Enterprise Edition that records database activity to an audit log file. It captures connections, queries, schema changes, and privilege modifications - providing a tamper-evident record for compliance requirements such as PCI DSS, HIPAA, and SOX.

## Installing the Audit Plugin

```sql
-- Install the plugin (plugin file is audit_log.so on Linux, audit_log.dll on Windows)
INSTALL PLUGIN audit_log SONAME 'audit_log.so';

-- Verify installation
SHOW PLUGINS WHERE Name = 'audit_log';

-- Check audit_log variables
SHOW VARIABLES LIKE 'audit_log%';
```

Or configure at startup in `my.cnf`:

```text
[mysqld]
plugin-load-add=audit_log.so
audit_log_file=/var/log/mysql/audit.log
audit_log_format=JSON
audit_log_policy=ALL
```

## Audit Log Formats

MySQL Enterprise Audit supports three formats:

```text
audit_log_format=OLD     - XML-based legacy format
audit_log_format=NEW     - XML-based newer format
audit_log_format=JSON    - JSON format (recommended for log aggregation)
```

Set at startup in `my.cnf` (this variable is not dynamic and cannot be changed at runtime with `SET GLOBAL`).

## Setting the Audit Policy

The `audit_log_policy` variable controls what gets logged:

```sql
-- Log everything (default)
SET GLOBAL audit_log_policy = 'ALL';

-- Log only logins and logouts
SET GLOBAL audit_log_policy = 'LOGINS';

-- Log only queries
SET GLOBAL audit_log_policy = 'QUERIES';

-- Log nothing (disable temporarily)
SET GLOBAL audit_log_policy = 'NONE';
```

## Filtering Audit Events

MySQL 8.0 Enterprise Audit supports rule-based filtering to reduce log volume:

```sql
-- Create a filter that logs all events for user 'app_user'
SELECT audit_log_filter_set_filter(
  'log_app_user',
  '{ "filter": { "log": true } }'
);

-- Assign the filter to a user
SELECT audit_log_filter_set_user('app_user@%', 'log_app_user');

-- Create a filter that logs only connection events
SELECT audit_log_filter_set_filter(
  'logins_only',
  '{ "filter": { "class": { "name": "connection" } } }'
);

-- Apply a default filter for all users not explicitly mapped
SELECT audit_log_filter_set_user('%', 'logins_only');
```

## Sample JSON Audit Log Entry

```json
{
  "timestamp": "2026-03-31T14:23:01Z",
  "id": 12345,
  "class": "general",
  "event": "query",
  "connection_id": 42,
  "account": { "user": "app_user", "host": "10.0.0.5" },
  "login": { "user": "app_user", "os": "", "ip": "10.0.0.5", "proxy": "" },
  "general_data": {
    "command": "Query",
    "query": "SELECT * FROM orders WHERE status = 'pending'",
    "status": 0
  }
}
```

## Rotating the Audit Log

```sql
-- Rotate the audit log file (creates a new file, renames the current one)
SELECT audit_log_rotate();
```

## Checking Required Privileges

```sql
-- Users need AUDIT_ADMIN privilege to manage filters
GRANT AUDIT_ADMIN ON *.* TO 'security_admin'@'localhost';
```

## Summary

MySQL Enterprise Audit provides fine-grained, compliance-ready activity logging for MySQL servers. Install the plugin, configure the log format and policy, and use rule-based filtering to capture exactly the events you need without overwhelming your storage. The JSON format integrates well with log aggregation tools like Elasticsearch, Splunk, or any SIEM platform.
