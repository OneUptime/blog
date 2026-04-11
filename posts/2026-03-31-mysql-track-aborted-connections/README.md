# How to Track MySQL Aborted Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, Monitoring

Description: Monitor MySQL aborted connections and clients using global status variables, identify root causes, and reduce connection failures with proper timeout settings.

---

MySQL tracks two types of connection failures: `Aborted_connects` (failed connection attempts, including authentication failures) and `Aborted_clients` (connections that were established but terminated abnormally). Both signal problems that degrade reliability.

## The Two Key Counters

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN ('Aborted_connects', 'Aborted_clients');
```

- `Aborted_connects`: failed connection attempts (wrong password, host not allowed, max connections reached, TLS handshake failure)
- `Aborted_clients`: clients that connected but disconnected without sending `COM_QUIT` (application crash, network timeout, idle timeout)

## What Causes Aborted_connects

```sql
-- Check max connections setting
SHOW VARIABLES LIKE 'max_connections';

-- Check current usage
SELECT VARIABLE_VALUE AS current_connections
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Threads_connected';
```

Common causes:
- Password authentication failure (application config drift)
- `max_connections` exceeded
- Host blocked via `max_connect_errors`

## Unblocking a Host

When a host exceeds `max_connect_errors`, MySQL blocks it:

```sql
-- Check blocked hosts
SELECT * FROM performance_schema.host_cache WHERE SUM_CONNECT_ERRORS > 0;

-- Unblock (MySQL 8.0.23+ deprecates FLUSH HOSTS; use TRUNCATE instead)
TRUNCATE TABLE performance_schema.host_cache;
```

Or raise the threshold:

```sql
SET GLOBAL max_connect_errors = 1000;
```

## What Causes Aborted_clients

```sql
-- Check wait_timeout (idle connection timeout)
SHOW VARIABLES LIKE 'wait_timeout';

-- Check interactive_timeout
SHOW VARIABLES LIKE 'interactive_timeout';
```

The default `wait_timeout` is 28800 seconds (8 hours). If connection pools hold idle connections longer than the configured `wait_timeout`, MySQL kills them, causing `Aborted_clients`.

Fix by aligning application-side idle timeout with MySQL timeout:

```text
[mysqld]
wait_timeout         = 600
interactive_timeout  = 600
```

And in application pool settings, set `idleTimeoutMs` (Node) or `pool_recycle` (Python SQLAlchemy) below this value.

## Monitoring Abort Rate Over Time

```bash
#!/bin/bash
T1_AC=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Aborted_clients'")
T1_AF=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Aborted_connects'")

sleep 60

T2_AC=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Aborted_clients'")
T2_AF=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Aborted_connects'")

echo "Aborted clients/min:   $((T2_AC - T1_AC))"
echo "Aborted connects/min:  $((T2_AF - T1_AF))"
```

## Prometheus Alert

```yaml
- alert: MySQLAbortedConnections
  expr: rate(mysql_global_status_aborted_connects[5m]) > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MySQL aborted connections above 1/s"
```

## Summary

Track `Aborted_connects` for authentication and capacity failures, and `Aborted_clients` for idle timeout mismatches between the application pool and MySQL. Align `wait_timeout` with pool-side idle timeouts, monitor `max_connect_errors` to prevent host blocking, and alert when either counter's rate exceeds a threshold relative to your baseline.
