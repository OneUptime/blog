# How to Use Unsigned Integers in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Unsigned Integer, Data Type, Schema Design, Numeric

Description: MySQL unsigned integers store only non-negative values, doubling the positive range compared to signed integers - ideal for IDs and counters.

---

## What Is an Unsigned Integer

An unsigned integer in MySQL stores only non-negative values (zero and positive numbers). Because it does not need to represent negative numbers, it can store twice the positive range compared to a signed integer of the same size.

For example, a signed `INT` stores values from `-2,147,483,648` to `2,147,483,647`, while an unsigned `INT` stores `0` to `4,294,967,295`.

## Integer Types and Their Ranges

| Type       | Signed Range                          | Unsigned Range              |
|------------|---------------------------------------|-----------------------------|
| TINYINT    | -128 to 127                           | 0 to 255                    |
| SMALLINT   | -32,768 to 32,767                     | 0 to 65,535                 |
| MEDIUMINT  | -8,388,608 to 8,388,607               | 0 to 16,777,215             |
| INT        | -2,147,483,648 to 2,147,483,647       | 0 to 4,294,967,295          |
| BIGINT     | -9.2 x 10^18 to 9.2 x 10^18          | 0 to 1.8 x 10^19            |

## Declaring an Unsigned Column

Add the `UNSIGNED` keyword after the type name:

```sql
CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  stock SMALLINT UNSIGNED DEFAULT 0,
  view_count BIGINT UNSIGNED DEFAULT 0
);
```

## Common Use Cases for UNSIGNED

Unsigned integers are well suited for:
- Auto-increment primary keys (IDs are never negative)
- Counters (page views, downloads, likes)
- Age, quantity, and stock values
- Bit flags and bitmask values

```sql
CREATE TABLE page_stats (
  page_id INT UNSIGNED NOT NULL,
  views BIGINT UNSIGNED DEFAULT 0,
  unique_visitors INT UNSIGNED DEFAULT 0,
  bounce_rate TINYINT UNSIGNED DEFAULT 0,
  INDEX (page_id)
);
```

## Inserting and Updating Unsigned Values

```sql
INSERT INTO products (name, stock) VALUES ('Widget A', 100);
INSERT INTO products (name, stock) VALUES ('Widget B', 0);

-- Increment stock
UPDATE products SET stock = stock + 50 WHERE id = 1;
```

## What Happens When You Insert a Negative Value

In strict SQL mode (the default in MySQL 5.7+), inserting a negative value into an unsigned column raises an error:

```sql
INSERT INTO products (name, stock) VALUES ('Widget C', -5);
```

```text
ERROR 1264 (22003): Out of range value for column 'stock' at row 1
```

In non-strict mode, MySQL silently clips the value to 0 (the minimum unsigned value). Always use strict mode in production.

## Unsigned in AUTO_INCREMENT Columns

Using `UNSIGNED` for `AUTO_INCREMENT` primary keys is best practice because it doubles the available range of IDs:

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

With `BIGINT UNSIGNED AUTO_INCREMENT`, the ID can grow up to approximately 18.4 quintillion before exhausting the range - effectively unlimited for most applications.

## Arithmetic Underflow Warning

Be careful with arithmetic that could result in a value below zero:

```sql
-- This can cause problems if stock is already 0
UPDATE products SET stock = stock - 10 WHERE id = 1;
```

If `stock` is less than 10, the unsigned subtraction wraps or raises an error (`ERROR 1690: BIGINT UNSIGNED value is out of range`) because unsigned arithmetic cannot produce a negative result. Protect against underflow by checking the value first:

```sql
UPDATE products
SET stock = stock - 10
WHERE id = 1 AND stock >= 10;
```

## Checking Column Definition

Inspect the column definition to see if UNSIGNED is applied:

```sql
SHOW CREATE TABLE products\G
```

Or query the information schema:

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'myapp'
  AND TABLE_NAME = 'products';
```

The `COLUMN_TYPE` will show `int unsigned` or `smallint unsigned`.

## Summary

Use the `UNSIGNED` modifier on integer columns that should never hold negative values, such as IDs, counters, and quantities. Unsigned integers double the positive range of their signed equivalents. Always use strict SQL mode to prevent silent data truncation when out-of-range values are inserted. For auto-increment primary keys, `INT UNSIGNED` or `BIGINT UNSIGNED` is standard practice.
