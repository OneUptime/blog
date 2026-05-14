# How to Tune MariaDB/MySQL Performance on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, MySQL, Performance Tuning

Description: Tune MariaDB and MySQL performance on RHEL 9 with optimized buffer pool settings.

---

## Overview

Tune MariaDB and MySQL performance on RHEL 9 with optimized buffer pool settings. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database storage

## Step 1 - Install the Database Packages

For MariaDB:

```bash
sudo dnf install -y mariadb-server
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

For MySQL 8.0:

```bash
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld
sudo mysql_secure_installation
```

Choose the appropriate commands for your database engine. On RHEL 9, MariaDB and MySQL packages conflict and should not be installed on the same host.

## Step 2 - Perform Initial Configuration

Edit the main configuration file:

- MariaDB: `/etc/my.cnf.d/mariadb-server.cnf`
- MySQL: `/etc/my.cnf.d/mysql-server.cnf`

Adjust memory settings, connection limits, and authentication methods to match your workload. For InnoDB-heavy workloads, set `innodb_buffer_pool_size` in the `[mysqld]` section to a value appropriate for the server memory and workload:

```ini
[mysqld]
innodb_buffer_pool_size=2G
```

Restart the database service after changing the configuration:

```bash
sudo systemctl restart mariadb
# or
sudo systemctl restart mysqld
```

## Step 3 - Create Users and Databases

For MariaDB/MySQL:

```sql
CREATE DATABASE myappdb;
CREATE USER 'myappuser'@'localhost' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON myappdb.* TO 'myappuser'@'localhost';
FLUSH PRIVILEGES;
```

## Step 4 - Configure Network Access

If remote connections are needed, update the listen address and authentication rules, then open the firewall:

```bash
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --reload
```

## Step 5 - Verify the Setup

Connect to the database and run a test query:

```bash
# MariaDB/MySQL
mysql -u myappuser -p myappdb -e "SELECT VERSION();"
```

## Summary

You have learned how to tune mariadb/mysql performance. Always secure your database with strong passwords, restricted network access, and regular backups.
