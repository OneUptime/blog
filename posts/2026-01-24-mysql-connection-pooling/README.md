# How to Configure MySQL Connection Pooling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection Pooling, Performance, Database, Optimization

Description: Learn how to configure MySQL connection pooling to improve application performance, reduce connection overhead, and handle high concurrency.

---

Creating a new database connection is expensive. Each connection requires a TCP handshake, authentication, and session initialization - operations that can take 50-200 milliseconds. For applications handling hundreds or thousands of requests per second, creating a new connection for each request would quickly become a bottleneck. Connection pooling solves this by maintaining a cache of database connections that can be reused across requests.

## How Connection Pooling Works

Instead of opening and closing connections for each database operation, a connection pool maintains a set of persistent connections. When your application needs a database connection, it borrows one from the pool. After the operation completes, the connection is returned to the pool rather than being closed.

```mermaid
graph LR
    subgraph Application
        R1[Request 1]
        R2[Request 2]
        R3[Request 3]
    end

    subgraph Connection Pool
        C1[Connection 1]
        C2[Connection 2]
        C3[Connection 3]
    end

    subgraph MySQL
        DB[(Database)]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3
    C1 --> DB
    C2 --> DB
    C3 --> DB
```

## MySQL Server Configuration

Before configuring your application's connection pool, ensure your MySQL server can handle the expected connections:

```sql
-- Check current connection limits
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'max_user_connections';

-- Check current connection usage
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
```

Update your MySQL configuration to support your pooling requirements:

```ini
# my.cnf or my.ini
[mysqld]
# Maximum number of connections (default is 151)
max_connections = 500

# Per-user connection limit (0 = unlimited)
max_user_connections = 100

# Connection timeout in seconds
wait_timeout = 28800
interactive_timeout = 28800

# Thread cache for connection reuse
thread_cache_size = 50
```

## Connection Pooling in Python

### Using SQLAlchemy

SQLAlchemy provides built-in connection pooling with extensive configuration options:

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Create engine with connection pool settings
engine = create_engine(
    'mysql+mysqlconnector://user:password@localhost/myapp',

    # Pool class (QueuePool is the default)
    poolclass=QueuePool,

    # Number of connections to keep open
    pool_size=10,

    # Maximum overflow connections beyond pool_size
    max_overflow=20,

    # Seconds to wait before giving up on getting a connection
    pool_timeout=30,

    # Recycle connections after this many seconds
    pool_recycle=3600,

    # Validate connections before using them
    pool_pre_ping=True
)

# Using the connection pool
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)

def get_user(user_id):
    """
    Connection is automatically borrowed from pool and returned.
    """
    session = Session()
    try:
        result = session.execute(
            "SELECT * FROM users WHERE id = :id",
            {"id": user_id}
        )
        return result.fetchone()
    finally:
        session.close()  # Returns connection to pool
```

### Using mysql-connector-python

The official MySQL connector also supports pooling:

```python
import mysql.connector
from mysql.connector import pooling

# Create a connection pool
connection_pool = pooling.MySQLConnectionPool(
    pool_name="myapp_pool",
    pool_size=10,
    pool_reset_session=True,
    host='localhost',
    database='myapp',
    user='user',
    password='password',
    charset='utf8mb4'
)

def execute_query(query, params=None):
    """
    Get connection from pool, execute query, return to pool.
    """
    connection = connection_pool.get_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params)
        result = cursor.fetchall()
        cursor.close()
        return result
    finally:
        connection.close()  # Returns to pool, not actually closed

# Usage
users = execute_query("SELECT * FROM users WHERE active = %s", (True,))
```

## Connection Pooling in Node.js

### Using mysql2

```javascript
const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'myapp',
    charset: 'utf8mb4',

    // Pool configuration
    connectionLimit: 10,      // Maximum connections in pool
    queueLimit: 0,            // Unlimited queue (0 = unlimited)
    waitForConnections: true, // Wait if no connections available

    // Connection configuration
    connectTimeout: 10000,    // 10 seconds
    acquireTimeout: 10000,    // 10 seconds to acquire connection

    // Keep connections alive
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Using the pool with async/await
async function getUser(userId) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        return rows[0];
    } finally {
        connection.release(); // Return connection to pool
    }
}

// Or use pool.execute() directly (auto-releases)
async function getUserSimple(userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
    );
    return rows[0];
}

// Monitor pool status
function logPoolStatus() {
    console.log('Pool status:', {
        total: pool.pool._allConnections.length,
        free: pool.pool._freeConnections.length,
        queued: pool.pool._connectionQueue.length
    });
}
```

## Connection Pooling in Java

### Using HikariCP

HikariCP is the fastest and most reliable connection pool for Java:

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class DatabasePool {
    private static HikariDataSource dataSource;

    static {
        HikariConfig config = new HikariConfig();

        // Basic connection settings
        config.setJdbcUrl("jdbc:mysql://localhost:3306/myapp");
        config.setUsername("user");
        config.setPassword("password");

        // Pool sizing
        config.setMinimumIdle(5);
        config.setMaximumPoolSize(20);

        // Timeouts
        config.setConnectionTimeout(30000);    // 30 seconds
        config.setIdleTimeout(600000);         // 10 minutes
        config.setMaxLifetime(1800000);        // 30 minutes

        // Connection validation
        config.setConnectionTestQuery("SELECT 1");

        // Performance settings
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");

        dataSource = new HikariDataSource(config);
    }

    public static User getUser(int userId) throws Exception {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "SELECT * FROM users WHERE id = ?"
             )) {

            stmt.setInt(1, userId);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                return new User(
                    rs.getInt("id"),
                    rs.getString("name"),
                    rs.getString("email")
                );
            }
            return null;
        }
        // Connection automatically returned to pool
    }
}
```

## Pool Sizing Guidelines

Choosing the right pool size is critical. Too few connections cause bottlenecks, too many waste resources and can overwhelm the database.

```mermaid
graph TD
    subgraph "Pool Size Formula"
        F["connections = (core_count * 2) + effective_spindle_count"]
    end

    subgraph "Example Calculations"
        E1["4 cores, SSD: (4 * 2) + 1 = 9-10 connections"]
        E2["8 cores, SSD: (8 * 2) + 1 = 17-20 connections"]
        E3["16 cores, RAID: (16 * 2) + 4 = 36-40 connections"]
    end

    F --> E1
    F --> E2
    F --> E3
```

### Practical Recommendations

```python
# Calculate optimal pool size
def calculate_pool_size(cpu_cores, storage_type='ssd'):
    """
    Calculate recommended connection pool size.

    For SSDs, effective_spindle_count is typically 1.
    For HDDs, use the actual number of drives.
    """
    effective_spindles = 1 if storage_type == 'ssd' else 4
    optimal = (cpu_cores * 2) + effective_spindles

    return {
        'minimum': max(5, optimal // 2),
        'optimal': optimal,
        'maximum': optimal * 2
    }

# Example
print(calculate_pool_size(8, 'ssd'))
# {'minimum': 8, 'optimal': 17, 'maximum': 34}
```

## Monitoring Connection Pools

### MySQL Server Monitoring

```sql
-- Current connection status
SELECT
    USER,
    COUNT(*) as connection_count,
    SUM(IF(COMMAND = 'Sleep', 1, 0)) as idle_connections,
    SUM(IF(COMMAND != 'Sleep', 1, 0)) as active_connections
FROM information_schema.PROCESSLIST
GROUP BY USER;

-- Connection statistics
SHOW STATUS LIKE 'Connections';      -- Total connection attempts
SHOW STATUS LIKE 'Threads_connected'; -- Current open connections
SHOW STATUS LIKE 'Threads_running';   -- Currently executing queries
SHOW STATUS LIKE 'Aborted_connects';  -- Failed connection attempts
```

### Application-Level Monitoring

```python
from sqlalchemy import event
from sqlalchemy.pool import Pool
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('pool_monitor')

@event.listens_for(Pool, "checkout")
def on_checkout(dbapi_conn, connection_record, connection_proxy):
    logger.debug("Connection checked out from pool")

@event.listens_for(Pool, "checkin")
def on_checkin(dbapi_conn, connection_record):
    logger.debug("Connection returned to pool")

@event.listens_for(Pool, "connect")
def on_connect(dbapi_conn, connection_record):
    logger.info("New connection created")

@event.listens_for(Pool, "invalidate")
def on_invalidate(dbapi_conn, connection_record, exception):
    logger.warning(f"Connection invalidated: {exception}")

# Periodic pool statistics
def log_pool_stats(engine):
    pool = engine.pool
    logger.info(f"Pool size: {pool.size()}, "
                f"Checked out: {pool.checkedout()}, "
                f"Overflow: {pool.overflow()}")
```

## Common Pitfalls and Solutions

### Connection Leaks

Always ensure connections are returned to the pool:

```python
# BAD: Connection leak
def bad_query():
    conn = pool.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    return cursor.fetchall()
    # Connection never returned!

# GOOD: Use context managers or try/finally
def good_query():
    conn = pool.get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        return cursor.fetchall()
    finally:
        conn.close()  # Always returns to pool
```

### Stale Connections

Enable connection validation to handle stale connections:

```python
# SQLAlchemy - enable pre-ping
engine = create_engine(
    connection_string,
    pool_pre_ping=True  # Validates connection before use
)

# Or set connection recycling
engine = create_engine(
    connection_string,
    pool_recycle=3600  # Recycle connections after 1 hour
)
```

## Best Practices Summary

1. **Size pools appropriately** using the formula: `(cores * 2) + spindles`
2. **Enable connection validation** to detect stale connections
3. **Set reasonable timeouts** for connection acquisition and idle connections
4. **Monitor pool metrics** to detect leaks and sizing issues
5. **Use connection recycling** to prevent issues with long-lived connections
6. **Always return connections** using try/finally or context managers
7. **Match pool size to MySQL limits** to prevent connection refused errors

Connection pooling is essential for any production application using MySQL. With proper configuration, you can dramatically reduce latency, improve throughput, and make your application more resilient under load.
