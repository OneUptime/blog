# How to Choose the Right Collation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Collation, Character Set, Sorting, Comparison

Description: Understand MySQL collations and learn how to choose the right one for your use case, from case sensitivity to accent handling and performance.

---

## What Is a Collation?

A collation is a set of rules that determines how MySQL compares and sorts string values. Every character set has one or more associated collations. For example, `utf8mb4` has dozens of collations including `utf8mb4_general_ci`, `utf8mb4_unicode_ci`, `utf8mb4_bin`, and language-specific variants.

## Collation Naming Conventions

Collation names follow a structured pattern:

```text
{charset}_{locale_or_variant}_{sensitivity}
```

The suffix indicates the comparison behavior:

| Suffix | Meaning |
|--------|---------|
| `_ci`  | Case-insensitive |
| `_cs`  | Case-sensitive |
| `_ai`  | Accent-insensitive |
| `_as`  | Accent-sensitive |
| `_bin` | Binary (byte-by-byte) |

For example, `utf8mb4_unicode_ci` is case-insensitive and accent-insensitive using the Unicode Collation Algorithm.

## Common utf8mb4 Collations Compared

```sql
-- List utf8mb4 collations
SHOW COLLATION WHERE Charset = 'utf8mb4';
```

The four most common choices:

- **`utf8mb4_general_ci`** - Fast, case-insensitive, slightly less accurate for multilingual sorting.
- **`utf8mb4_unicode_ci`** - Follows the Unicode Collation Algorithm, better for internationalized applications.
- **`utf8mb4_0900_ai_ci`** - Default in MySQL 8.0+. Uses Unicode 9.0, faster than `unicode_ci`, accent-insensitive.
- **`utf8mb4_bin`** - Binary comparison, fully case- and accent-sensitive.

## Choosing Based on Use Case

| Use Case | Recommended Collation |
|----------|-----------------------|
| General web app | `utf8mb4_unicode_ci` or `utf8mb4_0900_ai_ci` |
| Username / email (case-insensitive) | `utf8mb4_0900_ai_ci` |
| Password hashes, tokens | `utf8mb4_bin` |
| Language-specific sorting (e.g. Swedish) | `utf8mb4_sv_0900_ai_ci` |
| Exact byte matching | `utf8mb4_bin` |

## Setting Collation at Different Levels

```sql
-- Server level (my.cnf)
-- collation_server = utf8mb4_unicode_ci

-- Database level
CREATE DATABASE shop
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Table level
CREATE TABLE products (
    name VARCHAR(255)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Column level
ALTER TABLE products
    MODIFY COLUMN name VARCHAR(255)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_bin;
```

## Checking Collation Impact on Queries

```sql
-- These rows are equal under _ci but not under _bin
SELECT 'Apple' = 'apple' COLLATE utf8mb4_unicode_ci;  -- 1
SELECT 'Apple' = 'apple' COLLATE utf8mb4_bin;          -- 0
```

## Summary

Choose `utf8mb4_unicode_ci` or `utf8mb4_0900_ai_ci` for most multilingual applications where case-insensitive comparison is acceptable. Use `utf8mb4_bin` when exact byte matching is required, such as for tokens or hashes. Always set the collation explicitly at the database or table level to avoid unexpected defaults when the server is upgraded.
