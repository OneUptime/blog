# How to Use NOW() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Database

Description: Learn how MySQL's NOW() function returns the current date and time, how it differs from SYSDATE(), and practical examples for timestamping and filtering.

---

## What is NOW()?

The `NOW()` function in MySQL returns the current date and time as a `DATETIME` value in the format `YYYY-MM-DD HH:MM:SS`. It represents the moment the statement began executing - meaning it returns the same value throughout the entire statement, even if the statement runs for several seconds.

The syntax is:

```sql
NOW()
NOW(fsp)
```

The optional `fsp` parameter (0-6) specifies fractional seconds precision:

```sql
SELECT NOW();
-- Result: 2026-03-31 14:22:07

SELECT NOW(3);
-- Result: 2026-03-31 14:22:07.413
```

## Basic Usage

```sql
SELECT NOW() AS current_datetime;
-- Result: 2026-03-31 14:22:07

SELECT NOW() + 0;
-- Result: 20260331142207.000000  (converts to numeric format)
```

## Inserting Timestamps

Use `NOW()` to record when a record was created or updated:

```sql
INSERT INTO orders (user_id, total, created_at, updated_at)
VALUES (42, 199.99, NOW(), NOW());
```

A more declarative approach uses `DEFAULT CURRENT_TIMESTAMP`:

```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Filtering by Date Range

Retrieve records from the last 24 hours:

```sql
SELECT *
FROM audit_log
WHERE created_at >= NOW() - INTERVAL 1 DAY;
```

Records from the last 7 days:

```sql
SELECT *
FROM sessions
WHERE last_active >= NOW() - INTERVAL 7 DAY;
```

Records from the last hour:

```sql
SELECT *
FROM api_requests
WHERE requested_at BETWEEN NOW() - INTERVAL 1 HOUR AND NOW();
```

## Calculating Time Elapsed

```sql
SELECT
  id,
  created_at,
  TIMESTAMPDIFF(MINUTE, created_at, NOW()) AS minutes_ago
FROM jobs
WHERE status = 'pending'
ORDER BY created_at;
```

## Expiry Checking

```sql
SELECT *
FROM subscriptions
WHERE expires_at > NOW();
```

Find expiring sessions:

```sql
SELECT user_id, expires_at
FROM sessions
WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL 15 MINUTE;
```

## NOW() vs SYSDATE()

Both return the current datetime, but they differ in evaluation timing:

| Function   | Evaluated at              | Consistent in statement? |
|------------|---------------------------|--------------------------|
| `NOW()`    | Statement start           | Yes                      |
| `SYSDATE()`| Time of function call     | No                       |

```sql
SELECT NOW(), SLEEP(2), NOW();
-- Both NOW() values are the same (statement-start time)

SELECT SYSDATE(), SLEEP(2), SYSDATE();
-- Second SYSDATE() is 2 seconds later
```

For logging and auditing, `NOW()` is preferred because it gives a consistent timestamp for the entire statement.

## Using NOW() in Stored Procedures

```sql
DELIMITER //
CREATE PROCEDURE process_order(IN p_order_id INT)
BEGIN
  DECLARE v_now DATETIME;
  SET v_now = NOW();

  UPDATE orders SET status = 'processing', updated_at = v_now WHERE id = p_order_id;
  INSERT INTO order_history (order_id, status, changed_at) VALUES (p_order_id, 'processing', v_now);
END //
DELIMITER ;
```

Capturing `NOW()` into a variable at the start ensures all related operations get the same timestamp.

## Summary

`NOW()` returns the current date and time at statement-start with optional fractional second precision. It is consistent across a statement (unlike `SYSDATE()`), making it ideal for auditing, timestamping inserts/updates, date range filtering, and expiry checks. Use `NOW() - INTERVAL N UNIT` for time-window queries and `TIMESTAMPDIFF()` to compute elapsed time.
