# How to Prevent Runaway Queries with Statement Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Timeout, Query Optimization, Database Administration, Reliability

Description: Learn how to configure PostgreSQL statement timeouts to prevent runaway queries from consuming resources, with practical examples for different application patterns.

---

A single bad query can bring down your database. A missing WHERE clause, an accidental Cartesian join, or a poorly planned query can consume all available connections and CPU. Statement timeouts are your safety net, automatically killing queries that run too long.

## Understanding Timeout Settings

PostgreSQL has three main timeout settings:

| Setting | Scope | Purpose |
|---------|-------|---------|
| statement_timeout | Per statement | Maximum query execution time |
| lock_timeout | Per statement | Maximum time waiting for locks |
| idle_in_transaction_session_timeout | Per session | Kill idle transactions |

```sql
-- Check current settings
SHOW statement_timeout;
SHOW lock_timeout;
SHOW idle_in_transaction_session_timeout;
```

## Configuring Statement Timeout

### Server-Wide Default

Set in `postgresql.conf` for all connections:

```ini
# postgresql.conf
statement_timeout = '30s'  # Kill queries after 30 seconds
```

Reload configuration:

```bash
# Reload without restart
sudo systemctl reload postgresql

# Or from SQL
SELECT pg_reload_conf();
```

### Per-Database Settings

Different databases may need different limits:

```sql
-- Web application database needs fast queries
ALTER DATABASE webapp SET statement_timeout = '10s';

-- Analytics database allows longer queries
ALTER DATABASE analytics SET statement_timeout = '5min';

-- Verify
SELECT datname, datconfig
FROM pg_database
WHERE datname IN ('webapp', 'analytics');
```

### Per-User Settings

Set timeouts based on user role:

```sql
-- Application user gets short timeout
ALTER ROLE app_user SET statement_timeout = '10s';

-- Admin user gets longer timeout for maintenance
ALTER ROLE admin_user SET statement_timeout = '30min';

-- Report user for analytical queries
ALTER ROLE report_user SET statement_timeout = '5min';

-- Verify
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname IN ('app_user', 'admin_user', 'report_user');
```

### Session-Level Settings

Override for the current session:

```sql
-- Set for this session only
SET statement_timeout = '5s';

-- Set for this transaction only
SET LOCAL statement_timeout = '60s';
```

## Timeout in Application Code

### Python with psycopg2

```python
import psycopg2

# Set timeout in connection string
conn = psycopg2.connect(
    "host=localhost dbname=myapp user=appuser "
    "options='-c statement_timeout=10000'"  # 10 seconds in ms
)

# Or set per-query
cursor = conn.cursor()
cursor.execute("SET statement_timeout = '5s'")
cursor.execute("SELECT * FROM large_table WHERE complex_condition")
```

### Node.js with pg

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'myapp',
    user: 'appuser',
    // Set default timeout for all queries
    statement_timeout: 10000  // 10 seconds
});

// Or per-query
async function queryWithTimeout(sql, timeout) {
    const client = await pool.connect();
    try {
        await client.query(`SET statement_timeout = '${timeout}ms'`);
        return await client.query(sql);
    } finally {
        client.release();
    }
}
```

### Java with JDBC

```java
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

// Set in connection URL
String url = "jdbc:postgresql://localhost/myapp?options=-c%20statement_timeout=10000";

// Or programmatically
try (Connection conn = DriverManager.getConnection(url);
     Statement stmt = conn.createStatement()) {
    stmt.execute("SET statement_timeout = '10s'");
    ResultSet rs = stmt.executeQuery("SELECT * FROM large_table");
}
```

## Lock Timeout

Prevent queries from waiting forever for locks:

```sql
-- Wait maximum 5 seconds for locks
SET lock_timeout = '5s';

BEGIN;
-- This will fail after 5 seconds if the lock is held
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
COMMIT;
```

When lock timeout triggers:

```
ERROR: canceling statement due to lock timeout
```

Combined with statement timeout for comprehensive protection:

```sql
SET statement_timeout = '30s';    -- Total execution time
SET lock_timeout = '5s';          -- Lock acquisition time

-- Now protected from both slow queries and lock contention
UPDATE orders SET status = 'processed' WHERE id = 1;
```

## Idle Transaction Timeout

Kill sessions that start a transaction and forget to commit:

```sql
-- Kill transactions idle for more than 5 minutes
ALTER SYSTEM SET idle_in_transaction_session_timeout = '5min';
SELECT pg_reload_conf();
```

This prevents transactions from holding locks indefinitely and blocking vacuum.

## Handling Timeouts in Applications

### Catching Timeout Errors

```python
import psycopg2
from psycopg2 import errors

try:
    cursor.execute("SELECT * FROM slow_query")
except errors.QueryCanceled as e:
    # Statement timeout triggered
    logger.warning(f"Query timed out: {e}")
    # Implement retry logic or return cached data
except errors.LockNotAvailable as e:
    # Lock timeout triggered
    logger.warning(f"Could not acquire lock: {e}")
    # Retry after delay
```

### Retry Pattern

```python
import time
from functools import wraps

def retry_on_timeout(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except errors.QueryCanceled:
                    if attempt < max_retries - 1:
                        time.sleep(delay * (attempt + 1))
                    else:
                        raise
        return wrapper
    return decorator

@retry_on_timeout(max_retries=3)
def get_report_data(conn, report_id):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
    return cursor.fetchall()
```

## Monitoring Timed-Out Queries

### Check for Cancelled Queries

```sql
-- View recent query cancellations in logs
-- Enable in postgresql.conf:
-- log_min_error_statement = error

-- Then check logs for:
-- ERROR: canceling statement due to statement timeout
```

### Track with pg_stat_statements

```sql
-- Queries that might be timing out (high max time)
SELECT
    substring(query, 1, 60) AS query_preview,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(max_exec_time::numeric, 2) AS max_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
WHERE max_exec_time > 10000  -- Over 10 seconds
ORDER BY max_exec_time DESC
LIMIT 20;
```

### Alert on Timeouts

```sql
-- Create a function to log timeouts
CREATE OR REPLACE FUNCTION log_timeout()
RETURNS event_trigger AS $$
BEGIN
    IF sqlerrm LIKE '%statement timeout%' THEN
        INSERT INTO timeout_log (query, occurred_at)
        VALUES (current_query(), now());
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## Different Timeouts for Different Operations

### Web Requests vs Background Jobs

```yaml
# Connection pool for web requests
web_pool:
  statement_timeout: 5s
  lock_timeout: 2s
  max_connections: 50

# Connection pool for background jobs
job_pool:
  statement_timeout: 5min
  lock_timeout: 30s
  max_connections: 10
```

### Read vs Write Operations

```python
class DatabasePool:
    def __init__(self):
        self.read_pool = create_pool(statement_timeout=5000)
        self.write_pool = create_pool(statement_timeout=30000)

    def read(self, query):
        with self.read_pool.connection() as conn:
            return conn.execute(query)

    def write(self, query):
        with self.write_pool.connection() as conn:
            return conn.execute(query)
```

## Per-Query Timeout Wrapper

```sql
-- Create a function that wraps queries with timeout
CREATE OR REPLACE FUNCTION execute_with_timeout(
    query_text text,
    timeout_ms integer
) RETURNS SETOF record AS $$
DECLARE
    original_timeout text;
BEGIN
    -- Save original timeout
    original_timeout := current_setting('statement_timeout');

    -- Set new timeout
    EXECUTE format('SET LOCAL statement_timeout = %L', timeout_ms || 'ms');

    -- Execute query
    RETURN QUERY EXECUTE query_text;

    -- Restore original (LOCAL settings reset at transaction end anyway)
EXCEPTION
    WHEN query_canceled THEN
        RAISE EXCEPTION 'Query exceeded timeout of % ms', timeout_ms;
END;
$$ LANGUAGE plpgsql;
```

## Recommended Settings

### OLTP Workload (Web Application)

```ini
# postgresql.conf
statement_timeout = '10s'
lock_timeout = '5s'
idle_in_transaction_session_timeout = '1min'
```

### Mixed Workload

```sql
-- Web application database
ALTER DATABASE webapp SET statement_timeout = '10s';

-- Same database, reporting user
ALTER ROLE report_user SET statement_timeout = '5min';
```

### Analytics Workload

```ini
# postgresql.conf
statement_timeout = '10min'
lock_timeout = '30s'
idle_in_transaction_session_timeout = '30min'
```

## Testing Timeouts

```sql
-- Test statement timeout
SET statement_timeout = '1s';

-- This will be cancelled after 1 second
SELECT pg_sleep(5);
-- ERROR: canceling statement due to statement timeout

-- Test lock timeout
SET lock_timeout = '1s';

-- In session 1:
BEGIN;
SELECT * FROM test_table FOR UPDATE;

-- In session 2:
SELECT * FROM test_table FOR UPDATE;  -- Will timeout after 1 second
```

---

Statement timeouts are your first line of defense against runaway queries. Start with conservative defaults for application users, allow longer timeouts for administrative tasks, and implement proper error handling in your application code. Combined with query monitoring, timeouts help maintain database stability without manual intervention.
