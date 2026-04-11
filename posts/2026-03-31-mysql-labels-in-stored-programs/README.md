# How to Use Labels in MySQL Stored Programs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, LABEL, Stored Procedure, Loop

Description: Learn how to use labels in MySQL stored procedures and functions to name BEGIN...END blocks and loops, enabling targeted LEAVE and ITERATE flow control.

---

## What Are Labels in MySQL

Labels are named markers that can be attached to `BEGIN...END` compound statements and loop constructs (`LOOP`, `WHILE`, `REPEAT`) in MySQL stored procedures and functions. Labels allow `LEAVE` and `ITERATE` statements to target a specific block or loop by name, which is essential when loops are nested.

## Label Syntax

A label is placed before the block keyword and optionally repeated at the closing keyword:

```text
label_name: BEGIN
  -- statements
END label_name;

label_name: LOOP
  -- statements
END LOOP label_name;
```

The closing label is optional but recommended for readability.

## Labeling a BEGIN...END Block

```sql
DELIMITER $$
CREATE PROCEDURE outer_block_example()
BEGIN
  outer_block: BEGIN
    DECLARE v_count INT DEFAULT 0;

    SET v_count = 1;

    IF v_count > 0 THEN
      LEAVE outer_block;  -- exit the labeled block early
    END IF;

    -- This line is never reached
    SET v_count = 99;
  END outer_block;

  SELECT 'After outer_block' AS msg;
END$$
DELIMITER ;
```

## Labels on LOOP

```sql
DELIMITER $$
CREATE PROCEDURE loop_with_label()
BEGIN
  DECLARE v_i INT DEFAULT 0;

  counting_loop: LOOP
    SET v_i = v_i + 1;

    IF v_i = 5 THEN
      ITERATE counting_loop;  -- skip rest of iteration, go back to loop start
    END IF;

    IF v_i >= 10 THEN
      LEAVE counting_loop;    -- exit the loop
    END IF;

    INSERT INTO loop_log (iteration) VALUES (v_i);
  END LOOP counting_loop;

  SELECT CONCAT('Loop finished at v_i = ', v_i) AS result;
END$$
DELIMITER ;
```

`ITERATE` continues to the next iteration (like `continue` in other languages). `LEAVE` exits the loop entirely (like `break`).

## Nested Loops with Labels

Labels are critical when loops are nested. Since `LEAVE` and `ITERATE` both require a label, you must choose which loop to target by name. With labels on each loop, you can exit or restart any outer loop from within an inner one:

```sql
DELIMITER $$
CREATE PROCEDURE nested_loop_labels()
BEGIN
  DECLARE v_i INT DEFAULT 0;
  DECLARE v_j INT DEFAULT 0;

  outer_loop: WHILE v_i < 5 DO
    SET v_i = v_i + 1;
    SET v_j = 0;

    inner_loop: WHILE v_j < 5 DO
      SET v_j = v_j + 1;

      -- Exit both loops when i=3 and j=2
      IF v_i = 3 AND v_j = 2 THEN
        LEAVE outer_loop;
      END IF;

      INSERT INTO grid_log (i, j) VALUES (v_i, v_j);
    END WHILE inner_loop;
  END WHILE outer_loop;

  SELECT CONCAT('Stopped at i=', v_i, ', j=', v_j) AS result;
END$$
DELIMITER ;
```

## Labels on WHILE and REPEAT

```sql
DELIMITER $$
CREATE PROCEDURE while_label_example()
BEGIN
  DECLARE v_n INT DEFAULT 0;

  batch_loop: WHILE v_n < 1000 DO
    SET v_n = v_n + 100;

    IF v_n = 500 THEN
      ITERATE batch_loop;  -- skip the INSERT at 500
    END IF;

    INSERT INTO batch_log (batch_num) VALUES (v_n);
  END WHILE batch_loop;
END$$

CREATE PROCEDURE repeat_label_example()
BEGIN
  DECLARE v_n INT DEFAULT 0;

  retry_block: REPEAT
    SET v_n = v_n + 1;

    IF v_n = 3 THEN
      LEAVE retry_block;
    END IF;
  UNTIL v_n >= 10 END REPEAT retry_block;

  SELECT v_n AS stopped_at;
END$$

DELIMITER ;
```

## Best Practices

```text
- Always use labels on nested loops to avoid ambiguity
- Use descriptive label names that indicate the loop's purpose
- Add the closing label for clarity, especially in long procedures
- Avoid deep nesting - consider refactoring into separate procedures
```

## Summary

Labels in MySQL stored programs allow `LEAVE` and `ITERATE` to target specific named blocks and loops. They are especially important for nested loops where you need to exit an outer loop from within an inner one. Use descriptive label names, always close labeled blocks with the matching end label, and keep nesting shallow to maintain readable, maintainable stored program code.
