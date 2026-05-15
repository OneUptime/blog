# How to Migrate from MariaDB to PostgreSQL on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, PostgreSQL, Migration

Description: Migrate from MariaDB to PostgreSQL on RHEL 9 with schema conversion and data transfer.

---

## Overview

Migrate from MariaDB to PostgreSQL on RHEL 9 with schema conversion and data transfer. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database storage
- The `pgloader` migration tool installed from a trusted repository or the upstream project

## Step 1 - Install the Database Packages

For the PostgreSQL target:

```bash
sudo dnf install -y postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql.service
```

For the MariaDB source, if it is running on the same RHEL 9 system:

```bash
sudo dnf install -y mariadb-server
sudo systemctl enable --now mariadb.service
sudo mariadb-secure-installation
```

For MySQL 8.0 instead of MariaDB:

```bash
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld.service
sudo mysql_secure_installation
```

Choose the appropriate commands for your database engine.

## Step 2 - Perform Initial Configuration

Edit the main configuration file:

- PostgreSQL: `/var/lib/pgsql/data/postgresql.conf` and `pg_hba.conf`
- MariaDB: `/etc/my.cnf.d/mariadb-server.cnf`
- MySQL: `/etc/my.cnf.d/mysql-server.cnf`

Adjust memory settings, connection limits, and authentication methods to match your workload.

## Step 3 - Create Users and Databases

For the PostgreSQL target:

```bash
sudo -u postgres createuser --pwprompt myappuser
sudo -u postgres createdb myappdb -O myappuser
```

For the MariaDB/MySQL source:

```sql
CREATE DATABASE myappdb;
CREATE USER 'myappuser'@'localhost' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON myappdb.* TO 'myappuser'@'localhost';
FLUSH PRIVILEGES;
```

## Step 4 - Configure Network Access

If remote connections are needed, update the listen address and authentication rules, then open the firewall:

```bash
# PostgreSQL
sudo firewall-cmd --permanent --add-service=postgresql

# MariaDB/MySQL
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --reload
```

## Step 5 - Run and Verify the Migration

Run the migration, then connect to PostgreSQL and run a test query:

```bash
pgloader mysql://myappuser:secure-password@localhost/myappdb pgsql://myappuser:secure-password@localhost/myappdb
psql -h localhost -U myappuser myappdb -c "SELECT version();"
```

## Summary

You have learned how to migrate from MariaDB to PostgreSQL. Always secure your database with strong passwords, restricted network access, and regular backups.
