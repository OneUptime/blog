# How to Configure Audit Logging in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Audit Logging, Security, Compliance, Database Administration

Description: Learn how to enable and configure MySQL audit logging to track user activity, detect unauthorized access, and meet compliance requirements.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## Why Audit Logging Matters

Audit logging records who connected to your MySQL server, which queries they ran, and what data they accessed or modified. It is essential for compliance frameworks like PCI-DSS, HIPAA, and SOC 2, and helps you investigate security incidents by providing a tamper-evident trail of database activity.

## MySQL Audit Plugin Options

MySQL Enterprise Edition includes the MySQL Enterprise Audit plugin (`audit_log`). For open-source deployments, Percona Server offers the Percona Audit Log Plugin and MariaDB provides the MariaDB Audit Plugin. The `audit_log.so` plugin discussed below requires MySQL Enterprise Edition.

Check if the audit plugin is available:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE '%audit%';
```

## Installing the Audit Log Plugin

For MySQL 8.0 Enterprise Edition, install the audit log plugin:

```bash
sudo mysql -u root -p -e "INSTALL PLUGIN audit_log SONAME 'audit_log.so';"
```

Verify installation:

```sql
SHOW PLUGINS;
```

You should see `audit_log` listed with status `ACTIVE`.

## Configuring Audit Log in my.cnf

Add audit log settings to your MySQL configuration file:

```ini
[mysqld]
plugin-load-add = audit_log.so
audit_log_file = /var/log/mysql/audit.log
audit_log_format = JSON
audit_log_policy = ALL
```

Restart MySQL after making changes:

```bash
sudo systemctl restart mysql
```

## Audit Log Policies

The `audit_log_policy` variable controls what gets logged. This variable is read-only at runtime and can only be set at server startup in `my.cnf`:

```ini
[mysqld]
# Log all events
audit_log_policy = ALL

# Log only logins and logouts
# audit_log_policy = LOGINS

# Log only queries
# audit_log_policy = QUERIES

# Log neither (disable)
# audit_log_policy = NONE
```

> Note: `audit_log_policy` is deprecated as of MySQL 8.0.34. Use audit log filtering rules (described below) for finer-grained control over which events are logged.

## Reading Audit Log Entries

With JSON format, each log entry looks like:

```text
{
  "timestamp": "2026-03-31 10:00:00",
  "id": 1,
  "class": "general",
  "event": "status",
  "connection_id": 101,
  "account": {"user": "webapp", "host": "localhost"},
  "login": {"user": "webapp", "os": "", "ip": "127.0.0.1", "proxy": ""},
  "general_data": {
    "command": "Query",
    "sql_command": "select",
    "query": "SELECT * FROM users WHERE id = 42",
    "status": 0
  }
}
```

You can parse this with standard JSON tools:

```bash
cat /var/log/mysql/audit.log | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip().rstrip(',')
    if line.startswith('{'):
        entry = json.loads(line)
        if entry.get('class') == 'general':
            user = entry.get('account', {}).get('user', '')
            query = entry.get('general_data', {}).get('query', '')
            print(user, query)
"
```

## Filtering Audit Events with Audit Filters

MySQL 8.0.10+ supports audit filtering rules that let you include or exclude specific users or event types:

```sql
-- Create a filter that logs all events
SELECT audit_log_filter_set_filter('log_all', '{ "filter": { "log": true } }');

-- Assign filter to all users
SELECT audit_log_filter_set_user('%', 'log_all');

-- Create a filter that logs only connection events for a specific user
SELECT audit_log_filter_set_filter('log_connections', '
{
  "filter": {
    "log": false,
    "class": {
      "name": "connection",
      "log": true
    }
  }
}');
SELECT audit_log_filter_set_user('sensitive_user@localhost', 'log_connections');
```

## Rotating the Audit Log

Rotate the audit log to prevent it from growing too large (MySQL 8.0.31+):

```sql
SELECT audit_log_rotate();
```

The current log is closed and renamed, and a new log file is opened. You can schedule this with a cron job:

```bash
0 0 * * * mysql -u root -p'secret' -e "SELECT audit_log_rotate();" 2>/dev/null
```

## Summary

MySQL audit logging provides a detailed record of all database activity for security monitoring and compliance. By installing the audit log plugin, setting an appropriate policy, and using audit filters to focus on high-risk users and events, you create a comprehensive trail of database access. Regular log rotation and secure log storage complete a production-ready audit logging setup.
