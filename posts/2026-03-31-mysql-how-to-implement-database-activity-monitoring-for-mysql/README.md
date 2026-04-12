# How to Implement Database Activity Monitoring for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database Activity Monitoring, Security, Compliance, Audit

Description: Learn how to implement Database Activity Monitoring (DAM) for MySQL using audit plugins, network sniffing, and third-party tools to detect threats in real time.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## What Is Database Activity Monitoring

Database Activity Monitoring (DAM) is a security approach that records, analyzes, and alerts on all database activity - including queries, logins, schema changes, and data exports - in real time. Unlike basic audit logs, DAM systems can detect anomalous behavior and trigger alerts without requiring changes to the database itself.

## Components of a DAM Solution

A complete DAM implementation combines:

1. **Data collection** - audit plugin, network sniffing, or agent-based
2. **Log shipping** - sending records to a centralized store
3. **Analysis** - parsing, correlating, and alerting on events
4. **Alerting** - notifying security teams on suspicious activity
5. **Reporting** - compliance dashboards and evidence

## Step 1: Enable the MySQL Audit Plugin

Install the Percona Audit Log Plugin (Community Edition):

```bash
# Check if audit_log plugin is available
ls /usr/lib/mysql/plugin/ | grep audit
```

```sql
INSTALL PLUGIN audit_log SONAME 'audit_log.so';

SHOW PLUGINS WHERE name = 'audit_log';
```

Configure audit log settings:

```text
[mysqld]
plugin-load-add = audit_log.so
audit_log_policy = ALL
audit_log_format = JSON
audit_log_file = /var/log/mysql/audit.json
audit_log_rotate_on_size = 100M
audit_log_rotations = 10
```

## Step 2: Ship Logs to a SIEM

Send MySQL audit logs to a Security Information and Event Management (SIEM) system like Splunk, Elasticsearch, or AWS Security Hub:

```bash
# Using Filebeat to ship to Elasticsearch
cat > /etc/filebeat/filebeat.yml << 'EOF'
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/mysql/audit.json
    json.keys_under_root: true
    json.add_error_key: true
    tags: ["mysql-audit"]

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "mysql-audit-%{+yyyy.MM.dd}"
EOF

systemctl start filebeat
```

## Step 3: Define Monitoring Rules

Create alert rules for suspicious patterns. Example Elasticsearch queries for alerting:

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"tags": "mysql-audit"}},
        {"match": {"command": "Query"}},
        {"wildcard": {"query.keyword": "*DROP TABLE*"}}
      ]
    }
  }
}
```

Common patterns to alert on:

```text
- DROP TABLE / DROP DATABASE
- SELECT * FROM sensitive_tables with large row counts
- Access outside business hours
- Login from new IP addresses
- Multiple failed login attempts
- Privilege escalation (GRANT, CREATE USER)
- Data exports (SELECT INTO OUTFILE)
```

## Step 4: Monitor Specific Tables with Triggers

For sensitive tables, add application-layer monitoring with audit triggers:

> Note: MySQL triggers only support INSERT, UPDATE, and DELETE events. SELECT monitoring requires the audit plugin or a proxy-layer solution.

```sql
CREATE TABLE security_audit_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_time   DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  db_user      VARCHAR(100),
  client_host  VARCHAR(50),
  table_name   VARCHAR(100),
  action       VARCHAR(20),
  query_text   TEXT,
  rows_affected INT
);

-- Log INSERT activity on the credit_cards table
DELIMITER $$
CREATE TRIGGER credit_cards_insert_monitor
AFTER INSERT ON credit_cards
FOR EACH ROW
BEGIN
  INSERT INTO security_audit_log (db_user, client_host, table_name, action)
  VALUES (USER(), SUBSTRING_INDEX(USER(), '@', -1), 'credit_cards', 'INSERT');
END$$
DELIMITER ;

-- Log UPDATE activity on the credit_cards table
DELIMITER $$
CREATE TRIGGER credit_cards_update_monitor
AFTER UPDATE ON credit_cards
FOR EACH ROW
BEGIN
  INSERT INTO security_audit_log (db_user, client_host, table_name, action)
  VALUES (USER(), SUBSTRING_INDEX(USER(), '@', -1), 'credit_cards', 'UPDATE');
END$$
DELIMITER ;

-- Log DELETE activity on the credit_cards table
DELIMITER $$
CREATE TRIGGER credit_cards_delete_monitor
AFTER DELETE ON credit_cards
FOR EACH ROW
BEGIN
  INSERT INTO security_audit_log (db_user, client_host, table_name, action)
  VALUES (USER(), SUBSTRING_INDEX(USER(), '@', -1), 'credit_cards', 'DELETE');
END$$
DELIMITER ;
```

## Step 5: Monitor Active Sessions

Poll `information_schema.processlist` for real-time session monitoring:

```sql
-- Sessions running long queries
SELECT
  id,
  user,
  host,
  db,
  command,
  time,
  state,
  info
FROM information_schema.processlist
WHERE command != 'Sleep'
  AND time > 30
ORDER BY time DESC;
```

Automate with a monitoring script:

```python
import mysql.connector
import time

def monitor_activity():
    conn = mysql.connector.connect(host='localhost', user='monitor', password='pass')
    cursor = conn.cursor(dictionary=True)

    while True:
        cursor.execute("""
            SELECT id, user, host, db, command, time, info
            FROM information_schema.processlist
            WHERE command != 'Sleep' AND time > 10
        """)

        for row in cursor.fetchall():
            print(f"ALERT: Long query - user={row['user']} host={row['host']} time={row['time']}s")
            print(f"  Query: {row['info']}")

        time.sleep(5)

monitor_activity()
```

## Step 6: Set Up Login Failure Alerts

```sql
-- Query failed logins from the host cache
SELECT
  ip,
  host,
  SUM_CONNECT_ERRORS,
  COUNT_AUTH_ERRORS,
  COUNT_HANDSHAKE_ERRORS,
  FIRST_ERROR_SEEN,
  LAST_ERROR_SEEN
FROM performance_schema.host_cache
WHERE COUNT_AUTH_ERRORS > 5;

-- Check overall failed connection count
SHOW GLOBAL STATUS LIKE 'Aborted_connects';
```

## Summary

Implementing Database Activity Monitoring for MySQL involves enabling the audit plugin for comprehensive logging, shipping logs to a SIEM for centralized analysis, defining alert rules for suspicious patterns, and setting up real-time session monitoring. Combined, these layers provide the visibility needed to detect threats and demonstrate compliance with security regulations.
