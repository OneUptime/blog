# How to Compare Two MySQL Database Schemas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema Diff, Migration, Database Comparison

Description: Learn how to compare two MySQL database schemas using mysqldiff, MySQL Workbench, and information_schema queries to identify structural differences.

---

Comparing two MySQL schemas is essential when promoting changes from staging to production, validating migrations, or auditing drift between environments. Multiple tools and methods are available.

## Method 1 - mysqldump and diff

The simplest approach: dump the schema from both databases and compare with diff.

```bash
# Dump schema only (no data)
mysqldump --no-data -u root -p -h production myapp > prod_schema.sql
mysqldump --no-data -u root -p -h staging    myapp > stg_schema.sql

# Compare line by line
diff prod_schema.sql stg_schema.sql
```

Limitations: comment lines, AUTO_INCREMENT values, and formatting differences create noise. Sort and clean the output:

```bash
grep -v "AUTO_INCREMENT" prod_schema.sql | grep -v "^--" | sort > prod_clean.sql
grep -v "AUTO_INCREMENT" stg_schema.sql  | grep -v "^--" | sort > stg_clean.sql
diff prod_clean.sql stg_clean.sql
```

## Method 2 - MySQL Utilities mysqldiff

```bash
# MySQL Utilities mysqldiff (deprecated but still useful)
mysqldiff --server1=user:pass@host1 --server2=user:pass@host2 \
          --difftype=sql myapp:myapp
```

## Method 3 - MySQL Workbench Schema Diff

In MySQL Workbench:
1. Connect to both servers
2. Go to Database > Schema Diff Tool
3. Select source and target schemas
4. Click Start

Workbench generates an ALTER script to bring the target in line with the source.

## Method 4 - Querying information_schema

Compare tables between two databases on the same server:

```sql
-- Tables in db1 but not in db2
SELECT TABLE_NAME
FROM   information_schema.TABLES
WHERE  TABLE_SCHEMA = 'db1'
  AND  TABLE_NAME NOT IN (
       SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'db2'
  );

-- Column differences for a specific table
SELECT
    c1.TABLE_NAME, c1.COLUMN_NAME,
    c1.DATA_TYPE AS db1_type, c2.DATA_TYPE AS db2_type
FROM information_schema.COLUMNS c1
JOIN information_schema.COLUMNS c2
    ON c1.TABLE_NAME = c2.TABLE_NAME
   AND c1.COLUMN_NAME = c2.COLUMN_NAME
WHERE c1.TABLE_SCHEMA = 'db1'
  AND c2.TABLE_SCHEMA = 'db2'
  AND c1.DATA_TYPE <> c2.DATA_TYPE;
```

## Method 5 - skeema

`skeema` is a modern schema management tool that can diff and sync schemas:

```bash
# Install skeema
curl -fsSL https://packagecloud.io/skeema/skeema/script.deb.sh | bash
apt-get install skeema

# Initialize from production
skeema init --host=prod-host --user=root --schema=myapp .

# Diff against staging
skeema diff --host=staging-host
```

## Finding Index Differences

Note: The `EXCEPT` clause requires MySQL 8.0.31 or later.

```sql
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM   information_schema.STATISTICS
WHERE  TABLE_SCHEMA = 'db1'
EXCEPT
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM   information_schema.STATISTICS
WHERE  TABLE_SCHEMA = 'db2';
```

## Summary

For quick comparisons, dump both schemas and use `diff`. For a GUI approach, MySQL Workbench's Schema Diff Tool generates actionable ALTER scripts. For programmatic or CI/CD workflows, use skeema or mysqldiff. Query `information_schema.COLUMNS` and `information_schema.STATISTICS` directly when you need specific column or index comparisons.
