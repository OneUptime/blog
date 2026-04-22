# MySQL CHAR vs VARCHAR: Performance and Storage Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CHAR, VARCHAR, Data Type, Performance, Storage

Description: Understand the storage and performance differences between MySQL CHAR and VARCHAR types to choose the right one for your use case.

---

## Overview

MySQL provides two string types for storing character data: `CHAR` for fixed-length strings and `VARCHAR` for variable-length strings. Choosing the right one affects storage efficiency, performance, and query behavior.

## How CHAR Works

`CHAR(n)` always stores exactly `n` characters, padding shorter values with spaces on the right. When retrieved, MySQL strips the trailing spaces.

```sql
CREATE TABLE test_char (
  code CHAR(5)
);

INSERT INTO test_char VALUES ('AB');
INSERT INTO test_char VALUES ('ABCDE');

-- Both rows stored as 5 characters on disk
-- 'AB' stored as 'AB   ' (padded)
SELECT code, LENGTH(code) FROM test_char;
```

```text
+-------+-------------+
| code  | LENGTH(code) |
+-------+-------------+
| AB    | 2           |
| ABCDE | 5           |
+-------+-------------+
```

The trailing spaces are stripped on retrieval, so `LENGTH('AB   ')` returns 2 after storage and retrieval.

## How VARCHAR Works

`VARCHAR(n)` stores only the actual characters plus 1 or 2 bytes of length prefix (1 byte if values require no more than 255 bytes, 2 bytes if values may require more than 255 bytes).

```sql
CREATE TABLE test_varchar (
  name VARCHAR(100)
);

INSERT INTO test_varchar VALUES ('Alice');
INSERT INTO test_varchar VALUES ('Bob');

-- 'Alice' uses 5 + 1 = 6 bytes
-- 'Bob' uses 3 + 1 = 4 bytes
```

## Storage Comparison

```text
Value     CHAR(10) storage   VARCHAR(10) storage
-------   ----------------   -------------------
'Hello'   10 bytes           6 bytes (5 + 1)
'Hi'      10 bytes           3 bytes (2 + 1)
''        10 bytes           1 byte (0 + 1)
```

For short values stored in wide `CHAR` columns, the space waste adds up quickly across millions of rows.

## Performance Differences

CHAR columns are faster for fixed-length data because MySQL knows the exact byte offset of every value without reading a length prefix. This makes random access in table scans slightly more efficient.

VARCHAR requires reading the length prefix first, adding a small overhead. However, for large datasets where most values are shorter than the column maximum, VARCHAR saves significant I/O by storing smaller rows.

```sql
-- Check actual row sizes in a table
SELECT
  AVG(LENGTH(code)) AS avg_code_len,
  AVG(LENGTH(name)) AS avg_name_len
FROM customers;
```

For InnoDB tables, row format also matters. With `DYNAMIC` or `COMPRESSED` row formats, long VARCHAR values may be stored off-page, which affects performance for long strings.

## When to Use CHAR

Use `CHAR` for columns where the value length is always the same or nearly the same:

```sql
-- Good candidates for CHAR
CREATE TABLE sessions (
  session_token  CHAR(32),    -- MD5 hash, always 32 chars
  country_code   CHAR(2),     -- ISO country code
  currency_code  CHAR(3),     -- ISO currency code
  status         CHAR(1)      -- Single character status flag
);
```

## When to Use VARCHAR

Use `VARCHAR` for columns where length varies significantly:

```sql
-- Good candidates for VARCHAR
CREATE TABLE users (
  username       VARCHAR(50),
  email          VARCHAR(255),
  first_name     VARCHAR(100),
  bio            VARCHAR(500)
);
```

## Impact of Character Sets

The maximum byte size of CHAR and VARCHAR depends on the character set. With `utf8mb4`, each character can use up to 4 bytes.

```sql
-- CHAR(10) with utf8mb4 uses up to 40 bytes on disk
-- VARCHAR(255) with utf8mb4 needs 2-byte length prefix (max bytes > 255)

CREATE TABLE example (
  code CHAR(10) CHARACTER SET utf8mb4,
  name VARCHAR(255) CHARACTER SET utf8mb4
);
```

This also affects index key length limits, since InnoDB has a 3072-byte key limit per index.

## Trailing Space Behavior

CHAR strips trailing spaces on retrieval:

```sql
CREATE TABLE c (code CHAR(5));
INSERT INTO c VALUES ('AB   ');
SELECT code, LENGTH(code) FROM c;  -- Returns 'AB', 2 - trailing spaces stripped
```

For string comparisons, whether trailing spaces are ignored depends on the collation, not the data type. PAD SPACE collations (like `utf8mb4_general_ci`) ignore trailing spaces, while NO PAD collations (like `utf8mb4_0900_ai_ci`, the default in MySQL 8.0) treat them as significant.

VARCHAR preserves trailing spaces:

```sql
CREATE TABLE v (name VARCHAR(10));
INSERT INTO v VALUES ('Alice   ');
SELECT name, LENGTH(name) FROM v;  -- Returns 8, not 5
```

## Summary

`CHAR` uses fixed storage and is best for columns with constant-length values like country codes, hashes, and status flags. `VARCHAR` uses variable storage and is better for text fields where length varies, saving significant disk space and I/O across large tables. For most application columns like names, emails, and descriptions, `VARCHAR` is the right default choice.
