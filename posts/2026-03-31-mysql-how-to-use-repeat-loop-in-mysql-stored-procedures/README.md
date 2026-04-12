# How to Use REPEAT Loop in MySQL Stored Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Loop, Control Flow, SQL

Description: Learn how to use the REPEAT...UNTIL loop in MySQL stored procedures to execute statements repeatedly until a condition becomes true.

---

## Loop Types in MySQL Stored Procedures

MySQL provides three loop constructs for stored routines:
- `REPEAT...UNTIL` - executes at least once, checks condition at end
- `WHILE...DO` - checks condition at start, may not execute at all
- `LOOP` - infinite loop requiring explicit `LEAVE` to exit

## REPEAT Loop Syntax

```sql
REPEAT
  -- statements
UNTIL condition
END REPEAT;
```

The body executes first, then the condition is evaluated. The loop continues until the condition is `TRUE` (opposite logic from `WHILE`).

## Basic REPEAT Loop Example

Generate a sequence of numbers and insert them into a table:

```sql
DELIMITER //

CREATE PROCEDURE InsertSequence(IN max_val INT)
BEGIN
  DECLARE counter INT DEFAULT 1;

  REPEAT
    INSERT INTO sequence_table (value) VALUES (counter);
    SET counter = counter + 1;
  UNTIL counter > max_val
  END REPEAT;
END //

DELIMITER ;
```

```sql
CALL InsertSequence(5);
SELECT * FROM sequence_table;
```

```text
+-------+
| value |
+-------+
| 1     |
| 2     |
| 3     |
| 4     |
| 5     |
+-------+
```

## REPEAT Loop for Batch Processing

Process rows in batches to avoid locking large numbers of rows at once:

```sql
DELIMITER //

CREATE PROCEDURE ArchiveOldOrders()
BEGIN
  DECLARE rows_affected INT DEFAULT 1;
  DECLARE batch_size INT DEFAULT 1000;

  REPEAT
    INSERT INTO orders_archive
    SELECT * FROM orders
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR)
    LIMIT batch_size;

    SET rows_affected = ROW_COUNT();

    DELETE FROM orders
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR)
    LIMIT batch_size;

    DO SLEEP(0.1);  -- brief pause to reduce I/O pressure

  UNTIL rows_affected = 0
  END REPEAT;
END //

DELIMITER ;
```

## Named REPEAT Loop with LEAVE

Label loops and exit early with `LEAVE`:

```sql
DELIMITER //

CREATE PROCEDURE FindPrime(
  IN max_n INT,
  OUT first_prime INT
)
BEGIN
  DECLARE n INT DEFAULT 2;
  DECLARE is_prime TINYINT DEFAULT 1;
  DECLARE divisor INT;

  SET first_prime = -1;

  prime_search: REPEAT
    SET divisor = 2;
    SET is_prime = 1;

    divisor_check: WHILE divisor <= FLOOR(SQRT(n)) DO
      IF n MOD divisor = 0 THEN
        SET is_prime = 0;
        LEAVE divisor_check;
      END IF;
      SET divisor = divisor + 1;
    END WHILE divisor_check;

    IF is_prime = 1 THEN
      SET first_prime = n;
      LEAVE prime_search;
    END IF;

    SET n = n + 1;
  UNTIL n > max_n
  END REPEAT prime_search;
END //

DELIMITER ;
```

## REPEAT vs WHILE: Choosing the Right Loop

| Feature | REPEAT | WHILE |
|---|---|---|
| Condition checked | After body executes | Before body executes |
| Minimum executions | 1 | 0 |
| Use when | You need at least one iteration | You might skip entirely |

WHILE example for comparison:

```sql
DELIMITER //

CREATE PROCEDURE CountDown(IN start INT)
BEGIN
  DECLARE n INT DEFAULT start;

  WHILE n > 0 DO
    SELECT n AS countdown_value;
    SET n = n - 1;
  END WHILE;
END //

DELIMITER ;
```

## ITERATE to Skip to Next Iteration

Use `ITERATE` to skip the rest of the loop body and go to the next iteration (similar to `continue` in other languages):

```sql
DELIMITER //

CREATE PROCEDURE ProcessEvenNumbers(IN max_val INT)
BEGIN
  DECLARE n INT DEFAULT 0;

  process_loop: REPEAT
    SET n = n + 1;

    IF n MOD 2 != 0 THEN
      ITERATE process_loop;  -- skip odd numbers
    END IF;

    INSERT INTO even_numbers (value) VALUES (n);

  UNTIL n >= max_val
  END REPEAT process_loop;
END //

DELIMITER ;
```

## Summary

The `REPEAT...UNTIL` loop in MySQL stored procedures executes the body at least once and continues until the `UNTIL` condition is true. Use it for batch processing, retry logic, or any scenario where one execution is always needed. Label loops to use `LEAVE` for early exit or `ITERATE` to skip to the next cycle. For pre-condition checks, prefer `WHILE...DO` instead.
