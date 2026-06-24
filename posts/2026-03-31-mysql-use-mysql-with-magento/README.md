# How to Use MySQL with Magento

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Magento, Database

Description: Set up and tune MySQL for Magento 2, covering database creation, env.php configuration, split database patterns, and InnoDB tuning.

---

Magento 2 is a MySQL-intensive application. A typical production store with a moderate catalog and traffic can generate thousands of queries per second. Getting the MySQL configuration right is essential before any other optimization.

## Prerequisites

Magento 2 requires MySQL 8.0 (or MariaDB 10.6+). Ensure the following PHP extensions are enabled:

```bash
php -m | grep -E "pdo_mysql|mysqli"
```

## Creating the Database

```sql
CREATE DATABASE magento_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'magento_user'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT ALL PRIVILEGES ON magento_db.* TO 'magento_user'@'localhost';
FLUSH PRIVILEGES;
```

## Configuring env.php

Magento stores database credentials in `app/etc/env.php`:

```php
'db' => [
    'table_prefix' => '',
    'connection' => [
        'default' => [
            'host'     => '127.0.0.1',
            'dbname'   => 'magento_db',
            'username' => 'magento_user',
            'password' => 'strongpassword',
            'active'   => '1',
        ],
    ],
],
```

## MySQL Configuration for Magento

Magento is memory-hungry. The buffer pool should be set to 70-80% of available RAM on a dedicated database server:

```text
[mysqld]
innodb_buffer_pool_size         = 4G
innodb_buffer_pool_instances    = 4
innodb_log_file_size            = 512M
innodb_flush_method             = O_DIRECT
max_connections                 = 200
tmp_table_size                  = 64M
max_heap_table_size             = 64M
```

`O_DIRECT` bypasses the OS page cache for InnoDB data files, avoiding double buffering when the buffer pool is large.

## Running Magento CLI Database Commands

```bash
# Reindex all indexes
php bin/magento indexer:reindex

# Flush cache
php bin/magento cache:flush

# Check database status
php bin/magento setup:db:status
```

## Identifying Large Magento Tables

```sql
SELECT TABLE_NAME,
       ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 0) AS size_mb,
       TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'magento_db'
ORDER BY size_mb DESC
LIMIT 15;
```

Tables like `catalog_product_flat_*`, `sales_order`, and `quote` tend to grow the largest.

## Cleaning Up Log Tables

Magento accumulates log data in tables like `report_event` and `customer_visitor`. Clean them regularly:

```sql
TRUNCATE TABLE report_event;
TRUNCATE TABLE customer_visitor;
```

Or configure automatic log cleaning via the Admin Panel at Stores > Configuration > Advanced > System > Log Cleaning, and set the retention period (e.g., 30 days). Magento's cron will handle the cleanup automatically.

## Summary

Magento demands generous InnoDB buffer pool sizing, controlled connection counts, and regular log table cleanup. Configure `env.php` with dedicated credentials, set `O_DIRECT` flush method on servers with large RAM, and use Magento CLI for all schema and cache management operations.
