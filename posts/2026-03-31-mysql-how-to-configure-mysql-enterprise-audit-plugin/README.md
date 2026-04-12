# How to Configure MySQL Enterprise Audit Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Audit, Enterprise, Compliance

Description: Learn how to install and configure the MySQL Enterprise Audit plugin to log database activity for compliance, security monitoring, and forensic investigation.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## What Is the MySQL Enterprise Audit Plugin?

The MySQL Enterprise Audit plugin (`audit_log`) records database activity to an audit log file. It captures login attempts, SQL statements, user privilege changes, and other database events. This is used for regulatory compliance (PCI DSS, HIPAA, SOX), security monitoring, and incident investigation.

The audit plugin is available in MySQL Enterprise Edition. MySQL Community Edition users can use the MariaDB Audit Plugin or third-party alternatives.

## Installing the Audit Plugin

```sql
INSTALL PLUGIN audit_log SONAME 'audit_log.so';
```

Verify installation:

```sql
SHOW PLUGINS WHERE Name = 'audit_log';
```

To load automatically on startup, add to `my.cnf`:

```text
[mysqld]
plugin-load-add = audit_log.so
```

## Configuring Audit Log File Location

```text
[mysqld]
audit_log_file = /var/log/mysql/audit.log
```

Restart MySQL for the change to take effect. Note that `audit_log_file` is a read-only variable and cannot be changed at runtime with `SET GLOBAL`.

## Audit Log Format

MySQL Enterprise Audit supports multiple output formats:

| Format | Description |
|---|---|
| `NEW` (default) | New-style XML |
| `OLD` | Legacy XML |
| `JSON` | JSON format (MySQL 8.0.11+) |

```text
[mysqld]
audit_log_format = JSON
```

Sample JSON audit log entry:

```json
{
  "timestamp": "2024-05-10T14:32:11.123456Z",
  "id": 12345,
  "class": "connection",
  "event": "connect",
  "connection_id": 45,
  "account": {"user": "app_user", "host": "10.0.1.10"},
  "login": {"user": "app_user", "os": "", "ip": "10.0.1.10", "proxy": ""},
  "connection_data": {
    "connection_type": "ssl",
    "status": 0,
    "db": "shop"
  }
}
```

## Audit Policy Configuration

### Log All Events

```text
[mysqld]
audit_log_policy = ALL
```

### Log Only Logins

```text
[mysqld]
audit_log_policy = LOGINS
```

### Log Only Queries

```text
[mysqld]
audit_log_policy = QUERIES
```

## Filtering Audit Events (MySQL 8.0)

MySQL 8.0 introduced a programmatic filtering API for fine-grained control:

```sql
-- Create a filter that logs everything
SELECT audit_log_filter_set_filter('log_all', '{ "filter": { "log": true } }');

-- Apply filter to all users
SELECT audit_log_filter_set_user('%', 'log_all');

-- Create a filter that only logs failed logins
SELECT audit_log_filter_set_filter('log_failures', '{
  "filter": {
    "class": {
      "name": "connection",
      "event": {
        "name": "connect",
        "log": { "field": { "name": "status", "value": 1 } }
      }
    }
  }
}');

-- Apply to specific user
SELECT audit_log_filter_set_user('suspicious_user@%', 'log_failures');
```

## Log Rotation

Configure automatic log rotation:

```text
[mysqld]
audit_log_rotate_on_size = 104857600
```

This rotates the audit log when it reaches 100MB.

To manually rotate:

```sql
SELECT audit_log_rotate();
```

## Protecting the Audit Log from Tampering

Prevent the audit log from being disabled by users who could otherwise execute `SET GLOBAL`:

```text
[mysqld]
audit_log_file = /var/log/mysql/audit.log
audit_log_connection_policy = ALL
audit_log_statement_policy = ALL
```

Grant the `AUDIT_ADMIN` privilege only to designated security administrators:

```sql
GRANT AUDIT_ADMIN ON *.* TO 'security_admin'@'localhost';
```

## Checking Audit Log Status

```sql
SHOW VARIABLES LIKE 'audit_log%';
SHOW STATUS LIKE 'audit_log%';
```

## Summary

The MySQL Enterprise Audit plugin provides comprehensive activity logging for compliance and security monitoring. Install it with `INSTALL PLUGIN`, configure the log file path and format in `my.cnf`, and use `audit_log_policy` or the filtering API to control what gets logged. Protect the audit log from modification by restricting the `AUDIT_ADMIN` privilege and using OS-level file permissions.
