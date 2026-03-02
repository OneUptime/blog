# How to Install MySQL 8 on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, Database, LAMP

Description: Install MySQL 8 on Ubuntu Server from the official MySQL APT repository, configure initial settings, and prepare it for production use.

---

MySQL 8 brought significant improvements over MySQL 5.7: better JSON support, window functions, roles and privileges improvements, and the new default authentication plugin (caching_sha2_password). Installing from the official MySQL APT repository ensures you get current releases and security updates directly from Oracle.

## Installation Options

There are two main ways to install MySQL 8 on Ubuntu:

1. **Ubuntu default repositories** - Simple but may be a version behind
2. **MySQL official APT repository** - Provides the latest MySQL 8.x releases

This guide uses the official repository for the most current version.

## Installing from the Official MySQL Repository

```bash
# Download the MySQL APT repository configuration package
# Check https://dev.mysql.com/downloads/repo/apt/ for the latest version
wget https://dev.mysql.com/get/mysql-apt-config_0.8.30-1_all.deb

# Install the configuration package
# This will open an interactive dialog to select the MySQL version
sudo dpkg -i mysql-apt-config_0.8.30-1_all.deb

# Update package lists to include the MySQL repository
sudo apt update

# Install MySQL Server
sudo apt install mysql-server -y
```

During `dpkg -i`, a dialog box appears. Select "MySQL Server & Cluster (Currently selected: mysql-8.0)" and confirm with OK.

## Alternative: Install from Ubuntu Repositories

Ubuntu 22.04 and later include MySQL 8 in the default repositories:

```bash
sudo apt update
sudo apt install mysql-server -y
```

This installs whatever MySQL 8.x version Ubuntu packages, which may not be the absolute latest but is well-tested with Ubuntu.

## Checking the Installation

```bash
# Check MySQL service status
sudo systemctl status mysql

# Check MySQL version
mysql --version

# Check if MySQL is listening
ss -tlnp | grep mysql
# Should show port 3306 listening on 127.0.0.1 (localhost only, correct for default install)
```

## Initial Security Configuration

MySQL 8 on Ubuntu 22.04+ automatically secures the installation during setup. However, you should verify and tighten the configuration:

```bash
# Connect as root using the auth socket (no password needed from root shell)
sudo mysql

# Check current root authentication method
SELECT user, host, plugin FROM mysql.user WHERE user='root';
```

By default, root uses `auth_socket` (or `unix_socket` on MariaDB), meaning root can only log in from the OS root account. This is secure. To change root to password authentication:

```sql
-- In MySQL prompt
ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'your-strong-password-here';
FLUSH PRIVILEGES;
EXIT;
```

Now test the password login:

```bash
mysql -u root -p
```

## Running mysql_secure_installation

Even after the automated setup, run the security script to catch any remaining defaults:

```bash
sudo mysql_secure_installation
```

It will prompt you to:
- Configure VALIDATE PASSWORD plugin
- Change root password (if using password auth)
- Remove anonymous users
- Disable remote root login
- Remove the test database
- Reload privilege tables

Answer yes to all except perhaps the password change if you already set one.

## Creating a Database and User

Never run applications as root. Create dedicated database users:

```bash
sudo mysql -u root -p
```

```sql
-- Create a database for your application
CREATE DATABASE myapp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a user with access only from localhost
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'strong-password-here';

-- Grant full access to only the application database
GRANT ALL PRIVILEGES ON myapp_db.* TO 'myapp_user'@'localhost';

-- Apply the privilege changes
FLUSH PRIVILEGES;

-- Verify
SHOW GRANTS FOR 'myapp_user'@'localhost';
EXIT;
```

Test the new user:

```bash
mysql -u myapp_user -p myapp_db
```

## Key MySQL 8 Configuration Settings

The main configuration file is `/etc/mysql/mysql.conf.d/mysqld.cnf`. Key settings to review:

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Data directory
datadir = /var/lib/mysql

# Log file for errors
log_error = /var/log/mysql/error.log

# Only listen on localhost (change for remote access)
bind-address = 127.0.0.1

# InnoDB buffer pool - most important performance setting
# Set to 70-80% of RAM for a dedicated database server
# Set to 25-30% if sharing with other services
innodb_buffer_pool_size = 1G

# Number of buffer pool instances
# Set to 8 for buffer pools >= 8GB, otherwise leave at 1
innodb_buffer_pool_instances = 1

# Maximum number of simultaneous connections
max_connections = 150

# Maximum packet size (increase for large queries or blobs)
max_allowed_packet = 64M

# Binary logging (required for replication and point-in-time recovery)
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
expire_logs_days = 7

# General query log (disable in production - very verbose)
# general_log = 1
# general_log_file = /var/log/mysql/query.log

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Character set defaults
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# SQL mode (strict is safer)
sql_mode = STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

After editing, restart MySQL:

```bash
sudo systemctl restart mysql

# Verify changes applied
sudo mysql -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
sudo mysql -e "SHOW VARIABLES LIKE 'max_connections';"
```

## Understanding MySQL 8 Authentication

MySQL 8 introduced `caching_sha2_password` as the default authentication plugin. Older clients may not support it. If you have connection issues with older applications:

```sql
-- Create a user with the older authentication (for compatibility)
CREATE USER 'legacy_user'@'localhost'
    IDENTIFIED WITH mysql_native_password BY 'password';

-- Or change an existing user
ALTER USER 'existing_user'@'localhost'
    IDENTIFIED WITH mysql_native_password BY 'password';
```

## Managing the MySQL Service

```bash
# Start/stop/restart MySQL
sudo systemctl start mysql
sudo systemctl stop mysql
sudo systemctl restart mysql

# Reload configuration without full restart (not all changes support this)
sudo systemctl reload mysql

# Enable MySQL to start at boot (enabled by default after installation)
sudo systemctl enable mysql

# Check if MySQL will start at boot
sudo systemctl is-enabled mysql
```

## Basic Verification Queries

```bash
# Check MySQL is working
sudo mysql -e "SELECT VERSION(), NOW();"

# Show all databases
sudo mysql -e "SHOW DATABASES;"

# Check InnoDB status
sudo mysql -e "SHOW ENGINE INNODB STATUS\G" | head -50

# Check current connections
sudo mysql -e "SHOW STATUS LIKE 'Threads_connected';"

# Check uptime
sudo mysql -e "SHOW STATUS LIKE 'Uptime';"
```

## Firewall Configuration

MySQL should not be exposed to the internet unless absolutely necessary:

```bash
# If using UFW - MySQL should only be accessible locally by default
sudo ufw status

# If you need to allow MySQL from a specific IP
sudo ufw allow from 10.0.0.5 to any port 3306

# Never do this (exposes MySQL to the internet)
# sudo ufw allow 3306
```

With MySQL 8 installed and configured, you have a robust database server ready for application development and production workloads. The next step is typically configuring backups and monitoring.
