# How to Use MySQL Audit Plugin for Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Audit, Logging, Compliance

Description: Learn how to install and configure the MySQL Audit Plugin to log database activity including logins, queries, and DDL operations for security and compliance requirements.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## How MySQL Audit Logging Works

MySQL audit logging captures database events - logins, logouts, query execution, schema changes, and more - and writes them to an audit log file. This is essential for security compliance (PCI-DSS, HIPAA, SOC 2) and for forensic investigation after a security incident.

```mermaid
flowchart LR
    U["User / Application"]
    MySQL["MySQL Server"]
    AP["Audit Plugin"]
    ALF["Audit Log File\n(JSON or XML)"]
    SIEM["SIEM / Log Analysis"]

    U -- "connects / queries" --> MySQL
    MySQL -- "audit event" --> AP
    AP -- "write" --> ALF
    ALF -- "forward" --> SIEM
```

MySQL's first-party audit implementation is **MySQL Enterprise Audit**, which ships with MySQL Enterprise Edition. Community Edition does not include the Enterprise audit plugin; use other logging features or a separately supported third-party tool if you need audit trails there.

## Installing MySQL Enterprise Audit

### Install the Plugin

```sql
INSTALL PLUGIN audit_log SONAME 'audit_log.so';
```

Verify the plugin is loaded:

```sql
SELECT plugin_name, plugin_status
FROM   information_schema.PLUGINS
WHERE  plugin_name = 'audit_log';
```

To ensure the plugin loads on every restart, add it to the configuration:

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
plugin-load-add  = audit_log.so
audit_log_format = JSON
audit_log_file   = /var/log/mysql/audit.log
audit_log_policy = ALL
```

## Configuration Options

### Audit Log Format

`audit_log_format` is a read-only variable - it can only be set at server startup in the configuration file, not at runtime.

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
# JSON format (recommended for log parsing)
audit_log_format = JSON

# Other valid values:
# NEW  - new-style XML (default)
# OLD  - old-style XML
```

### Audit Log Policy (What to Log)

`audit_log_policy` is a read-only variable - it can only be set at server startup in the configuration file, not at runtime. It is also deprecated as of MySQL 8.0.34; prefer rule-based filtering with `audit_log_filter_set_filter()` instead.

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
# Log everything (logins + queries) - this is the default
audit_log_policy = ALL

# Other valid values:
# LOGINS  - log only logins and logouts
# QUERIES - log only queries
# NONE    - log nothing
```

### Audit Log Rotation

```sql
-- Rotate the log file when it reaches 100 MB
SET GLOBAL audit_log_rotate_on_size = 104857600;  -- 100 MB in bytes
```

Rotate manually:

```sql
SELECT audit_log_rotate();
```

## Viewing Current Audit Settings

```sql
SHOW GLOBAL VARIABLES LIKE 'audit_log%';
```

Expected output:

```text
+-------------------------------+------------------------------+
| Variable_name                 | Value                        |
+-------------------------------+------------------------------+
| audit_log_file                | /var/log/mysql/audit.log     |
| audit_log_format              | JSON                         |
| audit_log_policy              | ALL                          |
| audit_log_rotate_on_size      | 104857600                    |
+-------------------------------+------------------------------+
```

## Filtering Audit Events

MySQL Enterprise Audit supports filtering to log only events from specific users, databases, or query types. Community Edition users need to rely on other logging features or separately supported third-party tooling for equivalent filtering.

### Using Audit Log Filter Functions (Enterprise)

```sql
-- Create a filter that logs all events
SELECT audit_log_filter_set_filter('log_all', '{ "filter": { "log": true } }');

-- Assign filter to all users
SELECT audit_log_filter_set_user('%', 'log_all');

-- Create a filter for specific user (connection and table_access events only)
SELECT audit_log_filter_set_filter(
    'log_admin',
    '{ "filter": { "class": [ { "name": "connection" }, { "name": "table_access" } ] } }'
);
SELECT audit_log_filter_set_user('admin@localhost', 'log_admin');
```

## Reading the Audit Log

### JSON Format Log Sample

```json
{
    "timestamp": "2026-03-31T14:23:01.123456Z",
    "id": 1,
    "class": "connection",
    "event": "connect",
    "connection_id": 42,
    "account": { "user": "appuser", "host": "192.168.1.100" },
    "login": { "user": "appuser", "os": "", "ip": "192.168.1.100", "proxy": "" },
    "connection_data": { "connection_type": "tcp/ip", "status": 0, "db": "myapp_db" }
}
```

Query log entry:

```json
{
    "timestamp": "2026-03-31T14:23:05.456789Z",
    "id": 2,
    "class": "general",
    "event": "status",
    "connection_id": 42,
    "account": { "user": "appuser", "host": "192.168.1.100" },
    "login": { "user": "appuser", "os": "", "ip": "192.168.1.100", "proxy": "" },
    "general_data": { "command": "Query", "sql_command": "select", "query": "SELECT * FROM orders WHERE id = 42", "status": 0 }
}
```

### Parsing the Log

```bash
# Find all failed logins
grep '"event": "connect"' /var/log/mysql/audit.log | grep '"status": 1'

# Find DROP TABLE events
grep '"sql_command": "drop_table"' /var/log/mysql/audit.log

# Find queries from a specific user
grep '"user": "appuser"' /var/log/mysql/audit.log | grep '"class": "general"'
```

## Community Edition Alternatives

If you run MySQL Community Edition, prefer built-in logging features such as binary logs, the general log, and Performance Schema, or evaluate a separately supported third-party audit solution with explicit compatibility testing.

## Forwarding Audit Logs to a SIEM

For centralized security monitoring, forward logs to a SIEM using `filebeat`:

```yaml
# /etc/filebeat/filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/mysql/audit.log
    json.keys_under_root: true
    tags: ["mysql-audit"]

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  index: "mysql-audit-%{+yyyy.MM.dd}"
```

## Best Practices

- Log at minimum: logins, logouts, DDL (CREATE, ALTER, DROP), and privileged commands.
- Use JSON format for easier parsing and SIEM integration.
- Enable log rotation to prevent the audit log from consuming all disk space.
- Exclude high-volume, low-risk service accounts (e.g., monitoring users) from query logging.
- Store audit logs on a separate disk from MySQL data files.
- Set file permissions so only root and mysql can read audit logs.
- Retain audit logs for at least 90 days (1 year for PCI-DSS environments).

## Summary

MySQL Audit Plugin logs database activity - connections, queries, and DDL operations - to a structured log file. Install the plugin with `INSTALL PLUGIN audit_log SONAME 'audit_log.so'`, configure it in `my.cnf`, and set the policy to `ALL` to capture logins and queries. Use JSON format for easier SIEM integration, and enable log rotation to manage file size. Audit logs are critical for compliance requirements and security incident response.
