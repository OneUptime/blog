# How to Use MySQL with PrestaShop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, PrestaShop, Database

Description: Configure MySQL for PrestaShop, including database setup, parameters.php configuration, prefix management, and InnoDB optimization tips.

---

PrestaShop is an open-source e-commerce platform built on PHP and MySQL. A clean MySQL configuration, correct character set, and appropriate InnoDB tuning keep your store responsive even as the product catalog and order history grow.

## Prerequisites

PrestaShop 8 requires PHP 8.1+ and MySQL 5.7+ (MySQL 8 recommended). Verify the PDO MySQL extension:

```bash
php -m | grep pdo_mysql
```

## Creating the Database and User

```sql
CREATE DATABASE prestashop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ps_user'@'localhost' IDENTIFIED BY 'securepassword';
GRANT ALL PRIVILEGES ON prestashop_db.* TO 'ps_user'@'localhost';
FLUSH PRIVILEGES;
```

## Parameters.php Configuration

PrestaShop stores database settings in `app/config/parameters.php` (PS 1.7+) or `config/settings.inc.php` (PS 1.6 and earlier):

```php
// PrestaShop 8 - app/config/parameters.php
<?php return array (
  'parameters' => array (
    'database_host' => '127.0.0.1',
    'database_port' => '3306',
    'database_name' => 'prestashop_db',
    'database_user' => 'ps_user',
    'database_password' => 'securepassword',
    'database_prefix' => 'ps_',
    'database_engine' => 'InnoDB',
  ),
);
```

The `database_prefix` allows multiple PrestaShop installations in one database schema.

## MySQL InnoDB Settings

```text
[mysqld]
innodb_buffer_pool_size     = 1G
innodb_log_file_size        = 256M
max_connections             = 150
table_open_cache            = 400
thread_cache_size           = 8
```

Increase `table_open_cache` if PrestaShop logs "Too many open files" warnings - the platform uses a large number of tables for modules.

## Checking Table Size and Fragmentation

```sql
SELECT TABLE_NAME,
       ENGINE,
       ROUND(DATA_LENGTH / 1024 / 1024, 2)  AS data_mb,
       ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb,
       ROUND(DATA_FREE / 1024 / 1024, 2)    AS free_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'prestashop_db'
ORDER BY data_mb DESC
LIMIT 10;
```

## Reclaiming Space from Log Tables

```sql
-- PrestaShop logs connections and statistics
TRUNCATE TABLE ps_connections;
TRUNCATE TABLE ps_connections_page;
TRUNCATE TABLE ps_statssearch;
```

Run this via a weekly cron job:

```bash
mysql -u ps_user -p prestashop_db -e "
  TRUNCATE TABLE ps_connections;
  TRUNCATE TABLE ps_connections_page;
"
```

## Verifying Database Integrity

```sql
-- Check for tables not using InnoDB
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'prestashop_db'
  AND ENGINE != 'InnoDB';

-- Convert MyISAM tables if any exist
ALTER TABLE ps_some_table ENGINE = InnoDB;
```

## Summary

PrestaShop and MySQL work reliably together when you use `utf8mb4` encoding, tune the InnoDB buffer pool to your catalog size, and schedule regular truncation of statistics and connection log tables. Always use `parameters.php` for credentials and never store them in the web root without proper file permissions.
