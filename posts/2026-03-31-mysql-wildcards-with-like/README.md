# How to Use Wildcards with LIKE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Wildcard, LIKE Operator

Description: Learn how MySQL's LIKE wildcards % and _ work in detail, including combining them, escaping literal wildcards, and performance implications.

---

MySQL's `LIKE` operator supports two wildcard characters: `%` and `_`. Knowing precisely what each matches - and how to combine them - lets you write targeted string pattern filters. This guide digs into wildcards in depth with practical examples.

## The % Wildcard

`%` matches zero or more characters of any type:

```sql
-- Matches: 'J', 'Jo', 'Joe', 'John', 'Johnson', etc.
SELECT name FROM contacts WHERE name LIKE 'J%';

-- Matches any string ending with '.pdf'
SELECT filename FROM documents WHERE filename LIKE '%.pdf';

-- Matches any string containing 'error'
SELECT message FROM logs WHERE message LIKE '%error%';
```

## The _ Wildcard

`_` matches exactly one character:

```sql
-- Matches exactly 3-character codes: 'ABC', 'XYZ', 'A1B', etc.
SELECT * FROM airport_codes WHERE code LIKE '___';

-- Match 2-letter country codes starting with 'U'
SELECT * FROM countries WHERE code LIKE 'U_';
-- Matches: 'US', 'UK', 'UA', 'UG', etc.
```

## Combining % and _

You can mix both wildcards in the same pattern:

```sql
-- Match email addresses with at least one character before @
SELECT email FROM users WHERE email LIKE '_%@%';
-- Matches: 'a@test.com', 'user@domain.org'
-- Does NOT match: '@missing.com'

-- Match version strings like v1.0, v2.1, v10.5
SELECT version FROM releases WHERE version LIKE 'v_%.%';
```

## Wildcard at Start, Middle, and End

```sql
-- Prefix: uses index
SELECT * FROM products WHERE sku LIKE 'PROD%';

-- Suffix: full scan required
SELECT * FROM products WHERE sku LIKE '%2025';

-- Infix: full scan required
SELECT * FROM products WHERE sku LIKE '%SALE%';

-- Combination
SELECT * FROM products WHERE sku LIKE 'P%SALE%2025';
```

## Escaping Literal Wildcards

When your data contains `%` or `_` as actual characters, escape them:

```sql
-- Find rows where discount_code contains a literal %
SELECT * FROM promotions
WHERE discount_code LIKE '%50\%' ESCAPE '\';

-- Find column names containing underscore (system tables)
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%\_id' ESCAPE '\';
```

## Case Sensitivity and Collation

Wildcards match characters according to the column collation:

```sql
-- Default ci collation: case-insensitive
SELECT * FROM users WHERE username LIKE 'admin%';
-- Matches: 'admin', 'Admin', 'ADMIN', 'administrator'

-- Force case-sensitive match using a binary collation
SELECT * FROM users WHERE username LIKE 'admin%' COLLATE utf8mb4_bin;
-- Matches only: 'admin', 'administrator' (not 'Admin')
```

## Wildcard Performance Guide

```sql
-- Fast: index range scan
SELECT * FROM employees WHERE last_name LIKE 'A%';

-- Slow: full table scan
SELECT * FROM employees WHERE last_name LIKE '%son';

-- Slow: full table scan
SELECT * FROM employees WHERE last_name LIKE '_ohnson';
```

Check with `EXPLAIN` to verify index usage. Leading wildcards prevent index use because the B-tree index is sorted by the first character.

## Summary

MySQL's `%` wildcard matches any sequence of zero or more characters, while `_` matches exactly one character. Combine them freely in patterns. Prefix patterns (`'value%'`) use B-tree indexes and are fast; patterns with a leading wildcard force a full table scan. Escape literal `%` and `_` using a backslash with the `ESCAPE` clause. For case-sensitive matching, use a binary collation such as `utf8mb4_bin` with the `COLLATE` clause.
