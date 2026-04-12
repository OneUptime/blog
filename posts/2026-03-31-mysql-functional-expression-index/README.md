# How to Create a Functional (Expression) Index in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Expression, InnoDB, Performance

Description: Learn how to create functional indexes in MySQL 8 that index the result of an expression, enabling fast queries on computed values and function-based predicates.

---

## What Is a Functional Index?

A functional index (also called an expression index) indexes the result of an expression rather than the raw column value. MySQL 8.0.13 introduced this feature, backed internally by a hidden virtual generated column. It lets you create indexes that support queries containing functions or expressions in the `WHERE` clause.

## Why Use a Functional Index?

Without a functional index, a query like `WHERE LOWER(email) = 'alice@example.com'` performs a full table scan because the index on `email` stores mixed-case values. A functional index on `LOWER(email)` solves this.

## Creating a Functional Index

```sql
-- Index on lowercase email for case-insensitive lookups
CREATE INDEX idx_email_lower ON users ((LOWER(email)));
```

Note the double parentheses - the expression is wrapped in an extra pair of parentheses to distinguish it from a column name.

## Using ALTER TABLE

```sql
ALTER TABLE users ADD INDEX idx_email_lower ((LOWER(email)));
```

## Querying with a Functional Index

The query predicate must match the indexed expression exactly for MySQL to use the index:

```sql
-- Uses idx_email_lower
SELECT id, name FROM users WHERE LOWER(email) = 'alice@example.com';

-- Does NOT use idx_email_lower (different expression)
SELECT id, name FROM users WHERE email = 'alice@example.com';
```

## Common Use Cases

### Date-only lookups on DATETIME columns

```sql
ALTER TABLE orders ADD INDEX idx_order_date ((DATE(created_at)));

SELECT id, total FROM orders WHERE DATE(created_at) = '2025-12-01';
```

### JSON attribute indexing

```sql
ALTER TABLE products
    ADD INDEX idx_color ((CAST(JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.color')) AS CHAR(100))));

SELECT id FROM products
WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.color')) AS CHAR(100)) = 'red';
```

The `CAST` is required because `JSON_UNQUOTE` returns `LONGTEXT`, which cannot be indexed directly. Wrapping the expression in `CAST(... AS CHAR(N))` produces a fixed-length type that MySQL can index.

### Year extraction

```sql
ALTER TABLE invoices ADD INDEX idx_year ((YEAR(invoice_date)));

SELECT COUNT(*) FROM invoices WHERE YEAR(invoice_date) = 2025;
```

## Verifying the Index Is Used

```sql
EXPLAIN SELECT id FROM users WHERE LOWER(email) = 'alice@example.com'\G
```

```text
...
key: idx_email_lower
rows: 1
Extra: Using index
...
```

## Viewing the Functional Index Definition

```sql
SHOW CREATE TABLE users\G
```

The output shows the functional index with the expression in the `KEY` clause, for example `KEY idx_email_lower ((lower(email)))`. Internally, MySQL creates a hidden virtual generated column to store the expression result, but this column is not visible in DDL output. You can inspect it through `information_schema.columns` where the `GENERATION_EXPRESSION` is not empty.

## Limitations

- The expression must be deterministic.
- Spatial and full-text functional indexes are not supported.
- The expression cannot reference columns from other tables.

## Summary

Functional indexes in MySQL 8 allow you to index the output of expressions and functions, enabling efficient queries on computed or transformed values. Use double parentheses to define the expression, ensure your queries reference the exact same expression, and verify with `EXPLAIN` that the functional index is selected by the optimizer.
