# How to Use PREPARE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Prepared Statement, SQL, Security

Description: Learn how to use the PREPARE statement in MySQL to create parameterized queries that improve performance and prevent SQL injection attacks.

---

## What is the PREPARE Statement

MySQL's `PREPARE` statement allows you to create a prepared (pre-compiled) SQL statement that can be executed multiple times with different parameters. Prepared statements help improve performance for repeated queries and are a key defense against SQL injection.

The workflow involves three steps:
1. `PREPARE` - parse and compile the statement
2. `EXECUTE` - run the statement with parameters
3. `DEALLOCATE PREPARE` - release the statement from memory

## Basic Syntax

```sql
PREPARE stmt_name FROM 'SQL statement with ? placeholders';
SET @param = value;
EXECUTE stmt_name USING @param;
DEALLOCATE PREPARE stmt_name;
```

## Simple SELECT Example

```sql
PREPARE get_user FROM 'SELECT id, name, email FROM users WHERE id = ?';
SET @user_id = 5;
EXECUTE get_user USING @user_id;
DEALLOCATE PREPARE get_user;
```

## Using Multiple Parameters

Separate parameters with commas in the `USING` clause:

```sql
PREPARE search_products FROM
  'SELECT * FROM products WHERE category = ? AND price < ? ORDER BY price';

SET @cat = 'Electronics';
SET @max_price = 500.00;

EXECUTE search_products USING @cat, @max_price;
DEALLOCATE PREPARE search_products;
```

## INSERT with PREPARE

```sql
PREPARE insert_order FROM
  'INSERT INTO orders (user_id, product_id, quantity) VALUES (?, ?, ?)';

SET @uid = 10;
SET @pid = 42;
SET @qty = 3;

EXECUTE insert_order USING @uid, @pid, @qty;
DEALLOCATE PREPARE insert_order;
```

## UPDATE with PREPARE

```sql
PREPARE update_status FROM
  'UPDATE orders SET status = ? WHERE order_id = ?';

SET @status = 'shipped';
SET @order_id = 1001;

EXECUTE update_status USING @status, @order_id;
DEALLOCATE PREPARE update_status;
```

## Dynamic Table or Column Names

Prepared statements do not allow table names as parameters directly, but you can build dynamic SQL using a session variable:

```sql
SET @table = 'orders';
SET @sql = CONCAT('SELECT COUNT(*) FROM ', @table);

PREPARE dynamic_count FROM @sql;
EXECUTE dynamic_count;
DEALLOCATE PREPARE dynamic_count;
```

Note: Using dynamic table names requires careful validation to prevent SQL injection since they cannot be parameterized.

## Re-executing with Different Parameters

One of the main benefits of prepared statements is reuse:

```sql
PREPARE get_product FROM 'SELECT * FROM products WHERE id = ?';

SET @id = 1;
EXECUTE get_product USING @id;

SET @id = 2;
EXECUTE get_product USING @id;

SET @id = 3;
EXECUTE get_product USING @id;

DEALLOCATE PREPARE get_product;
```

## Using PREPARE in Stored Procedures

```sql
DELIMITER //
CREATE PROCEDURE fetch_orders_by_status(IN p_status VARCHAR(50))
BEGIN
  SET @s = p_status;
  PREPARE stmt FROM 'SELECT * FROM orders WHERE status = ?';
  EXECUTE stmt USING @s;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

CALL fetch_orders_by_status('pending');
```

## Checking Prepared Statement Limitations

- Prepared statements are session-scoped and not visible to other connections.
- Maximum of 16,382 prepared statements across all sessions on the server (controlled by the global `max_prepared_stmt_count` variable).
- `?` placeholders can only replace data values, not identifiers (table/column names).

```sql
SHOW VARIABLES LIKE 'max_prepared_stmt_count';
```

## Summary

The MySQL `PREPARE` statement compiles a SQL query once and allows it to be executed multiple times with different parameters using `EXECUTE ... USING`. This improves performance for repeated queries and provides built-in protection against SQL injection for data values. Always call `DEALLOCATE PREPARE` to free memory when the statement is no longer needed.
