# How to Use READS SQL DATA and NO SQL in MySQL Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, Replication, Data Access, Characteristic

Description: Learn what READS SQL DATA and NO SQL mean in MySQL stored function declarations and when each characteristic is required for correctness and replication.

---

MySQL stored functions require one of four data-access characteristics in their definition: `CONTAINS SQL`, `NO SQL`, `READS SQL DATA`, or `MODIFIES SQL DATA`. These declarations tell the server what kind of SQL statements the function executes, which matters for both binary logging and the query optimizer.

## The Four Data-Access Characteristics

```text
Characteristic    | Meaning
------------------|------------------------------------------------------
NO SQL            | Contains no SQL statements at all
CONTAINS SQL      | Contains SQL but no read or write statements (default)
READS SQL DATA    | Contains SELECT but no data-modification statements
MODIFIES SQL DATA | Contains INSERT, UPDATE, DELETE, or DDL
```

## NO SQL

Use `NO SQL` when the function body contains only procedural logic - no SQL statements whatsoever:

```sql
DELIMITER //

CREATE FUNCTION celsius_to_fahrenheit(p_celsius DOUBLE)
RETURNS DOUBLE
DETERMINISTIC
NO SQL
BEGIN
    RETURN (p_celsius * 9 / 5) + 32;
END //

DELIMITER ;
```

`NO SQL` combined with `DETERMINISTIC` is the safest declaration for pure computation functions and works with all binary log formats.

## READS SQL DATA

Use `READS SQL DATA` when the function executes `SELECT` statements but does not insert, update, or delete rows:

```sql
DELIMITER //

CREATE FUNCTION get_user_role(p_user_id INT)
RETURNS VARCHAR(50)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_role VARCHAR(50);

    SELECT role INTO v_role
    FROM user_roles
    WHERE user_id = p_user_id
    LIMIT 1;

    RETURN COALESCE(v_role, 'guest');
END //

DELIMITER ;
```

This function reads from `user_roles` but never modifies data, making `READS SQL DATA` the correct declaration.

## Why the Characteristic Matters for Replication

When binary logging uses `STATEMENT` format, MySQL records the SQL statement rather than the row changes. For stored functions, MySQL requires one of: `DETERMINISTIC`, `NO SQL`, or `READS SQL DATA`. If you declare a function with only `CONTAINS SQL` (the default) and do not mark it as deterministic, MySQL rejects the `CREATE FUNCTION` statement when binary logging is active:

```text
ERROR 1418 (HY000): This function has none of DETERMINISTIC, NO SQL, or READS SQL DATA in its declaration
```

Check binary logging status:

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
```

## Correcting an Existing Function

To change the characteristic on an existing function, use `ALTER FUNCTION`:

```sql
ALTER FUNCTION get_user_role
    READS SQL DATA;
```

Note that `ALTER FUNCTION` cannot change the `DETERMINISTIC` or `NOT DETERMINISTIC` property. To change determinism, drop and recreate the function.

Or drop and recreate it:

```sql
DROP FUNCTION IF EXISTS get_user_role;

DELIMITER //

CREATE FUNCTION get_user_role(p_user_id INT)
RETURNS VARCHAR(50)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_role VARCHAR(50);
    SELECT role INTO v_role FROM user_roles WHERE user_id = p_user_id LIMIT 1;
    RETURN COALESCE(v_role, 'guest');
END //

DELIMITER ;
```

## Combining Characteristics

You combine the data-access characteristic with the determinism declaration:

```sql
-- Pure math - no SQL, always deterministic
CREATE FUNCTION square(n DOUBLE) RETURNS DOUBLE DETERMINISTIC NO SQL
RETURN n * n;

-- Table lookup - reads data, result varies
DELIMITER //

CREATE FUNCTION item_price(p_id INT) RETURNS DECIMAL(10,2)
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v DECIMAL(10,2);
    SELECT price INTO v FROM items WHERE id = p_id;
    RETURN v;
END //

DELIMITER ;
```

## Summary

`NO SQL` is for functions that contain only procedural logic with no SQL at all. `READS SQL DATA` is for functions that query tables but do not modify data. Declaring the correct characteristic ensures compatibility with statement-based replication and provides the optimizer with accurate metadata about what the function does.
