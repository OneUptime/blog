# How to Fix ERROR 1071 Specified Key Was Too Long in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Error, Charset, InnoDB

Description: Fix MySQL ERROR 1071 Specified key was too long by reducing index prefix lengths, changing character sets, or enabling innodb_large_prefix support.

---

MySQL ERROR 1071 occurs when creating an index on a column where the key length exceeds the maximum allowed size. The error reads: `ERROR 1071 (42000): Specified key was too long; max key length is 767 bytes`.

## Why the Limit Exists

InnoDB indexes have a maximum key length:
- 767 bytes in MySQL 5.6 and earlier
- 3072 bytes in MySQL 5.7+ with `innodb_large_prefix = ON` and `ROW_FORMAT = DYNAMIC` or `COMPRESSED`

The number of bytes per character depends on the character set:
- `latin1`: 1 byte per character
- `utf8`: up to 3 bytes per character
- `utf8mb4`: up to 4 bytes per character

A `VARCHAR(255)` in `utf8mb4` requires 255 x 4 = 1020 bytes, exceeding the 767-byte limit.

## Check Current Settings

```sql
SHOW VARIABLES LIKE 'innodb_large_prefix';
SHOW VARIABLES LIKE 'innodb_file_format';
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

## Fix 1: Use a Prefix Index

Index only a prefix of the column instead of the full value:

```sql
-- Index only the first 191 characters (191 x 4 bytes = 764, under 767)
ALTER TABLE users ADD INDEX idx_email (email(191));

-- For a unique index on a long column (191 x 4 = 764 bytes for utf8mb4)
ALTER TABLE sessions ADD UNIQUE INDEX idx_token (token(191));
```

Prefix indexes reduce selectivity but are often sufficient for search operations.

## Fix 2: Enable innodb_large_prefix (MySQL 5.6/5.7)

For MySQL 5.6 and 5.7, enable large prefix support:

```text
[mysqld]
innodb_large_prefix = ON
innodb_file_format = Barracuda
innodb_file_per_table = ON
```

Then create or alter the table to use `ROW_FORMAT = DYNAMIC`:

```sql
ALTER TABLE users ROW_FORMAT = DYNAMIC;
CREATE INDEX idx_email ON users (email);
```

In MySQL 8.0, `innodb_large_prefix` is always ON and `innodb_file_format` is removed.

## Fix 3: Reduce Column Length

If the full column does not need to be 255 characters:

```sql
ALTER TABLE sessions MODIFY token VARCHAR(100) NOT NULL;
ALTER TABLE sessions ADD UNIQUE INDEX idx_token (token);
```

## Fix 4: Use a Hash Column

For very long natural keys, store a hash and index that instead:

```sql
ALTER TABLE pages ADD COLUMN url_hash CHAR(64) AS (SHA2(url, 256)) STORED;
ALTER TABLE pages ADD UNIQUE INDEX idx_url_hash (url_hash);
```

This provides a unique constraint while the original column stays at any length.

## Fix 5: Switch to utf8 Instead of utf8mb4

If you do not need 4-byte Unicode characters (emoji, rare CJK):

```sql
ALTER TABLE users MODIFY email VARCHAR(255)
  CHARACTER SET utf8 COLLATE utf8_unicode_ci;
ALTER TABLE users ADD UNIQUE INDEX idx_email (email);
```

Note: `utf8` in MySQL is actually 3-byte UTF-8 (no emoji support).

## Summary

ERROR 1071 is resolved by reducing the effective byte length of the indexed column. The cleanest solutions are using a prefix index for VARCHAR columns in `utf8mb4`, or enabling `innodb_large_prefix` (MySQL 5.6/5.7) or upgrading to MySQL 8.0 where this limit is 3072 bytes. For unique constraints on very long strings, a generated hash column is a reliable alternative.
