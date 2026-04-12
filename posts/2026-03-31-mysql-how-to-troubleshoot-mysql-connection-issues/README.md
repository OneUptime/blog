# How to Troubleshoot MySQL Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Troubleshooting, Connection Issues, Database Administration, Networking

Description: A practical guide to diagnosing and fixing common MySQL connection errors including too many connections, authentication failures, and network timeouts.

---

## Common MySQL Connection Errors

The most frequent MySQL connection errors are:
- `ERROR 1040: Too many connections`
- `ERROR 2003: Can't connect to MySQL server on 'host' (111)`
- `ERROR 1045: Access denied for user`
- `ERROR 2006: MySQL server has gone away`
- Connection timeouts after idle periods

## Error 1040 - Too Many Connections

### Diagnose

```sql
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';
```

If `Threads_connected` is at or near `max_connections`, new connections are being refused.

```sql
SHOW PROCESSLIST;
-- Or for more detail:
SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO
FROM information_schema.PROCESSLIST
ORDER BY TIME DESC;
```

Look for long-running queries or connections stuck in `Sleep` state.

### Fix - Increase max_connections

```sql
SET GLOBAL max_connections = 500;
```

To persist across restarts, add to `my.cnf`:

```text
[mysqld]
max_connections = 500
```

### Fix - Kill Idle Connections

```sql
-- Find idle connections sleeping more than 300 seconds
SELECT ID, USER, HOST, TIME
FROM information_schema.PROCESSLIST
WHERE COMMAND = 'Sleep' AND TIME > 300;

-- Kill a specific connection
KILL CONNECTION 42;
```

Automate with `wait_timeout`:

```sql
SET GLOBAL wait_timeout = 300;
SET GLOBAL interactive_timeout = 300;
```

## Error 2003 - Cannot Connect to Server

### Check if MySQL is Running

```bash
systemctl status mysql
# Or:
mysqladmin -u root -p ping
```

### Check Bind Address

```bash
grep bind-address /etc/mysql/my.cnf
```

If `bind-address = 127.0.0.1`, MySQL only accepts local connections. Change to `0.0.0.0` or the specific IP to allow remote access.

### Check Firewall

```bash
# Check if port 3306 is open
telnet db_host 3306
# Or:
nc -zv db_host 3306
```

```bash
# Open port 3306 in iptables
iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
```

## Error 1045 - Access Denied

### Check User and Host

```sql
SELECT user, host FROM mysql.user WHERE user = 'app_user';
```

MySQL user accounts are identified by both username AND host. `'app_user'@'localhost'` is different from `'app_user'@'%'`.

### Create User with Correct Host

```sql
CREATE USER 'app_user'@'10.0.0.%' IDENTIFIED BY 'StrongPass!1';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app_user'@'10.0.0.%';
FLUSH PRIVILEGES;
```

### Reset Password if Forgotten

```bash
# Stop MySQL and start with skip-grant-tables
systemctl stop mysql
mysqld --skip-grant-tables &
mysql -u root
```

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPass!1';
```

## Error 2006 - Server Has Gone Away

This error occurs when the connection is dropped mid-query, usually due to:
- `max_allowed_packet` being too small for a large query or blob.
- `wait_timeout` expiring during idle periods between queries.
- Network instability.

### Check and Increase max_allowed_packet

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
SET GLOBAL max_allowed_packet = 67108864;  -- 64MB
```

In `my.cnf`:

```text
[mysqld]
max_allowed_packet = 64M
```

## SSL/TLS Connection Issues

```bash
# Test SSL connection
mysql -u app_user -p -h db_host --ssl-mode=REQUIRED
```

```sql
-- Check SSL status of current connection
SHOW STATUS LIKE 'Ssl_cipher';
```

## Connection Pool Diagnostics

If using a connection pool (like HikariCP, ProxySQL, or Django's pool), check pool metrics:

```bash
# With ProxySQL
mysql -h 127.0.0.1 -P 6032 -u admin -p
```

```sql
SELECT * FROM stats_mysql_connection_pool;
```

## Checking the Error Log

```sql
SHOW VARIABLES LIKE 'log_error';
```

```bash
tail -n 100 /var/log/mysql/error.log | grep -i "error\|abort\|refused"
```

## Summary

MySQL connection issues typically fall into a few categories: too many connections (raise `max_connections` and tune timeouts), network/firewall blocks (verify `bind-address` and open port 3306), authentication failures (check user host grants), and packet size limits (raise `max_allowed_packet`). Always check `SHOW PROCESSLIST` to understand current connection activity and the MySQL error log for root cause details.
