# What Is a Functional Index in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Functional Index, Index

Description: Learn what a MySQL functional index is, how to index the result of an expression or function, and when functional indexes enable queries that regular indexes cannot optimize.

---

A functional index (also called an expression index) in MySQL 8.0.13+ allows you to index the result of an expression or function rather than a raw column value. This enables the query optimizer to use an index for queries that apply functions to columns - a pattern that normally prevents index usage.

## Why Functional Indexes Exist

A fundamental rule in MySQL index optimization is that applying a function to an indexed column in a WHERE clause prevents the index from being used.

```sql
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_email (email),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Function on column: index NOT used
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
-- type: ALL (full scan - idx_email not used because of LOWER())

SELECT * FROM users WHERE YEAR(created_at) = 2025;
-- type: ALL (full scan - idx_created not used because of YEAR())
```

Functional indexes solve this by precomputing and storing the expression result.

## Creating a Functional Index

Functional index expressions must be wrapped in parentheses.

```sql
-- Index on LOWER(email) for case-insensitive searches
ALTER TABLE users ADD INDEX idx_email_lower ((LOWER(email)));

-- Now this query uses the index
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
-- type: ref (index used!)

-- Index on YEAR(created_at)
ALTER TABLE users ADD INDEX idx_year ((YEAR(created_at)));

SELECT * FROM users WHERE YEAR(created_at) = 2025;
-- type: ref (index used)
```

## Common Use Cases

**Case-insensitive email lookups**:

```sql
CREATE TABLE accounts (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  INDEX idx_email_ci ((LOWER(email)))
) ENGINE=InnoDB;

INSERT INTO accounts (email) VALUES ('Alice@EXAMPLE.COM');
SELECT * FROM accounts WHERE LOWER(email) = 'alice@example.com';
```

**Date part extraction**:

```sql
-- Index by month for reporting queries
ALTER TABLE orders ADD INDEX idx_month ((MONTH(created_at)));
SELECT COUNT(*), SUM(total)
FROM orders
WHERE MONTH(created_at) = 3 AND YEAR(created_at) = 2026;
```

**JSON field indexing**:

```sql
-- Index a specific JSON field
CREATE TABLE profiles (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  data JSON NOT NULL,
  INDEX idx_country ((CAST(data->>'$.country' AS CHAR(100))))
) ENGINE=InnoDB;

SELECT * FROM profiles WHERE CAST(data->>'$.country' AS CHAR(100)) = 'US';
-- Uses the functional index
```

**Computed string manipulation**:

```sql
-- Index on first 10 characters of a long URL
ALTER TABLE pages ADD INDEX idx_url_prefix ((LEFT(url, 10)));
SELECT * FROM pages WHERE LEFT(url, 10) = 'https://ex';
```

## Functional Index Under the Hood

Internally, MySQL creates a hidden virtual generated column and indexes it. You can verify this:

```sql
-- After creating a functional index, check generated columns
SELECT COLUMN_NAME, GENERATION_EXPRESSION, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND EXTRA = 'VIRTUAL GENERATED';
```

## Limitations

Functional indexes have some restrictions:
- Primary keys cannot be functional indexes
- The expression must be deterministic (no `RAND()`, `NOW()`, etc.)
- The expression cannot reference other generated columns

```sql
-- ERROR: non-deterministic expression
ALTER TABLE events ADD INDEX idx_rand ((RAND()));
-- ERROR: primary key cannot be functional
CREATE TABLE t (id INT, PRIMARY KEY ((ABS(id))));
```

## Comparing to Generated Columns

An alternative to functional indexes is creating an explicit virtual generated column and then indexing it:

```sql
-- Equivalent approach using generated column
ALTER TABLE users
  ADD COLUMN email_lower VARCHAR(255) AS (LOWER(email)) VIRTUAL,
  ADD INDEX idx_email_lower (email_lower);
```

The functional index syntax is more concise and achieves the same result.

## Summary

Functional indexes in MySQL 8.0.13+ let you index the result of an expression, enabling the optimizer to use an index for queries that apply functions to columns. They are most useful for case-insensitive searches, date part filtering, and JSON field lookups. Internally, MySQL stores the expression result in a hidden generated column and indexes that. The expression must be deterministic and cannot be used as a primary key.
