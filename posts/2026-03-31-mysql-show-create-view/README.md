# How to Use SHOW CREATE VIEW in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, DDL, Administration

Description: Learn how to use SHOW CREATE VIEW in MySQL to retrieve a view's full definition, useful for migrations, documentation, and debugging query logic.

---

## What Is SHOW CREATE VIEW?

Views in MySQL are named queries stored in the database that can be queried like tables. The `SHOW CREATE VIEW` statement retrieves the full `CREATE VIEW` DDL, including the defining query, security settings, and character set metadata. This is useful when you need to recreate, review, or migrate views.

## Basic Syntax

```sql
SHOW CREATE VIEW view_name;
SHOW CREATE VIEW db_name.view_name;
```

## Creating a Sample View

```sql
CREATE OR REPLACE VIEW active_customers AS
SELECT id, name, email, created_at
FROM customers
WHERE status = 'active'
  AND last_login > NOW() - INTERVAL 90 DAY;
```

## Retrieving the View DDL

```sql
SHOW CREATE VIEW active_customers\G
```

Sample output:

```text
*************************** 1. row ***************************
                View: active_customers
         Create View: CREATE ALGORITHM=UNDEFINED
                      DEFINER=`root`@`localhost`
                      SQL SECURITY DEFINER
                      VIEW `active_customers` AS
                      SELECT `customers`.`id`,
                             `customers`.`name`,
                             `customers`.`email`,
                             `customers`.`created_at`
                      FROM `customers`
                      WHERE `customers`.`status` = 'active'
                        AND `customers`.`last_login` > (NOW() - INTERVAL 90 DAY)
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
```

## Listing All Views

```sql
-- List all views in the current database
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- Query information_schema
SELECT TABLE_NAME, VIEW_DEFINITION, SECURITY_TYPE, DEFINER
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'mydb'
ORDER BY TABLE_NAME;
```

## Understanding View Security

Views can use two security modes:

```sql
-- DEFINER: runs with privileges of the view creator (default)
CREATE DEFINER = 'dba_user'@'localhost'
  SQL SECURITY DEFINER
  VIEW orders_summary AS
  SELECT customer_id, COUNT(*) AS total_orders FROM orders GROUP BY customer_id;

-- INVOKER: runs with privileges of the calling user
CREATE SQL SECURITY INVOKER
  VIEW my_orders AS
  SELECT * FROM orders WHERE user = CURRENT_USER();
```

## Modifying a View

```sql
-- Modify the view definition
CREATE OR REPLACE VIEW active_customers AS
SELECT id, name, email, phone, created_at
FROM customers
WHERE status = 'active'
  AND last_login > NOW() - INTERVAL 60 DAY;

-- Drop a view
DROP VIEW IF EXISTS active_customers;
```

## Exporting Views with mysqldump

```bash
# Views are included in a standard dump
mysqldump mydb > mydb_backup.sql

# To dump only view definitions (no data)
mysqldump --no-data mydb > mydb_schema.sql
```

## Permissions Required

```sql
-- Grant access to query a view
GRANT SELECT ON mydb.active_customers TO 'app_user'@'localhost';

-- Grant ability to create views
GRANT CREATE VIEW ON mydb.* TO 'dev_user'@'localhost';
```

## Summary

`SHOW CREATE VIEW` is the quickest way to retrieve a complete view definition in MySQL. It exposes the view's algorithm, security mode, and underlying query, making it straightforward to document or migrate views. Use it alongside `information_schema.VIEWS` for programmatic inventory of all views in your schema.
