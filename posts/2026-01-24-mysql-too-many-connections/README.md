# How to Fix "Too Many Connections" Errors in MySQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MySQL, Database, Connections, Performance, Troubleshooting, DevOps

Description: Learn how to diagnose and resolve MySQL too many connections errors by tuning connection limits, implementing connection pooling, and identifying connection leaks.

---

The "Too many connections" error occurs when MySQL reaches its maximum allowed simultaneous connections. This prevents new clients from connecting and can bring your application to a halt. Understanding connection management helps you prevent and quickly resolve this issue.

## Understanding the Error

```
ERROR 1040 (HY000): Too many connections
```

This error means all available connection slots are occupied. MySQL has a configurable limit on concurrent connections, and when that limit is reached, new connections are rejected.

```mermaid
flowchart TD
    A[New Connection Request] --> B{Connections < max_connections?}
    B -->|Yes| C[Connection Accepted]
    B -->|No| D[ERROR 1040: Too many connections]

    C --> E[Application Uses Connection]
    E --> F{Connection Closed?}
    F -->|Yes| G[Slot Available]
    F -->|No| H[Connection Still Occupied]

    G --> I[Available for New Connections]
    H --> J[Reduces Available Slots]
```

## Diagnosing the Problem

### Check Current Connection Status

```sql
-- Connect as root (reserve one connection for admin with +1)
mysql -u root -p

-- Current connection count and limit
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- Detailed output:
-- max_connections: 151 (default)
-- Threads_connected: 145 (current active)
-- Max_used_connections: 150 (peak usage)
```

### View Active Connections

```sql
-- List all current connections
SHOW PROCESSLIST;

-- Full query text (SHOW FULL PROCESSLIST can be slow with many connections)
SELECT
    id,
    user,
    host,
    db,
    command,
    time,
    state,
    LEFT(info, 100) AS query_preview
FROM information_schema.processlist
ORDER BY time DESC;

-- Group connections by user and state
SELECT
    user,
    COUNT(*) AS connection_count,
    SUM(IF(command = 'Sleep', 1, 0)) AS sleeping,
    SUM(IF(command != 'Sleep', 1, 0)) AS active
FROM information_schema.processlist
GROUP BY user
ORDER BY connection_count DESC;

-- Find connections by application host
SELECT
    SUBSTRING_INDEX(host, ':', 1) AS client_host,
    COUNT(*) AS connections
FROM information_schema.processlist
GROUP BY client_host
ORDER BY connections DESC;
```

### Check Connection History

```sql
-- Peak connection usage since server start
SHOW STATUS LIKE 'Max_used_connections';
SHOW STATUS LIKE 'Max_used_connections_time';

-- Connection errors
SHOW STATUS LIKE 'Connection_errors%';
-- Connection_errors_max_connections shows how often this error occurred

-- Aborted connections (clients that didn't close properly)
SHOW STATUS LIKE 'Aborted_connects';
SHOW STATUS LIKE 'Aborted_clients';
```

## Immediate Solutions

### Kill Idle Connections

When you need to free up connections immediately.

```sql
-- Find long-running sleep connections (potential leaks)
SELECT id, user, host, db, command, time, state
FROM information_schema.processlist
WHERE command = 'Sleep'
AND time > 300  -- Idle for more than 5 minutes
ORDER BY time DESC;

-- Kill a specific connection
KILL CONNECTION 12345;

-- Kill all idle connections older than 5 minutes (careful!)
-- Generate kill statements
SELECT CONCAT('KILL CONNECTION ', id, ';') AS kill_statement
FROM information_schema.processlist
WHERE command = 'Sleep'
AND time > 300
AND user != 'system user';

-- Execute the generated statements
-- Or use a procedure:
DELIMITER //
CREATE PROCEDURE kill_idle_connections(IN max_idle_time INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE conn_id BIGINT;
    DECLARE cur CURSOR FOR
        SELECT id FROM information_schema.processlist
        WHERE command = 'Sleep' AND time > max_idle_time;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO conn_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        KILL CONNECTION conn_id;
    END LOOP;
    CLOSE cur;
END //
DELIMITER ;

-- Kill connections idle more than 300 seconds
CALL kill_idle_connections(300);
```

### Increase Connection Limit Temporarily

```sql
-- Check current limit
SHOW VARIABLES LIKE 'max_connections';

-- Increase limit (takes effect immediately, no restart needed)
SET GLOBAL max_connections = 300;

-- Note: This change is not persistent
-- Restarting MySQL will revert to the config file value
```

## Long-term Solutions

### Configure Appropriate Limits

Set limits based on your server's resources and application needs.

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Maximum simultaneous connections
# Rule of thumb: start with (available RAM in MB) / 10
# But consider your application's actual needs
max_connections = 300

# Reserve connection for admin (root) access
# This allows connecting even when max_connections is reached
# Only users with CONNECTION_ADMIN or SUPER privilege can use this
# MySQL 8.0+:
admin_address = 127.0.0.1
admin_port = 33062

# Or for older versions, max_connections + 1 is reserved for SUPER users

# Close idle connections automatically
wait_timeout = 300           # 5 minutes for non-interactive
interactive_timeout = 300    # 5 minutes for interactive (mysql client)

# Thread cache to reduce connection overhead
thread_cache_size = 50

# Per-connection memory settings (affects total memory usage)
# Be careful: max_connections * per_connection_memory = potential memory usage
sort_buffer_size = 256K
read_buffer_size = 256K
join_buffer_size = 256K
```

Calculate memory requirements:

```sql
-- Estimate memory per connection
-- Each connection can use up to:
-- sort_buffer_size + read_buffer_size + join_buffer_size + ...
-- Plus thread stack and other overhead

-- Rough formula:
-- Total connection memory = max_connections *
--   (sort_buffer_size + read_buffer_size + join_buffer_size +
--    read_rnd_buffer_size + thread_stack)

-- Check current settings
SELECT
    @@max_connections AS max_conn,
    @@sort_buffer_size / 1024 AS sort_kb,
    @@read_buffer_size / 1024 AS read_kb,
    @@join_buffer_size / 1024 AS join_kb,
    (@@sort_buffer_size + @@read_buffer_size + @@join_buffer_size)
        * @@max_connections / 1024 / 1024 AS potential_mb;
```

### Implement Connection Pooling

Connection pools maintain a set of reusable connections, preventing connection exhaustion.

**Node.js with mysql2:**

```javascript
const mysql = require('mysql2/promise');

// Create connection pool instead of individual connections
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Pool settings
  connectionLimit: 10,        // Maximum connections in THIS pool
  queueLimit: 0,              // Unlimited queue (wait for connection)
  waitForConnections: true,   // Wait if pool is exhausted

  // Timeouts
  connectTimeout: 10000,      // 10s to establish connection
  acquireTimeout: 10000,      // 10s to acquire from pool

  // Keep connections alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

// Usage: pool automatically manages connections
async function getUser(id) {
  // Connection acquired from pool
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  // Connection automatically returned to pool
  return rows[0];
}

// For transactions, explicitly get and release connection
async function transferFunds(fromId, toId, amount) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
    await connection.execute('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();  // Always release back to pool!
  }
}
```

**Python with SQLAlchemy:**

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Create engine with connection pool
engine = create_engine(
    'mysql+pymysql://user:pass@localhost/db',
    poolclass=QueuePool,
    pool_size=10,           # Maintained connections
    max_overflow=20,        # Additional connections when busy
    pool_timeout=30,        # Wait time for connection
    pool_recycle=3600,      # Recycle connections after 1 hour
    pool_pre_ping=True,     # Verify connection before use
)

# Pool handles connection management automatically
with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": 1})
    # Connection returned to pool when context exits
```

### Use ProxySQL for Connection Multiplexing

ProxySQL sits between your application and MySQL, multiplexing many application connections onto fewer database connections.

```mermaid
flowchart LR
    subgraph Applications
        A1[App Instance 1]
        A2[App Instance 2]
        A3[App Instance 3]
    end

    subgraph ProxySQL
        P[Connection Pool]
    end

    subgraph MySQL
        M[(Database)]
    end

    A1 -->|"100 conns"| P
    A2 -->|"100 conns"| P
    A3 -->|"100 conns"| P
    P -->|"50 conns"| M
```

```bash
# Install ProxySQL
apt-get install proxysql

# Configure through admin interface
mysql -u admin -padmin -h 127.0.0.1 -P 6032

# Add MySQL server
INSERT INTO mysql_servers(hostgroup_id, hostname, port)
VALUES (1, 'mysql-server', 3306);

# Add user for connection
INSERT INTO mysql_users(username, password, default_hostgroup)
VALUES ('app_user', 'password', 1);

# Set connection pool settings
UPDATE mysql_servers SET max_connections = 100 WHERE hostname = 'mysql-server';

# Load and save configuration
LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;
```

### Fix Connection Leaks

Connection leaks occur when code opens connections but fails to close them.

```javascript
// BAD: Connection leak
async function getUserBad(id) {
  const connection = await mysql.createConnection(config);
  const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
  // Connection never closed! Leak!
  return rows[0];
}

// GOOD: Always close connections with try/finally
async function getUserGood(id) {
  const connection = await mysql.createConnection(config);
  try {
    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  } finally {
    await connection.end();  // Always executed
  }
}

// BETTER: Use connection pool
async function getUserBetter(id) {
  // Pool handles connection lifecycle
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
}
```

```python
# BAD: Connection leak in Python
def get_user_bad(user_id):
    conn = pymysql.connect(**config)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return cursor.fetchone()
    # Connection never closed!

# GOOD: Use context manager
def get_user_good(user_id):
    with pymysql.connect(**config) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cursor.fetchone()
    # Connection automatically closed
```

## Monitoring and Alerting

Set up proactive monitoring to catch issues before they become critical.

```sql
-- Create monitoring query
-- Alert when connections exceed 80% of max
SELECT
    @@max_connections AS max_connections,
    (SELECT COUNT(*) FROM information_schema.processlist) AS current_connections,
    ROUND((SELECT COUNT(*) FROM information_schema.processlist) / @@max_connections * 100, 2) AS usage_percent;

-- For Prometheus metrics, export these values:
-- mysql_global_status_threads_connected
-- mysql_global_variables_max_connections
```

```bash
#!/bin/bash
# connection_monitor.sh - Run via cron every minute

MYSQL_USER="monitor"
MYSQL_PASS="password"
THRESHOLD=80

CURRENT=$(mysql -u$MYSQL_USER -p$MYSQL_PASS -N -e "SELECT COUNT(*) FROM information_schema.processlist")
MAX=$(mysql -u$MYSQL_USER -p$MYSQL_PASS -N -e "SELECT @@max_connections")
PERCENT=$((CURRENT * 100 / MAX))

if [ $PERCENT -gt $THRESHOLD ]; then
    echo "WARNING: MySQL connections at ${PERCENT}% (${CURRENT}/${MAX})"
    # Send alert
fi
```

## Quick Reference

| Issue | Solution |
|-------|----------|
| Sudden spike | Kill idle connections, increase limit temporarily |
| Gradual increase | Fix connection leaks in application code |
| Consistent high usage | Implement connection pooling |
| Many app instances | Use ProxySQL for multiplexing |
| Long-running queries | Optimize queries, add timeouts |

| Parameter | Default | Recommendation |
|-----------|---------|----------------|
| max_connections | 151 | Based on RAM and needs |
| wait_timeout | 28800 | 300-600 for web apps |
| thread_cache_size | 9 | 50-100 for busy servers |
| connection pool size | - | 10-20 per app instance |

The "too many connections" error is usually a symptom of either insufficient limits, connection leaks, or missing connection pooling. Start by analyzing your connection patterns, then implement the appropriate solution. Connection pooling should be standard practice for any production application.
