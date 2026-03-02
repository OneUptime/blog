# How to Install MariaDB as a MySQL Alternative on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MariaDB, MySQL, Database

Description: Install MariaDB on Ubuntu as a MySQL drop-in replacement, configure it for production, and understand the key differences from MySQL 8.

---

MariaDB started as a fork of MySQL in 2009 when Oracle acquired Sun Microsystems. It maintains compatibility with MySQL's protocol and SQL dialect, making it usable as a drop-in replacement for most applications. Ubuntu has included MariaDB in its default repositories for years, and many hosting providers and Linux distributions prefer it over MySQL due to its fully open-source license and active community development.

## MariaDB vs MySQL: Key Differences

Before choosing MariaDB, understand where it differs from MySQL 8:

- **JSON support**: MariaDB has a different JSON implementation. MySQL 8's `JSON` type is a true binary storage format; MariaDB stores JSON as `LONGTEXT` with JSON validation functions. Most applications are unaffected.
- **Authentication**: MariaDB uses `unix_socket` for root by default on Linux, similar to MySQL on Ubuntu. Password auth is otherwise similar.
- **Storage engines**: MariaDB has Aria (replaces MyISAM), ColumnStore, and Spider. MySQL 8 focuses on InnoDB.
- **Window functions, CTEs**: Both support modern SQL features, with slight syntax differences.
- **Galera Cluster**: Built into MariaDB for multi-master clustering. MySQL uses Group Replication.

For WordPress, Drupal, Laravel, and most common applications, MariaDB is a transparent replacement for MySQL.

## Installation from Ubuntu Repositories

Ubuntu's default repositories include a recent MariaDB version:

```bash
sudo apt update
sudo apt install mariadb-server mariadb-client -y
```

Check what version was installed:

```bash
mariadb --version
mysql --version  # Also points to MariaDB
```

## Installation from the Official MariaDB Repository

For the latest stable release, use MariaDB's repository:

```bash
# Install repository setup tools
sudo apt install software-properties-common -y

# Add the MariaDB repository for version 11.x (LTS)
# Check https://mariadb.org/download/ for the current recommended version
curl -LsSO https://downloads.mariadb.com/MariaDB/mariadb_repo_setup
echo "6948ead6d5a7d9516b1e3fba66b16fbc1a3b1ac3  mariadb_repo_setup" | sha256sum -c -
sudo bash mariadb_repo_setup --mariadb-server-version="mariadb-11.4"

sudo apt update
sudo apt install mariadb-server -y
```

## Initial Security Setup

Run the security script immediately after installation:

```bash
sudo mariadb-secure-installation
# Or the older command still works:
# sudo mysql_secure_installation
```

Respond to the prompts:

- **Switch to unix_socket authentication?** - N (already using it for root, leave as is)
- **Change root password?** - Only if you plan to use password auth for root
- **Remove anonymous users?** - Y
- **Disallow root login remotely?** - Y
- **Remove test database?** - Y
- **Reload privilege tables?** - Y

## Connecting to MariaDB

```bash
# Connect as root using unix_socket (no password needed from root shell)
sudo mariadb
# Or
sudo mysql

# Check the server is running
sudo systemctl status mariadb
```

## Creating Databases and Users

The SQL syntax is identical to MySQL:

```sql
-- Create a database
CREATE DATABASE myapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create an application user
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'strong-password-here';

-- Grant privileges
GRANT ALL PRIVILEGES ON myapp.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW GRANTS FOR 'myapp_user'@'localhost';
```

## Configuration File Locations

MariaDB follows a different configuration structure than MySQL:

```bash
# Main configuration
/etc/mysql/mariadb.conf.d/50-server.cnf

# Client configuration
/etc/mysql/mariadb.conf.d/50-client.cnf

# All configuration files (loaded in alphabetical order)
ls /etc/mysql/mariadb.conf.d/
ls /etc/mysql/conf.d/
```

Key server settings in `50-server.cnf`:

```ini
# /etc/mysql/mariadb.conf.d/50-server.cnf

[mysqld]
# Listen on localhost only
bind-address = 127.0.0.1

# Data directory
datadir = /var/lib/mysql

# Error log
log_error = /var/log/mysql/error.log

# InnoDB buffer pool - set to 70-80% of RAM for dedicated DB servers
innodb_buffer_pool_size = 2G

# Number of buffer pool instances (increase for large buffer pools)
innodb_buffer_pool_instances = 2

# InnoDB redo log size (larger = faster writes, slower crash recovery)
innodb_log_file_size = 512M

# Maximum connections
max_connections = 200

# Maximum packet size
max_allowed_packet = 64M

# Thread cache
thread_cache_size = 16

# Query cache (removed in MySQL 8, still present in MariaDB - use cautiously)
# query_cache_type = 1
# query_cache_size = 128M

# Binary logging
log_bin = /var/log/mysql/mysql-bin.log
expire_logs_days = 7
binlog_format = ROW

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

Restart after configuration changes:

```bash
sudo systemctl restart mariadb
```

## MariaDB-Specific Features Worth Using

**The Aria Storage Engine** - More crash-safe than MyISAM and good for temporary tables:

```sql
CREATE TABLE temp_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data TEXT
) ENGINE=Aria;
```

**System-Versioned Tables** - Temporal data tracking built into the table:

```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    amount DECIMAL(10,2),
    status VARCHAR(50)
) WITH SYSTEM VERSIONING;

-- Query historical data
SELECT * FROM orders
    FOR SYSTEM_TIME AS OF '2025-01-01 00:00:00';
```

**Dynamic Columns** - Store flexible key-value data:

```sql
CREATE TABLE products (
    id INT PRIMARY KEY,
    attributes BLOB
);

INSERT INTO products VALUES (1, COLUMN_CREATE('color', 'red', 'size', 'L'));
SELECT COLUMN_GET(attributes, 'color' AS CHAR) FROM products WHERE id = 1;
```

## Monitoring MariaDB Performance

```bash
# Check status variables
sudo mariadb -e "SHOW STATUS LIKE 'Threads_connected';"
sudo mariadb -e "SHOW STATUS LIKE 'Innodb_buffer_pool_read_requests';"
sudo mariadb -e "SHOW STATUS LIKE 'Innodb_buffer_pool_reads';"

# Calculate buffer pool hit ratio (should be > 99%)
sudo mariadb -e "
SELECT
    ROUND(
        (1 - (
            (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME='Innodb_buffer_pool_reads') /
            (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME='Innodb_buffer_pool_read_requests')
        )) * 100, 2
    ) AS buffer_pool_hit_ratio_percent;"
```

## Migrating from MySQL to MariaDB

For most applications, migration is straightforward:

```bash
# Dump data from MySQL
mysqldump -u root -p --all-databases > mysql_backup.sql

# Stop MySQL
sudo systemctl stop mysql

# Install MariaDB (after removing MySQL if on same server)
sudo apt remove mysql-server -y
sudo apt install mariadb-server -y

# Import the data
sudo mariadb < mysql_backup.sql

# Test your application
```

Potential compatibility issues to check:
- Applications using MySQL 8's `caching_sha2_password` may need the user recreated with `mysql_native_password` in MariaDB
- MySQL 8 JSON column behavior differs slightly from MariaDB's JSON functions
- Some MySQL 8 syntax additions may not be available in older MariaDB versions

```bash
# Check MariaDB version after migration
mariadb --version

# Verify data imported correctly
sudo mariadb -e "SHOW DATABASES;"
sudo mariadb -u myapp_user -p myapp -e "SHOW TABLES;"
```

MariaDB is an excellent choice for most production workloads, especially when you want full open-source licensing, active community support, and the extensive library of MariaDB-specific features like Galera Cluster and temporal tables.
