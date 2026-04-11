# What Is a MySQL Prefix Index

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Prefix Index, Index

Description: Learn what a MySQL prefix index is, how to choose the right prefix length for VARCHAR and TEXT columns, and the trade-off between selectivity and index size.

---

A MySQL prefix index indexes only the first N characters of a string column rather than the full value. Prefix indexes are used to reduce the size of indexes on long string columns like `VARCHAR`, `TEXT`, and `BLOB`, where indexing the full value would be wasteful or impossible.

## Why Prefix Indexes Exist

MySQL imposes a maximum index key length of 767 bytes (InnoDB with `ROW_FORMAT=COMPACT` or `ROW_FORMAT=REDUNDANT`) or 3072 bytes (InnoDB with `ROW_FORMAT=DYNAMIC` or `ROW_FORMAT=COMPRESSED`, the default in MySQL 8.0). Indexing full `TEXT` or `BLOB` columns directly is not allowed - a prefix length is required.

```sql
-- ERROR: TEXT column cannot be indexed without a prefix
CREATE TABLE articles (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  body TEXT
);
ALTER TABLE articles ADD INDEX idx_body (body);
-- ERROR 1170: BLOB/TEXT column 'body' used in key specification without a key length

-- Correct: index only the first 100 characters
ALTER TABLE articles ADD INDEX idx_body (body(100));
```

## Creating Prefix Indexes

```sql
-- Prefix index on a VARCHAR column
CREATE TABLE users (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(500) NOT NULL,
  INDEX idx_email (email(50))
) ENGINE=InnoDB;

-- Prefix index on TEXT column
CREATE TABLE posts (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  title   VARCHAR(500),
  content TEXT,
  INDEX idx_content (content(200))
) ENGINE=InnoDB;
```

## Choosing the Right Prefix Length

The goal is to choose a prefix length that is long enough to maintain good selectivity while keeping the index compact. Use this query to analyze selectivity at different prefix lengths:

```sql
-- Analyze selectivity for different prefix lengths on 'email' column
SELECT
  COUNT(DISTINCT LEFT(email, 10)) AS prefix_10,
  COUNT(DISTINCT LEFT(email, 20)) AS prefix_20,
  COUNT(DISTINCT LEFT(email, 30)) AS prefix_30,
  COUNT(DISTINCT LEFT(email, 50)) AS prefix_50,
  COUNT(DISTINCT email)           AS full_value,
  COUNT(*)                        AS total_rows
FROM users;
-- Find the prefix length where distinct count approaches the full_value count
```

If `prefix_20` is close to `full_value`, using 20 characters is enough.

## Prefix Index Limitations

Prefix indexes cannot be used as covering indexes. MySQL must access the table row to verify the full column value for equality comparisons.

```sql
-- Prefix index on email(50) - cannot cover this query
SELECT email FROM users WHERE email = 'alice@example.com';
-- Extra: Using where (must verify full value from table)
-- Compare to a full-column index:
-- Extra: Using index (covered - no table access needed)
```

Prefix indexes also cannot be used for `ORDER BY` or `GROUP BY` operations.

## When to Use Prefix Indexes

Use prefix indexes when:
- The column is `TEXT` or `BLOB` (required for indexing)
- The `VARCHAR` column is very long (>200 chars) and full indexing would waste space
- The first N characters are highly selective

Do not use prefix indexes when:
- You need the index to be a covering index
- You need ORDER BY or GROUP BY to use the index
- Full-text search would be more appropriate (use `FULLTEXT` index instead)

## Prefix Index vs FULLTEXT Index

For searching within text (not just prefix matching), a FULLTEXT index is more appropriate.

```sql
-- Prefix index: only efficient for LIKE 'prefix%'
SELECT * FROM articles WHERE body LIKE 'MySQL%'; -- uses prefix index
SELECT * FROM articles WHERE body LIKE '%MySQL%'; -- cannot use prefix index

-- FULLTEXT index: supports natural language search
ALTER TABLE articles ADD FULLTEXT INDEX ft_body (body);
SELECT * FROM articles WHERE MATCH(body) AGAINST('MySQL performance');
```

## Summary

A MySQL prefix index indexes only the first N characters of a string column, reducing index size at the cost of some selectivity. Prefix length is required for TEXT and BLOB columns. Choose a prefix length that captures most of the column's distinct values. Prefix indexes cannot serve as covering indexes and cannot support ORDER BY. For substring searches, use a FULLTEXT index instead.
