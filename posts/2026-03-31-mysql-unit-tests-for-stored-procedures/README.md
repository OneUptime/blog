# How to Write Unit Tests for MySQL Stored Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Unit Test, Stored Procedure, Testing

Description: Learn how to write unit tests for MySQL stored procedures using a lightweight test framework built with stored procedures, assertions, and rollback isolation.

---

## Why Test Stored Procedures

Stored procedures contain business logic that can be complex and difficult to debug. Without tests, refactoring a procedure can silently break behavior. A lightweight test framework built entirely in MySQL lets you run tests without any external tooling.

## Building a Simple Test Framework

Create a table to record test results and helper procedures to assert conditions:

```sql
CREATE TABLE test_results (
  test_id     INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  test_name   VARCHAR(200) NOT NULL,
  passed      TINYINT(1)   NOT NULL,
  message     VARCHAR(500),
  run_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

DELIMITER $$

-- Assert that two values are equal
CREATE PROCEDURE assert_equals(
  IN p_test_name VARCHAR(200),
  IN p_expected  TEXT,
  IN p_actual    TEXT
)
BEGIN
  IF p_expected = p_actual OR (p_expected IS NULL AND p_actual IS NULL) THEN
    INSERT INTO test_results (test_name, passed, message)
    VALUES (p_test_name, 1, 'PASS');
  ELSE
    INSERT INTO test_results (test_name, passed, message)
    VALUES (p_test_name, 0,
      CONCAT('FAIL: expected [', IFNULL(p_expected,'NULL'),
             '] got [', IFNULL(p_actual,'NULL'), ']'));
  END IF;
END$$

-- Assert that a value is not null
CREATE PROCEDURE assert_not_null(
  IN p_test_name VARCHAR(200),
  IN p_actual    TEXT
)
BEGIN
  IF p_actual IS NOT NULL THEN
    INSERT INTO test_results (test_name, passed, message)
    VALUES (p_test_name, 1, 'PASS');
  ELSE
    INSERT INTO test_results (test_name, passed, message)
    VALUES (p_test_name, 0, 'FAIL: expected non-null value');
  END IF;
END$$

DELIMITER ;
```

## The Procedure Under Test

```sql
DELIMITER $$
CREATE PROCEDURE calculate_discount(
  IN  p_order_total DECIMAL(10,2),
  IN  p_customer_tier VARCHAR(20),
  OUT p_discount DECIMAL(5,2)
)
BEGIN
  CASE p_customer_tier
    WHEN 'GOLD'     THEN SET p_discount = 0.15;
    WHEN 'SILVER'   THEN SET p_discount = 0.10;
    WHEN 'BRONZE'   THEN SET p_discount = 0.05;
    ELSE                 SET p_discount = 0.00;
  END CASE;

  -- No discount on orders below $10
  IF p_order_total < 10.00 THEN
    SET p_discount = 0.00;
  END IF;
END$$
DELIMITER ;
```

## Writing Unit Tests

```sql
DELIMITER $$
CREATE PROCEDURE test_calculate_discount()
BEGIN
  DECLARE v_discount DECIMAL(5,2);

  -- Test 1: Gold tier gets 15%
  CALL calculate_discount(100.00, 'GOLD', v_discount);
  CALL assert_equals('Gold tier discount', '0.15', CAST(v_discount AS CHAR));

  -- Test 2: Silver tier gets 10%
  CALL calculate_discount(50.00, 'SILVER', v_discount);
  CALL assert_equals('Silver tier discount', '0.10', CAST(v_discount AS CHAR));

  -- Test 3: Unknown tier gets 0%
  CALL calculate_discount(50.00, 'UNKNOWN', v_discount);
  CALL assert_equals('Unknown tier discount', '0.00', CAST(v_discount AS CHAR));

  -- Test 4: Order below $10 always gets 0% even for Gold
  CALL calculate_discount(9.99, 'GOLD', v_discount);
  CALL assert_equals('Low value order no discount', '0.00', CAST(v_discount AS CHAR));

  -- Test 5: Bronze tier gets 5%
  CALL calculate_discount(25.00, 'BRONZE', v_discount);
  CALL assert_equals('Bronze tier discount', '0.05', CAST(v_discount AS CHAR));
END$$
DELIMITER ;
```

## Running Tests with Rollback Isolation

Wrap data-modifying test cases in a transaction to avoid polluting the database:

```sql
DELIMITER $$
CREATE PROCEDURE test_with_isolation()
BEGIN
  DECLARE v_last_id BIGINT;

  START TRANSACTION;
    -- Insert test data
    INSERT INTO orders (customer_id, total) VALUES (9999, 100.00);
    -- Capture values before rollback
    SET v_last_id = LAST_INSERT_ID();
  ROLLBACK; -- Undo test data

  -- Assert after rollback so the result is not rolled back
  CALL assert_not_null('Order inserted', v_last_id);
END$$
DELIMITER ;
```

## Running and Viewing Results

```sql
-- Truncate previous results and run tests
TRUNCATE TABLE test_results;
CALL test_calculate_discount();

-- View results
SELECT test_name, IF(passed, 'PASS', 'FAIL') AS status, message
FROM test_results
ORDER BY test_id;

-- Summary
SELECT
  SUM(passed)         AS passed,
  SUM(1 - passed)     AS failed,
  COUNT(*)            AS total
FROM test_results;
```

## Summary

You can build a functional unit test framework entirely inside MySQL using a results table, assertion procedures, and transaction rollbacks for isolation. This approach requires no external dependencies and integrates easily into CI pipelines by running the test procedures via a MySQL client and checking the test_results table for failures.
