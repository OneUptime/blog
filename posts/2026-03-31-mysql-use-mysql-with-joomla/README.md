# How to Use MySQL with Joomla

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Joomla, Database

Description: Configure MySQL as the Joomla database backend, covering database creation, configuration.php settings, and InnoDB performance tips.

---

Joomla is a popular PHP-based CMS that relies on MySQL for storing articles, users, extensions, and session data. A properly configured MySQL instance ensures reliable performance at scale.

## Prerequisites

Joomla 5 requires MySQL 8.0.13+ and PHP 8.1+. Joomla 4 supports MySQL 5.6+ and PHP 7.2.5+, though MySQL 8.0+ is recommended. Both versions require the `mysqli` PHP extension.

```bash
php -m | grep mysqli
```

## Creating the Database and User

```sql
CREATE DATABASE joomla_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'joomla_user'@'localhost' IDENTIFIED BY 'securepassword';
GRANT ALL PRIVILEGES ON joomla_db.* TO 'joomla_user'@'localhost';
FLUSH PRIVILEGES;
```

## Configuration.php Settings

After running the Joomla installer, `configuration.php` is written automatically. For manual or automated deployments, set the following:

```php
public $dbtype   = 'mysqli';
public $host     = 'localhost';
public $user     = 'joomla_user';
public $password = 'securepassword';
public $db       = 'joomla_db';
public $dbprefix = 'jos_';
```

Joomla uses table prefixes to allow multiple installations in one database. The installer generates a random prefix automatically; `jos_` is shown here as a common example. Keep a unique prefix per site.

## Tuning MySQL for Joomla

Joomla generates many short-lived queries for menu rendering, module loading, and session tracking. Key settings:

```text
[mysqld]
innodb_buffer_pool_size     = 512M
innodb_flush_log_at_trx_commit = 2
max_connections             = 100
thread_cache_size           = 8
```

Setting `innodb_flush_log_at_trx_commit = 2` trades strict ACID durability for a significant write performance boost - acceptable for most CMS workloads where you have daily backups.

## Checking Table Overhead

Joomla's session and log tables accumulate stale rows. Check and reclaim space:

```sql
-- Find tables with significant overhead
SELECT TABLE_NAME,
       DATA_FREE / 1024 / 1024 AS free_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'joomla_db'
  AND DATA_FREE > 0
ORDER BY free_mb DESC;

-- Reclaim space
OPTIMIZE TABLE jos_session;
```

## Enabling Joomla Database Debugging

To profile Joomla database queries, enable debug mode in `configuration.php`:

```php
public $debug = true;
```

With the System - Debug plugin enabled, a debug console appears at the bottom of every page showing all executed queries, their execution times, and duplicate query detection. This helps identify slow or redundant queries during development.

## Verifying Joomla Tables

```sql
-- Count tables created by installer
SELECT COUNT(*) AS table_count
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'joomla_db';

-- Check for non-InnoDB tables
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'joomla_db'
  AND ENGINE != 'InnoDB';
```

Any non-InnoDB tables should be converted to InnoDB for transaction support and crash recovery.

## Summary

Joomla and MySQL pair cleanly when you use `utf8mb4`, configure InnoDB for the expected write volume, and periodically clean up session and log tables. Keep `configuration.php` out of version control and use environment-specific credentials for each deployment.
