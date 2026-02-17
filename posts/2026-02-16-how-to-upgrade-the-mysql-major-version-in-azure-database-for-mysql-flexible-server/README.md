# How to Upgrade the MySQL Major Version in Azure Database for MySQL Flexible Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Version Upgrade, Flexible Server, Database Migration, MySQL 8.0, Maintenance

Description: A practical guide to upgrading from MySQL 5.7 to 8.0 on Azure Database for MySQL Flexible Server with minimal risk and downtime.

---

MySQL 5.7 is approaching end of life, and Azure Database for MySQL Flexible Server supports both 5.7 and 8.0. If you are still on 5.7, it is time to plan your upgrade. MySQL 8.0 brings significant improvements - better performance, window functions, common table expressions, improved JSON support, and enhanced security features. But a major version upgrade is not something you do casually. Queries that worked fine on 5.7 might behave differently on 8.0, and some deprecated features have been removed entirely.

This post covers the full upgrade process: assessing compatibility, testing, performing the upgrade, and handling the things that inevitably go sideways.

## What Changes Between MySQL 5.7 and 8.0

Before upgrading, understand what changed. Here are the most impactful differences:

### SQL Changes
- The default character set changed from `latin1` to `utf8mb4`.
- The default collation changed from `utf8mb4_general_ci` to `utf8mb4_0900_ai_ci`.
- `GROUP BY` no longer implicitly sorts results. If your application relies on sorted GROUP BY output, you need to add an explicit `ORDER BY`.
- `ASC` and `DESC` designators for `GROUP BY` columns are removed.
- Reserved words list has expanded (e.g., `RANK`, `ROW_NUMBER`, `GROUPS`).

### Authentication Changes
- The default authentication plugin changed from `mysql_native_password` to `caching_sha2_password`.
- Older clients may not support `caching_sha2_password`.

### Removed Features
- Query cache is removed entirely.
- `@@tx_isolation` system variable is replaced by `@@transaction_isolation`.
- Some deprecated features from 5.7 are gone.

### Performance Improvements
- InnoDB improvements across the board.
- Better handling of temporary tables.
- Improved optimizer with histograms and descending indexes.

## Pre-Upgrade Assessment

### Step 1: Check for Compatibility Issues

Connect to your MySQL 5.7 server and run compatibility checks:

```sql
-- Check for tables using deprecated storage engines
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE engine NOT IN ('InnoDB', 'MEMORY', 'PERFORMANCE_SCHEMA', 'CSV')
  AND table_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema');

-- Check for columns using removed data types or features
-- Look for tables with partition definitions that might be affected
SELECT table_schema, table_name, partition_method
FROM information_schema.partitions
WHERE partition_method IS NOT NULL
  AND table_schema NOT IN ('mysql', 'sys', 'information_schema');
```

### Step 2: Check for Reserved Word Conflicts

MySQL 8.0 added new reserved words. If your table or column names collide with these, queries will break:

```sql
-- Common new reserved words in MySQL 8.0 that might conflict
-- Check if any tables or columns use these names:
-- CUME_DIST, DENSE_RANK, EMPTY, EXCEPT, FIRST_VALUE, GROUPING,
-- GROUPS, JSON_TABLE, LAG, LAST_VALUE, LATERAL, LEAD, NTH_VALUE,
-- NTILE, OF, OVER, PERCENT_RANK, RANK, RECURSIVE, ROW_NUMBER, WINDOW

SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE column_name IN ('rank', 'row_number', 'groups', 'window', 'over', 'recursive', 'lead', 'lag')
  AND table_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema');
```

If you find conflicts, you will need to quote those identifiers with backticks in your queries.

### Step 3: Check for Implicit GROUP BY Sorting

This catches a lot of people. In MySQL 5.7, `GROUP BY` implicitly sorted results. In 8.0, it does not:

```sql
-- This query returns sorted results in 5.7 but NOT in 8.0
SELECT department, COUNT(*) FROM employees GROUP BY department;

-- Fix: Add explicit ORDER BY
SELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY department;
```

Search your application code for `GROUP BY` clauses that lack a corresponding `ORDER BY`.

### Step 4: Check Authentication Compatibility

```sql
-- Check which authentication plugins are in use
SELECT user, host, plugin FROM mysql.user;
```

If clients use `mysql_native_password` and cannot support `caching_sha2_password`, you will need to keep the old plugin or update the clients.

## Testing the Upgrade

Never upgrade production directly. Test first.

### Create a Test Server

Use point-in-time restore or a read replica to create a test copy:

```bash
# Restore your production server to a test instance
az mysql flexible-server restore \
  --resource-group myResourceGroup \
  --name my-mysql-upgrade-test \
  --source-server my-mysql-production \
  --restore-time "2026-02-16T00:00:00Z"
```

### Run the Upgrade on the Test Server

```bash
# Upgrade the test server to MySQL 8.0
az mysql flexible-server update \
  --resource-group myResourceGroup \
  --name my-mysql-upgrade-test \
  --version 8.0.21
```

### Validate on the Test Server

After the upgrade completes:

1. Run your application's test suite against the upgraded server.
2. Execute your most common queries and check the results.
3. Verify stored procedures and functions work correctly.
4. Check that all views are valid.
5. Test application authentication with the new default plugin.

```sql
-- Validate that critical queries return expected results
-- Run a few spot checks on important tables

-- Check row counts on key tables
SELECT 'orders' AS tbl, COUNT(*) AS cnt FROM orders
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'products', COUNT(*) FROM products;

-- Verify stored procedures run without errors
CALL my_critical_procedure();

-- Check that views are valid
SELECT * FROM my_important_view LIMIT 1;
```

## Performing the Production Upgrade

Once testing passes, plan the production upgrade.

### Pre-Upgrade Checklist

1. Take a manual backup (in addition to automated backups).
2. Note the current server parameters - some may reset during upgrade.
3. Notify stakeholders about the maintenance window.
4. Prepare rollback plan.
5. Reduce application traffic if possible.

### Schedule During Low Traffic

The upgrade causes downtime. Schedule it during your lowest traffic period:

```bash
# Perform the major version upgrade
az mysql flexible-server update \
  --resource-group myResourceGroup \
  --name my-mysql-production \
  --version 8.0.21
```

The upgrade typically takes 5-30 minutes depending on the database size and complexity. During this time, the server is unavailable.

### Post-Upgrade Steps

After the upgrade completes:

```bash
# Verify the server version
az mysql flexible-server show \
  --resource-group myResourceGroup \
  --name my-mysql-production \
  --query "version"

# Check that server parameters are set correctly
az mysql flexible-server parameter list \
  --resource-group myResourceGroup \
  --server-name my-mysql-production \
  --output table
```

Connect to MySQL and run post-upgrade tasks:

```sql
-- Run mysql_upgrade equivalent checks
-- Azure handles this automatically, but verify key tables

-- Check for any warnings or errors in the error log
SHOW WARNINGS;

-- Verify the authentication plugin for your users
SELECT user, host, plugin FROM mysql.user WHERE user NOT LIKE 'mysql.%';

-- Update statistics on important tables
ANALYZE TABLE orders;
ANALYZE TABLE customers;
ANALYZE TABLE products;
```

### Update Application Authentication (If Needed)

If you need to keep using `mysql_native_password` for compatibility:

```sql
-- Change a user back to mysql_native_password if needed
ALTER USER 'appuser'@'%' IDENTIFIED WITH mysql_native_password BY 'AppPassword123!';
```

Or set the server default:

```bash
# Set the default authentication plugin server-wide
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-production \
  --name default_authentication_plugin \
  --value mysql_native_password
```

## Rollback Plan

If the upgrade goes wrong, your options are:

1. **Point-in-time restore**: Restore to a point just before the upgrade. This creates a new server on MySQL 5.7 with your pre-upgrade data.
2. **Read replica promotion**: If you had a read replica that was not upgraded, promote it.

You cannot downgrade a server in place. The only rollback path is restoring from backup.

```bash
# Rollback by restoring from backup (creates a new server on 5.7)
az mysql flexible-server restore \
  --resource-group myResourceGroup \
  --name my-mysql-production-rollback \
  --source-server my-mysql-production \
  --restore-time "2026-02-16T01:00:00Z"
```

## Handling Read Replicas

If your server has read replicas:

- Replicas are NOT automatically upgraded when you upgrade the primary.
- You must upgrade replicas separately after upgrading the primary.
- The primary must be upgraded before the replicas.
- During the primary upgrade, replication will break temporarily and resume after the replica is also upgraded.

```bash
# After upgrading the primary, upgrade each replica
az mysql flexible-server update \
  --resource-group myResourceGroup \
  --name my-mysql-replica-1 \
  --version 8.0.21
```

## Taking Advantage of MySQL 8.0 Features

After upgrading, start using the new features:

```sql
-- Common Table Expressions (CTEs)
WITH monthly_sales AS (
    SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, SUM(total) AS revenue
    FROM orders
    GROUP BY DATE_FORMAT(order_date, '%Y-%m')
)
SELECT month, revenue FROM monthly_sales WHERE revenue > 10000;

-- Window Functions
SELECT
    employee_name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
FROM employees;

-- JSON improvements
SELECT JSON_TABLE(
    '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]',
    '$[*]' COLUMNS (
        name VARCHAR(50) PATH '$.name',
        age INT PATH '$.age'
    )
) AS jt;
```

## Summary

Upgrading from MySQL 5.7 to 8.0 on Azure Database for MySQL Flexible Server is a planned operation that requires preparation but is well worth it. The pre-upgrade assessment catches compatibility issues before they become production problems. Always test on a copy of your production data first. Plan for the downtime window, have a rollback strategy ready, and upgrade replicas after the primary. Once you are on 8.0, take advantage of the new features - CTEs, window functions, and improved performance will make your life easier.
