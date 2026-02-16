# How to Fix 'too many clients already' Connection Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Connections, Performance, Connection Pooling

Description: Learn how to diagnose and fix 'too many clients already' errors in PostgreSQL. This guide covers connection management, pool configuration, and strategies to handle connection limits.

---

The "FATAL: too many clients already" error occurs when your application tries to open more database connections than PostgreSQL allows. This is a common issue in production environments, especially during traffic spikes or when connection management is not properly implemented. This guide will help you understand why this happens and how to fix it.

---

## Understanding the Error

When you see this error:

```
FATAL: sorry, too many clients already
FATAL: remaining connection slots are reserved for non-replication superuser connections
```

It means PostgreSQL has reached its maximum connection limit, and no more connections can be established. The second error means there are reserved slots for superusers, but regular users cannot connect.

---

## Checking Current Connection Status

### View Connection Limits and Usage

```sql
-- Check max connections setting
SHOW max_connections;

-- Check current connection count
SELECT count(*) FROM pg_stat_activity;

-- Check connections by state
SELECT
    state,
    count(*) as connections
FROM pg_stat_activity
GROUP BY state
ORDER BY connections DESC;

-- Check connections by user and application
SELECT
    usename,
    application_name,
    client_addr,
    count(*) as connections
FROM pg_stat_activity
GROUP BY usename, application_name, client_addr
ORDER BY connections DESC;

-- Check reserved connections
SHOW superuser_reserved_connections;
```

### Identify Connection Hogs

```sql
-- Find applications using the most connections
SELECT
    application_name,
    usename,
    count(*) AS connection_count,
    array_agg(DISTINCT client_addr) AS client_ips
FROM pg_stat_activity
WHERE pid != pg_backend_pid()
GROUP BY application_name, usename
ORDER BY connection_count DESC
LIMIT 10;

-- Find idle connections that could be closed
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    state_change,
    NOW() - state_change AS idle_duration,
    query
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes'
ORDER BY state_change ASC;
```

---

## Immediate Solutions

### Solution 1: Terminate Idle Connections

```sql
-- Terminate connections idle for more than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes'
AND pid != pg_backend_pid();

-- Terminate connections from specific application
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE application_name = 'problematic_app'
AND pid != pg_backend_pid();

-- Terminate all connections to a specific database (except your own)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb'
AND pid != pg_backend_pid();
```

### Solution 2: Increase max_connections (Temporary Fix)

```ini
# postgresql.conf
max_connections = 200  # Default is typically 100

# Also increase superuser_reserved_connections if needed
superuser_reserved_connections = 5
```

Restart PostgreSQL after changing these settings:

```bash
sudo systemctl restart postgresql
```

### Solution 3: Configure Connection Timeout

```ini
# postgresql.conf

# Terminate idle connections after 10 minutes
idle_in_transaction_session_timeout = '10min'

# Terminate any session idle for too long (PostgreSQL 14+)
idle_session_timeout = '30min'

# Statement timeout to kill long-running queries
statement_timeout = '5min'
```

---

## Long-Term Solutions

### Solution 1: Implement Connection Pooling

Connection pooling dramatically reduces the number of database connections needed.

#### PgBouncer Setup

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction    # Best for most apps
max_client_conn = 1000     # Clients connecting to PgBouncer
default_pool_size = 20     # Connections to PostgreSQL per user/db
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
```

```bash
# Start PgBouncer
sudo systemctl start pgbouncer

# Connect through PgBouncer instead of directly to PostgreSQL
psql -h localhost -p 6432 -U myuser mydb
```

### Solution 2: Application-Level Connection Pooling

**Python with psycopg2**

```python
from psycopg2 import pool
import atexit

# Create connection pool
connection_pool = pool.ThreadedConnectionPool(
    minconn=5,      # Minimum connections to keep open
    maxconn=20,     # Maximum connections allowed
    host="localhost",
    database="mydb",
    user="myuser",
    password="mypass"
)

def get_connection():
    """Get connection from pool"""
    return connection_pool.getconn()

def return_connection(conn):
    """Return connection to pool"""
    connection_pool.putconn(conn)

def close_all_connections():
    """Close all connections on shutdown"""
    connection_pool.closeall()

# Register cleanup on exit
atexit.register(close_all_connections)

# Usage
def query_database():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users LIMIT 10")
            return cur.fetchall()
    finally:
        return_connection(conn)
```

**Node.js with pg**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    user: 'myuser',
    password: 'mypass',
    max: 20,              // Maximum connections
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 2000  // Timeout for new connections
});

// Proper connection handling
async function queryDatabase() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users LIMIT 10');
        return result.rows;
    } finally {
        client.release();  // Always release back to pool
    }
}

// Or use pool.query for simple queries (auto-releases)
async function simpleQuery() {
    const result = await pool.query('SELECT NOW()');
    return result.rows[0];
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});
```

**Java with HikariCP**

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

public class DatabasePool {
    private static HikariDataSource dataSource;

    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        config.setUsername("myuser");
        config.setPassword("mypass");

        // Pool settings
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setIdleTimeout(300000);  // 5 minutes
        config.setConnectionTimeout(10000);  // 10 seconds
        config.setMaxLifetime(1800000);  // 30 minutes

        dataSource = new HikariDataSource(config);
    }

    public static Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }

    public static void close() {
        if (dataSource != null) {
            dataSource.close();
        }
    }
}
```

### Solution 3: Optimize Connection Usage

```python
# Bad: Opening new connection for each query
def bad_query():
    conn = psycopg2.connect(...)
    cur = conn.cursor()
    cur.execute("SELECT 1")
    result = cur.fetchone()
    conn.close()  # Connection overhead for simple query
    return result

# Good: Reuse connections from pool
def good_query():
    conn = pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1")
        return cur.fetchone()
    finally:
        pool.putconn(conn)  # Return to pool, not closed

# Better: Context manager ensures cleanup
from contextlib import contextmanager

@contextmanager
def get_db_cursor():
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            yield cur
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)

# Usage
with get_db_cursor() as cur:
    cur.execute("SELECT * FROM users")
    users = cur.fetchall()
```

---

## Monitoring and Alerting

### Create Monitoring View

```sql
-- Create a view for connection monitoring
CREATE VIEW connection_stats AS
SELECT
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
    (SELECT count(*) FROM pg_stat_activity) AS current_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') AS idle_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') AS idle_in_transaction,
    round(
        100.0 * (SELECT count(*) FROM pg_stat_activity) /
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')
    , 1) AS usage_percent;

-- Query the view
SELECT * FROM connection_stats;
```

### Alert Query

```sql
-- Check if connections are above threshold
SELECT
    CASE
        WHEN usage_percent > 80 THEN 'CRITICAL'
        WHEN usage_percent > 60 THEN 'WARNING'
        ELSE 'OK'
    END AS status,
    current_connections,
    max_connections,
    usage_percent || '%' AS usage
FROM connection_stats;
```

### Shell Script for Monitoring

```bash
#!/bin/bash
# check_connections.sh

THRESHOLD=80
DB_HOST="localhost"
DB_NAME="mydb"
DB_USER="postgres"

usage=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT round(100.0 * count(*) /
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'))
    FROM pg_stat_activity;
")

usage=${usage// /}  # Trim whitespace

if [ "$usage" -gt "$THRESHOLD" ]; then
    echo "ALERT: PostgreSQL connections at ${usage}%"
    # Send alert (email, Slack, PagerDuty, etc.)
    # curl -X POST "https://hooks.slack.com/..." -d '{"text":"DB connections at '$usage'%"}'
fi
```

---

## Configuration Recommendations

### For Small Applications (< 100 users)

```ini
# postgresql.conf
max_connections = 100
superuser_reserved_connections = 3
```

### For Medium Applications (100-1000 users)

Use connection pooling:

```ini
# postgresql.conf
max_connections = 200

# pgbouncer.ini
max_client_conn = 1000
default_pool_size = 50
```

### For Large Applications (1000+ users)

```ini
# postgresql.conf
max_connections = 300  # Keep reasonable

# pgbouncer.ini
max_client_conn = 10000
default_pool_size = 100
pool_mode = transaction
```

---

## Best Practices

1. **Always use connection pooling** - Either PgBouncer or application-level
2. **Release connections quickly** - Use context managers or try/finally
3. **Set idle timeouts** - Clean up abandoned connections
4. **Monitor connection usage** - Alert before hitting limits
5. **Use transaction pool mode** - Best connection reuse for most apps
6. **Close connections on app shutdown** - Prevent connection leaks
7. **Review application code** - Find and fix connection leaks

---

## Conclusion

The "too many clients" error is a sign that connection management needs improvement. The solutions are:

1. **Immediate**: Kill idle connections, increase max_connections
2. **Short-term**: Configure timeouts, optimize connection usage
3. **Long-term**: Implement connection pooling with PgBouncer

Connection pooling is almost always the right answer for production applications. It allows handling thousands of application connections with just dozens of database connections.

---

*Need to monitor your PostgreSQL connections? [OneUptime](https://oneuptime.com) provides real-time connection monitoring with alerts for connection pool exhaustion, idle connection buildup, and usage trends.*
