# How to Fix 'database is being accessed by other users' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Connections, DROP DATABASE, Administration

Description: Learn how to fix 'database is being accessed by other users' errors in PostgreSQL. This guide covers how to identify and terminate active connections safely.

---

The error "database is being accessed by other users" occurs when you try to perform operations that require exclusive access to a database, such as DROP DATABASE, ALTER DATABASE, or certain maintenance operations. PostgreSQL refuses to proceed because other sessions are connected to the database. This guide shows you how to safely resolve this situation.

---

## Understanding the Error

When you see this error:

```sql
DROP DATABASE mydb;
-- ERROR: database "mydb" is being accessed by other users
-- DETAIL: There are 5 other sessions using the database.
```

It means there are active connections to the database that must be terminated before the operation can proceed.

---

## Check Active Connections

### View All Connections to the Database

```sql
-- See who is connected to the database
SELECT
    pid,
    usename AS username,
    application_name,
    client_addr AS ip_address,
    state,
    state_change,
    query_start,
    query
FROM pg_stat_activity
WHERE datname = 'mydb';
```

### Count Connections

```sql
-- Count connections by database
SELECT
    datname,
    count(*) AS connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY connections DESC;
```

---

## Solutions

### Solution 1: Terminate Connections and Drop Database

```sql
-- Step 1: Prevent new connections to the database
ALTER DATABASE mydb WITH ALLOW_CONNECTIONS = false;

-- Step 2: Terminate all existing connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb'
AND pid != pg_backend_pid();  -- Don't kill your own connection

-- Step 3: Drop the database
DROP DATABASE mydb;
```

### Solution 2: Force Disconnect with Single Query (PostgreSQL 13+)

```sql
-- PostgreSQL 13+ has DROP DATABASE ... FORCE option
DROP DATABASE mydb WITH (FORCE);

-- This automatically terminates all connections and drops the database
```

### Solution 3: Graceful Termination

```sql
-- First, send cancel request (graceful)
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb'
AND pid != pg_backend_pid();

-- Wait a moment for sessions to cancel
SELECT pg_sleep(2);

-- Then terminate any remaining connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb'
AND pid != pg_backend_pid();

-- Now drop the database
DROP DATABASE mydb;
```

### Solution 4: Shell Script for Automation

```bash
#!/bin/bash
# drop_database.sh - Safely drop a PostgreSQL database

DB_NAME="$1"
DB_HOST="${2:-localhost}"
DB_USER="${3:-postgres}"

if [ -z "$DB_NAME" ]; then
    echo "Usage: $0 <database_name> [host] [user]"
    exit 1
fi

echo "Terminating connections to $DB_NAME..."

psql -h "$DB_HOST" -U "$DB_USER" -d postgres <<EOF
-- Prevent new connections
ALTER DATABASE $DB_NAME WITH ALLOW_CONNECTIONS = false;

-- Terminate existing connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME';
EOF

echo "Dropping database $DB_NAME..."

psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE $DB_NAME;"

if [ $? -eq 0 ]; then
    echo "Database $DB_NAME dropped successfully."
else
    echo "Failed to drop database $DB_NAME."
    exit 1
fi
```

---

## Handling Specific Operations

### Renaming a Database

```sql
-- You cannot rename a database with active connections
ALTER DATABASE mydb RENAME TO mydb_new;
-- ERROR: database "mydb" is being accessed by other users

-- Solution: Terminate connections first
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb'
AND pid != pg_backend_pid();

-- Then rename
ALTER DATABASE mydb RENAME TO mydb_new;
```

### Changing Database Owner

```sql
-- This usually works even with connections
ALTER DATABASE mydb OWNER TO new_owner;

-- If it fails, terminate connections first
```

### Restoring Over Existing Database

```bash
# Option 1: Drop and recreate
psql -U postgres -d postgres -c "DROP DATABASE mydb WITH (FORCE);"
createdb -U postgres mydb
pg_restore -U postgres -d mydb backup.dump

# Option 2: Restore to new database, then swap
createdb -U postgres mydb_new
pg_restore -U postgres -d mydb_new backup.dump
# Then rename (after terminating connections to mydb)
psql -U postgres -d postgres -c "DROP DATABASE mydb WITH (FORCE);"
psql -U postgres -d postgres -c "ALTER DATABASE mydb_new RENAME TO mydb;"
```

---

## Identifying Connection Sources

### Find Long-Running Connections

```sql
-- Connections open for more than 1 hour
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    backend_start,
    NOW() - backend_start AS connection_duration,
    state,
    query
FROM pg_stat_activity
WHERE datname = 'mydb'
AND backend_start < NOW() - INTERVAL '1 hour'
ORDER BY backend_start;
```

### Find Idle Connections

```sql
-- Idle connections that can likely be terminated
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    NOW() - state_change AS idle_duration
FROM pg_stat_activity
WHERE datname = 'mydb'
AND state = 'idle'
ORDER BY state_change;
```

### Find Connections by Application

```sql
-- Group connections by application
SELECT
    application_name,
    count(*) AS connection_count,
    array_agg(DISTINCT client_addr) AS ip_addresses
FROM pg_stat_activity
WHERE datname = 'mydb'
GROUP BY application_name
ORDER BY connection_count DESC;
```

---

## Preventing Connection Issues

### Set Connection Limits

```sql
-- Limit connections to a database
ALTER DATABASE mydb CONNECTION LIMIT 50;

-- Remove limit
ALTER DATABASE mydb CONNECTION LIMIT -1;

-- Limit connections for a user
ALTER ROLE myuser CONNECTION LIMIT 10;
```

### Configure Idle Session Timeout

```ini
# postgresql.conf (PostgreSQL 14+)
idle_session_timeout = '30min'  # Disconnect idle sessions after 30 minutes

# For idle in transaction
idle_in_transaction_session_timeout = '10min'
```

### Application-Level Connection Management

```python
# Python: Properly close connections
import psycopg2
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")
    try:
        yield conn
    finally:
        conn.close()  # Always close the connection

# Usage
with get_db_connection() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users")
        results = cur.fetchall()
# Connection automatically closed
```

---

## Safe Termination Practices

### Check Query Status Before Terminating

```sql
-- Check what queries are running before terminating
SELECT
    pid,
    usename,
    application_name,
    state,
    query_start,
    NOW() - query_start AS query_duration,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = 'mydb'
AND state != 'idle';

-- Terminate only idle connections first
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb'
AND state = 'idle'
AND pid != pg_backend_pid();
```

### Notify Users Before Terminating

```sql
-- Create a function to notify before termination
CREATE OR REPLACE FUNCTION notify_and_terminate(target_db TEXT, wait_seconds INT)
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- Send notice to all connections
    FOR r IN
        SELECT pid FROM pg_stat_activity
        WHERE datname = target_db AND pid != pg_backend_pid()
    LOOP
        -- PostgreSQL doesn't have a built-in notify for connections
        -- But you can log it
        RAISE NOTICE 'Will terminate PID % in % seconds', r.pid, wait_seconds;
    END LOOP;

    -- Wait
    PERFORM pg_sleep(wait_seconds);

    -- Terminate
    PERFORM pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = target_db AND pid != pg_backend_pid();
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT notify_and_terminate('mydb', 30);
```

---

## pg_cancel_backend vs pg_terminate_backend

| Function | Effect | Use Case |
|----------|--------|----------|
| `pg_cancel_backend(pid)` | Cancels current query | Graceful, allows cleanup |
| `pg_terminate_backend(pid)` | Kills connection | Forceful, immediate |

```sql
-- Graceful: Cancel query but keep connection open
SELECT pg_cancel_backend(12345);

-- Forceful: Terminate connection entirely
SELECT pg_terminate_backend(12345);

-- Recommended approach: Cancel first, then terminate
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb' AND state = 'active';

SELECT pg_sleep(5);  -- Give time to cancel

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mydb';
```

---

## Automation Script

```sql
-- Create a function to safely drop a database
CREATE OR REPLACE FUNCTION safe_drop_database(db_name TEXT)
RETURNS void AS $$
DECLARE
    connection_count INT;
BEGIN
    -- Check if database exists
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = db_name) THEN
        RAISE EXCEPTION 'Database % does not exist', db_name;
    END IF;

    -- Prevent new connections
    EXECUTE format('ALTER DATABASE %I WITH ALLOW_CONNECTIONS = false', db_name);

    -- Count and terminate existing connections
    SELECT count(*) INTO connection_count
    FROM pg_stat_activity
    WHERE datname = db_name;

    IF connection_count > 0 THEN
        RAISE NOTICE 'Terminating % connections to %', connection_count, db_name;

        PERFORM pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = db_name;

        -- Wait for connections to close
        PERFORM pg_sleep(2);
    END IF;

    -- Drop the database
    EXECUTE format('DROP DATABASE %I', db_name);

    RAISE NOTICE 'Database % dropped successfully', db_name;
END;
$$ LANGUAGE plpgsql;

-- Usage (must be run from a different database, like postgres)
SELECT safe_drop_database('mydb');
```

---

## Conclusion

The "database is being accessed by other users" error is resolved by:

1. **Identify connections** using `pg_stat_activity`
2. **Prevent new connections** with `ALTER DATABASE ... ALLOW_CONNECTIONS = false`
3. **Terminate existing connections** with `pg_terminate_backend()`
4. **Perform your operation** (DROP, RENAME, etc.)
5. **Use FORCE option** (PostgreSQL 13+) for one-step solution

Always check what queries are running before terminating connections to avoid data loss or corruption.

---

*Need to monitor your PostgreSQL connections? [OneUptime](https://oneuptime.com) provides real-time connection monitoring with alerts for connection spikes, idle session buildup, and database access patterns.*
