# How to Audit MySQL Database Activity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Audit, Security, Compliance, Database

Description: Learn how to audit MySQL database activity using the general query log, audit plugins, triggers, and Performance Schema to track user actions and data changes.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## Why Audit MySQL Activity

Auditing tracks who accessed what data, when, and from where. It is required for compliance with PCI-DSS, HIPAA, SOX, and GDPR. Auditing helps detect unauthorized access, investigate security incidents, and demonstrate regulatory compliance.

## Option 1: Enable the General Query Log

The general query log records every connection and query. It is the simplest audit mechanism but has high overhead - use only for short-term investigations:

```text
[mysqld]
general_log = 1
general_log_file = /var/log/mysql/general.log
```

Enable/disable dynamically:

```sql
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

View recent activity:

```bash
tail -f /var/log/mysql/general.log
```

```text
2026-03-31T10:00:01.123456Z    42 Connect   appuser@10.0.0.5 on appdb using TCP/IP
2026-03-31T10:00:01.124000Z    42 Query     SELECT * FROM customers WHERE id = 1001
2026-03-31T10:00:01.125000Z    42 Quit
```

## Option 2: MySQL Enterprise Audit Plugin

MySQL Enterprise Edition includes a purpose-built audit plugin:

```sql
-- Install the plugin
INSTALL PLUGIN audit_log SONAME 'audit_log.so';

-- Configure in my.cnf
```

```text
[mysqld]
plugin-load-add = audit_log.so
audit_log_policy = ALL
audit_log_format = JSON
audit_log_file = /var/log/mysql/audit.json
```

Sample JSON audit record:

```json
{
  "timestamp": "2026-03-31T10:00:01",
  "id": 1,
  "class": "general",
  "event": "query",
  "connection_id": 42,
  "account": {"user": "appuser", "host": "10.0.0.5"},
  "os_account": {"os_user": "", "os_host": ""},
  "ip": "10.0.0.5",
  "command": "Query",
  "status": 0,
  "query": "SELECT * FROM customers WHERE id = 1001"
}
```

## Option 3: Percona Audit Log Plugin (Community Alternative)

Percona Server is a drop-in replacement for MySQL Community Edition that includes a built-in audit log plugin. Switching to Percona Server gives you audit logging without an Enterprise license:

```bash
# Install Percona Server (replaces MySQL Community Edition)
apt-get install percona-server-server

# Enable the audit plugin
mysql -u root -p -e "INSTALL PLUGIN audit_log SONAME 'audit_log.so';"
```

## Option 4: Trigger-Based Audit Trail

For targeted auditing of specific table changes, use triggers:

```sql
-- Create an audit table
CREATE TABLE user_audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name  VARCHAR(100),
  action      ENUM('INSERT', 'UPDATE', 'DELETE'),
  record_id   BIGINT,
  changed_by  VARCHAR(100) DEFAULT (USER()),
  changed_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  old_data    JSON,
  new_data    JSON
);

-- Audit trigger for the customers table
DELIMITER $$
CREATE TRIGGER customers_audit_after_update
AFTER UPDATE ON customers
FOR EACH ROW
BEGIN
  INSERT INTO user_audit_log (table_name, action, record_id, old_data, new_data)
  VALUES (
    'customers',
    'UPDATE',
    OLD.id,
    JSON_OBJECT('email', OLD.email, 'phone', OLD.phone),
    JSON_OBJECT('email', NEW.email, 'phone', NEW.phone)
  );
END$$
DELIMITER ;
```

## Option 5: Performance Schema for Login Auditing

Track query activity by account:

```sql
SELECT
  event_name,
  count_star AS total,
  sum_errors AS errors
FROM performance_schema.events_statements_summary_by_account_by_event_name
WHERE count_star > 0
ORDER BY total DESC;
```

Monitor failed logins:

```sql
SELECT * FROM performance_schema.host_cache
WHERE sum_connect_errors > 0;
```

## Centralize Audit Logs

For compliance, ship audit logs to a centralized log management system:

```bash
# Ship to syslog using rsyslog
cat >> /etc/rsyslog.d/mysql-audit.conf <<'EOF'
module(load="imfile" Mode="inotify")
input(type="imfile"
      File="/var/log/mysql/audit.json"
      Tag="mysql-audit"
      Facility="local6")
local6.* @@log-aggregator.example.com:514
EOF

systemctl restart rsyslog
```

## Summary

MySQL activity auditing can be implemented at multiple levels: the general query log for broad logging, the Enterprise or Percona audit plugin for structured JSON records, triggers for table-level change tracking, and Performance Schema for connection monitoring. For compliance, combine plugin-based auditing with centralized log shipping to ensure tamper-proof audit trails.
