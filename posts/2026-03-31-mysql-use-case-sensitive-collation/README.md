# How to Use Case-Sensitive Collation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Collation, Case Sensitivity, String Comparison, Index

Description: Learn how to configure and use case-sensitive collations in MySQL to distinguish uppercase and lowercase text in comparisons and sorts.

---

## Why Case-Sensitive Collation Matters

By default, MySQL uses case-insensitive collations (`_ci` suffix) for most character sets. This means `SELECT * FROM users WHERE username = 'Alice'` will also match `alice` and `ALICE`. For tokens, file paths, or identifiers where case carries semantic meaning, you need a case-sensitive collation.

## Case-Sensitive Collation Options

For `utf8mb4`, the primary options are:

- **`utf8mb4_bin`** - Binary comparison, fully case- and accent-sensitive. Available in all MySQL versions.
- **`utf8mb4_0900_as_cs`** - Unicode 9.0, accent-sensitive and case-sensitive (MySQL 8.0+).

For `latin1`, `latin1_bin` and `latin1_general_cs` are the typical choices.

## Applying at Column Level

The most targeted approach is to specify the collation on the column that needs case sensitivity:

```sql
CREATE TABLE tokens (
    id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    UNIQUE KEY uq_token (token)
);
```

With this definition, `SELECT * FROM tokens WHERE token = 'AbCd'` will not match `abcd`.

## Using COLLATE in a Query

You can override collation at query time without altering the schema:

```sql
SELECT id, username
FROM users
WHERE username COLLATE utf8mb4_bin = 'Alice';
```

This is useful for one-off lookups but can prevent index usage unless the index was created with the same collation.

## Changing an Existing Column to Case-Sensitive

```sql
ALTER TABLE users
    MODIFY COLUMN username VARCHAR(100)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_bin
        NOT NULL;
```

After this change, duplicate usernames that differ only by case (e.g., `alice` and `Alice`) will be treated as distinct values.

## Index Considerations

Indexes respect the collation of the column. A `UNIQUE` index on a `_bin` column enforces case-sensitive uniqueness:

```sql
ALTER TABLE users
    ADD UNIQUE KEY uq_username (username);
-- username uses utf8mb4_bin, so 'alice' and 'Alice' are distinct keys
```

If you add a `COLLATE` override at query time on a column with a `_ci` index, MySQL may perform a full table scan instead of using the index. Always match query collation to column collation for optimal performance.

## Checking Whether a Query Is Case-Sensitive

```sql
-- Returns 1 (equal) under _ci, 0 (not equal) under _bin
SELECT 'Hello' = 'hello' COLLATE utf8mb4_bin;
-- Output: 0

SELECT 'Hello' = 'hello' COLLATE utf8mb4_unicode_ci;
-- Output: 1
```

## Summary

Use `utf8mb4_bin` or `utf8mb4_0900_as_cs` when your application must distinguish between uppercase and lowercase text. Apply the collation at the column level for permanent enforcement, or use the `COLLATE` clause in queries for ad hoc overrides. Make sure indexes align with the intended collation to avoid performance degradation.
