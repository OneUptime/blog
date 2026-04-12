# How to Convert a MySQL Database from utf8 to utf8mb4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Character Set, utf8mb4, Migration, Unicode

Description: Learn how to convert a MySQL database from the legacy utf8 character set to utf8mb4 to support full Unicode including emojis and special characters.

---

## Why Convert from utf8 to utf8mb4

MySQL's `utf8` character set is misleadingly named - it only supports 3-byte UTF-8 characters, which means it cannot store 4-byte Unicode characters such as emojis (e.g., 😀), certain Chinese characters, and symbols in the supplementary planes.

The `utf8mb4` character set is the true 4-byte UTF-8 encoding and should be the standard choice for all new and existing MySQL databases.

## Step 1 - Check Current Character Sets

Before converting, audit your current setup:

```sql
-- Check database character set
SELECT schema_name, default_character_set_name, default_collation_name
FROM information_schema.schemata
WHERE schema_name = 'your_database';

-- Check table character sets
SELECT table_name, table_collation
FROM information_schema.tables
WHERE table_schema = 'your_database';

-- Check column character sets
SELECT table_name, column_name, character_set_name, collation_name
FROM information_schema.columns
WHERE table_schema = 'your_database'
  AND character_set_name IS NOT NULL;
```

## Step 2 - Backup the Database

Always back up before making character set changes:

```bash
mysqldump -u root -p --single-transaction your_database > backup_before_utf8mb4.sql
```

## Step 3 - Update Server Configuration

Edit `/etc/mysql/my.cnf` (or `/etc/my.cnf`) to set `utf8mb4` as the default:

```text
[client]
default-character-set = utf8mb4

[mysql]
default-character-set = utf8mb4

[mysqld]
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

Restart MySQL after updating the config:

```bash
sudo systemctl restart mysql
```

## Step 4 - Convert the Database

```sql
ALTER DATABASE your_database
  CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
```

## Step 5 - Convert All Tables

Generate and run ALTER TABLE statements for each table:

```sql
-- Convert a single table
ALTER TABLE users
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

To convert all tables in a database at once, generate the statements:

```sql
SELECT CONCAT(
  'ALTER TABLE `', table_name, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
) AS alter_statement
FROM information_schema.tables
WHERE table_schema = 'your_database'
  AND table_type = 'BASE TABLE';
```

Run the generated SQL statements in sequence.

## Step 6 - Verify the Conversion

```sql
-- Check database
SELECT default_character_set_name, default_collation_name
FROM information_schema.schemata
WHERE schema_name = 'your_database';

-- Check all tables
SELECT table_name, table_collation
FROM information_schema.tables
WHERE table_schema = 'your_database';
```

## Step 7 - Test with 4-byte Characters

```sql
-- Test emoji storage
CREATE TABLE emoji_test (content TEXT CHARACTER SET utf8mb4);
INSERT INTO emoji_test VALUES ('Hello World 😀🎉');
SELECT * FROM emoji_test;
-- Should return: Hello World 😀🎉
```

## Potential Issues

### Unique Key Length Limits

Converting from `utf8` to `utf8mb4` increases the byte size per character from 3 to 4. If you have VARCHAR columns in unique indexes near the 767-byte InnoDB limit, you may hit errors:

```sql
-- Reduce key length if needed
ALTER TABLE users
  DROP INDEX email,
  MODIFY email VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX (email);
```

On MySQL 5.6 or 5.7, you can enable `innodb_large_prefix` to raise the index key limit to 3072 bytes instead:

```sql
SET GLOBAL innodb_large_prefix = ON;
SET GLOBAL innodb_file_format = Barracuda;
```

Note: `innodb_large_prefix` and `innodb_file_format` were removed in MySQL 8.0, where the 3072-byte index prefix limit is always enabled. On MySQL 8.0+, VARCHAR(255) with `utf8mb4` (1020 bytes) fits within the limit without any changes.

### Application Connection Strings

Update application connection strings to use `utf8mb4`:

```text
jdbc:mysql://host/db?useUnicode=true&characterEncoding=UTF-8
```

## Summary

Converting from `utf8` to `utf8mb4` in MySQL requires updating server config, altering the database, converting all tables and columns, and testing with 4-byte characters. The main risk is index length limits when converting VARCHAR columns used in unique keys - reduce column sizes to 191 characters if needed. Always back up before starting the migration.
