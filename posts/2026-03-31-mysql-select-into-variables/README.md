# How to Use SELECT INTO Variables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Variable, Stored Procedure, Query, Session

Description: Learn how to use MySQL's SELECT INTO syntax to capture query results into user-defined or local procedure variables for use in subsequent logic.

---

## What is SELECT INTO?

MySQL provides two forms of `SELECT INTO`:

1. **`SELECT ... INTO var_name`** - captures column values from a query result into variables
2. **`SELECT ... INTO OUTFILE`** - writes query results to a file on the server

This post focuses on the variable form, which stores query values for use in stored procedures and subsequent statements.

## SELECT INTO with User-Defined Variables

Use `:=` in `SELECT` to assign to user-defined variables:

```sql
-- Assign max price to a user variable
SELECT @max_price := MAX(price) FROM products;

-- Use the captured value in the next query
SELECT id, name, price
FROM products
WHERE price = @max_price;
```

## SELECT INTO in Stored Procedures

Inside stored procedures, `SELECT INTO` stores query results into local declared variables:

```sql
DELIMITER //
CREATE PROCEDURE get_customer_stats(IN p_customer_id INT)
BEGIN
  DECLARE order_count INT;
  DECLARE total_spent DECIMAL(10,2);

  SELECT COUNT(*), SUM(total)
  INTO order_count, total_spent
  FROM orders
  WHERE customer_id = p_customer_id;

  SELECT
    order_count AS orders,
    total_spent AS total,
    total_spent / order_count AS avg_order_value;
END//
DELIMITER ;

CALL get_customer_stats(42);
```

The `INTO` clause must list the same number of variables as columns in the `SELECT`.

## SELECT INTO Must Return Exactly One Row

`SELECT INTO` requires the query to return exactly one row. Zero rows or multiple rows cause an error:

```sql
DELIMITER //
CREATE PROCEDURE safe_lookup(IN pid INT)
BEGIN
  DECLARE p_name VARCHAR(100);
  DECLARE CONTINUE HANDLER FOR NOT FOUND
    SET p_name = 'Unknown';

  SELECT name INTO p_name FROM products WHERE id = pid;
  SELECT p_name AS product_name;
END//
DELIMITER ;
```

Use a `CONTINUE HANDLER FOR NOT FOUND` to gracefully handle the zero-rows case.

## Capturing Multiple Columns

```sql
DELIMITER //
CREATE PROCEDURE load_product(IN pid INT)
BEGIN
  DECLARE p_name VARCHAR(100);
  DECLARE p_price DECIMAL(10,2);
  DECLARE p_stock INT;

  SELECT name, price, stock_qty
  INTO p_name, p_price, p_stock
  FROM products
  WHERE id = pid
  LIMIT 1;

  -- Now use the variables
  IF p_stock = 0 THEN
    UPDATE products SET price = p_price * 1.10 WHERE id = pid;
  END IF;
END//
DELIMITER ;
```

## Inline Assignment Pattern with :=

The `:=` operator is useful when you want to both assign and display the result in one step:

```sql
-- Assign and display simultaneously
SELECT
  @total_orders := COUNT(*),
  @avg_value := AVG(total)
FROM orders
WHERE YEAR(created_at) = 2025;

-- Values are now available for subsequent statements
SELECT @total_orders, @avg_value;
```

## SELECT INTO vs SET

| Approach | Best For |
|---|---|
| `SET @var = (SELECT ...)` | Assigning a subquery result outside procedures |
| `SELECT ... INTO @var` | Single-row result in procedures |
| `SELECT @var := expr` | In-line assignment while displaying results |

```sql
-- These are equivalent for single values
SET @max = (SELECT MAX(price) FROM products);
SELECT MAX(price) INTO @max FROM products;
SELECT @max := MAX(price) FROM products;
```

## Error Handling for Multiple Rows

If your query might return multiple rows, use `LIMIT 1` or add an appropriate `WHERE` clause:

```sql
SELECT name INTO @first_name
FROM customers
WHERE status = 'active'
ORDER BY created_at
LIMIT 1;
```

## Summary

`SELECT INTO` captures query result columns into variables for use in subsequent SQL logic. In stored procedures, use it with `DECLARE`d local variables to build procedural flows. Outside procedures, use the `:=` operator to assign to user-defined variables. Always ensure the query returns exactly one row, or handle the zero-row case with a `NOT FOUND` handler.
