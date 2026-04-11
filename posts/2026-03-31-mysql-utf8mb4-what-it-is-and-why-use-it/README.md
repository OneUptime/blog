# What Is utf8mb4 in MySQL and Why Should You Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, utf8mb4, Character Set, Unicode, Encoding, Emoji, Database

Description: utf8mb4 is MySQL's full Unicode character set that supports all UTF-8 characters including emoji, unlike the older utf8 which only supports 3-byte sequences.

---

## Overview

`utf8mb4` is a character set in MySQL that implements full UTF-8 encoding, supporting all Unicode code points from U+0000 to U+10FFFF. The name stands for "UTF-8 Multibyte 4-byte." It uses 1 to 4 bytes per character depending on the code point.

If you are building any modern application, `utf8mb4` is the character set you should use. The older `utf8` (also called `utf8mb3`) is a MySQL-specific variant that only supports 3-byte UTF-8 sequences and cannot store characters outside the Basic Multilingual Plane, including emoji.

## The Problem with MySQL's utf8

Despite its name, MySQL's `utf8` character set is not fully compliant with the UTF-8 standard. It was implemented to only support up to 3-byte sequences, which covers code points U+0000 to U+FFFF (the Basic Multilingual Plane). Characters that require 4 bytes, such as emoji (U+1F600 and beyond), many CJK extension characters, and some rare scripts, cannot be stored.

Attempting to insert a 4-byte character into a `utf8` column either silently truncates the data or raises an error depending on the SQL mode:

```sql
-- With utf8 column and strict SQL mode
INSERT INTO messages (content) VALUES ('Hello ');
-- ERROR 1366 (HY000): Incorrect string value: '\xF0\x9F\x98\x80' for column 'content'
```

`utf8mb4` was added in MySQL 5.5.3 to address this gap and provide true UTF-8 support.

## Key Differences Between utf8 and utf8mb4

| Feature | utf8 (utf8mb3) | utf8mb4 |
|---------|---------------|---------|
| Max bytes per character | 3 | 4 |
| Emoji support | No | Yes |
| Full Unicode support | No | Yes |
| Storage overhead | Slightly less | Negligible difference |
| MySQL 8.0 default | No | Yes |

## Setting utf8mb4 at the Server Level

The recommended approach is to set `utf8mb4` as the default at the server level in `my.cnf`:

```ini
[mysqld]
character_set_server = utf8mb4
collation_server = utf8mb4_0900_ai_ci

[client]
default_character_set = utf8mb4
```

Restart MySQL after making this change:

```bash
sudo systemctl restart mysql
```

## Creating Databases and Tables with utf8mb4

```sql
-- Create a database with utf8mb4
CREATE DATABASE myapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Create a table with utf8mb4
CREATE TABLE messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

## Setting utf8mb4 for the Connection

Application connections should also specify `utf8mb4` to avoid encoding mismatches:

```sql
SET NAMES utf8mb4;
```

In most client libraries, you configure this in the connection string or DSN:

```bash
# MySQL CLI
mysql --default-character-set=utf8mb4 -u root -p myapp
```

```python
# Python with mysql-connector-python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='appuser',
    password='secret',
    database='myapp',
    charset='utf8mb4',
    collation='utf8mb4_0900_ai_ci'
)
```

## Migrating from utf8 to utf8mb4

To convert an existing database from `utf8` to `utf8mb4`:

```sql
-- Convert a database
ALTER DATABASE myapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Convert a table
ALTER TABLE messages
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

Note that converting large tables requires an `ALGORITHM=COPY` rebuild, which can be time-consuming. Plan this migration during a maintenance window or use an online schema change tool like `pt-online-schema-change` or `gh-ost`.

## Index Size Considerations

When migrating, be aware that `utf8mb4` uses up to 4 bytes per character instead of 3. This can cause `VARCHAR` columns used as indexes to exceed the InnoDB index key limit (3072 bytes in MySQL 8.0, where the `innodb_large_prefix` variable was removed and the larger limit is always in effect):

```sql
-- This may fail if the key length exceeds the limit
CREATE INDEX idx_email ON users (email(191));
-- Use a prefix index if needed
```

For MySQL 8.0 with `innodb_large_prefix` on (default), indexes on `VARCHAR(255)` in `utf8mb4` are within limits (255 * 4 = 1020 bytes, well under 3072).

## Verifying the Character Set

```sql
-- Check server defaults
SHOW VARIABLES LIKE 'character_set_%';
SHOW VARIABLES LIKE 'collation_%';

-- Check a table
SHOW CREATE TABLE messages\G

-- Check column character sets
SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'myapp' AND TABLE_NAME = 'messages';
```

## Summary

`utf8mb4` is the correct character set to use for any MySQL application that needs to store the full range of Unicode characters, including emoji and supplementary scripts. MySQL's older `utf8` is a 3-byte-only variant that silently breaks when encountering 4-byte characters. MySQL 8.0 defaults to `utf8mb4`, but older databases may still use `utf8` and should be migrated. Set `utf8mb4` at the server, database, table, and connection level to ensure consistent behavior throughout your stack.
