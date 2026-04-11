# How to Install MySQL on AlmaLinux 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, AlmaLinux, Linux, Database

Description: Install MySQL 8.0 on AlmaLinux 9 using the AppStream module or the official MySQL community repository, and configure firewalld and SELinux for production.

---

## How It Works

AlmaLinux 9 is a 1:1 binary compatible rebuild of RHEL 9. MySQL 8.0 is available through the DNF AppStream module. The official MySQL community repository provides MySQL 8.0 and 8.4 LTS packages as an alternative. Both approaches use `systemctl` to manage the service.

```mermaid
flowchart LR
    A[Enable MySQL module] --> B[dnf install mysql-server]
    B --> C[systemctl enable --now mysqld]
    C --> D[mysql_secure_installation]
    D --> E[firewall-cmd --add-service=mysql]
    E --> F[Create app user]
    F --> G[Production ready]
```

## Prerequisites

- AlmaLinux 9 (minimal install or full)
- User with `sudo` access
- Network access for package downloads

## Method 1 - AppStream Module

### Check Available MySQL Streams

```bash
sudo dnf module list mysql
```

```text
AlmaLinux 9 - AppStream
Name    Stream  Profiles       Summary
mysql   8.0     client, server MySQL Module
```

### Enable and Install

```bash
sudo dnf module enable mysql:8.0 -y
sudo dnf install -y mysql-server
```

## Method 2 - Official MySQL Community Repository

```bash
sudo dnf install -y https://dev.mysql.com/get/mysql84-community-release-el9-1.noarch.rpm
sudo dnf module disable mysql -y
sudo dnf install -y mysql-community-server
```

## Start the Service

```bash
sudo systemctl enable --now mysqld
sudo systemctl status mysqld
```

```text
● mysqld.service - MySQL 8.0 database server
     Active: active (running)
```

## Set the Root Password

For the AppStream package, the root account initially has no password.

```bash
sudo mysql
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'RootPassword1!';
FLUSH PRIVILEGES;
EXIT;
```

For the official MySQL repo package, retrieve the temporary password first.

```bash
sudo grep 'temporary password' /var/log/mysqld.log
```

Then run:

```bash
sudo mysql_secure_installation
```

## Create an Application User

```bash
mysql -u root -p
```

```sql
CREATE DATABASE myapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'AppPassword1!';
GRANT ALL PRIVILEGES ON myapp.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Firewall and SELinux

Open the MySQL port through firewalld.

```bash
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --reload
```

Check the active rules.

```bash
sudo firewall-cmd --list-all
```

For a custom data directory, set the SELinux context.

```bash
sudo semanage fcontext -a -t mysqld_db_t "/opt/mysql/data(/.*)?"
sudo restorecon -Rv /opt/mysql/data
```

## Verify the Installation

```bash
mysql --version
```

```text
mysql  Ver 8.0.x  Distrib 8.0.x, for Linux (x86_64)
```

Show running processes.

```sql
SHOW PROCESSLIST;
```

## Key File Locations

```text
/etc/my.cnf                   Primary configuration
/etc/my.cnf.d/mysql-server.conf  Server settings (AppStream)
/var/lib/mysql/               Data directory
/var/log/mysql/mysqld.log    Error log (AppStream)
/var/log/mysqld.log          Error log (official repo)
```

## Tuning Tips for Production

Edit `/etc/my.cnf` to set common production parameters.

```ini
[mysqld]
innodb_buffer_pool_size        = 1G
max_connections                = 300
slow_query_log                 = 1
slow_query_log_file            = /var/log/mysql/slow.log
long_query_time                = 1
innodb_flush_log_at_trx_commit = 1
sync_binlog                    = 1
```

Restart after changes.

```bash
sudo systemctl restart mysqld
```

## Summary

AlmaLinux 9 offers MySQL 8.0 through the AppStream module, making installation as simple as enabling the module and running `dnf install mysql-server`. The AppStream root account requires you to set a password manually, while the official MySQL community package generates a temporary password in the error log. Configure firewalld and SELinux before exposing MySQL to network traffic.
