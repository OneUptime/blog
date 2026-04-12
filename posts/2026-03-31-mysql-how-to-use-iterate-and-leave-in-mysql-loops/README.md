# How to Use ITERATE and LEAVE in MySQL Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ITERATE, LEAVE, Loop, Stored Procedure, Control Flow

Description: Learn how to use ITERATE to continue to the next loop iteration and LEAVE to exit loops early in MySQL stored procedures.

---

## Loop Types in MySQL Stored Procedures

MySQL supports three loop constructs in stored procedures:
- `LOOP ... END LOOP` - unconditional loop (must exit with LEAVE).
- `WHILE ... DO ... END WHILE` - pre-condition loop.
- `REPEAT ... UNTIL ... END REPEAT` - post-condition loop.

`ITERATE` and `LEAVE` work with all three, and require a **loop label** to identify which loop to target.

## LEAVE - Exiting a Loop

`LEAVE label` exits the labeled loop immediately. It is equivalent to `break` in other languages.

### LOOP with LEAVE

```sql
DELIMITER $$

CREATE PROCEDURE count_to_ten()
BEGIN
  DECLARE n INT DEFAULT 1;

  count_loop: LOOP
    IF n > 10 THEN
      LEAVE count_loop;  -- Exit when n exceeds 10
    END IF;

    INSERT INTO numbers (value) VALUES (n);
    SET n = n + 1;
  END LOOP count_loop;
END$$

DELIMITER ;
```

### WHILE with LEAVE

```sql
DELIMITER $$

CREATE PROCEDURE process_until_empty()
BEGIN
  DECLARE batch_size INT DEFAULT 100;
  DECLARE rows_affected INT;

  process_loop: WHILE TRUE DO
    -- Process a batch of pending records
    UPDATE jobs
    SET status = 'processing', started_at = NOW()
    WHERE status = 'pending'
    LIMIT 100;

    SET rows_affected = ROW_COUNT();

    -- Leave if no more rows to process
    IF rows_affected = 0 THEN
      LEAVE process_loop;
    END IF;

    -- Small delay to avoid overwhelming the server
    DO SLEEP(0.1);
  END WHILE process_loop;
END$$

DELIMITER ;
```

## ITERATE - Continuing to Next Iteration

`ITERATE label` skips the rest of the current iteration and jumps to the next check. It is equivalent to `continue` in other languages.

### Skipping Invalid Values

```sql
DELIMITER $$

CREATE PROCEDURE process_product_ids(IN id_list TEXT)
BEGIN
  DECLARE current_id INT;
  DECLARE i INT DEFAULT 1;
  DECLARE total INT;
  DECLARE part VARCHAR(20);

  -- Count comma-separated values
  SET total = LENGTH(id_list) - LENGTH(REPLACE(id_list, ',', '')) + 1;

  process_ids: LOOP
    IF i > total THEN
      LEAVE process_ids;
    END IF;

    -- Extract the i-th value
    SET part = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(id_list, ',', i), ',', -1));
    SET current_id = CAST(part AS UNSIGNED);
    SET i = i + 1;

    -- Skip invalid IDs (0 means non-numeric input)
    IF current_id = 0 THEN
      ITERATE process_ids;  -- Skip to next iteration
    END IF;

    -- Process valid ID
    UPDATE products SET processed = 1 WHERE id = current_id;
  END LOOP process_ids;
END$$

DELIMITER ;
```

## REPEAT with ITERATE

```sql
DELIMITER $$

CREATE PROCEDURE generate_report_rows()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE current_month DATE DEFAULT '2025-01-01';

  monthly_loop: REPEAT
    -- Skip months with no data (check first)
    IF NOT EXISTS (SELECT 1 FROM sales WHERE MONTH(sale_date) = MONTH(current_month)
                   AND YEAR(sale_date) = YEAR(current_month)) THEN
      SET current_month = DATE_ADD(current_month, INTERVAL 1 MONTH);
      ITERATE monthly_loop;  -- Restart loop body (skips UNTIL check)
    END IF;

    -- Generate report for this month
    INSERT INTO monthly_report (month, total_sales)
    SELECT current_month, SUM(amount) FROM sales
    WHERE MONTH(sale_date) = MONTH(current_month)
      AND YEAR(sale_date) = YEAR(current_month);

    SET current_month = DATE_ADD(current_month, INTERVAL 1 MONTH);

  UNTIL current_month > '2025-12-01' END REPEAT monthly_loop;
END$$

DELIMITER ;
```

## Nested Loops with Labels

Labels allow you to break out of outer loops from inside inner loops:

```sql
DELIMITER $$

CREATE PROCEDURE find_pair()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE j INT DEFAULT 1;
  DECLARE target INT DEFAULT 100;

  outer_loop: LOOP
    IF i > 20 THEN LEAVE outer_loop; END IF;

    SET j = 1;
    inner_loop: LOOP
      IF j > 20 THEN LEAVE inner_loop; END IF;

      IF i * j = target THEN
        INSERT INTO results (a, b, product) VALUES (i, j, i * j);
        LEAVE outer_loop;  -- Exit both loops when found
      END IF;

      SET j = j + 1;
    END LOOP inner_loop;

    SET i = i + 1;
  END LOOP outer_loop;
END$$

DELIMITER ;
```

## Cursor Loop with ITERATE

A common pattern uses ITERATE to skip rows that do not need processing:

```sql
DELIMITER $$

CREATE PROCEDURE process_customers()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE cust_id INT;
  DECLARE cust_email VARCHAR(200);

  DECLARE cur CURSOR FOR
    SELECT id, email FROM customers WHERE status = 'active';

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  customer_loop: LOOP
    FETCH cur INTO cust_id, cust_email;

    IF done THEN
      LEAVE customer_loop;
    END IF;

    -- Skip customers with no email
    IF cust_email IS NULL OR cust_email = '' THEN
      ITERATE customer_loop;
    END IF;

    -- Send email (log the action)
    INSERT INTO email_log (customer_id, sent_at) VALUES (cust_id, NOW());
  END LOOP customer_loop;

  CLOSE cur;
END$$

DELIMITER ;
```

## Summary

`LEAVE` exits a labeled loop immediately (like `break`), and `ITERATE` skips the remaining statements in the current iteration and continues with the next (like `continue`). Both require a loop label to identify the target loop. Use `LEAVE` to exit when a termination condition is met, and `ITERATE` to skip processing for rows or values that do not meet the criteria. Labels are especially important in nested loops to precisely control which loop to exit or continue.
