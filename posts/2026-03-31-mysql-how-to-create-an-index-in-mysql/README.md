# How to Create an Index in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Query Optimization, Performance, DDL

Description: Learn how to create indexes in MySQL to speed up queries, including syntax, index types, and best practices for choosing which columns to index.

---

## Overview

An index in MySQL is a data structure that allows the database engine to locate rows quickly without scanning the entire table. Without indexes, MySQL performs a full table scan for every query - an operation that becomes prohibitively slow as table size grows.

Indexes work similarly to a book index: instead of reading every page to find a topic, you look up the topic in the index and jump directly to the right page.

## Basic CREATE INDEX Syntax

```sql
CREATE INDEX index_name ON table_name (column_name);
```

For example, adding an index on the `email` column of a `users` table:

```sql
CREATE INDEX idx_email ON users (email);
```

## Creating an Index at Table Creation Time

The most efficient way to add an index is during table creation:

```sql
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email),
  INDEX idx_username (username)
);
```

## Adding an Index to an Existing Table

Use `CREATE INDEX` or `ALTER TABLE` to add an index to an existing table:

```sql
-- Using CREATE INDEX
CREATE INDEX idx_last_name ON employees (last_name);

-- Using ALTER TABLE
ALTER TABLE employees ADD INDEX idx_department (department_id);
```

Both statements are equivalent and produce the same result.

## Index Types in MySQL

MySQL supports several index types:

```sql
-- Regular (B-Tree) index - the default
CREATE INDEX idx_name ON products (name);

-- Unique index - enforces uniqueness
CREATE UNIQUE INDEX idx_sku ON products (sku);

-- Fulltext index - for text search
CREATE FULLTEXT INDEX ft_description ON products (description);

-- Spatial index - for geometry data
CREATE SPATIAL INDEX idx_location ON stores (coordinates);
```

## Choosing Which Columns to Index

Good candidates for indexes include:

- Columns used frequently in `WHERE` clauses
- Columns used in `JOIN` conditions
- Columns used in `ORDER BY` or `GROUP BY`
- Columns with high cardinality (many distinct values)

Bad candidates for indexes include:

- Columns with very few distinct values (e.g., boolean flags)
- Columns rarely used in queries
- Very wide columns (long strings) without prefix indexes

## Using EXPLAIN to Verify an Index is Used

After creating an index, use `EXPLAIN` to confirm MySQL is using it:

```sql
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';
```

```text
+----+-------------+-------+------+---------------+-----------+---------+-------+------+-------+
| id | select_type | table | type | possible_keys | key       | key_len | ref   | rows | Extra |
+----+-------------+-------+------+---------------+-----------+---------+-------+------+-------+
|  1 | SIMPLE      | users | ref  | idx_email     | idx_email | 1022    | const |    1 |       |
+----+-------------+-------+------+---------------+-----------+---------+-------+------+-------+
```

The `key` column showing `idx_email` confirms the index is being used.

## Prefix Indexes for Long String Columns

For long VARCHAR or TEXT columns, use a prefix index to index only the first N characters:

```sql
CREATE INDEX idx_description_prefix ON products (description(50));
```

This reduces index size while still speeding up prefix-matching queries.

## Listing Existing Indexes on a Table

```sql
SHOW INDEX FROM users;
```

```text
+-------+------------+-----------+--------------+-------------+...
| Table | Non_unique | Key_name  | Seq_in_index | Column_name |...
+-------+------------+-----------+--------------+-------------+...
| users |          0 | PRIMARY   |            1 | id          |...
| users |          1 | idx_email |            1 | email       |...
+-------+------------+-----------+--------------+-------------+...
```

## Dropping an Index

```sql
DROP INDEX idx_email ON users;

-- Or using ALTER TABLE
ALTER TABLE users DROP INDEX idx_email;
```

## Summary

Creating indexes in MySQL is the most impactful way to improve query performance on large tables. Use `CREATE INDEX` for simple B-Tree indexes, `CREATE UNIQUE INDEX` to enforce uniqueness, and always verify with `EXPLAIN` that MySQL is actually using your new index. Focus on columns in `WHERE`, `JOIN`, and `ORDER BY` clauses with high cardinality for the best results.
