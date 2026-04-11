# How to Troubleshoot MySQL Character Encoding Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Character Set, Encoding, UTF8, Collation

Description: Fix MySQL character encoding problems including Incorrect string value errors, mojibake, and collation mismatches with practical SQL commands.

---

## Common Encoding Symptoms

- `Incorrect string value: '\xF0\x9F\x98...' for column 'name'` - emoji blocked by `utf8` instead of `utf8mb4`
- Garbled text like `Ã©` instead of `é` - double UTF-8 encoding (mojibake)
- `Illegal mix of collations` error when comparing or joining columns

## Step 1: Check Current Character Set Settings

```sql
-- Server defaults
SHOW VARIABLES LIKE 'character_set_%';
SHOW VARIABLES LIKE 'collation_%';

-- Per-database settings
SELECT schema_name, default_character_set_name, default_collation_name
FROM information_schema.schemata
WHERE schema_name = 'mydb';

-- Per-table settings
SHOW CREATE TABLE users;

-- Per-column settings
SELECT column_name, character_set_name, collation_name
FROM information_schema.columns
WHERE table_schema = 'mydb' AND table_name = 'users';
```

## Step 2: Fix the utf8 vs utf8mb4 Problem

MySQL's `utf8` is actually a 3-byte subset that cannot store 4-byte characters (emojis, some CJK characters). Use `utf8mb4` everywhere.

```sql
-- Convert database
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Convert a table and all its columns
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Also set the connection character set at the session or server level:

```sql
-- Set for current session
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Set server defaults in my.cnf
-- [mysqld]
-- character-set-server = utf8mb4
-- collation-server = utf8mb4_unicode_ci
```

## Step 3: Fix Mojibake (Double-Encoded Data)

If data was inserted with the wrong connection charset, stored bytes may be double-encoded. First confirm:

```sql
-- Check the raw hex bytes of a suspect row
SELECT HEX(name) FROM users WHERE id = 1;
```

If you see `C3A9` where `C3A9` is the UTF-8 encoding of `é` but the column is also UTF-8, the data was inserted as Latin-1 and stored as UTF-8 bytes interpreted as Latin-1.

To fix, re-encode without changing the byte values:

```sql
-- Re-interpret the column data: treat stored bytes as latin1, convert to utf8mb4
UPDATE users
SET name = CONVERT(BINARY CONVERT(name USING latin1) USING utf8mb4)
WHERE id = 1;
```

Always test on a single row and back up before a bulk update.

## Step 4: Fix Illegal Mix of Collations

This error occurs when two columns have different collations in a JOIN or comparison:

```sql
-- Error example
SELECT * FROM orders o JOIN customers c ON o.customer_name = c.name;
-- ERROR 1267: Illegal mix of collations

-- Quick fix: use COLLATE in the query
SELECT * FROM orders o
JOIN customers c ON o.customer_name COLLATE utf8mb4_unicode_ci = c.name;

-- Permanent fix: align column collations
ALTER TABLE orders
  MODIFY customer_name VARCHAR(255)
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 5: Verify Application Connection Settings

Many frameworks need explicit character set configuration. For example in PHP (PDO):

```sql
-- After connecting, run this to ensure the session uses utf8mb4
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
```

In connection strings, add `charset=utf8mb4`:

```bash
# Example DSN for PHP PDO
mysql:host=localhost;dbname=mydb;charset=utf8mb4
```

## Step 6: Check Index Length Limits

Converting to `utf8mb4` increases the byte size per character from 3 to 4. This can cause:
`Specified key was too long; max key length is 767 bytes`

```sql
-- Use prefix indexes for long VARCHAR columns
ALTER TABLE users ADD INDEX idx_name (name(191));

-- Or enable large index prefix (requires innodb_large_prefix = ON in MySQL 5.7)
-- In MySQL 8, innodb_default_row_format = DYNAMIC handles this automatically
```

## Summary

MySQL character encoding issues almost always trace back to using the 3-byte `utf8` charset instead of `utf8mb4`, mismatched collations between tables, or connection-level charset settings differing from the storage charset. Migrate everything to `utf8mb4_unicode_ci`, set `SET NAMES utf8mb4` at connection time, and verify with `SHOW CREATE TABLE` that changes took effect.
