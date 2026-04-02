# What Is a Collation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Collation, Character Set, Encoding, Sorting, InnoDB, Database

Description: A collation in MySQL defines the rules for comparing and sorting characters in a character set, controlling case sensitivity, accent sensitivity, and ordering.

---

## Overview

A collation is a set of rules that determines how characters are compared and sorted. In MySQL, every column with a text-based type (CHAR, VARCHAR, TEXT, etc.) has both a character set and a collation. The character set defines which characters can be stored; the collation defines how those characters are ordered and compared.

Choosing the right collation affects query results, index behavior, and string comparisons throughout your application.

## Character Sets and Collations

Character sets and collations are tightly coupled in MySQL. Each character set has one or more associated collations, and each collation belongs to exactly one character set. You can list available collations with:

```sql
SHOW COLLATION WHERE Charset = 'utf8mb4';
```

Common collations for `utf8mb4`:

| Collation | Case Sensitive | Accent Sensitive | Notes |
|-----------|---------------|-----------------|-------|
| utf8mb4_general_ci | No | No | Legacy default, fast |
| utf8mb4_unicode_ci | No | No | Better Unicode support |
| utf8mb4_0900_ai_ci | No | No | MySQL 8.0 default |
| utf8mb4_0900_as_cs | Yes | Yes | Accent and case sensitive |
| utf8mb4_bin | Yes | Yes | Binary byte comparison |

## The Collation Naming Convention

MySQL collation names follow a consistent pattern:

```text
{charset}_{language/standard}_{sensitivity_flags}

ci  = case-insensitive
cs  = case-sensitive
ai  = accent-insensitive
as  = accent-sensitive
bin = binary (byte-by-byte comparison)
```

So `utf8mb4_0900_ai_ci` means: utf8mb4 character set, Unicode 9.0 rules, accent-insensitive, case-insensitive.

## Setting Collations at Different Levels

Collations can be set at the server, database, table, or column level. More specific settings override broader ones.

**Server level** (in `my.cnf`):
```ini
[mysqld]
collation_server = utf8mb4_0900_ai_ci
```

**Database level:**
```sql
CREATE DATABASE myapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

**Table level:**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

**Column level:**
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(50) COLLATE utf8mb4_bin,
  name VARCHAR(200) COLLATE utf8mb4_0900_ai_ci
);
```

## How Collations Affect Queries

Collation rules determine whether string comparisons are case-sensitive, which can produce surprising results:

```sql
-- With utf8mb4_0900_ai_ci (case-insensitive)
SELECT * FROM users WHERE username = 'alice';
-- Returns rows with 'alice', 'Alice', 'ALICE'

-- With utf8mb4_bin (binary/case-sensitive)
SELECT * FROM users WHERE username = 'alice';
-- Returns only exact lowercase 'alice'
```

Sorting order is also affected:

```sql
-- With utf8mb4_0900_ai_ci
SELECT name FROM products ORDER BY name;
-- 'café', 'Cafe', 'CAFE' grouped together

-- With utf8mb4_bin
SELECT name FROM products ORDER BY name;
-- Uppercase letters sort before lowercase (by byte value)
```

## Collation and Indexes

Indexes are built using the column's collation. A query that compares a column against a literal with a different collation may cause a full scan instead of an index lookup:

```sql
-- This may skip the index if column collation differs from the literal collation
SELECT * FROM users WHERE username = _utf8mb4'admin' COLLATE utf8mb4_bin;
```

To avoid collation mismatches, ensure that columns, literals, and connection settings use consistent collations.

## Detecting Collation Mismatches

Collation mismatches cause the common `ERROR 1267: Illegal mix of collations` error:

```sql
-- Fails if the two columns have different collations
SELECT * FROM t1 JOIN t2 ON t1.name = t2.name;
-- ERROR 1267 (HY000): Illegal mix of collations
```

Fix by explicitly coercing:

```sql
SELECT * FROM t1 JOIN t2
  ON t1.name = CONVERT(t2.name USING utf8mb4) COLLATE utf8mb4_0900_ai_ci;
```

Or by altering the column to use the same collation:

```sql
ALTER TABLE t2
  MODIFY COLUMN name VARCHAR(100) COLLATE utf8mb4_0900_ai_ci;
```

## Checking Current Collations

```sql
-- Check server default
SHOW VARIABLES LIKE 'collation_%';

-- Check a specific table
SHOW CREATE TABLE users\G

-- Check column collations via information_schema
SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'myapp' AND TABLE_NAME = 'users';
```

## Summary

A collation in MySQL defines the comparison and sorting rules for text data. It controls whether searches and joins are case-sensitive or accent-sensitive. MySQL 8.0 uses `utf8mb4_0900_ai_ci` as its default collation, which provides Unicode 9.0 rules with case and accent insensitivity. Selecting the right collation at the column level and ensuring consistency across joins and comparisons is essential for correct query results and index efficiency.
