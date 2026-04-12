# How to Use ROW_COUNT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ROW_COUNT, Affected Rows, SQL Functions

Description: Learn how to use the ROW_COUNT() function in MySQL to determine how many rows were affected by the most recent INSERT, UPDATE, DELETE, or REPLACE.

---

## What is ROW_COUNT()

MySQL's `ROW_COUNT()` function returns the number of rows affected by the last DML (Data Manipulation Language) statement in the current session. It works for `INSERT`, `UPDATE`, `DELETE`, `REPLACE`, and `LOAD DATA` statements.

For `SELECT` statements, `ROW_COUNT()` returns -1. For statements that do not affect rows, it returns 0.

Syntax:

```sql
ROW_COUNT()
```

## Basic Usage

```sql
-- After an UPDATE
UPDATE employees SET salary = salary * 1.1 WHERE department = 'Engineering';
SELECT ROW_COUNT();
-- Output: number of employees in Engineering

-- After a DELETE
DELETE FROM logs WHERE created_at < '2025-01-01';
SELECT ROW_COUNT();
-- Output: number of deleted log rows

-- After a SELECT (returns -1)
SELECT * FROM employees;
SELECT ROW_COUNT();
-- Output: -1
```

## Using ROW_COUNT() After INSERT

```sql
INSERT INTO products (name, price) VALUES ('Widget', 9.99);
SELECT ROW_COUNT();
-- Output: 1

INSERT INTO products (name, price) VALUES ('A', 1.00), ('B', 2.00), ('C', 3.00);
SELECT ROW_COUNT();
-- Output: 3
```

## Using ROW_COUNT() After UPDATE

Note: `UPDATE` only counts rows where the data actually changed. If the new value equals the old value, the row is not counted.

```sql
UPDATE employees SET status = 'active' WHERE status = 'active';
SELECT ROW_COUNT();
-- Output: 0 (no rows changed, even though the WHERE matched rows)
```

Use `CLIENT_FOUND_ROWS` flag to return matched rows instead of changed rows (driver-specific).

## Using ROW_COUNT() in Stored Procedures

```sql
DELIMITER //
CREATE PROCEDURE deactivate_old_users(IN cutoff_date DATE)
BEGIN
  UPDATE users SET active = 0 WHERE last_login < cutoff_date AND active = 1;

  SELECT ROW_COUNT() AS deactivated_count;
END //
DELIMITER ;

CALL deactivate_old_users('2025-01-01');
```

## Using ROW_COUNT() for Conditional Logic

```sql
DELIMITER //
CREATE PROCEDURE safe_delete(IN p_id INT)
BEGIN
  DELETE FROM orders WHERE id = p_id AND status = 'pending';

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order not found or not in pending status';
  ELSE
    SELECT 'Order deleted successfully' AS result;
  END IF;
END //
DELIMITER ;
```

## ROW_COUNT() with REPLACE

`REPLACE` deletes then inserts, so it reports 2 for each replaced row and 1 for new inserts:

```sql
REPLACE INTO settings (key_name, value) VALUES ('theme', 'dark');
SELECT ROW_COUNT();
-- Output: 1 if new, 2 if replaced
```

## ROW_COUNT() vs Found_Rows()

```sql
-- ROW_COUNT(): rows affected by DML
UPDATE products SET stock = 0 WHERE stock < 0;
SELECT ROW_COUNT();  -- How many rows were updated

-- FOUND_ROWS(): rows returned by last SELECT (with SQL_CALC_FOUND_ROWS)
-- Note: SQL_CALC_FOUND_ROWS and FOUND_ROWS() are deprecated as of MySQL 8.0.17
SELECT SQL_CALC_FOUND_ROWS * FROM products LIMIT 10;
SELECT FOUND_ROWS();  -- Total matching rows (ignoring LIMIT)
```

## Application Code Usage

In Python:

```python
cursor.execute("UPDATE employees SET salary = salary * 1.1 WHERE department = %s", ("Engineering",))
print(f"Updated {cursor.rowcount} employees")  # cursor.rowcount = ROW_COUNT()
conn.commit()
```

In Node.js:

```javascript
const [result] = await conn.execute(
    'DELETE FROM sessions WHERE expires_at < NOW()'
);
console.log(`Deleted ${result.affectedRows} expired sessions`);
```

## Summary

`ROW_COUNT()` returns the number of rows affected by the last INSERT, UPDATE, DELETE, or REPLACE statement in the current session. It returns -1 for SELECT statements. Use it in stored procedures for conditional error handling, logging, and reporting how many records a DML operation changed. Remember that UPDATE only counts rows where the data actually changed (not just matched), unless the `CLIENT_FOUND_ROWS` connection flag is enabled.
