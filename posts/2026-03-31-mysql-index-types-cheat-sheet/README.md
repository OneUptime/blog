# MySQL Index Types Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Performance, Cheat Sheet

Description: Quick reference for MySQL index types including PRIMARY, UNIQUE, FULLTEXT, SPATIAL, composite, covering, and prefix indexes with creation syntax and use cases.

---

## Index Types Overview

```text
PRIMARY KEY    - unique, not null, clustered (InnoDB)
UNIQUE         - enforces uniqueness, allows multiple NULLs
INDEX / KEY    - non-unique secondary index
FULLTEXT       - inverted index for text search
SPATIAL        - R-tree for geometry columns
```

## Creating Indexes

```sql
-- Primary key
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL
);

-- Unique index
CREATE UNIQUE INDEX uq_email ON users (email);

-- Regular index
CREATE INDEX idx_last_name ON users (last_name);

-- Composite index
CREATE INDEX idx_dept_salary ON employees (dept_id, salary);

-- Fulltext index
CREATE FULLTEXT INDEX ft_body ON articles (title, body);

-- Spatial index
CREATE SPATIAL INDEX spx_location ON places (coord);
```

## Primary Key (Clustered Index)

In InnoDB, the primary key IS the table - rows are stored in B-tree order. Choosing a small, monotonically increasing PK (INT/BIGINT AUTO_INCREMENT) keeps insertions fast.

```sql
-- Check primary key
SELECT index_name, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'orders'
  AND index_name = 'PRIMARY';
```

## Composite Indexes and Leftmost Prefix Rule

A composite index on `(a, b, c)` supports queries on `a`, `(a, b)`, or `(a, b, c)` - but not `b` or `c` alone.

```sql
-- This uses the index
SELECT * FROM employees WHERE dept_id = 3 AND salary > 50000;

-- This does NOT use the index (skips dept_id)
SELECT * FROM employees WHERE salary > 50000;
```

## Covering Index

An index that contains all columns needed by a query avoids a table lookup.

```sql
-- Query only touches index (no row lookup)
CREATE INDEX idx_cover ON orders (customer_id, status, total);
SELECT customer_id, status, total FROM orders WHERE customer_id = 42;
```

## Prefix Index (for long strings)

```sql
-- Index only first 20 chars of email
CREATE INDEX idx_email_prefix ON users (email(20));
```

Trade-off: smaller index, but cannot enforce uniqueness on full value.

## Functional / Expression Index (MySQL 8.0+)

```sql
-- Index on lowercased email
CREATE INDEX idx_lower_email ON users ((LOWER(email)));
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
```

## FULLTEXT Index Usage

```sql
-- Natural language search
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('MySQL performance' IN NATURAL LANGUAGE MODE);

-- Boolean mode
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('+MySQL -deprecated' IN BOOLEAN MODE);
```

## Managing Indexes

```sql
-- List all indexes on a table
SHOW INDEX FROM orders;

-- Drop an index
DROP INDEX idx_last_name ON users;

-- Rename (MySQL 5.7+)
ALTER TABLE users RENAME INDEX idx_old TO idx_new;

-- Disable index updates during bulk load (MyISAM only, no effect on InnoDB)
ALTER TABLE big_table DISABLE KEYS;
-- ... bulk load ...
ALTER TABLE big_table ENABLE KEYS;
```

## Checking Index Usage

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
-- key column shows which index was used
-- rows column shows estimated rows scanned
```

## Summary

MySQL indexes speed up queries but add write overhead and storage cost. PRIMARY KEY is the clustered row store; UNIQUE enforces data integrity; composite indexes follow the leftmost prefix rule; covering indexes eliminate row lookups; and functional indexes (8.0+) handle expression-based queries. Always verify index usage with EXPLAIN before and after adding indexes.
