# How to Use MySQL Stored Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Stored Procedure, Database, Procedural SQL

Description: Learn how to create and use MySQL stored procedures to encapsulate reusable business logic, including parameters, loops, conditionals, and error handling.

---

## How Stored Procedures Work

A stored procedure is a named, compiled set of SQL statements stored in the database. It can accept input parameters, produce output parameters, execute conditional logic, loops, and complex SQL - all on the database server. Procedures reduce network round trips by moving logic closer to the data.

```mermaid
graph TD
    A[Application calls: CALL procedure_name(args)] --> B[MySQL executes stored procedure]
    B --> C[Runs SQL statements, loops, conditionals]
    C --> D[Returns result sets and OUT parameters]
    D --> E[Application receives results]
```

## Syntax

```sql
DELIMITER $$

CREATE PROCEDURE procedure_name (
    IN  param1 DATATYPE,
    OUT param2 DATATYPE,
    INOUT param3 DATATYPE
)
BEGIN
    -- SQL statements
    -- Declare local variables
    -- Conditionals, loops, error handling
END$$

DELIMITER ;
```

The `DELIMITER` command changes the statement terminator temporarily so the procedure body's semicolons don't end the CREATE statement prematurely.

## Examples

### Setup: Create Sample Tables

```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10, 2),
    stock_qty INT DEFAULT 0
);

CREATE TABLE order_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,
    quantity INT,
    total_price DECIMAL(10, 2),
    order_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, category, price, stock_qty) VALUES
    ('Laptop',   'Electronics', 999.99, 50),
    ('Mouse',    'Electronics',  29.99, 200),
    ('Keyboard', 'Electronics',  59.99, 150),
    ('Desk',     'Furniture',   349.99, 30),
    ('Chair',    'Furniture',   199.99, 45);
```

### Simple Procedure: No Parameters

```sql
DELIMITER $$

CREATE PROCEDURE GetAllProducts()
BEGIN
    SELECT id, name, category, price, stock_qty
    FROM products
    ORDER BY category, name;
END$$

DELIMITER ;

-- Call the procedure
CALL GetAllProducts();
```

### Procedure with IN Parameter

```sql
DELIMITER $$

CREATE PROCEDURE GetProductsByCategory(IN p_category VARCHAR(50))
BEGIN
    SELECT id, name, price, stock_qty
    FROM products
    WHERE category = p_category
    ORDER BY price;
END$$

DELIMITER ;

CALL GetProductsByCategory('Electronics');
```

```text
+----+----------+--------+-----------+
| id | name     | price  | stock_qty |
+----+----------+--------+-----------+
| 2  | Mouse    |  29.99 | 200       |
| 3  | Keyboard |  59.99 | 150       |
| 1  | Laptop   | 999.99 |  50       |
+----+----------+--------+-----------+
```

### Procedure with OUT Parameter

```sql
DELIMITER $$

CREATE PROCEDURE GetCategoryTotal(
    IN  p_category VARCHAR(50),
    OUT p_total    DECIMAL(12, 2)
)
BEGIN
    SELECT SUM(price * stock_qty)
    INTO p_total
    FROM products
    WHERE category = p_category;
END$$

DELIMITER ;

-- Call and read the output parameter
CALL GetCategoryTotal('Electronics', @total);
SELECT @total AS electronics_inventory_value;
```

```text
+-----------------------------+
| electronics_inventory_value |
+-----------------------------+
| 64996.00                    |
+-----------------------------+
```

### Procedure with Conditional Logic

```sql
DELIMITER $$

CREATE PROCEDURE PlaceOrder(
    IN  p_product_id INT,
    IN  p_quantity   INT,
    OUT p_status     VARCHAR(50)
)
BEGIN
    DECLARE v_stock INT;
    DECLARE v_price DECIMAL(10, 2);

    -- Check stock
    SELECT stock_qty, price
    INTO v_stock, v_price
    FROM products
    WHERE id = p_product_id;

    IF v_stock IS NULL THEN
        SET p_status = 'ERROR: Product not found';
    ELSEIF v_stock < p_quantity THEN
        SET p_status = CONCAT('ERROR: Insufficient stock. Available: ', v_stock);
    ELSE
        -- Deduct stock and log order
        UPDATE products
        SET stock_qty = stock_qty - p_quantity
        WHERE id = p_product_id;

        INSERT INTO order_log (product_id, quantity, total_price)
        VALUES (p_product_id, p_quantity, p_quantity * v_price);

        SET p_status = CONCAT('SUCCESS: Order placed. Total: $',
                              FORMAT(p_quantity * v_price, 2));
    END IF;
END$$

DELIMITER ;

CALL PlaceOrder(1, 5, @status);
SELECT @status;
```

```text
+---------------------------------------------+
| @status                                     |
+---------------------------------------------+
| SUCCESS: Order placed. Total: $4,999.95     |
+---------------------------------------------+
```

### Procedure with LOOP

```sql
DELIMITER $$

CREATE PROCEDURE GenerateTestOrders(IN p_count INT)
BEGIN
    DECLARE i INT DEFAULT 1;

    WHILE i <= p_count DO
        INSERT INTO order_log (product_id, quantity, total_price)
        VALUES (
            1 + (i MOD 5),
            1 + (i MOD 10),
            ROUND(RAND() * 500, 2)
        );
        SET i = i + 1;
    END WHILE;

    SELECT CONCAT(p_count, ' test orders generated') AS result;
END$$

DELIMITER ;

CALL GenerateTestOrders(20);
```

### Managing Stored Procedures

```sql
-- List all stored procedures in the current database
SHOW PROCEDURE STATUS WHERE Db = DATABASE();

-- View the CREATE statement for a procedure
SHOW CREATE PROCEDURE PlaceOrder;

-- Drop a procedure
DROP PROCEDURE IF EXISTS PlaceOrder;
```

## Best Practices

- Use `DELIMITER $$` (or `//`) to avoid conflicts with the semicolons inside the procedure body.
- Declare all local variables with `DECLARE` at the top of the BEGIN block before any other statements.
- Use `IF ... ELSEIF ... ELSE ... END IF` rather than nesting multiple IF blocks.
- Add a `DECLARE ... HANDLER FOR SQLEXCEPTION` block to catch and handle errors gracefully.
- Keep procedures focused on one task. Avoid mega-procedures that do unrelated operations.
- Grant minimal `EXECUTE` privileges to application users rather than broader DDL permissions.

## Summary

MySQL stored procedures encapsulate reusable SQL logic on the server side. They support IN, OUT, and INOUT parameters, local variables, conditional logic (IF/CASE), loops (WHILE/REPEAT/LOOP), and multiple result sets. Procedures reduce network overhead by running complex multi-step operations directly on the database server. Use them for batch processing, multi-step transactions, and business logic that must be enforced at the database layer.
