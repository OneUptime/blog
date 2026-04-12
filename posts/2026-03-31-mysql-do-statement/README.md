# How to Use DO Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Statement, Expression, Stored Procedure, Performance

Description: Learn how to use the DO statement in MySQL to execute expressions without returning a result set, useful for side effects and stored routines.

---

## Overview

The `DO` statement in MySQL executes one or more expressions but discards the results without returning a result set to the client. It is a faster alternative to `SELECT` when you only need the side effect of an expression - such as calling a stored function for its side effects or releasing a lock - and have no need for the return value.

## Basic Syntax

```sql
DO expression [, expression] ...;
```

## Using DO for Side Effects

The most common use of `DO` is invoking functions that you call for their side effects rather than their return value:

```sql
-- Release a named lock without caring about the return value
DO RELEASE_LOCK('my_application_lock');

-- Equivalent SELECT is slower and returns an unused result
SELECT RELEASE_LOCK('my_application_lock');
```

`DO` is slightly more efficient than `SELECT` because it does not allocate a result set.

## Using DO with SLEEP()

`DO` is often combined with `SLEEP()` in testing or debugging scenarios:

```sql
DO SLEEP(2);
-- Pauses execution for 2 seconds, no result returned
```

## Calling Stored Functions

When a stored function has side effects (such as logging or updating counters), you can call it with `DO` to ignore the return value:

```sql
-- Assume log_event() inserts a log row and returns the new log ID
DO log_event('user_login', 42);
```

Using `DO` instead of `SELECT log_event(...)` avoids sending an unused result set to the client.

## Using DO with Multiple Expressions

`DO` accepts a comma-separated list of expressions, all of which are evaluated:

```sql
DO RELEASE_LOCK('lock1'), RELEASE_LOCK('lock2'), RELEASE_LOCK('lock3');
```

## Practical Example: Advisory Locking Pattern

A common pattern with `DO` is in lock acquisition workflows inside a stored procedure:

```sql
DELIMITER //
CREATE PROCEDURE run_batch_job()
BEGIN
  SELECT GET_LOCK('batch_job', 10) INTO @lock_result;

  IF @lock_result = 1 THEN
    -- Do work here ...
    DO RELEASE_LOCK('batch_job');
  END IF;
END //
DELIMITER ;
```

Note that `IF ... THEN ... END IF` is only valid inside stored programs (procedures, functions, triggers). In plain SQL, you would handle the conditional logic in your application code.

## DO Inside Stored Procedures

`DO` is useful inside stored procedures when you need to call a function but discard its value:

```sql
DELIMITER //
CREATE PROCEDURE process_queue()
BEGIN
  -- Update a counter as a side effect, ignore return value
  DO update_processing_stats('queue_processed', 1);

  -- Main logic here
  UPDATE queue_items SET status = 'processed' WHERE status = 'pending';
END //
DELIMITER ;
```

## Difference Between DO and SELECT

```sql
-- DO: executes but returns no result set
DO 1 + 1;  -- No output

-- SELECT: executes and returns a result set
SELECT 1 + 1;  -- Returns: 2
```

`DO` is not useful when you actually need the expression value. Use `SELECT ... INTO @var` for that.

## Limitations

- `DO` cannot reference table columns directly (for example, `DO id FROM t1` is invalid)
- `DO` only evaluates expressions; it does not support full query syntax like `SELECT` does
- Inside stored functions and triggers, `DO` is preferred over `SELECT` because these contexts do not allow statements that return result sets to the client

## Summary

The `DO` statement executes expressions purely for their side effects, discarding the return value without sending a result set to the client. It is most useful when calling functions like `RELEASE_LOCK()` or `SLEEP()` inside stored procedures where the return value is unneeded. While the performance difference versus `SELECT` is minor, `DO` expresses intent more clearly and avoids unnecessary result set overhead.
