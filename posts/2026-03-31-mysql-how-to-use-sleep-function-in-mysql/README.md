# How to Use SLEEP() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SLEEP Function, Testing, SQL Functions

Description: Learn how to use the SLEEP() function in MySQL to pause execution for a specified number of seconds, useful for testing timeouts and simulating delays.

---

## What is SLEEP()

MySQL's `SLEEP()` function pauses execution for a specified number of seconds. It returns 0 if it sleeps for the full duration, or 1 if the sleep was interrupted (e.g., the query was killed).

Syntax:

```sql
SLEEP(seconds)
```

The `seconds` argument can be a float (e.g., 0.5 for 500 milliseconds).

## Basic Usage

```sql
SELECT SLEEP(1);       -- Pauses for 1 second, returns 0
SELECT SLEEP(0.5);     -- Pauses for 500 milliseconds
SELECT SLEEP(0);       -- Returns immediately
```

Return values:

```sql
-- If the sleep completes:
SELECT SLEEP(2);  -- Returns: 0

-- If the query is killed during sleep:
-- Returns: 1
```

## Testing Query Timeouts

`SLEEP()` is useful for testing timeout settings:

```sql
-- Test wait_timeout behavior
SELECT SLEEP(5), 'Timeout test' AS description;
```

To test `MAX_EXECUTION_TIME`:

```sql
SELECT /*+ MAX_EXECUTION_TIME(2000) */ SLEEP(10);
-- Will be killed after 2 seconds (2000ms)
```

## Simulating Slow Queries for Testing

When testing monitoring tools, lock detection, or PROCESSLIST behavior:

```sql
-- This will appear in SHOW PROCESSLIST for 30 seconds
SELECT SLEEP(30) AS slow_query_simulation;
```

In another session:

```sql
SHOW PROCESSLIST;
-- Shows the sleeping query with its connection ID and time
```

## SLEEP() in Stored Procedures

Useful for retry logic with delays:

```sql
DELIMITER //
CREATE PROCEDURE retry_with_delay(IN max_attempts INT)
BEGIN
  DECLARE attempts INT DEFAULT 0;
  DECLARE result_found INT DEFAULT 0;

  WHILE attempts < max_attempts AND result_found = 0 DO
    -- Try to acquire a lock or check a condition
    SELECT GET_LOCK('my_resource', 0) INTO result_found;

    IF result_found = 0 THEN
      DO SLEEP(0.5);  -- Wait 500ms before retry
      SET attempts = attempts + 1;
    END IF;
  END WHILE;

  IF result_found = 1 THEN
    SELECT 'Lock acquired' AS status;
    DO RELEASE_LOCK('my_resource');
  ELSE
    SELECT 'Failed to acquire lock' AS status;
  END IF;
END //
DELIMITER ;
```

## SLEEP() as a Scheduling Workaround

Note: For real scheduling needs, use MySQL Events. SLEEP() is not suitable for production scheduling.

```sql
-- Example Event (preferred over SLEEP loops)
CREATE EVENT cleanup_old_sessions
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM sessions WHERE expires_at < NOW();
```

## Using SLEEP() to Test Replication Lag

```sql
-- On the primary (statement-based replication):
-- Use SLEEP() in a DML so it gets written to the binary log
UPDATE test_table SET updated_at = NOW() WHERE id = 1 AND SLEEP(10) >= 0;

-- On the replica, check replication lag:
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master increases as the replica replays the SLEEP()
```

## Killing a SLEEP() Query

```sql
-- In one session:
SELECT SLEEP(60);  -- Connection ID: 42

-- In another session:
KILL QUERY 42;     -- Returns 1 to the SLEEP() call
-- Or kill the connection:
KILL CONNECTION 42;
```

## SLEEP() Security Considerations

`SLEEP()` can be used in blind SQL injection attacks to detect vulnerabilities. If user input ends up in a query that calls SLEEP(), attackers can measure response times to extract information.

Always sanitize and parameterize user input:

```sql
-- DANGEROUS: never build queries like this
SET @query = CONCAT('SELECT * FROM users WHERE name = ''', user_input, '''');

-- SAFE: use prepared statements
PREPARE stmt FROM 'SELECT * FROM users WHERE name = ?';
EXECUTE stmt USING @user_input;
```

## Summary

`SLEEP(seconds)` pauses MySQL query execution for the specified duration, returning 0 on completion or 1 if interrupted. It is useful for testing timeout configurations, simulating slow queries in monitoring tests, and implementing retry delays in stored procedures. Avoid `SLEEP()` for production scheduling - use MySQL Events instead. Be aware that user-supplied values should never reach `SLEEP()` as this is a common SQL injection vector.
