# How to Use VARCHAR Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Storage, Character

Description: Learn how the VARCHAR variable-length data type works in MySQL, its storage overhead, length limits, and best practices for string columns.

---

## What Is the VARCHAR Data Type

`VARCHAR(n)` stores variable-length character strings up to `n` characters. Unlike `CHAR`, MySQL only uses as much storage as the actual string requires, plus 1 or 2 bytes of length prefix (1 byte for lengths up to 255, 2 bytes for up to 65,535).

The effective maximum depends on the row format and character set. With `utf8mb4` (4 bytes per character) and a 65,535-byte row limit, a single `VARCHAR` column can hold up to 16,383 characters.

## Declaring VARCHAR Columns

```sql
CREATE TABLE users (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    bio        VARCHAR(500),
    UNIQUE KEY uq_email (email)
);
```

## Inserting and Retrieving Data

```sql
INSERT INTO users (username, email, bio)
VALUES ('alice', 'alice@example.com', 'Software engineer based in London.');

SELECT username, email, LENGTH(bio) AS bio_len FROM users;
```

## Storage Compared to CHAR

For a column declared `VARCHAR(100)` containing the value `'hello'`:
- Storage used: 5 bytes (value) + 1 byte (length prefix) = 6 bytes
- A `CHAR(100)` storing the same value would use 100 bytes

```sql
CREATE TABLE storage_demo (
    c1 CHAR(100),
    v1 VARCHAR(100)
);
INSERT INTO storage_demo VALUES ('hello', 'hello');
```

## Trailing Spaces

Unlike `CHAR`, `VARCHAR` preserves trailing spaces:

```sql
CREATE TABLE sp_test (v VARCHAR(10));
INSERT INTO sp_test VALUES ('abc   ');
SELECT v, LENGTH(v) FROM sp_test;
-- LENGTH: 6 (spaces preserved)
```

## Maximum Length Considerations

```sql
-- Check the maximum row size for your character set
CREATE TABLE wide_row (
    col1 VARCHAR(16382) CHARACTER SET utf8mb4,
    -- Remaining row bytes are very small after this
    col2 TINYINT
);
```

For very long strings (over a few thousand characters), consider using `TEXT` types instead, since they store data off-page and do not consume the 65,535-byte row limit.

## Indexing VARCHAR Columns

Full-column indexes on long `VARCHAR` columns can be inefficient. Use prefix indexes for lengthy strings:

```sql
ALTER TABLE users ADD INDEX idx_bio (bio(50));
```

For short columns like `username` and `email`, full indexes are fine and enable fast lookups.

## Collation and Comparisons

```sql
CREATE TABLE messages (
    content VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
);

-- Case-insensitive comparison with unicode collation
SELECT * FROM messages WHERE content = 'Hello World';
```

## Summary

`VARCHAR` is the most commonly used string type in MySQL because it stores only the bytes needed plus a small overhead. It is the right choice for columns with variable-length values such as names, emails, and descriptions. Reserve `CHAR` for truly fixed-length fields and consider `TEXT` types when values regularly exceed a few thousand characters.
