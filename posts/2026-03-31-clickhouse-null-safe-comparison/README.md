# How to Use NULL-safe Comparisons in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL Handling, Comparison, Query Pattern, Analytics

Description: Learn how to write NULL-safe comparisons in ClickHouse using isNull(), isNotNull(), equals(), and the NULL-safe equality operator to avoid silent NULL-related logic errors.

---

In standard SQL and ClickHouse, any comparison involving NULL returns NULL (not true or false): `NULL = NULL` is NULL, `NULL != 5` is NULL, and `NULL IN (1, 2, NULL)` is NULL. This means standard equality operators silently drop NULL rows from WHERE clauses and JOIN conditions. ClickHouse provides several functions and operators to write NULL-safe comparisons: `isNull(x)`, `isNotNull(x)`, and the NULL-safe equality function `isNotDistinctFrom(a, b)` (or the `<=>` operator). Understanding these tools is essential for correct filtering of nullable columns.

## Setup: Table with Nullable Columns

```sql
CREATE TABLE products
(
    product_id   UInt64,
    name         String,
    category     Nullable(String),
    price        Nullable(Float64),
    discount_pct Nullable(Float64)
)
ENGINE = MergeTree()
ORDER BY product_id;
```

```sql
INSERT INTO products VALUES
    (1, 'Laptop',    'Electronics', 999.0,  10.0),
    (2, 'Notebook',  'Stationery',  5.0,    NULL),
    (3, 'Headphones','Electronics', 149.0,  5.0),
    (4, 'Pen',       NULL,          1.5,    NULL),
    (5, 'Monitor',   'Electronics', NULL,   15.0),
    (6, 'Stapler',   NULL,          12.0,   NULL);
```

## The NULL Trap: Standard Equality

```sql
-- Standard equality does NOT match NULL values
SELECT product_id, name, category
FROM products
WHERE category = 'Electronics';
-- Returns only rows where category IS 'Electronics', not where category IS NULL
```

```sql
-- This also returns nothing for NULLs
SELECT product_id FROM products WHERE category = NULL;  -- always empty
SELECT product_id FROM products WHERE category != NULL; -- always empty
```

## isNull() and isNotNull()

```sql
-- Correct way to test for NULL
SELECT product_id, name, category
FROM products
WHERE isNull(category);
```

```text
product_id  name     category
4           Pen      NULL
6           Stapler  NULL
```

```sql
-- Correct way to test for non-NULL
SELECT product_id, name, category
FROM products
WHERE isNotNull(category);
```

```text
product_id  name        category
1           Laptop      Electronics
2           Notebook    Stationery
3           Headphones  Electronics
5           Monitor     Electronics
```

## IS NULL / IS NOT NULL Syntax

ClickHouse supports the standard SQL syntax as well:

```sql
SELECT product_id, name
FROM products
WHERE category IS NULL;

SELECT product_id, name
FROM products
WHERE price IS NOT NULL;
```

Both `isNull(x)` and `x IS NULL` are equivalent.

## NULL-Safe Equality with equals()

In ClickHouse, the `equals(a, b)` function (and the `=` operator) return NULL when either argument is NULL. For NULL-safe equality where `NULL = NULL` should be `1`, use `a IS NOT DISTINCT FROM b` logic, which in ClickHouse translates to:

```sql
-- NULL-safe equality: treats NULL as equal to NULL
SELECT
    a,
    b,
    (a = b)                                       AS standard_equals,      -- NULL if either is NULL
    (isNull(a) AND isNull(b)) OR (isNotNull(a) AND isNotNull(b) AND a = b)
                                                  AS null_safe_equals       -- true if both NULL
FROM (
    SELECT *
    FROM (VALUES
        (1,    1   ),
        (1,    2   ),
        (NULL, NULL),
        (NULL, 1   ),
        (1,    NULL)
    ) AS t(a, b)
);
```

```text
a     b     standard_equals  null_safe_equals
1     1     1                1
1     2     0                0
NULL  NULL  NULL             1
NULL  1     NULL             0
1     NULL  NULL             0
```

## Using isNotDistinctFrom() (ClickHouse-specific)

ClickHouse provides `isNotDistinctFrom(a, b)` (and the `<=>` operator, since v25.10) for NULL-safe equality in a single function:

```sql
SELECT
    product_id,
    category,
    isNotDistinctFrom(category, 'Electronics') AS is_electronics,
    isNotDistinctFrom(category, NULL)           AS is_null_category
FROM products
ORDER BY product_id;
```

```text
product_id  category     is_electronics  is_null_category
1           Electronics  1               0
2           Stationery   0               0
3           Electronics  1               0
4           NULL         0               1
5           Electronics  1               0
6           NULL         0               1
```

## Filtering with NULL-safe Inequality

```sql
-- Find products that are NOT in Electronics (including those with NULL category)
SELECT product_id, name, category
FROM products
WHERE NOT isNotDistinctFrom(category, 'Electronics');
```

```text
product_id  name     category
2           Notebook Stationery
4           Pen      NULL
6           Stapler  NULL
```

## NULL-Safe Comparisons in GROUP BY and HAVING

```sql
-- Group by category with NULL as its own bucket, then filter
SELECT
    ifNull(category, 'Uncategorized') AS category_label,
    count()   AS product_count,
    avg(price) AS avg_price
FROM products
GROUP BY category_label
HAVING isNotNull(avg_price)
ORDER BY avg_price DESC;
```

## Using multiIf for NULL-Safe Conditional Logic

```sql
SELECT
    product_id,
    name,
    price,
    discount_pct,
    multiIf(
        isNull(price),        'No price set',
        isNull(discount_pct), 'Full price',
        discount_pct >= 10,   'Good deal',
        'Minor discount'
    ) AS deal_status
FROM products
ORDER BY product_id;
```

```text
product_id  name        price  discount_pct  deal_status
1           Laptop      999.0  10.0          Good deal
2           Notebook    5.0    NULL          Full price
3           Headphones  149.0  5.0           Minor discount
4           Pen         1.5    NULL          Full price
5           Monitor     NULL   15.0          No price set
6           Stapler     12.0   NULL          Full price
```

## NULL-safe JOIN Key Handling

```sql
CREATE TABLE categories
(
    category_name String,
    department    String
)
ENGINE = MergeTree()
ORDER BY category_name;
```

```sql
INSERT INTO categories VALUES
    ('Electronics', 'Tech'),
    ('Stationery', 'Office');
```

```sql
-- LEFT JOIN: products with NULL category get NULL department
-- Use ifNull to assign a default department
SELECT
    p.product_id,
    p.name,
    ifNull(p.category, 'Uncategorized')  AS category,
    ifNull(c.department, 'Unassigned')   AS department
FROM products AS p
LEFT JOIN categories AS c ON p.category = c.category_name
ORDER BY p.product_id;
```

## Counting NULLs Across Multiple Columns

```sql
-- How many columns are NULL per row
SELECT
    product_id,
    name,
    isNull(category)     + isNull(price) + isNull(discount_pct) AS null_column_count
FROM products
ORDER BY null_column_count DESC, product_id;
```

```text
product_id  name        null_column_count
4           Pen         2
6           Stapler     2
2           Notebook    1
5           Monitor     1
1           Laptop      0
3           Headphones  0
```

## Summary

Standard equality operators treat NULL as unknown and return NULL rather than true or false, silently excluding NULL rows from filters and joins. Use `isNull(x)` / `isNotNull(x)` (or `x IS NULL` / `x IS NOT NULL`) for explicit NULL checks. Use `isNotDistinctFrom(a, b)` (or `a <=> b`) for NULL-safe equality where `NULL = NULL` evaluates to `1`. In `GROUP BY`, use `ifNull` to merge NULL into a named bucket. Combine `isNull` with `multiIf` and `ifNull` to build fully NULL-aware conditional logic without silent data loss.
