# How to Create Dynamic SQL in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Query

Description: Learn how to create and execute dynamic SQL in MySQL using prepared statements, user-defined variables, and stored procedures for flexible runtime queries.

---

Dynamic SQL refers to SQL statements that are constructed and executed at runtime rather than being fixed at write time. MySQL supports dynamic SQL through prepared statements, which allow you to build query strings in variables and execute them. This is essential for pivot queries, dynamic column lists, and conditional filtering.

## Prepared Statement Basics

Prepared statements use `PREPARE`, `EXECUTE`, and `DEALLOCATE PREPARE`:

```sql
SET @query = 'SELECT * FROM employees WHERE department = ?';

PREPARE stmt FROM @query;
SET @dept = 'Engineering';
EXECUTE stmt USING @dept;
DEALLOCATE PREPARE stmt;
```

The `?` placeholder prevents SQL injection and lets you reuse the same prepared statement with different parameter values.

## Building Dynamic Column Lists

The most common use case for dynamic SQL is generating column lists at runtime, such as for pivot queries:

```sql
SET @columns = NULL;

SELECT GROUP_CONCAT(
  DISTINCT CONCAT('SUM(CASE WHEN MONTH(sale_date) = ', month_num, ' THEN revenue ELSE 0 END) AS `Month_', month_num, '`')
  ORDER BY month_num
) INTO @columns
FROM (SELECT DISTINCT MONTH(sale_date) AS month_num FROM sales) months;

SET @query = CONCAT(
  'SELECT product_id, ', @columns,
  ' FROM sales GROUP BY product_id'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

## Dynamic Table Names

You cannot use parameters for table names, so concatenate them into the query string:

```sql
DELIMITER //

CREATE PROCEDURE query_table(IN table_name VARCHAR(64))
BEGIN
  SET @q = CONCAT('SELECT COUNT(*) FROM `', table_name, '`');
  PREPARE stmt FROM @q;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //

DELIMITER ;

CALL query_table('orders');
```

Always use backtick quoting around table names to handle reserved words and special characters.

## Dynamic WHERE Clause

Build optional filter conditions based on input parameters:

```sql
DELIMITER //

CREATE PROCEDURE search_products(
  IN p_category VARCHAR(50),
  IN p_min_price DECIMAL(10,2)
)
BEGIN
  SET @base = 'SELECT id, name, price FROM products WHERE 1=1';

  IF p_category IS NOT NULL THEN
    SET @base = CONCAT(@base, ' AND category = ?');
    SET @cat = p_category;
  END IF;

  IF p_min_price IS NOT NULL THEN
    SET @base = CONCAT(@base, ' AND price >= ', p_min_price);
  END IF;

  SET @base = CONCAT(@base, ' ORDER BY name');

  PREPARE stmt FROM @base;

  IF p_category IS NOT NULL THEN
    EXECUTE stmt USING @cat;
  ELSE
    EXECUTE stmt;
  END IF;

  DEALLOCATE PREPARE stmt;
END //

DELIMITER ;
```

Note that MySQL prepared statements support only a fixed number of `?` placeholders, so conditionally appended parameters require careful tracking.

## Dynamic ORDER BY

Use `CASE` expressions in `ORDER BY` for dynamic sorting without prepared statements:

```sql
SELECT id, name, price, stock
FROM products
ORDER BY
  CASE WHEN @sort_col = 'price' THEN price END ASC,
  CASE WHEN @sort_col = 'name'  THEN name  END ASC,
  CASE WHEN @sort_col = 'stock' THEN stock END DESC;
```

## Security Considerations

Never interpolate untrusted user input directly into query strings. Use parameterized placeholders (`?`) for values. For identifiers like table and column names, validate them against a whitelist before concatenation:

```sql
-- Validate table name against known tables
IF table_name NOT IN ('orders', 'products', 'customers') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid table name';
END IF;
```

## Summary

Dynamic SQL in MySQL is built using string concatenation into user variables and executed via `PREPARE` and `EXECUTE`. It is most useful for pivot queries with variable column counts, dynamic table names, and conditional filtering. Always use parameterized placeholders for data values and whitelist validation for identifiers to prevent SQL injection.
