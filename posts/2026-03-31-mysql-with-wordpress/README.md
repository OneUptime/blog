# How to Use MySQL with WordPress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, WordPress, Configuration, Performance, Database

Description: Learn how to configure MySQL for WordPress, including optimal settings, database creation, user permissions, and performance tuning for WordPress workloads.

---

## Overview

WordPress uses MySQL as its primary data store and is one of the most common MySQL use cases on the web. Proper MySQL configuration for WordPress goes beyond the default settings - tuning InnoDB, query cache alternatives, character sets, and connection settings can significantly improve WordPress performance and reliability.

## Creating the WordPress Database and User

```sql
-- Create the WordPress database with proper character set
CREATE DATABASE wordpress_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create a dedicated WordPress database user
CREATE USER 'wordpress_user'@'localhost'
  IDENTIFIED BY 'strong_password_here';

-- Grant only the necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP,
      INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES
  ON wordpress_db.*
  TO 'wordpress_user'@'localhost';

FLUSH PRIVILEGES;
```

## Configuring wp-config.php

```php
// wp-config.php
define('DB_NAME', 'wordpress_db');
define('DB_USER', 'wordpress_user');
define('DB_PASSWORD', 'strong_password_here');
define('DB_HOST', 'localhost');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', 'utf8mb4_unicode_ci');
```

## Optimal MySQL Configuration for WordPress

Add these settings to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
# Character set
character_set_server    = utf8mb4
collation_server        = utf8mb4_unicode_ci

# InnoDB settings
innodb_buffer_pool_size = 256M     # Set to 70-80% of available RAM
innodb_log_file_size    = 64M
innodb_flush_method     = O_DIRECT

# Connection settings
max_connections         = 150
wait_timeout            = 300
interactive_timeout     = 300

# Temporary tables
tmp_table_size          = 32M
max_heap_table_size     = 32M

# Query optimization
innodb_stats_on_metadata = 0
```

## WordPress-Specific Table Optimizations

WordPress's core tables benefit from proper indexing:

```sql
-- Check for missing indexes that WordPress commonly needs
SELECT table_name, index_name, column_name
FROM information_schema.statistics
WHERE table_schema = 'wordpress_db'
ORDER BY table_name, index_name;

-- Common WordPress performance index additions
-- For large sites with many posts:
ALTER TABLE wp_posts ADD INDEX idx_post_author_status (post_author, post_status);
ALTER TABLE wp_postmeta ADD INDEX idx_meta_key_value (meta_key, meta_value(100));
```

## Monitoring WordPress Database Performance

```sql
-- Find slow queries from WordPress
SELECT
    db,
    LEFT(info, 100) AS query_preview,
    time AS seconds,
    state
FROM information_schema.processlist
WHERE db = 'wordpress_db'
  AND time > 5
ORDER BY time DESC;

-- Check table sizes to identify bloat
SELECT
    table_name,
    ROUND(data_length / 1024 / 1024, 2) AS data_mb,
    ROUND(index_length / 1024 / 1024, 2) AS index_mb,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'wordpress_db'
ORDER BY data_length DESC;
```

## Optimizing WordPress Tables

Run periodic table maintenance to reclaim space and update statistics:

```sql
-- Optimize tables with significant fragmentation
OPTIMIZE TABLE wp_posts;
OPTIMIZE TABLE wp_postmeta;
OPTIMIZE TABLE wp_options;

-- Remove autoloaded options that slow down WordPress startup
SELECT option_name, LENGTH(option_value) AS size_bytes
FROM wp_options
WHERE autoload = 'yes'
ORDER BY size_bytes DESC
LIMIT 20;
```

## Connecting WordPress to a Remote MySQL Server

For production setups with a separate database server:

```php
// wp-config.php for remote MySQL
define('DB_HOST', '10.0.1.100:3306');
define('DB_NAME', 'wordpress_db');
define('DB_USER', 'wordpress_user');
define('DB_PASSWORD', 'strong_password_here');
```

Create the user with the web server's IP instead of localhost:

```sql
CREATE USER 'wordpress_user'@'10.0.1.50'
  IDENTIFIED BY 'strong_password_here';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP,
      INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES
  ON wordpress_db.*
  TO 'wordpress_user'@'10.0.1.50';
```

## Summary

MySQL for WordPress requires creating a dedicated database and user with minimal privileges, configuring the character set to `utf8mb4` throughout (database, tables, and `wp-config.php`), and tuning `innodb_buffer_pool_size` to keep the working set in memory. For performance, add indexes to `wp_posts` and `wp_postmeta` for large content sites, run `OPTIMIZE TABLE` periodically to reduce fragmentation, and audit the `wp_options` autoloaded values to prevent slow page loads caused by loading large option values on every request.
