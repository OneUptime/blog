# How to Fix ERROR 1215 Cannot Add Foreign Key Constraint in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Foreign Key, Error, Constraint, InnoDB

Description: Learn the causes of MySQL ERROR 1215 and how to fix mismatched data types, missing indexes, and engine differences that prevent adding foreign keys.

---

MySQL ERROR 1215 occurs when `ALTER TABLE` or `CREATE TABLE` fails to add a foreign key constraint. The error message reads: `ERROR 1215 (HY000): Cannot add foreign key constraint`. This error is frustrating because it gives little detail. Understanding the common causes will help you resolve it quickly.

## Common Causes

The most frequent reasons for ERROR 1215 are:

- Mismatched data types between the parent and child columns
- Missing index on the referenced parent column
- Different storage engines (InnoDB vs MyISAM)
- The referenced table or column does not exist
- Unsigned vs signed integer mismatch

## Check the Exact Cause

MySQL's `SHOW ENGINE INNODB STATUS` provides the most detail about the constraint failure:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `LATEST FOREIGN KEY ERROR` section. It will show which columns and tables are involved.

## Fix: Matching Data Types

Both the child column and the referenced parent column must have exactly the same data type, including the UNSIGNED attribute:

```sql
-- Parent table
CREATE TABLE departments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- Child table - id must also be INT UNSIGNED
CREATE TABLE employees (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dept_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);
```

A common mistake is declaring the parent column as `INT UNSIGNED` but the child as `INT` (signed).

## Fix: Add Index on Parent Column

The referenced column must have an index where it appears as the first column. A primary key, unique index, or regular index all satisfy this requirement:

```sql
-- Ensure the parent column is indexed
ALTER TABLE departments ADD PRIMARY KEY (id);

-- Or add a unique index
ALTER TABLE categories ADD UNIQUE INDEX (code);

-- A regular index also works
ALTER TABLE categories ADD INDEX (code);
```

## Fix: Ensure Matching Storage Engines

Foreign keys are only supported by InnoDB. If either table uses MyISAM, the constraint will fail:

```sql
-- Check table engine
SHOW CREATE TABLE departments\G

-- Convert to InnoDB
ALTER TABLE departments ENGINE = InnoDB;
ALTER TABLE employees ENGINE = InnoDB;
```

## Fix: Verify Referenced Table Exists

The parent table must exist before the child table references it:

```sql
-- Check if the table exists
SHOW TABLES LIKE 'departments';

-- Check character set and collation match
SHOW CREATE TABLE departments\G
SHOW CREATE TABLE employees\G
```

Collation mismatches also trigger ERROR 1215. If one column is `utf8mb4_unicode_ci` and the other is `utf8mb4_general_ci`, they will not link:

```sql
ALTER TABLE employees MODIFY dept_code VARCHAR(10)
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Verify the Foreign Key Was Added

After fixing the issue, confirm the constraint exists:

```sql
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME,
       REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Summary

ERROR 1215 is always caused by a mismatch between the child and parent columns. Use `SHOW ENGINE INNODB STATUS` to get the exact reason, then verify data types match (including UNSIGNED), the parent column has an index, both tables use InnoDB, and the character sets and collations are identical.
