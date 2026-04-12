# How to Handle Connection Timeouts in MySQL Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, Timeout, Driver, Configuration

Description: Learn how to configure and handle connection timeouts in MySQL drivers to build resilient applications that gracefully recover from network issues.

---

## Overview

Connection timeouts in MySQL drivers occur when the application cannot establish or maintain a connection within the configured time limit. Proper timeout configuration prevents applications from hanging indefinitely and enables faster failure detection and recovery.

## Types of MySQL Timeouts

MySQL has several distinct timeout settings that work together:

```sql
-- View current server-side timeout settings
SHOW VARIABLES LIKE '%timeout%';
```

Key timeout variables:

```text
connect_timeout         = 10    -- Seconds for initial TCP connection
wait_timeout            = 28800 -- Seconds before idle connection is closed
interactive_timeout     = 28800 -- Same but for interactive sessions
net_read_timeout        = 30    -- Seconds to wait for data from client
net_write_timeout       = 60    -- Seconds to wait when sending data
```

## Configuring Timeouts in mysql2 (Node.js)

```javascript
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  // Time to wait for initial connection (ms)
  connectTimeout: 10000,
  // Keep connections alive to avoid wait_timeout expiry
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

pool.on('error', (err) => {
  if (err.code === 'PROTOCOL_CONNECTION_LOST' ||
      err.code === 'ECONNRESET') {
    console.error('Connection lost:', err.message);
    // Pool will automatically create a new connection
  }
});
```

## Configuring Timeouts in Python (mysql-connector-python)

```python
import mysql.connector
from mysql.connector import pooling

config = {
    'host': 'localhost',
    'user': 'app_user',
    'password': 'secure_password',
    'database': 'myapp',
    'connection_timeout': 10,      # seconds to establish connection
    'pool_size': 5,
    'pool_reset_session': True
}

cnx_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="mypool",
    **config
)

try:
    cnx = cnx_pool.get_connection()
    cursor = cnx.cursor()
    cursor.execute("SELECT 1")
except mysql.connector.errors.InterfaceError as e:
    print(f"Timeout or connection error: {e}")
finally:
    if 'cnx' in locals() and cnx.is_connected():
        cnx.close()
```

## Configuring Timeouts in Java (JDBC)

```java
import java.util.Properties;
import java.sql.Connection;
import java.sql.DriverManager;

Properties props = new Properties();
props.setProperty("user", "app_user");
props.setProperty("password", "secure_password");

// Connection socket timeout (milliseconds)
props.setProperty("connectTimeout", "10000");
// Socket read timeout (milliseconds)
props.setProperty("socketTimeout", "30000");
// Auto-reconnect on stale connection
props.setProperty("autoReconnect", "false"); // Use connection validation instead

Connection conn = DriverManager.getConnection(
    "jdbc:mysql://localhost:3306/myapp", props
);
```

## Using Connection Validation to Detect Stale Connections

Rather than relying on reconnect flags, validate connections before use:

```javascript
// With mysql2, use ping to verify connection health
pool.getConnection((err, connection) => {
  if (err) throw err;

  connection.ping((pingErr) => {
    if (pingErr) {
      connection.destroy();
      // Get a fresh connection
      return;
    }
    // Connection is healthy, proceed
    connection.release();
  });
});
```

## Setting Statement-Level Timeouts

For individual query timeouts, use the `MAX_EXECUTION_TIME` optimizer hint:

```sql
-- Timeout query after 5 seconds (5000 ms)
SELECT /*+ MAX_EXECUTION_TIME(5000) */ *
FROM large_table
WHERE status = 'pending';
```

## Summary

Handling connection timeouts properly requires configuring both client-side driver timeouts (`connectTimeout`, `socketTimeout`) and understanding server-side variables like `wait_timeout`. The most resilient approach uses connection pool health checks to detect stale connections before they are used, rather than relying on auto-reconnect which can mask data integrity issues. Always set explicit timeouts at every layer - TCP connection, socket read/write, and query execution - to prevent your application from hanging indefinitely on database failures.
