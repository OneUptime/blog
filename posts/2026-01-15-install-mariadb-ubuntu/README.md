# How to Install and Configure MariaDB on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, MariaDB, Database, MySQL, SQL, Tutorial

Description: Complete guide to installing, configuring, and securing MariaDB database server on Ubuntu.

---

MariaDB is a community-developed fork of MySQL that's fully compatible with MySQL while offering additional features and performance improvements. This guide covers installation, configuration, and basic administration on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- At least 1GB RAM

## Installation

### From Ubuntu Repository

```bash
# Update packages
sudo apt update

# Install MariaDB
sudo apt install mariadb-server mariadb-client -y

# Verify installation
mariadb --version

# Check service status
sudo systemctl status mariadb
```

### From MariaDB Repository (Latest Version)

```bash
# Add MariaDB repository
curl -LsS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --mariadb-server-version=11.2

# Install
sudo apt update
sudo apt install mariadb-server mariadb-client -y
```

## Secure Installation

```bash
# Run security script
sudo mariadb-secure-installation
```

Answer the prompts:
- **Switch to unix_socket authentication**: n (or y for local-only)
- **Change root password**: Y (set strong password)
- **Remove anonymous users**: Y
- **Disallow root login remotely**: Y
- **Remove test database**: Y
- **Reload privilege tables**: Y

## Basic Configuration

### Configuration File

```bash
# Edit main configuration
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

Common settings:

```ini
[mysqld]
# Network
bind-address = 127.0.0.1
port = 3306

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# InnoDB settings
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT

# Query cache (disable for MariaDB 10.2+)
query_cache_type = 0
query_cache_size = 0

# Connections
max_connections = 151
wait_timeout = 600
interactive_timeout = 600

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Binary logging (for replication)
# log_bin = /var/log/mysql/mariadb-bin
# expire_logs_days = 7
```

### Apply Changes

```bash
sudo systemctl restart mariadb
```

## Connect to MariaDB

```bash
# Connect as root
sudo mariadb

# Or with password
mariadb -u root -p

# Connect to specific database
mariadb -u username -p database_name
```

## User Management

### Create User

```sql
-- Create local user
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'StrongPassword123!';

-- Create user for remote access
CREATE USER 'appuser'@'%' IDENTIFIED BY 'StrongPassword123!';

-- Create user with specific host
CREATE USER 'appuser'@'192.168.1.%' IDENTIFIED BY 'StrongPassword123!';
```

### Grant Privileges

```sql
-- Grant all privileges on database
GRANT ALL PRIVILEGES ON myapp_db.* TO 'appuser'@'localhost';

-- Grant specific privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.* TO 'appuser'@'localhost';

-- Grant global privileges (careful!)
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost' WITH GRANT OPTION;

-- Apply privileges
FLUSH PRIVILEGES;
```

### View Users

```sql
-- List all users
SELECT User, Host FROM mysql.user;

-- Show user privileges
SHOW GRANTS FOR 'appuser'@'localhost';
```

### Remove User

```sql
-- Drop user
DROP USER 'appuser'@'localhost';
```

## Database Management

### Create Database

```sql
-- Create database
CREATE DATABASE myapp_db;

-- Create with character set
CREATE DATABASE myapp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### List Databases

```sql
SHOW DATABASES;
```

### Use Database

```sql
USE myapp_db;
```

### Delete Database

```sql
DROP DATABASE myapp_db;
```

## Backup and Restore

### Backup Single Database

```bash
# Backup database
mysqldump -u root -p myapp_db > myapp_db_backup.sql

# Backup with compression
mysqldump -u root -p myapp_db | gzip > myapp_db_backup.sql.gz
```

### Backup All Databases

```bash
# Backup all databases
mysqldump -u root -p --all-databases > all_databases.sql

# Backup with routines and triggers
mysqldump -u root -p --all-databases --routines --triggers > full_backup.sql
```

### Restore Database

```bash
# Restore from backup
mariadb -u root -p myapp_db < myapp_db_backup.sql

# Restore compressed backup
gunzip < myapp_db_backup.sql.gz | mariadb -u root -p myapp_db
```

## Enable Remote Access

### Configure Binding

```bash
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

Change:
```ini
bind-address = 0.0.0.0
```

### Create Remote User

```sql
CREATE USER 'remoteuser'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON database.* TO 'remoteuser'@'%';
FLUSH PRIVILEGES;
```

### Configure Firewall

```bash
sudo ufw allow 3306/tcp
```

### Restart MariaDB

```bash
sudo systemctl restart mariadb
```

## Performance Monitoring

### Check Status

```sql
-- Server status
SHOW STATUS;

-- Specific variables
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Slow_queries';

-- Process list
SHOW PROCESSLIST;
```

### Performance Schema

```sql
-- Enable performance schema
SET GLOBAL performance_schema = ON;

-- Query performance
SELECT * FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

### Slow Query Analysis

```bash
# View slow query log
sudo tail -f /var/log/mysql/slow.log

# Analyze with mysqldumpslow
mysqldumpslow /var/log/mysql/slow.log
```

## Replication Setup

### Master Configuration

```bash
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

```ini
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mariadb-bin
binlog_format = ROW
```

```sql
-- Create replication user
CREATE USER 'replica'@'%' IDENTIFIED BY 'replica_password';
GRANT REPLICATION SLAVE ON *.* TO 'replica'@'%';
FLUSH PRIVILEGES;

-- Get master status
SHOW MASTER STATUS;
```

### Slave Configuration

```ini
[mysqld]
server-id = 2
relay_log = /var/log/mysql/relay-bin
read_only = 1
```

```sql
-- Configure slave
CHANGE MASTER TO
    MASTER_HOST='master_ip',
    MASTER_USER='replica',
    MASTER_PASSWORD='replica_password',
    MASTER_LOG_FILE='mariadb-bin.000001',
    MASTER_LOG_POS=position;

-- Start slave
START SLAVE;

-- Check status
SHOW SLAVE STATUS\G
```

## Troubleshooting

### Check Logs

```bash
# Error log
sudo tail -f /var/log/mysql/error.log

# General query log (for debugging)
# Enable in config: general_log = 1
```

### Connection Issues

```bash
# Check MariaDB is running
sudo systemctl status mariadb

# Check port
ss -tlnp | grep 3306

# Test connection
mariadb -u root -p -e "SELECT 1"
```

### Reset Root Password

```bash
# Stop MariaDB
sudo systemctl stop mariadb

# Start without grant tables
sudo mysqld_safe --skip-grant-tables &

# Connect and reset
mariadb -u root
```

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPassword';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Restart normally
sudo systemctl restart mariadb
```

### Repair Tables

```bash
# Check and repair
mysqlcheck -u root -p --auto-repair --all-databases
```

---

MariaDB is a robust, MySQL-compatible database suitable for most applications. For high-availability setups, consider Galera Cluster or MaxScale for load balancing and failover.
