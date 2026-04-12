# How to Use CHAR Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Storage, Character

Description: Learn how the CHAR fixed-length data type works in MySQL, when to use it, and how it differs from variable-length alternatives.

---

## What Is the CHAR Data Type

The `CHAR` data type in MySQL stores fixed-length character strings. When you define a column as `CHAR(n)`, MySQL always allocates exactly `n` characters of storage, padding shorter values with trailing spaces.

The maximum length for `CHAR` is 255 characters. In strict SQL mode, values longer than the defined length produce an error and the statement is rejected. In non-strict mode, MySQL truncates the value and issues a warning.

## Declaring a CHAR Column

```sql
CREATE TABLE countries (
    code    CHAR(2)   NOT NULL,
    name    VARCHAR(100) NOT NULL,
    PRIMARY KEY (code)
);
```

```sql
INSERT INTO countries (code, name) VALUES ('US', 'United States');
INSERT INTO countries (code, name) VALUES ('GB', 'United Kingdom');
```

## Storage Behavior

MySQL pads `CHAR` values with trailing spaces to reach the declared length, but strips those spaces on retrieval. This means you cannot reliably store strings that intentionally end with a space.

```sql
CREATE TABLE test_char (val CHAR(5));
INSERT INTO test_char VALUES ('abc');
SELECT val, LENGTH(val), CHAR_LENGTH(val) FROM test_char;
-- val: 'abc', LENGTH: 3, CHAR_LENGTH: 3
```

Even though MySQL stored three bytes plus two padding bytes, the padding is invisible after retrieval.

## When to Use CHAR vs VARCHAR

Use `CHAR` when:
- Every value has the same length (ISO country codes, currency codes, UUIDs stored as hex).
- The column is frequently compared with `=` and performance matters.
- The table uses the `MyISAM` engine and you want row-level padding for predictable row sizes.

Use `VARCHAR` when:
- Lengths vary significantly (names, emails, descriptions).
- Saving storage space matters more than fixed-width access patterns.

## CHAR and Collations

`CHAR` columns respect the column or table collation for comparisons and sorting.

```sql
CREATE TABLE greetings (
    lang CHAR(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    greeting VARCHAR(50)
);
```

## Checking Column Definition

```sql
SHOW COLUMNS FROM countries LIKE 'code';
-- Field: code, Type: char(2), Null: NO, Key: PRI, Default: NULL
```

```sql
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'countries';
```

## Practical Example: Status Flags

`CHAR(1)` is a common pattern for single-character flags:

```sql
CREATE TABLE orders (
    id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status CHAR(1) NOT NULL DEFAULT 'P',
    -- 'P' = pending, 'S' = shipped, 'C' = cancelled
    total  DECIMAL(10, 2)
);

SELECT id, status, total FROM orders WHERE status = 'S';
```

## Summary

`CHAR` is a fixed-length string type suited for columns where every value has the same known length, such as country codes, state abbreviations, and single-character flags. It trades slightly more storage (for short values) against predictable access patterns. For variable-length strings, prefer `VARCHAR` to avoid wasted space.
