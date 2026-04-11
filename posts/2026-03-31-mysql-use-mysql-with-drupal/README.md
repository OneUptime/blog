# How to Use MySQL with Drupal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Drupal, Database

Description: Learn how to configure MySQL as the database backend for Drupal, including installation, settings.php configuration, and performance tuning.

---

Drupal is one of the most widely deployed open-source CMS platforms, and MySQL is its default recommended database. Getting this combination right from the start avoids a range of performance and reliability problems down the road.

## Prerequisites

You need a running MySQL 8.0+ server and Drupal 10 or 11. Ensure the `pdo_mysql` PHP extension is active (Drupal uses PDO exclusively for database access).

```bash
php -m | grep pdo_mysql
```

## Creating the Drupal Database and User

```sql
CREATE DATABASE drupal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'drupal_user'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES
  ON drupal_db.* TO 'drupal_user'@'localhost';
FLUSH PRIVILEGES;
```

Using `utf8mb4` is critical. Drupal stores multilingual content including emoji, and the older `utf8` charset truncates 4-byte characters silently.

## Configuring settings.php

During installation you can provide credentials via the web UI, but for production deployments set them directly in `sites/default/settings.php`:

```php
$databases['default']['default'] = [
  'driver'   => 'mysql',
  'database' => 'drupal_db',
  'username' => 'drupal_user',
  'password' => 'strongpassword',
  'host'     => '127.0.0.1',
  'port'     => '3306',
  'prefix'   => '',
  'collation' => 'utf8mb4_general_ci',
];
```

Using `127.0.0.1` instead of `localhost` forces TCP instead of Unix socket, which is more predictable across environments.

## Key MySQL Settings for Drupal

Drupal is write-heavy during caching and session management. Tune `my.cnf` accordingly:

```text
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size    = 256M
max_connections         = 150
```

Do not include `query_cache_type` or other query cache settings - the query cache was completely removed in MySQL 8.0 and these variables are unrecognized, which can prevent the server from starting.

## Running Drupal CLI (Drush) Database Commands

```bash
# Check database connection from Drush
drush sql:connect

# Export the database
drush sql:dump --result-file=backup.sql

# Import a database
drush sql:cli < backup.sql
```

## Performance: InnoDB Table Optimization

Drupal's cache tables receive constant inserts and deletes. Use InnoDB and consider truncating cache tables rather than deleting rows:

```sql
-- Check cache table engine
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'drupal_db'
  AND TABLE_NAME LIKE 'cache%';

-- Truncate a cache table manually (Drush does this for you)
TRUNCATE TABLE cache_default;
```

## Monitoring Table Growth

Drupal's watchdog and cache tables can balloon in size. Monitor them:

```sql
SELECT TABLE_NAME,
       ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'drupal_db'
ORDER BY size_mb DESC
LIMIT 10;
```

## Summary

MySQL and Drupal work well together when you configure `utf8mb4`, tune InnoDB buffer pool, and disable the legacy query cache. Use Drush for database operations in CI/CD pipelines and monitor cache table growth to prevent unbounded disk usage.
