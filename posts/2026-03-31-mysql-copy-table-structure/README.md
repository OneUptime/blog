# How to Copy a Table Structure in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Table, Schema, Database, Index

Description: Learn how to copy a table structure in MySQL using CREATE TABLE LIKE and other methods to replicate schemas without copying data.

---

## Overview

Copying a table structure in MySQL is a common task when you need to create a staging table, test environment, or archive schema. MySQL provides several approaches to duplicate a table definition without copying its data.

## Using CREATE TABLE LIKE

The simplest method to copy a table structure is `CREATE TABLE ... LIKE`. This preserves all column definitions, indexes, column constraints (such as NOT NULL), and AUTO_INCREMENT settings.

```sql
CREATE TABLE employees_copy LIKE employees;
```

After running this command, `employees_copy` has the same schema as `employees` but contains no rows. You can verify the structure:

```sql
SHOW CREATE TABLE employees_copy;
```

### What LIKE Copies

- Column names, data types, and defaults
- NOT NULL constraints
- PRIMARY KEY and UNIQUE indexes
- Regular indexes
- AUTO_INCREMENT values (reset to 1)
- Column comments

### What LIKE Does NOT Copy

- Foreign key constraints
- Triggers
- Stored data

## Using CREATE TABLE SELECT

Another approach uses `CREATE TABLE ... SELECT` with a false WHERE clause:

```sql
CREATE TABLE employees_copy AS
SELECT * FROM employees WHERE 1 = 0;
```

This method copies column names and data types but does NOT copy indexes or constraints. It is rarely preferred over `LIKE` unless you need only the column definitions.

## Copying Across Databases

You can copy a table structure to a different database by qualifying the table names:

```sql
CREATE TABLE archive_db.employees LIKE production_db.employees;
```

This is useful for replicating schemas in multi-database setups.

## Copying Structure Including Foreign Keys

`CREATE TABLE ... LIKE` does not include foreign key definitions. To fully replicate a table including foreign keys, use `SHOW CREATE TABLE` to extract the DDL and modify it:

```sql
SHOW CREATE TABLE employees;
```

Copy the output, rename the table, adjust the foreign key names, and execute the modified statement:

```sql
CREATE TABLE employees_backup (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  CONSTRAINT fk_dept_backup FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

## Verifying the Copied Structure

After creating the copy, confirm the schema matches:

```sql
DESCRIBE employees;
DESCRIBE employees_copy;
```

Or compare indexes:

```sql
SHOW INDEX FROM employees;
SHOW INDEX FROM employees_copy;
```

## Monitoring Table Changes with OneUptime

When you copy table structures as part of a deployment or migration, use OneUptime to track the health of your MySQL service during and after schema changes. OneUptime can alert you if query performance degrades after structural modifications.

## Summary

`CREATE TABLE ... LIKE` is the recommended way to copy a table structure in MySQL, as it preserves indexes and column constraints (but not foreign keys). Use `CREATE TABLE ... SELECT WHERE 1=0` when you only need column definitions. For foreign keys, extract the DDL from `SHOW CREATE TABLE` and modify it manually.
