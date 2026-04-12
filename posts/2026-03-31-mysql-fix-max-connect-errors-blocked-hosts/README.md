# How to Fix max_connect_errors and Blocked Hosts in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, Error, Security, Host

Description: Fix MySQL blocked hosts caused by max_connect_errors by flushing host cache, increasing the threshold, or resolving the underlying connection failures.

---

MySQL tracks connection failures per host. When a host exceeds the `max_connect_errors` threshold, MySQL blocks all future connections from that host with the error: `ERROR 1129 (HY000): Host 'hostname' is blocked because of many connection errors; unblock with 'mysqladmin flush-hosts'`.

## Understand the Mechanism

MySQL maintains an internal host cache. For each host, it counts consecutive failed connection attempts. Once the count reaches `max_connect_errors`, the host is blocked until the cache is flushed. A successful connection resets the counter for that host.

## Check if a Host Is Blocked

```sql
-- Check the performance_schema host cache for blocked entries
SELECT IP, HOST, SUM_CONNECT_ERRORS, COUNT_HANDSHAKE_ERRORS,
       COUNT_HOST_BLOCKED_ERRORS
FROM performance_schema.host_cache
WHERE SUM_CONNECT_ERRORS >= @@GLOBAL.max_connect_errors;
```

## Fix: Flush Host Cache Immediately

The fastest fix is to flush the host cache:

```bash
mysqladmin -u root -p flush-hosts
```

Or from within MySQL:

```sql
TRUNCATE TABLE performance_schema.host_cache;
```

Note: The older `FLUSH HOSTS` statement achieves the same result but was deprecated in MySQL 8.0.23 and removed in MySQL 8.4.

This unblocks all hosts immediately but does not fix the underlying cause.

## Fix: Increase max_connect_errors

If legitimate connections are failing due to transient network issues:

```sql
SHOW VARIABLES LIKE 'max_connect_errors';

-- Increase the limit (global variable)
SET GLOBAL max_connect_errors = 1000000;
```

Persist in `my.cnf`:

```text
[mysqld]
max_connect_errors = 1000000
```

## Fix: Disable Host Cache (Not Recommended for Production)

Disabling the host cache entirely prevents blocking:

```text
[mysqld]
host_cache_size = 0
```

Or at runtime:

```sql
SET GLOBAL host_cache_size = 0;
```

This disables the host cache entirely, so MySQL cannot track or block hosts. Note that flushing the host cache (`TRUNCATE TABLE performance_schema.host_cache`) only clears the cache entries while keeping the cache enabled.

## Diagnose the Root Cause

Repeated connection errors indicate an underlying problem. Common causes:

- Connection pool not handling broken connections properly
- Network drops causing TCP handshakes to fail mid-way
- Clients disconnecting during the protocol handshake phase
- Port scanners or monitoring tools making incomplete connections

```sql
-- Check recent error log
-- (from the OS)
```

```bash
sudo grep "Connection refused\|Host.*blocked\|Access denied" /var/log/mysql/error.log | tail -50
```

```sql
-- Check which hosts have errors
SELECT IP, HOST, SUM_CONNECT_ERRORS, COUNT_AUTH_PLUGIN_ERRORS
FROM performance_schema.host_cache
ORDER BY SUM_CONNECT_ERRORS DESC;
```

## Fix the Underlying Application Issue

If your application is the source of errors, fix the connection configuration:

```python
import mysql.connector
from mysql.connector import Error

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='app_user',
        password='correct_password',
        database='mydb',
        connection_timeout=10
    )
except Error as e:
    print(f"Connection error: {e}")
    # Implement exponential backoff, not immediate retry loop
```

## Summary

Host blocking from `max_connect_errors` is a security mechanism. The immediate fix is `TRUNCATE TABLE performance_schema.host_cache` or `mysqladmin flush-hosts`. The real fix is diagnosing why connections are failing - protocol handshake failures, network instability, or application misconfiguration. Increase `max_connect_errors` only after addressing the root cause to prevent legitimate application hosts from being blocked during transient failures.
