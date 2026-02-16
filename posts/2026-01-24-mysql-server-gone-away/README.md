# How to Fix 'Server Has Gone Away' Errors in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Troubleshooting, Connection, Timeout, DevOps

Description: Learn how to diagnose and fix MySQL 'Server has gone away' errors caused by timeouts, packet size limits, and connection issues.

---

The dreaded "MySQL server has gone away" error is one of the most common issues developers face when working with MySQL databases. This error occurs when the connection between your application and MySQL is unexpectedly terminated. Let's explore the causes and solutions systematically.

## Understanding the Error

```mermaid
sequenceDiagram
    participant App as Application
    participant Conn as Connection Pool
    participant MySQL as MySQL Server

    App->>Conn: Request connection
    Conn->>MySQL: Establish connection
    MySQL-->>Conn: Connection OK
    Note over App,MySQL: Time passes...
    App->>Conn: Execute query
    Conn->>MySQL: Send query
    MySQL--xConn: Connection closed
    Conn-->>App: Error: Server has gone away
```

The error message `MySQL server has gone away` (error code 2006) or `Lost connection to MySQL server during query` (error code 2013) indicates that the MySQL server closed the connection. This typically happens due to:

1. Connection timeout exceeded
2. Packet size too large
3. Server restart or crash
4. Network issues
5. Connection killed by administrator

## Quick Diagnosis

First, identify which cause applies to your situation:

```sql
-- Check current timeout settings
SHOW VARIABLES LIKE 'wait_timeout';
SHOW VARIABLES LIKE 'interactive_timeout';
SHOW VARIABLES LIKE 'max_allowed_packet';
SHOW VARIABLES LIKE 'net_read_timeout';
SHOW VARIABLES LIKE 'net_write_timeout';

-- Check server uptime (did it restart?)
SHOW STATUS LIKE 'Uptime';

-- Check for aborted connections
SHOW STATUS LIKE 'Aborted_connects';
SHOW STATUS LIKE 'Aborted_clients';
```

## Cause 1: Connection Timeout

The most common cause. MySQL closes idle connections after `wait_timeout` seconds (default: 28800 seconds or 8 hours).

### Solution: Increase Timeout Values

Edit your MySQL configuration file (`my.cnf` or `my.ini`):

```ini
[mysqld]
# Timeout for non-interactive connections (applications)
wait_timeout = 28800

# Timeout for interactive connections (mysql client)
interactive_timeout = 28800

# Timeout for reading from connection
net_read_timeout = 60

# Timeout for writing to connection
net_write_timeout = 120
```

Restart MySQL after changes:

```bash
# Linux with systemd
sudo systemctl restart mysql

# Or using service command
sudo service mysql restart
```

### Solution: Implement Connection Pooling with Reconnect

Better than increasing timeouts is handling reconnection in your application.

**Python with SQLAlchemy:**

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Create engine with connection pool and pre-ping
engine = create_engine(
    "mysql+pymysql://user:password@localhost/database",
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,  # Recycle connections every 30 minutes
    pool_pre_ping=True  # Test connection before using
)
```

**Node.js with mysql2:**

```javascript
const mysql = require('mysql2/promise');

// Create pool with automatic reconnection
const pool = mysql.createPool({
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'mydb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000 // 10 seconds
});

// Wrapper function with retry logic
async function queryWithRetry(sql, params, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            if (error.code === 'PROTOCOL_CONNECTION_LOST' && i < retries - 1) {
                console.log('Connection lost, retrying...');
                continue;
            }
            throw error;
        }
    }
}
```

**PHP with PDO:**

```php
<?php
class DatabaseConnection {
    private $pdo;
    private $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_PERSISTENT => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];

    public function __construct($dsn, $user, $pass) {
        $this->dsn = $dsn;
        $this->user = $user;
        $this->pass = $pass;
        $this->connect();
    }

    private function connect() {
        $this->pdo = new PDO($this->dsn, $this->user, $this->pass, $this->options);
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            // Check if connection was lost
            if ($e->getCode() == 'HY000' || strpos($e->getMessage(), 'gone away') !== false) {
                $this->connect();  // Reconnect
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($params);
                return $stmt;
            }
            throw $e;
        }
    }
}
```

## Cause 2: Packet Size Too Large

MySQL has a maximum packet size limit. If your query or data exceeds this, the connection closes.

```mermaid
flowchart TD
    A[Application sends large query] --> B{Packet size check}
    B -->|Size <= max_allowed_packet| C[Query executes]
    B -->|Size > max_allowed_packet| D[Connection terminated]
    D --> E[Server has gone away]
```

### Solution: Increase max_allowed_packet

Check current value:

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
-- Default is often 4MB or 16MB
```

Increase in configuration:

```ini
[mysqld]
# Increase to 64MB or higher based on your needs
max_allowed_packet = 64M
```

Or set dynamically (temporary, until restart):

```sql
SET GLOBAL max_allowed_packet = 67108864;  -- 64MB
```

### Solution: Chunk Large Data Operations

Instead of sending huge packets, break them into smaller chunks:

```python
def insert_large_data(connection, data_list, chunk_size=1000):
    """Insert data in chunks to avoid packet size issues."""
    for i in range(0, len(data_list), chunk_size):
        chunk = data_list[i:i + chunk_size]

        # Build batch insert
        placeholders = ', '.join(['(%s, %s, %s)'] * len(chunk))
        flat_values = [val for row in chunk for val in row]

        query = f"INSERT INTO my_table (col1, col2, col3) VALUES {placeholders}"

        cursor = connection.cursor()
        cursor.execute(query, flat_values)
        connection.commit()

        print(f"Inserted rows {i} to {i + len(chunk)}")
```

## Cause 3: Long Running Queries

Queries that take too long can exceed network timeouts.

### Solution: Increase Network Timeouts

```ini
[mysqld]
net_read_timeout = 300
net_write_timeout = 600
```

### Solution: Optimize or Break Up Long Queries

```sql
-- Instead of one massive update
-- UPDATE large_table SET status = 'processed' WHERE created_at < '2025-01-01';

-- Break into batches
UPDATE large_table
SET status = 'processed'
WHERE created_at < '2025-01-01'
AND status != 'processed'
LIMIT 10000;

-- Repeat until no rows affected
```

## Cause 4: Connection Killed or Server Restarted

Check if connections are being killed:

```sql
-- Check process list
SHOW PROCESSLIST;

-- Check for killed connections in error log
-- Location: /var/log/mysql/error.log
```

### Solution: Monitor and Alert

Set up monitoring for MySQL availability:

```bash
#!/bin/bash
# Simple MySQL health check script

MYSQL_HOST="localhost"
MYSQL_USER="monitor"
MYSQL_PASS="secure_password"

if ! mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" --silent; then
    echo "MySQL is down or unreachable!"
    # Send alert (email, Slack, PagerDuty, etc.)
fi
```

## Complete Configuration Example

Here is a production-ready MySQL configuration addressing connection stability:

```ini
[mysqld]
# Connection settings
max_connections = 500
wait_timeout = 28800
interactive_timeout = 28800

# Packet and buffer sizes
max_allowed_packet = 64M
net_buffer_length = 32K

# Network timeouts
net_read_timeout = 60
net_write_timeout = 120
connect_timeout = 10

# Keep connections alive
skip-name-resolve = 1

# Logging for troubleshooting
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

## Application-Level Best Practices

```mermaid
flowchart LR
    A[Application] --> B[Connection Pool]
    B --> C{Health Check}
    C -->|Healthy| D[Execute Query]
    C -->|Unhealthy| E[Create New Connection]
    E --> D
    D --> F{Success?}
    F -->|Yes| G[Return Result]
    F -->|No - Gone Away| H[Retry with New Connection]
    H --> D
```

Follow these best practices in your application:

1. **Use connection pooling** - Never create a new connection for each query
2. **Enable connection health checks** - Test connections before use (pre-ping)
3. **Set appropriate pool recycling** - Recycle connections before server timeout
4. **Implement retry logic** - Automatically retry on connection loss
5. **Handle errors gracefully** - Catch specific MySQL errors and respond appropriately

## Troubleshooting Checklist

When you encounter "Server has gone away":

- [ ] Check MySQL error log for crashes or restarts
- [ ] Verify `wait_timeout` is appropriate for your application
- [ ] Check `max_allowed_packet` against your query sizes
- [ ] Review network timeouts for long-running queries
- [ ] Ensure connection pooling is configured correctly
- [ ] Verify no firewall or proxy is killing idle connections
- [ ] Check if queries are being killed manually or by query governor

---

The "Server has gone away" error is usually caused by timeouts or packet size limits. Start by checking your timeout settings and query sizes, then implement proper connection pooling with health checks. With the right configuration and application-level handling, you can eliminate these errors entirely.
