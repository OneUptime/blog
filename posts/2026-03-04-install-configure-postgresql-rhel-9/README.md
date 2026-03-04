# How to Install and Configure PostgreSQL on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Database, Linux

Description: Install and configure PostgreSQL on RHEL 9 with initial setup and user creation.

---

## Overview

Install and configure PostgreSQL on RHEL 9 with initial setup and user creation. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database storage

## Step 1 - Install the Database Packages

For PostgreSQL:

```bash
sudo dnf install -y postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

For MariaDB:

```bash
sudo dnf install -y mariadb-server
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

For MySQL 8.0:

```bash
sudo dnf install -y mysql-community-server
sudo systemctl enable --now mysqld
```

Choose the appropriate commands for your database engine.

## Step 2 - Perform Initial Configuration

Edit the main configuration file:

- PostgreSQL: `/var/lib/pgsql/data/postgresql.conf` and `pg_hba.conf`
- MariaDB/MySQL: `/etc/my.cnf.d/server.cnf`

Adjust memory settings, connection limits, and authentication methods to match your workload.

## Step 3 - Create Users and Databases

For PostgreSQL:

```bash
sudo -u postgres createuser myappuser
sudo -u postgres createdb myappdb -O myappuser
```

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
sudo firewall-cmd --permanent --add-service=postgresql
# or
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --reload
```

## Step 5 - Verify the Setup

Connect to the database and run a test query:

```bash
# PostgreSQL
psql -h localhost -U myappuser myappdb -c "SELECT version();"
# MariaDB/MySQL
mysql -u myappuser -p myappdb -e "SELECT VERSION();"
```

## Summary

You have learned how to install and configure postgresql. Always secure your database with strong passwords, restricted network access, and regular backups.
