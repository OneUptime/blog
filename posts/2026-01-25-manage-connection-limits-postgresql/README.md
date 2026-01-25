# How to Manage Connection Limits in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Connections, Database, Operations

Description: Learn how to configure and manage PostgreSQL connection limits effectively, including monitoring active connections, setting per-user limits, and implementing connection pooling strategies.

---

Every PostgreSQL connection consumes memory and resources. Run out of connections and your application grinds to a halt with "FATAL: too many connections" errors. This guide covers how to configure limits properly, monitor usage, and implement pooling to handle high-concurrency workloads.

## How PostgreSQL Handles Connections

Each PostgreSQL connection spawns a dedicated backend process. This process consumes:

- Shared memory for buffers and locks
- Private memory for query execution (work_mem, temp buffers)
- File descriptors for the connection socket
- CPU time for context switching

The default `max_connections` is typically 100, which is conservative but safe. The right number for your server depends on available RAM and workload characteristics.

## Checking Current Connection Status

Before changing anything, understand your current situation:

```sql
-- Show current connection count and limit
SELECT
    count(*) AS current_connections,
    (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections,
    (SELECT setting FROM pg_settings WHERE name = 'superuser_reserved_connections') AS reserved
FROM pg_stat_activity;
```

Break down connections by state and user:

```sql
-- Connections grouped by user and state
SELECT
    usename,
    state,
    count(*) AS connection_count,
    max(now() - backend_start) AS longest_connection_age
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY usename, state
ORDER BY connection_count DESC;
```

Find idle connections that might be candidates for cleanup:

```sql
-- Find connections idle for more than 10 minutes
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    now() - state_change AS idle_duration,
    query
FROM pg_stat_activity
WHERE state = 'idle'
  AND now() - state_change > interval '10 minutes'
ORDER BY idle_duration DESC;
```

## Configuring Connection Limits

### Server-Wide Limits

Edit `postgresql.conf` or use ALTER SYSTEM:

```sql
-- Set maximum connections (requires restart)
ALTER SYSTEM SET max_connections = 200;

-- Reserve connections for superusers (for emergency access)
ALTER SYSTEM SET superuser_reserved_connections = 5;
```

After changing max_connections, you must restart PostgreSQL:

```bash
# Check if the change will be applied
sudo -u postgres psql -c "SELECT name, setting, pending_restart FROM pg_settings WHERE name = 'max_connections';"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Per-User Connection Limits

Limit connections for specific users to prevent any single application from monopolizing the pool:

```sql
-- Create a role with a connection limit
CREATE ROLE app_user WITH LOGIN PASSWORD 'secret' CONNECTION LIMIT 50;

-- Modify an existing role
ALTER ROLE app_user CONNECTION LIMIT 50;

-- Check current limits
SELECT rolname, rolconnlimit
FROM pg_roles
WHERE rolconnlimit > 0;
```

A value of -1 means unlimited (up to max_connections).

### Per-Database Connection Limits

You can also limit connections per database:

```sql
-- Limit connections to a specific database
ALTER DATABASE myapp CONNECTION LIMIT 100;

-- Check database limits
SELECT datname, datconnlimit
FROM pg_database
WHERE datconnlimit > 0;
```

## Handling Connection Exhaustion

When connections run out, you need to act fast. Here are emergency procedures:

### Kill Idle Connections

```sql
-- Terminate idle connections older than 30 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND now() - state_change > interval '30 minutes'
  AND pid != pg_backend_pid();  -- Don't kill your own connection
```

### Kill Long-Running Queries

```sql
-- Terminate queries running longer than 1 hour
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '1 hour'
  AND pid != pg_backend_pid();
```

### Automatic Idle Connection Timeout

PostgreSQL 14+ supports automatic idle session timeout:

```sql
-- Disconnect sessions idle for more than 30 minutes
ALTER SYSTEM SET idle_session_timeout = '30min';
SELECT pg_reload_conf();
```

For older versions, you need a cron job or monitoring system to clean up idle connections.

## Connection Pooling with PgBouncer

For applications with many short-lived connections, PgBouncer is essential. It maintains a pool of database connections and multiplexes client connections through them.

### Installing PgBouncer

```bash
# Ubuntu/Debian
sudo apt-get install pgbouncer

# RHEL/CentOS
sudo yum install pgbouncer
```

### Basic PgBouncer Configuration

Edit `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
# Map application database name to PostgreSQL connection
myapp = host=127.0.0.1 port=5432 dbname=myapp

[pgbouncer]
# Listen on all interfaces
listen_addr = 0.0.0.0
listen_port = 6432

# Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000      # Max client connections to PgBouncer
default_pool_size = 20      # Connections per user/database pair
min_pool_size = 5           # Minimum connections to keep open
reserve_pool_size = 5       # Extra connections for burst traffic
reserve_pool_timeout = 3    # Seconds before using reserve pool

# Timeouts
server_idle_timeout = 600   # Close unused server connections after 10 min
client_idle_timeout = 0     # No timeout for idle clients (app handles this)
query_timeout = 0           # No query timeout (use statement_timeout in PG)

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
```

### Pool Modes Explained

PgBouncer offers three pool modes:

**Session pooling**: Client owns a server connection for the entire session. Safest but least efficient.

**Transaction pooling**: Client gets a server connection for each transaction. Best balance of safety and efficiency.

**Statement pooling**: Client gets a connection for each statement. Most efficient but breaks many features (prepared statements, SET commands).

For most applications, transaction pooling is the right choice:

```ini
pool_mode = transaction
```

### Creating the Auth File

```bash
# Generate password hash for PgBouncer
echo "\"app_user\" \"md5$(echo -n 'passwordapp_user' | md5sum | cut -d' ' -f1)\"" | sudo tee /etc/pgbouncer/userlist.txt
```

Or use plain text (less secure):

```
"app_user" "plain_password"
```

### Monitoring PgBouncer

Connect to the PgBouncer admin console:

```bash
psql -h localhost -p 6432 -U pgbouncer pgbouncer
```

Useful commands:

```sql
-- Show pool statistics
SHOW POOLS;

-- Show client connections
SHOW CLIENTS;

-- Show server connections
SHOW SERVERS;

-- Show database configuration
SHOW DATABASES;

-- Show overall stats
SHOW STATS;
```

## Application-Side Connection Management

Your application code matters too. Here are patterns for different frameworks:

### Python with SQLAlchemy

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Configure connection pool
engine = create_engine(
    "postgresql://user:pass@localhost:6432/myapp",
    poolclass=QueuePool,
    pool_size=10,           # Base number of connections
    max_overflow=20,        # Additional connections when pool is exhausted
    pool_timeout=30,        # Seconds to wait for a connection
    pool_recycle=1800,      # Recycle connections after 30 minutes
    pool_pre_ping=True      # Verify connections before use
)
```

### Node.js with pg-pool

```javascript
const { Pool } = require('pg');

// Configure pool
const pool = new Pool({
  host: 'localhost',
  port: 6432,
  database: 'myapp',
  user: 'app_user',
  password: 'secret',
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000  // Timeout when acquiring connection
});

// Always release connections back to pool
async function queryExample() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [1]);
    return result.rows;
  } finally {
    client.release();  // Critical: always release
  }
}
```

### Java with HikariCP

```java
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:6432/myapp");
config.setUsername("app_user");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setIdleTimeout(300000);      // 5 minutes
config.setConnectionTimeout(30000); // 30 seconds
config.setMaxLifetime(1800000);     // 30 minutes

HikariDataSource dataSource = new HikariDataSource(config);
```

## Monitoring and Alerting

Set up alerts before you hit limits:

```sql
-- Create a view for connection monitoring
CREATE VIEW connection_monitor AS
SELECT
    (SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend') AS current,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max,
    (SELECT setting::int FROM pg_settings WHERE name = 'superuser_reserved_connections') AS reserved,
    round(100.0 * count(*) /
        (SELECT setting::int - setting2::int
         FROM pg_settings, (SELECT setting AS setting2 FROM pg_settings WHERE name = 'superuser_reserved_connections') s
         WHERE name = 'max_connections'), 1) AS usage_percent
FROM pg_stat_activity
WHERE backend_type = 'client backend';

-- Query the view
SELECT * FROM connection_monitor;
```

Alert when usage exceeds 80%:

```sql
-- Returns rows when connections are critically high
SELECT *
FROM connection_monitor
WHERE usage_percent > 80;
```

## Summary

Connection management in PostgreSQL requires attention at multiple levels:

1. **Set appropriate limits** based on your server's RAM (roughly 400 connections per GB of RAM as a starting point)
2. **Use per-user limits** to prevent any single application from exhausting the pool
3. **Deploy PgBouncer** for applications with many short-lived connections
4. **Configure application pools** to limit connections at the source
5. **Monitor continuously** and alert before you hit limits

Start with conservative limits and increase them based on monitoring data. Running out of connections in production is painful, but over-provisioning wastes memory that could be used for caching. The right balance depends on your specific workload patterns.
