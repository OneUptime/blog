# How to Choose Between IN and EXISTS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, IN, EXISTS, Performance, Subqueries, Query Optimization

Description: Understand the performance and semantic differences between IN and EXISTS in MySQL to choose the right operator for your queries.

---

## Overview: IN vs EXISTS

Both `IN` and `EXISTS` can filter rows based on related data in a subquery, but they work differently internally and have different performance characteristics depending on the data.

```sql
-- Using IN
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders);

-- Using EXISTS
SELECT * FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

## How They Work

```sql
-- IN: The subquery is evaluated ONCE, producing a set of values
-- Then the outer query filters by checking membership in that set
SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE status = 'completed');
-- MySQL executes: SELECT customer_id FROM orders WHERE status = 'completed'
-- Then checks each customer.id against the resulting set

-- EXISTS: The subquery is a correlated subquery evaluated FOR EACH outer row
-- It stops as soon as one matching row is found (short-circuit)
SELECT name FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.id AND o.status = 'completed'
);
```

## Performance Comparison

```sql
-- Case 1: Large outer table, small subquery result
-- IN is often faster (subquery runs once, small set for membership check)
SELECT name FROM large_customers_table
WHERE id IN (SELECT customer_id FROM vip_list);  -- vip_list has 100 rows

-- Case 2: Small outer table, large subquery result
-- EXISTS is often faster (stops at first match, no huge set to build)
SELECT name FROM small_vip_list v
WHERE EXISTS (
    SELECT 1 FROM million_row_orders o WHERE o.customer_id = v.id
);

-- Case 3: Both tables are large with indexes
-- Modern MySQL (8.0+) optimizes both similarly via semi-join transformations
-- Measure with EXPLAIN ANALYZE
```

## NULL Handling Difference - Critical

This is the most important difference. `NOT IN` has a NULL trap that `NOT EXISTS` avoids:

```sql
-- Setup
CREATE TABLE A (id INT);
CREATE TABLE B (id INT);
INSERT INTO A VALUES (1), (2), (3);
INSERT INTO B VALUES (1), (2), (NULL);

-- NOT IN with NULL: returns 0 rows (because NULL comparison is UNKNOWN)
SELECT * FROM A WHERE id NOT IN (SELECT id FROM B);
-- Returns NOTHING because B contains NULL

-- NOT EXISTS: handles NULL correctly
SELECT * FROM A a
WHERE NOT EXISTS (SELECT 1 FROM B b WHERE b.id = a.id);
-- Returns 3 (id not found in non-NULL B rows)

-- Fix for NOT IN when NULLs possible:
SELECT * FROM A WHERE id NOT IN (
    SELECT id FROM B WHERE id IS NOT NULL  -- Explicitly exclude NULLs
);
```

## When to Use IN

```sql
-- Use IN when:
-- 1. The subquery result set is small
-- 2. The subquery is non-correlated (no reference to outer query)
-- 3. You have a static list of values

-- Static list (always use IN)
SELECT * FROM products WHERE category IN ('Electronics', 'Books', 'Clothing');

-- Small subquery result
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM premium_customers);

-- IN with non-correlated subquery (runs once)
SELECT name FROM employees
WHERE department_id IN (
    SELECT id FROM departments WHERE location = 'New York'
);
```

## When to Use EXISTS

```sql
-- Use EXISTS when:
-- 1. The subquery is correlated (references outer query)
-- 2. The related table is large and you need short-circuit behavior
-- 3. You are checking existence of related records (NOT just matching values)
-- 4. You use NOT EXISTS (avoids NULL trap)

-- Correlated subquery
SELECT c.name FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.id
      AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
);

-- Anti-join with NOT EXISTS (safer than NOT IN)
SELECT p.name FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
);
```

## Using EXPLAIN to Compare

```sql
-- Check execution plan for both approaches
EXPLAIN SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE status = 'completed');

EXPLAIN SELECT name FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.id AND o.status = 'completed'
);

-- In MySQL 8.0+, use EXPLAIN ANALYZE for actual timing
EXPLAIN ANALYZE SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE status = 'completed');
```

## Quick Decision Guide

```text
Situation                                | Use
-----------------------------------------|------------
Static list of values                    | IN
Small subquery result                    | IN
Large subquery result                    | EXISTS
Correlated subquery                      | EXISTS
NOT with possible NULLs in subquery      | NOT EXISTS
Just checking existence (not values)     | EXISTS
MySQL 8.0+ with good indexes             | Either (optimizer handles both)
```

## Summary

Choose `IN` for non-correlated subqueries with small result sets and for static value lists. Choose `EXISTS` for correlated subqueries, large related tables, and anytime you use `NOT` (to avoid the NULL trap that `NOT IN` suffers from). In modern MySQL 8.0+, the optimizer often rewrites `IN` and `EXISTS` to equivalent execution plans, but `NOT EXISTS` remains the safer choice over `NOT IN` whenever the subquery column could contain NULL values.
