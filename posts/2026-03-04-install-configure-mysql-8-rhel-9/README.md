# How to Install and Configure MySQL 8.0 on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MySQL, Database, Linux

Description: Install and configure MySQL 8.0 on RHEL 9 with secure defaults.

---

## Overview

Install and configure MySQL 8.0 on RHEL 9 with secure defaults. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database storage

## Step 1 - Install the Database Packages

Install the MySQL 8.0 server package:

```bash
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld
sudo mysql_secure_installation
```

## Step 2 - Perform Initial Configuration

Edit the main configuration file:

- MySQL: `/etc/my.cnf.d/mysql-server.cnf`

Adjust memory settings, connection limits, and authentication methods to match your workload.

## Step 3 - Create Users and Databases

Connect as an administrative MySQL user and create an application database and user:

```sql
CREATE DATABASE myappdb;
CREATE USER 'myappuser'@'localhost' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON myappdb.* TO 'myappuser'@'localhost';
FLUSH PRIVILEGES;
```

## Step 4 - Configure Network Access

If remote connections are needed, update `bind-address` in `/etc/my.cnf.d/mysql-server.cnf`, grant the user access from the required client host or network, then open the firewall:

```bash
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --reload
sudo systemctl restart mysqld
```

## Step 5 - Verify the Setup

Connect to the database and run a test query:

```bash
mysql -u myappuser -p myappdb -e "SELECT VERSION();"
```

## Summary

You have learned how to install and configure MySQL 8.0. Always secure your database with strong passwords, restricted network access, and regular backups.
