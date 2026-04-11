# How to Use MySQL Prepared Statements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Prepared Statement, Security, Performance, Database

Description: Learn how to use MySQL prepared statements to improve query performance through plan reuse and protect against SQL injection attacks.

---

## How Prepared Statements Work

A prepared statement is a SQL query template that MySQL parses once and then executes multiple times with different parameter values. MySQL parses and validates the query during PREPARE, then reuses the parsed representation for each EXECUTE. This provides two key benefits:

1. **Performance** - parsing and validation cost is paid once, not on every execution.
2. **Security** - parameters are passed separately from the SQL text, preventing SQL injection.

```mermaid
sequenceDiagram
    participant App as Application
    participant MySQL as MySQL Server
    App->>MySQL: PREPARE stmt FROM "SELECT ... WHERE id = ?"
    MySQL-->>App: Statement handle
    App->>MySQL: SET @id = 1; EXECUTE stmt USING @id
    MySQL-->>App: Result rows
    App->>MySQL: SET @id = 2; EXECUTE stmt USING @id
    MySQL-->>App: Result rows
    App->>MySQL: DEALLOCATE PREPARE stmt
```

## Syntax: SQL-Level Prepared Statements

```sql
-- Prepare the statement
PREPARE statement_name FROM 'SELECT ... WHERE column = ?';

-- Set variables
SET @variable = value;

-- Execute with variables
EXECUTE statement_name USING @variable1, @variable2;

-- Deallocate when done
DEALLOCATE PREPARE statement_name;
```

The `?` is a placeholder for a parameter. Parameters are positional.

## Examples

### Setup: Create Sample Tables

```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10, 2),
    stock_qty INT
);

CREATE TABLE order_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT,
    product_id INT,
    quantity INT,
    total DECIMAL(10, 2),
    order_date DATE DEFAULT (CURDATE())
);

INSERT INTO products (name, category, price, stock_qty) VALUES
    ('Laptop',   'Electronics', 999.99, 50),
    ('Mouse',    'Electronics',  29.99, 200),
    ('Keyboard', 'Electronics',  59.99, 150),
    ('Desk',     'Furniture',   349.99, 30),
    ('Chair',    'Furniture',   199.99, 45);

INSERT INTO order_history (customer_id, product_id, quantity, total) VALUES
    (1, 1, 1, 999.99),
    (1, 2, 3,  89.97),
    (2, 3, 2, 119.98),
    (3, 1, 1, 999.99),
    (2, 4, 1, 349.99);
```

### Basic Prepared Statement: SELECT

Prepare a query to look up a product by ID.

```sql
PREPARE get_product FROM 'SELECT id, name, price, stock_qty FROM products WHERE id = ?';

SET @product_id = 1;
EXECUTE get_product USING @product_id;
```

```text
+----+--------+--------+-----------+
| id | name   | price  | stock_qty |
+----+--------+--------+-----------+
| 1  | Laptop | 999.99 | 50        |
+----+--------+--------+-----------+
```

```sql
-- Reuse with a different value - no re-parsing
SET @product_id = 3;
EXECUTE get_product USING @product_id;

DEALLOCATE PREPARE get_product;
```

### Multiple Parameters

```sql
PREPARE search_products FROM
    'SELECT id, name, price FROM products WHERE category = ? AND price <= ? ORDER BY price';

SET @category = 'Electronics';
SET @max_price = 100.00;
EXECUTE search_products USING @category, @max_price;
```

```text
+----+----------+-------+
| id | name     | price |
+----+----------+-------+
| 2  | Mouse    | 29.99 |
| 3  | Keyboard | 59.99 |
+----+----------+-------+
```

```sql
-- Reuse for Furniture under $400
SET @category = 'Furniture';
SET @max_price = 400.00;
EXECUTE search_products USING @category, @max_price;

DEALLOCATE PREPARE search_products;
```

### Prepared INSERT

```sql
PREPARE insert_order FROM
    'INSERT INTO order_history (customer_id, product_id, quantity, total) VALUES (?, ?, ?, ?)';

SET @cust = 4;
SET @prod = 2;
SET @qty  = 5;
SET @tot  = 149.95;
EXECUTE insert_order USING @cust, @prod, @qty, @tot;

-- Batch insert more orders
SET @cust = 4; SET @prod = 3; SET @qty = 2; SET @tot = 119.98;
EXECUTE insert_order USING @cust, @prod, @qty, @tot;

DEALLOCATE PREPARE insert_order;
```

### Dynamic SQL with PREPARE

PREPARE can also execute a dynamically constructed SQL string. This is MySQL's way of doing dynamic SQL.

```sql
-- Build a query string dynamically
SET @table = 'products';
SET @sql = CONCAT('SELECT COUNT(*) AS row_count FROM ', @table);

PREPARE dynamic_count FROM @sql;
EXECUTE dynamic_count;
DEALLOCATE PREPARE dynamic_count;
```

Note: When using dynamic SQL, validate and sanitize the table/column names yourself - parameter placeholders (`?`) only work for values, not identifiers.

### Prepared CALL for Stored Procedures

```sql
DELIMITER $$
CREATE PROCEDURE GetProductsByCat(IN p_cat VARCHAR(50))
BEGIN
    SELECT * FROM products WHERE category = p_cat;
END$$
DELIMITER ;

PREPARE call_proc FROM 'CALL GetProductsByCat(?)';
SET @cat = 'Electronics';
EXECUTE call_proc USING @cat;
DEALLOCATE PREPARE call_proc;
```

### Client-Side Prepared Statements (Application Layer)

In application code, prepared statements are handled by the MySQL driver. Here is how they look in common languages:

```sql
-- Python (mysql-connector-python)
-- cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))

-- Node.js (mysql2)
-- connection.execute("SELECT * FROM products WHERE id = ?", [productId])

-- PHP (PDO)
-- $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
-- $stmt->execute([$productId]);

-- Java (JDBC)
-- PreparedStatement ps = conn.prepareStatement("SELECT * FROM products WHERE id = ?");
-- ps.setInt(1, productId);
-- ResultSet rs = ps.executeQuery();
```

Client-side prepared statements work the same way - the query is compiled once per connection and reused with different parameter values.

## SQL Injection Prevention

Without prepared statements, concatenating user input into SQL is dangerous:

```sql
-- UNSAFE: direct string concatenation (SQL injection risk)
-- User input: "1; DROP TABLE products; --"
SET @unsafe = CONCAT('SELECT * FROM products WHERE id = ', user_input);
-- Executes: SELECT * FROM products WHERE id = 1; DROP TABLE products; --

-- SAFE: prepared statement - user input is always treated as a value, never SQL
PREPARE safe_query FROM 'SELECT * FROM products WHERE id = ?';
SET @user_input = '1; DROP TABLE products; --';
EXECUTE safe_query USING @user_input;
-- MySQL treats @user_input as a string value, not SQL code
-- Returns 0 rows (no product with that weird ID) - safe
DEALLOCATE PREPARE safe_query;
```

## Best Practices

- Always use prepared statements in application code when queries include user-supplied values.
- Prepared statements at the SQL level (PREPARE/EXECUTE) are session-scoped and deallocated when the session ends. Explicitly DEALLOCATE when done to free server resources.
- Use client-side prepared statements (via the MySQL driver) for application code - they are more ergonomic and automatically handle deallocating.
- Parameter placeholders (`?`) work for values (strings, numbers, dates) but not for table names, column names, or SQL keywords. Use whitelisting or other validation for dynamic identifiers.
- In stored procedures, use prepared statements for truly dynamic queries; for static queries, regular SQL is simpler and equivalent in performance.

## Summary

MySQL prepared statements parse a query template once and execute it multiple times with different parameter values. They prevent SQL injection by treating parameters as data values, never as SQL code. At the SQL level, use PREPARE, EXECUTE, and DEALLOCATE PREPARE. In application code, use the MySQL driver's native prepared statement support - all major MySQL drivers (Python, Node.js, PHP, Java) support parameterized queries that provide equivalent protection against SQL injection. Prepared statements are a security requirement, not just a performance optimization.
