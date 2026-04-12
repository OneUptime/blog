# How to Fix ERROR 2006 MySQL Server Has Gone Away

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Handling, Troubleshooting, Connection Issues

Description: Learn how to diagnose and fix MySQL ERROR 2006 'MySQL server has gone away' caused by timeouts, packet size limits, and connection drops.

---

## What is ERROR 2006

MySQL ERROR 2006 "MySQL server has gone away" occurs when the client loses its connection to the MySQL server mid-query or attempts to reconnect after the server has closed an idle connection. The error code `CR_SERVER_GONE_ERROR` corresponds to this issue.

Common causes:

- The `wait_timeout` or `interactive_timeout` was reached on an idle connection
- The query or data packet exceeds `max_allowed_packet`
- The MySQL server crashed or was restarted
- Network interruption between client and server
- Long-running queries or transactions that exceed timeout limits

## Cause 1 - Connection Timeout

The most common cause is an idle connection exceeding `wait_timeout`.

Check current timeout settings:

```sql
SHOW VARIABLES LIKE 'wait_timeout';
SHOW VARIABLES LIKE 'interactive_timeout';
```

Increase timeout values:

```sql
SET GLOBAL wait_timeout = 28800;         -- 8 hours
SET GLOBAL interactive_timeout = 28800;
```

To persist these changes, add to `/etc/mysql/my.cnf`:

```text
[mysqld]
wait_timeout = 28800
interactive_timeout = 28800
```

## Cause 2 - max_allowed_packet Too Small

If you are inserting large blobs, long strings, or large SQL statements, the packet may exceed `max_allowed_packet`.

Check the current limit:

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
```

Increase the limit:

```sql
SET GLOBAL max_allowed_packet = 67108864; -- 64MB
```

Or in `/etc/mysql/my.cnf`:

```text
[mysqld]
max_allowed_packet = 64M
```

Also set it for the client section:

```text
[client]
max_allowed_packet = 64M
```

## Cause 3 - Server Crash or Restart

Check the MySQL error log to see if the server restarted:

```bash
sudo tail -100 /var/log/mysql/error.log
```

Check server uptime:

```sql
SHOW STATUS LIKE 'Uptime';
```

If uptime is very small, the server recently restarted. Investigate the error log for the cause.

## Cause 4 - Long-Running Query Exceeding net_read_timeout

```sql
SHOW VARIABLES LIKE 'net_read_timeout';
SHOW VARIABLES LIKE 'net_write_timeout';

-- Increase if needed
SET GLOBAL net_read_timeout = 120;
SET GLOBAL net_write_timeout = 120;
```

## Application-Level Fixes

### Reconnect on Error (Python mysql-connector)

```python
import mysql.connector
from mysql.connector import OperationalError

def get_connection():
    conn = mysql.connector.connect(
        host='localhost',
        user='user',
        password='password',
        database='mydb',
        connection_timeout=60
    )
    return conn

def execute_query(query, params=None):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return cursor.fetchall()
    except OperationalError as e:
        if e.errno == 2006:
            conn.reconnect(attempts=3, delay=2)
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()
        raise
```

### Using pool_pre_ping in SQLAlchemy

```python
engine = create_engine(
    "mysql+pymysql://user:password@localhost/mydb",
    pool_pre_ping=True  # Tests connection before use
)
```

### Connection Pool Recycling

```python
engine = create_engine(
    "mysql+pymysql://user:password@localhost/mydb",
    pool_recycle=3600  # Recycle after 1 hour, before wait_timeout
)
```

## Diagnosing Large Packet Issues

```bash
# Check if the dump file is being cut off
wc -l backup.sql

# Import with explicit max_allowed_packet
mysql --max_allowed_packet=64M -u user -p mydb < backup.sql
```

## Summary

ERROR 2006 in MySQL is most commonly caused by connection timeout (increase `wait_timeout`) or oversized packets (increase `max_allowed_packet`). For application-level fixes, use `pool_pre_ping=True` in SQLAlchemy or enable auto-reconnect in your driver. Always persist configuration changes in `my.cnf` so they survive server restarts.
