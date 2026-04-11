# How to Use SHOW COLLATION in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Collation, Character Set, Sorting

Description: Learn how to use SHOW COLLATION in MySQL to list available collations, filter by character set, and choose the right collation for accurate text sorting.

---

## What Is SHOW COLLATION?

A collation defines the rules for comparing and sorting characters within a character set. MySQL supports hundreds of collations - each tied to a specific character set. The `SHOW COLLATION` statement lists all available collations on your server, making it easy to choose the right one for your use case.

Understanding collations prevents subtle bugs like case-sensitive comparisons behaving unexpectedly or accented characters sorting incorrectly.

## Basic Syntax

```sql
SHOW COLLATION;
SHOW COLLATION [LIKE 'pattern' | WHERE expr];
```

## Listing All Collations

```sql
SHOW COLLATION;
```

Sample output:

```text
+----------------------------+----------+-----+---------+----------+---------+
| Collation                  | Charset  | Id  | Default | Compiled | Sortlen |
+----------------------------+----------+-----+---------+----------+---------+
| utf8mb4_0900_ai_ci         | utf8mb4  | 255 | Yes     | Yes      |       0 |
| utf8mb4_unicode_ci         | utf8mb4  | 224 |         | Yes      |       8 |
| utf8mb4_bin                | utf8mb4  | 46  |         | Yes      |       1 |
| latin1_swedish_ci          | latin1   |   8 | Yes     | Yes      |       1 |
+----------------------------+----------+-----+---------+----------+---------+
```

## Filtering Collations by Character Set

```sql
-- List all utf8mb4 collations
SHOW COLLATION LIKE 'utf8mb4%';

-- List all latin1 collations
SHOW COLLATION LIKE 'latin1%';
```

## Filtering with WHERE

```sql
-- Show only default collations
SHOW COLLATION WHERE `Default` = 'Yes';

-- Show case-sensitive collations for utf8mb4
SHOW COLLATION WHERE Charset = 'utf8mb4' AND Collation LIKE '%_cs';
```

## Querying information_schema

```sql
SELECT COLLATION_NAME, CHARACTER_SET_NAME, IS_DEFAULT, IS_COMPILED
FROM information_schema.COLLATIONS
WHERE CHARACTER_SET_NAME = 'utf8mb4'
ORDER BY COLLATION_NAME;
```

## Understanding Collation Naming

Collation names follow this pattern: `{charset}_{language}_{sensitivity}`

```text
utf8mb4_unicode_ci   - Unicode rules, case-insensitive, accent-insensitive
utf8mb4_0900_as_cs   - Unicode 9.0 rules, accent-sensitive, case-sensitive
utf8mb4_bin          - Binary comparison (byte-by-byte)
utf8mb4_0900_ai_ci   - Unicode 9.0 rules, accent-insensitive, case-insensitive
```

Key suffixes:
- `_ci` - case-insensitive
- `_cs` - case-sensitive
- `_ai` - accent-insensitive
- `_as` - accent-sensitive
- `_bin` - binary (byte comparison)

## Applying Collations

```sql
-- Set collation at the database level
CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Set collation on a column
CREATE TABLE products (
  name VARCHAR(200) COLLATE utf8mb4_unicode_ci
);

-- Override collation in a query
SELECT * FROM users ORDER BY name COLLATE utf8mb4_bin;
```

## Comparing Collation Behavior

```sql
-- Case-insensitive comparison (default for _ci collations)
SELECT 'Hello' = 'hello' COLLATE utf8mb4_unicode_ci;  -- returns 1

-- Case-sensitive comparison
SELECT 'Hello' = 'hello' COLLATE utf8mb4_bin;          -- returns 0
```

## Summary

`SHOW COLLATION` is your reference for all available text sorting and comparison rules in MySQL. Use the `LIKE` filter to narrow results by character set and understand the naming conventions to pick the right collation - typically `utf8mb4_unicode_ci` for international text or `utf8mb4_bin` when byte-exact matching is required. Setting collations consistently at the database and column level avoids hard-to-debug comparison issues.
