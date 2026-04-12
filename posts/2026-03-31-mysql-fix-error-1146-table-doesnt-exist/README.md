# How to Fix ERROR 1146 Table Doesn't Exist in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Table Not Found, Troubleshooting, InnoDB

Description: Learn how to diagnose and fix MySQL ERROR 1146 Table Doesn't Exist including orphaned frm files, case sensitivity, and InnoDB recovery.

---

`ERROR 1146 (42S02): Table 'database.tablename' doesn't exist` means MySQL cannot find the table you referenced. The causes range from a simple typo to InnoDB data dictionary corruption.

## Step 1 - Verify the Table Exists

```sql
-- List all tables in the database
SHOW TABLES FROM myapp;

-- Or query information_schema
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myapp'
ORDER BY TABLE_NAME;
```

## Step 2 - Check Case Sensitivity

On Linux, MySQL table names are case-sensitive by default (controlled by `lower_case_table_names`).

```sql
SHOW VARIABLES LIKE 'lower_case_table_names';
-- 0 = case-sensitive (Linux default)
-- 1 = lowercase stored and compared (Windows default)
-- 2 = stored as given, compared case-insensitively (macOS)
```

```sql
-- If you created 'Orders' but are querying 'orders':
SHOW TABLES LIKE 'Order%';
SELECT * FROM Orders;   -- note the capital O
```

## Step 3 - Check the Correct Database

```sql
SELECT DATABASE();   -- current database
USE myapp;           -- switch to correct database
```

## Step 4 - Orphaned .frm File (MySQL 5.x)

On MySQL 5.x with per-file tablespace, you might have a `.frm` file but the InnoDB data file (`.ibd`) is missing:

```bash
ls -la /var/lib/mysql/myapp/
# Look for tablename.frm without tablename.ibd
```

If the `.ibd` file is missing but the `.frm` exists, the table metadata exists without data. Drop and recreate:

```sql
DROP TABLE IF EXISTS orphaned_table;
-- Then recreate from migration scripts
```

## Step 5 - InnoDB Data Dictionary Mismatch

If the table exists in the file system but MySQL reports it as missing, the InnoDB data dictionary may be out of sync. This can happen after moving or copying data files:

```bash
# Check error log for clues
grep -i "tablename" /var/log/mysql/error.log
```

```sql
-- First recreate the table structure (the table must exist in the dictionary)
CREATE TABLE myapp.tablename (...);

-- Discard the empty tablespace created by CREATE TABLE
ALTER TABLE myapp.tablename DISCARD TABLESPACE;

-- Copy the .ibd file into the data directory, then import
ALTER TABLE myapp.tablename IMPORT TABLESPACE;
```

## Step 6 - After Restoring a Backup

If you restored only `.ibd` files without matching dictionary entries:

```sql
-- First recreate the table structure so it exists in the data dictionary
CREATE TABLE tablename (...);

-- Discard the empty tablespace created by CREATE TABLE
ALTER TABLE tablename DISCARD TABLESPACE;

-- Copy the .ibd file to the data directory
-- Then import
ALTER TABLE tablename IMPORT TABLESPACE;
```

## Step 7 - Check for Typos in Application Code

```python
# Print the actual table name being queried
table = "users"
query = f"SELECT * FROM {table} WHERE id = %s"
print(query)  # debug before executing
```

## Recreating the Table From Schema

If the table was accidentally dropped:

```sql
-- Recreate from your migration scripts or schema.sql
CREATE TABLE users (
    id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);
```

Then restore data from backup if available.

## Summary

Fix ERROR 1146 by verifying the table exists in `information_schema.TABLES`, checking case sensitivity with `lower_case_table_names`, and confirming you are in the correct database. For InnoDB-specific issues, check for orphaned `.frm` files without matching `.ibd` files. For accidental drops, recreate the table from migration scripts and restore data from the latest backup.
