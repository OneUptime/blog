# How to Use Stored Functions in SELECT Statements in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Function, SELECT, Query, Performance

Description: Learn how to call MySQL stored functions inside SELECT, WHERE, ORDER BY, and GROUP BY clauses with practical examples and performance tips.

---

MySQL stored functions return a single scalar value and can appear anywhere in a SQL statement that accepts an expression. This makes them powerful tools for encapsulating business logic that multiple queries need to share.

## Calling a Function in the SELECT List

The most common use is adding a computed column to query results:

```sql
-- First create a simple helper function
DELIMITER //
CREATE FUNCTION full_name(p_first VARCHAR(50), p_last VARCHAR(50))
RETURNS VARCHAR(101)
DETERMINISTIC
BEGIN
    RETURN CONCAT(p_first, ' ', p_last);
END //
DELIMITER ;

-- Use it in a SELECT
SELECT
    id,
    full_name(first_name, last_name) AS display_name,
    email
FROM users
LIMIT 10;
```

The function is invoked once per row returned, just like a built-in function.

## Using a Function in the WHERE Clause

Stored functions can filter rows:

```sql
DELIMITER //
CREATE FUNCTION age_in_years(p_birthdate DATE)
RETURNS INT
NOT DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_birthdate, CURDATE());
END //
DELIMITER ;

-- Find all adults
SELECT id, first_name, birthdate
FROM users
WHERE age_in_years(birthdate) >= 18;
```

Be aware that when a function wraps a column in a `WHERE` clause, the optimizer cannot use an index on that column. For high-frequency queries on large tables, consider adding a generated column with an index instead.

## Using a Function in ORDER BY

```sql
SELECT product_id, name, price
FROM products
ORDER BY calculate_discount_price(price, category_id) ASC;
```

## Using a Function in GROUP BY and HAVING

```sql
DELIMITER //
CREATE FUNCTION price_tier(p_price DECIMAL(10,2))
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    RETURN CASE
        WHEN p_price < 25  THEN 'Budget'
        WHEN p_price < 100 THEN 'Mid-range'
        ELSE 'Premium'
    END;
END //
DELIMITER ;

SELECT
    price_tier(price) AS tier,
    COUNT(*)          AS product_count,
    AVG(price)        AS avg_price
FROM products
GROUP BY price_tier(price)
HAVING COUNT(*) > 5;
```

## Nesting Function Calls

Stored functions compose just like built-in functions:

```sql
SELECT
    id,
    UPPER(full_name(first_name, last_name)) AS upper_name
FROM users;
```

## Performance Considerations

Every row in the result set triggers a function call. For queries scanning millions of rows this can be slow. Use `EXPLAIN` to check estimated rows, and consider:

```sql
-- Check whether a query using a function reads many rows
EXPLAIN SELECT id, full_name(first_name, last_name) AS name
FROM users
WHERE age_in_years(birthdate) < 30;
```

If the `rows` estimate is large, redesign with computed/generated columns or move the logic into the application layer.

## Summary

MySQL stored functions integrate naturally into `SELECT`, `WHERE`, `ORDER BY`, `GROUP BY`, and `HAVING` clauses. They are ideal for centralizing reusable scalar computations, but watch for index bypass issues when functions wrap indexed columns in filter conditions.
