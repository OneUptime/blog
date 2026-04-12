# How to Use DEALLOCATE PREPARE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Prepared Statement, Memory, Resource Management, Query

Description: Learn how and when to use DEALLOCATE PREPARE in MySQL to release prepared statement resources and avoid session-level memory leaks.

---

## What is DEALLOCATE PREPARE?

`DEALLOCATE PREPARE` releases a named prepared statement from the current session. It is the final step in the `PREPARE` / `EXECUTE` / `DEALLOCATE PREPARE` workflow. When you deallocate a prepared statement, MySQL frees the server-side memory used to store the compiled query plan.

The synonym `DROP PREPARE` is also accepted but `DEALLOCATE PREPARE` is the SQL standard form.

## Basic Syntax

```sql
DEALLOCATE PREPARE stmt_name;
-- or equivalently:
DROP PREPARE stmt_name;
```

## Complete Lifecycle Example

```sql
-- 1. Prepare: compile the query
PREPARE get_product FROM
  'SELECT id, name, price FROM products WHERE id = ?';

-- 2. Execute multiple times with different parameters
SET @pid = 1;
EXECUTE get_product USING @pid;

SET @pid = 2;
EXECUTE get_product USING @pid;

-- 3. Deallocate: free resources
DEALLOCATE PREPARE get_product;
```

## Why Deallocation Matters

Each prepared statement uses server memory to store the parsed query tree and execution plan. In long-running stored procedures or sessions that create many prepared statements, failing to deallocate leads to accumulating memory consumption.

```sql
DELIMITER //
CREATE PROCEDURE process_batch()
BEGIN
  PREPARE ins FROM 'INSERT INTO audit_log (event) VALUES (?)';

  SET @ev = 'start';
  EXECUTE ins USING @ev;

  -- ... do work ...

  SET @ev = 'end';
  EXECUTE ins USING @ev;

  -- Always deallocate at end of procedure
  DEALLOCATE PREPARE ins;
END//
DELIMITER ;
```

## Automatic Deallocation

MySQL automatically deallocates all prepared statements when a session ends. However, relying on this for cleanup in long-running application connections (like those in a connection pool) is risky - the session persists and accumulates statements.

## Checking Active Prepared Statements

Monitor active prepared statements per session with the Performance Schema:

```sql
SELECT
  OWNER_THREAD_ID,
  SQL_TEXT,
  COUNT_EXECUTE
FROM performance_schema.prepared_statements_instances;
```

A high and growing `COUNT_EXECUTE` on statements that should have been deallocated indicates a leak.

## Error When Executing After Deallocate

Attempting to execute a deallocated statement raises an error:

```sql
PREPARE stmt FROM 'SELECT 1';
DEALLOCATE PREPARE stmt;

-- This will error: Unknown prepared statement handler 'stmt'
EXECUTE stmt;
```

## Deallocating All Statements in a Procedure

A stored procedure that creates and uses multiple prepared statements should deallocate each one before it goes out of scope:

```sql
DELIMITER //
CREATE PROCEDURE dynamic_report(IN table_name VARCHAR(64))
BEGIN
  SET @q1 = CONCAT('SELECT COUNT(*) FROM ', table_name);
  SET @q2 = CONCAT('SELECT MAX(id) FROM ', table_name);

  PREPARE count_stmt FROM @q1;
  PREPARE max_stmt FROM @q2;

  EXECUTE count_stmt;
  EXECUTE max_stmt;

  DEALLOCATE PREPARE count_stmt;
  DEALLOCATE PREPARE max_stmt;
END//
DELIMITER ;
```

## Summary

`DEALLOCATE PREPARE` releases a named prepared statement and its associated server resources. Always deallocate prepared statements when you are finished with them, especially inside stored procedures. Skipping deallocation in connection-pool environments leads to gradual memory growth. Use `performance_schema.prepared_statements_instances` to monitor active statements and identify leaks.
