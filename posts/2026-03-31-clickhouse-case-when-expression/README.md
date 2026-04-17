# How to Use CASE WHEN Expression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Conditional Function, CASE WHEN, SQL, Aggregation

Description: Learn how to use CASE WHEN in ClickHouse for value mapping, conditional aggregation, and complex classification with standard SQL syntax.

---

`CASE WHEN` is standard SQL syntax supported in ClickHouse. It comes in two forms: the "searched" form that evaluates boolean conditions, and the "simple" form that compares a single expression to a list of values. Both forms are fully supported in ClickHouse and work anywhere an expression is valid, including inside aggregate functions.

## Searched CASE WHEN

The searched form evaluates each condition independently. Conditions are checked in order, and the first matching `THEN` result is returned.

```sql
-- Classify orders by amount
SELECT
    order_id,
    amount,
    CASE
        WHEN amount >= 1000 THEN 'enterprise'
        WHEN amount >= 500  THEN 'premium'
        WHEN amount >= 100  THEN 'standard'
        ELSE 'basic'
    END AS order_tier
FROM orders
LIMIT 10;
```

## Simple CASE Expression

The simple form compares one expression to multiple values using equality.

```sql
-- Map status codes to descriptions
SELECT
    order_id,
    status,
    CASE status
        WHEN 'P' THEN 'pending'
        WHEN 'C' THEN 'confirmed'
        WHEN 'S' THEN 'shipped'
        WHEN 'D' THEN 'delivered'
        WHEN 'X' THEN 'cancelled'
        ELSE 'unknown'
    END AS status_label
FROM orders
LIMIT 10;
```

## Conditional Aggregation with CASE WHEN

One of the most powerful uses of `CASE WHEN` is inside aggregate functions to compute conditional sums or counts in a single pass.

```sql
-- Count and sum by category in one query
SELECT
    toDate(event_time) AS event_date,
    SUM(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS purchases,
    SUM(CASE WHEN event_type = 'refund'   THEN 1 ELSE 0 END) AS refunds,
    SUM(CASE WHEN event_type = 'purchase' THEN amount ELSE 0 END) AS purchase_revenue,
    SUM(CASE WHEN event_type = 'refund'   THEN amount ELSE 0 END) AS refund_amount
FROM transactions
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 30;
```

## Using CASE WHEN in WHERE Clauses

`CASE WHEN` can be used in `WHERE` clauses, though it is less common. Often a direct condition is cleaner.

```sql
-- Filter using CASE WHEN result
SELECT
    user_id,
    email
FROM users
WHERE
    CASE
        WHEN country = 'US' AND age >= 21 THEN 1
        WHEN country != 'US' AND age >= 18 THEN 1
        ELSE 0
    END = 1
LIMIT 10;
```

## CASE WHEN with NULL Handling

```sql
-- Handle NULL values in CASE WHEN
SELECT
    user_id,
    CASE
        WHEN phone IS NULL AND email IS NULL THEN 'no contact'
        WHEN phone IS NULL                   THEN 'email only'
        WHEN email IS NULL                   THEN 'phone only'
        ELSE 'full contact'
    END AS contact_status
FROM users
LIMIT 10;
```

## Pivoting Data with CASE WHEN

A classic use of conditional aggregation is pivoting rows into columns.

```sql
-- Pivot monthly revenue into columns
SELECT
    product_id,
    SUM(CASE WHEN toMonth(sale_date) = 1  THEN revenue ELSE 0 END) AS jan,
    SUM(CASE WHEN toMonth(sale_date) = 2  THEN revenue ELSE 0 END) AS feb,
    SUM(CASE WHEN toMonth(sale_date) = 3  THEN revenue ELSE 0 END) AS mar,
    SUM(CASE WHEN toMonth(sale_date) = 4  THEN revenue ELSE 0 END) AS apr,
    SUM(CASE WHEN toMonth(sale_date) = 5  THEN revenue ELSE 0 END) AS may,
    SUM(CASE WHEN toMonth(sale_date) = 6  THEN revenue ELSE 0 END) AS jun
FROM sales
WHERE toYear(sale_date) = 2025
GROUP BY product_id
ORDER BY product_id
LIMIT 20;
```

## CASE WHEN vs multiIf()

```sql
-- CASE WHEN (standard SQL, more portable)
SELECT
    score,
    CASE
        WHEN score >= 90 THEN 'A'
        WHEN score >= 80 THEN 'B'
        ELSE 'C'
    END AS grade_case
FROM (SELECT 85 AS score);

-- multiIf() (ClickHouse-specific, slightly more concise)
SELECT
    score,
    multiIf(score >= 90, 'A', score >= 80, 'B', 'C') AS grade_multiif
FROM (SELECT 85 AS score);
```

Both produce identical results. Use `CASE WHEN` when you want standard SQL portability. Use `multiIf()` when you want more concise ClickHouse-specific syntax.

## ORDER BY with CASE WHEN

Apply custom sort order using `CASE WHEN` in `ORDER BY`.

```sql
-- Sort by custom priority order
SELECT
    ticket_id,
    priority,
    created_at
FROM support_tickets
ORDER BY
    CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high'     THEN 2
        WHEN 'medium'   THEN 3
        WHEN 'low'      THEN 4
        ELSE 5
    END ASC,
    created_at ASC
LIMIT 20;
```

## Summary

`CASE WHEN` is standard SQL syntax that works everywhere an expression is valid in ClickHouse - in `SELECT`, `WHERE`, `ORDER BY`, `HAVING`, and inside aggregate functions. The searched form evaluates conditions independently; the simple form compares one expression to multiple values. Conditional aggregation with `SUM(CASE WHEN ...)` and `COUNT(CASE WHEN ...)` is one of the most powerful patterns in analytics SQL.
