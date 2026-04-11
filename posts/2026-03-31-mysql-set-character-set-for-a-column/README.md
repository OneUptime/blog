# How to Set the Character Set for a MySQL Column

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Character Set, Column, Encoding, Schema

Description: Learn how to define or change the character set for individual MySQL columns using CREATE TABLE and ALTER TABLE with practical examples.

---

## Overview

MySQL allows you to override the table-level character set on a per-column basis. This is useful when a single table stores content in multiple languages that need different encodings, or when you are migrating columns one at a time to `utf8mb4` without touching the entire table.

## Setting Character Set on a New Column

Specify `CHARACTER SET` directly in the column definition:

```sql
CREATE TABLE users (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(100) CHARACTER SET ascii COLLATE ascii_general_ci,
    full_name   VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    bio         TEXT         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
);
```

Here `username` uses ASCII (safe for email-style identifiers), while `full_name` and `bio` use the full Unicode `utf8mb4`.

## Changing the Character Set of an Existing Column

Use `ALTER TABLE ... MODIFY COLUMN` to re-encode a single column:

```sql
ALTER TABLE users
    MODIFY COLUMN full_name VARCHAR(255)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci;
```

This command changes both the column definition and re-encodes any existing data. If the new character set cannot represent some stored characters MySQL raises an error - test on a copy of the data first.

Note that `ALTER TABLE ... CHANGE COLUMN` also re-encodes data (it differs from `MODIFY COLUMN` only in allowing a column rename). To change the stored bytes without conversion, first convert the column to its binary equivalent (e.g., `VARBINARY`), then convert it to the target character set.

## Adding a New Column with a Specific Character Set

```sql
ALTER TABLE users
    ADD COLUMN preferred_language CHAR(5)
        CHARACTER SET ascii
        COLLATE ascii_general_ci
        NOT NULL DEFAULT 'en';
```

## Verifying Column Character Sets

Inspect column-level settings through `SHOW FULL COLUMNS` or `information_schema`:

```sql
SHOW FULL COLUMNS FROM users;
```

The `Collation` field shows each column's effective collation (from which the character set can be derived).

```sql
SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'your_database'
  AND TABLE_NAME   = 'users';
```

## Column vs. Table vs. Server Precedence

MySQL resolves the character set using a four-level hierarchy:

```text
column > table > database > server
```

A column-level setting always wins. If you do not specify one, the table default applies. Being explicit at the column level is the safest approach in mixed-encoding schemas.

## Summary

Setting character sets at the column level gives you fine-grained control over how individual text fields are stored. Use `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` for any column that may store multilingual text or emoji, and verify your settings with `information_schema.COLUMNS` after applying changes.
