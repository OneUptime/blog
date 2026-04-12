# How to Use CONNECTION_ID() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CONNECTION_ID, Information Functions, Administration

Description: Learn how to use the CONNECTION_ID() function in MySQL to retrieve the current session's connection ID for debugging and process management.

---

## What is CONNECTION_ID()

MySQL's `CONNECTION_ID()` function returns the unique thread ID for the current client connection. Each connection to MySQL gets a unique integer connection ID that persists for the life of that connection.

The connection ID is the same value shown in `SHOW PROCESSLIST` in the `Id` column.

Syntax:

```sql
CONNECTION_ID()
```

## Basic Usage

```sql
SELECT CONNECTION_ID();
-- Output: 42 (varies per connection)
```

## Viewing the Current Connection in PROCESSLIST

```sql
-- See the current connection
SHOW PROCESSLIST;

-- Filter to current connection only
SELECT * FROM information_schema.processlist
WHERE id = CONNECTION_ID();
```

## Using CONNECTION_ID() for Debugging

Log the connection ID in application messages to trace queries back to a specific connection:

```sql
SELECT
  CONNECTION_ID() AS conn_id,
  USER() AS user,
  DATABASE() AS db,
  NOW() AS current_time;
```

## Killing a Stuck Query by Connection ID

Use the connection ID to kill a stuck query or connection:

```sql
-- Get connection ID of a slow query
SHOW PROCESSLIST;

-- Kill the query (not the connection)
KILL QUERY 42;

-- Kill the entire connection
KILL CONNECTION 42;
```

Or with a dynamic approach:

```sql
-- Store your connection ID for reference
SELECT CONNECTION_ID();
-- Note the returned value (e.g., 42), then in another session:
-- KILL QUERY 42;
```

## Storing Connection ID in Audit Logs

```sql
DELIMITER //
CREATE TRIGGER audit_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (
    event_type,
    record_id,
    connection_id,
    user_name,
    logged_at
  ) VALUES (
    'INSERT',
    NEW.id,
    CONNECTION_ID(),
    USER(),
    NOW()
  );
END //
DELIMITER ;
```

## Using Connection ID as a Lock Name

`CONNECTION_ID()` is perfect for generating unique lock names per connection:

```sql
-- Acquire a named lock unique to this connection
SELECT GET_LOCK(CONCAT('report_lock_', CONNECTION_ID()), 10);

-- Release it
SELECT RELEASE_LOCK(CONCAT('report_lock_', CONNECTION_ID()));
```

## Monitoring Active Connections

```sql
-- Count active connections
SELECT COUNT(*) FROM information_schema.processlist;

-- Find long-running queries
SELECT id, user, host, db, time, state, info
FROM information_schema.processlist
WHERE time > 60
ORDER BY time DESC;
```

## Connection ID in Performance Schema

```sql
SELECT
  processlist_id,
  processlist_user,
  processlist_host,
  processlist_db,
  processlist_command,
  processlist_time
FROM performance_schema.threads
WHERE processlist_id = CONNECTION_ID();
```

## Application Usage

In Python:

```python
cursor.execute("SELECT CONNECTION_ID()")
conn_id = cursor.fetchone()[0]
print(f"Connection ID: {conn_id}")
```

In Node.js:

```javascript
const [rows] = await conn.execute('SELECT CONNECTION_ID() AS conn_id');
console.log('Connection ID:', rows[0].conn_id);
```

## Summary

`CONNECTION_ID()` returns the unique numeric ID for the current MySQL connection, matching the ID shown in `SHOW PROCESSLIST`. It is useful for audit logging (recording which connection made a change), generating unique named locks per connection, debugging slow query issues, and killing specific connections or queries. The ID increments globally and wraps around after reaching the maximum value.
