# How to Configure MySQL Lower Case Table Names Setting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Table Name, Case Sensitivity, Portability

Description: Learn how MySQL lower_case_table_names works, when to configure it, and the implications for case sensitivity, portability, and cross-platform deployments.

---

## Overview

MySQL's `lower_case_table_names` setting controls how table and database names are stored on disk and compared in queries. This setting is critical for cross-platform compatibility - especially when moving databases between Linux (case-sensitive) and Windows or macOS (case-insensitive file systems).

## Understanding the Setting Values

```text
Value | Storage           | Comparison  | Typical Platform
------+-------------------+-------------+------------------
  0   | As specified      | Case-sensitive  | Linux (default)
  1   | Lowercase         | Case-insensitive| Windows (default)
  2   | As specified      | Case-insensitive| macOS (default)
```

## Checking the Current Setting

```sql
SHOW VARIABLES LIKE 'lower_case_table_names';
```

## The Impact on Table Names

With `lower_case_table_names=0` (Linux default):

```sql
-- These are THREE different tables
CREATE TABLE Orders (id INT);
CREATE TABLE orders (id INT);
CREATE TABLE ORDERS (id INT);

-- Case must match exactly
SELECT * FROM Orders;  -- Finds the 'Orders' table
SELECT * FROM orders;  -- Finds the 'orders' table (different table)
SELECT * FROM ORDERS;  -- Finds the 'ORDERS' table (different table)
```

With `lower_case_table_names=1`:

```sql
-- MySQL converts to lowercase, all equivalent
CREATE TABLE Orders (id INT);
-- Stored as 'orders'

-- All of these work and refer to the same table
SELECT * FROM Orders;
SELECT * FROM orders;
SELECT * FROM ORDERS;
```

## Configuring the Setting

`lower_case_table_names` must be set at server initialization. Changing it on a running server with existing data can corrupt the data dictionary. Set it in `my.cnf` before initializing:

```text
[mysqld]
lower_case_table_names = 1
```

For MySQL 8.0, you must set this during initialization:

```bash
# Initialize with lower_case_table_names=1
mysqld --initialize --lower-case-table-names=1
```

## MySQL 8.0 Restrictions

MySQL 8.0 added a restriction: `lower_case_table_names` cannot be changed after the server has been initialized:

```bash
# Check if the setting was applied at initialization
mysql -e "SHOW VARIABLES LIKE 'lower_case_table_names';"

# Docker: set during container creation via server argument
docker run -e MYSQL_ROOT_PASSWORD=secret \
  mysql:8.0 --lower-case-table-names=1
```

## Cross-Platform Portability Best Practices

Regardless of the server setting, adopt these conventions to avoid portability issues:

```sql
-- Always use lowercase for table and database names
CREATE DATABASE myapp;
CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT);
CREATE TABLE user_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Use lowercase in all queries
SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN user_orders o ON u.id = o.user_id
GROUP BY u.id;
```

## Migration: Converting Mixed-Case Tables to Lowercase

If you need to normalize existing mixed-case tables:

```sql
-- Step 1: List tables with mixed case
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'myapp'
  AND table_name != LOWER(table_name);

-- Step 2: Rename each table (do this on a test server first)
RENAME TABLE `UserOrders` TO `user_orders`;
RENAME TABLE `ProductCatalog` TO `product_catalog`;
```

## Summary

`lower_case_table_names` is one of the most consequential MySQL settings for cross-platform deployments. On Linux servers, consider setting it to `1` if your application was developed on Windows or macOS to ensure consistent behavior. Always set this value before initializing MySQL 8.0 - changing it afterward is not supported and can cause the server to fail to start. Adopt an all-lowercase naming convention for tables and databases as a portable practice regardless of the server's setting.
