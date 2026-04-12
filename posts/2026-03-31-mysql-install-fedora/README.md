# How to Install MySQL on Fedora

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, Fedora, Linux, Database

Description: Install MySQL 8.0 or 8.4 on Fedora using the official MySQL community DNF repository, start the service, and secure it with mysql_secure_installation.

---

## How It Works

Fedora ships MySQL community packages in its default repository starting from Fedora 38+, or you can use the official MySQL Yum/DNF repository for the latest release. This guide covers both methods and focuses on the official MySQL repository approach for the most up-to-date version.

```mermaid
flowchart LR
    A[Add MySQL repo] --> B[dnf install mysql-community-server]
    B --> C[systemctl start mysqld]
    C --> D[Read temp password from log]
    D --> E[mysql_secure_installation]
    E --> F[MySQL ready]
```

## Prerequisites

- Fedora 38, 39, 40, or later
- User with `sudo` access
- DNF package manager (default on Fedora)

## Method 1 - Install from Official MySQL Repository (Recommended)

### Add the Repository

```bash
sudo dnf install -y https://dev.mysql.com/get/mysql84-community-release-fc40-1.noarch.rpm
```

Replace `fc40` with your Fedora version number (`fc38`, `fc39`, etc.).

Verify the repository.

```bash
sudo dnf repolist | grep mysql
```

To install MySQL 8.0 instead of 8.4:

```bash
sudo dnf config-manager --disable mysql-8.4-lts-community
sudo dnf config-manager --enable mysql80-community
```

### Install MySQL Server

```bash
sudo dnf install -y mysql-community-server
```

## Method 2 - Install from Fedora Default Repository

On Fedora 38+, a MySQL community build may be available directly.

```bash
sudo dnf install -y community-mysql-server
```

Note: The version in Fedora repos may lag behind the official MySQL releases.

## Start and Enable the Service

```bash
sudo systemctl enable --now mysqld
```

Check the status.

```bash
sudo systemctl status mysqld
```

```text
● mysqld.service - MySQL Server
     Active: active (running)
```

## Retrieve the Temporary Root Password

```bash
sudo grep 'temporary password' /var/log/mysqld.log
```

```text
[Note] [MY-010454] [Server] A temporary password is generated for root@localhost: Tr0uble#XX
```

## Secure the Installation

```bash
sudo mysql_secure_installation
```

Enter the temporary password when prompted and set a new strong password. Accept all hardening options.

## Connect to MySQL

```bash
mysql -u root -p
```

Create a database and dedicated user.

```sql
CREATE DATABASE appdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'app'@'localhost' IDENTIFIED BY 'AppPassword1!';
GRANT ALL PRIVILEGES ON appdb.* TO 'app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Configure the Firewall

Fedora uses firewalld by default.

```bash
# Allow MySQL from a specific subnet
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/8" port port="3306" protocol="tcp" accept'
sudo firewall-cmd --reload
```

## Verify the Installation

```bash
mysql --version
```

```text
mysql  Ver 8.4.x Distrib 8.4.x, for Linux on x86_64
```

Show active connections and uptime.

```bash
mysqladmin -u root -p status
```

## Key File Locations

```text
/etc/my.cnf                   Primary configuration file
/etc/my.cnf.d/               Drop-in directory
/var/lib/mysql/               Data directory
/var/log/mysqld.log          Error log
```

## SELinux Notes

Fedora ships with SELinux enforcing. If you change the data directory, update the security context.

```bash
sudo semanage fcontext -a -t mysqld_db_t "/newdata/mysql(/.*)?"
sudo restorecon -Rv /newdata/mysql
```

## Summary

MySQL on Fedora can be installed from either the official MySQL community repository or the Fedora default repository. The official repository provides the latest stable release. After starting `mysqld`, retrieve the auto-generated temporary root password from the error log, run `mysql_secure_installation` to apply hardening, and create a dedicated application user for your projects.
