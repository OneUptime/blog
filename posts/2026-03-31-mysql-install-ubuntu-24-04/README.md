# How to Install MySQL on Ubuntu 24.04

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, Ubuntu, Database, Linux

Description: Install MySQL 8.0 on Ubuntu 24.04 LTS using the APT repository, configure the service, and create a dedicated application user ready for production use.

---

## How It Works

Ubuntu 24.04 LTS (Noble Numbat) includes MySQL 8.0 in its main APT repository. The package manager installs the server binary, registers the `mysql` systemd unit, initializes the data directory under `/var/lib/mysql`, and generates a temporary root password in `/var/log/mysql/error.log` only when socket authentication is not used.

```mermaid
flowchart LR
    A[apt update] --> B[apt install mysql-server]
    B --> C[Data directory initialized]
    C --> D[mysql.service enabled]
    D --> E[mysql_secure_installation]
    E --> F[Create app user]
    F --> G[Production ready]
```

## Prerequisites

- Ubuntu 24.04 LTS
- User with `sudo` privileges
- Active internet connection

## Step 1 - Update Package Lists

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2 - Install MySQL Server

```bash
sudo apt install -y mysql-server
```

The `mysql` service starts automatically after installation.

```bash
sudo systemctl status mysql
```

```text
● mysql.service - MySQL Community Server
     Active: active (running)
```

## Step 3 - Secure the Installation

```bash
sudo mysql_secure_installation
```

When prompted about the VALIDATE PASSWORD component, answer **Y** and choose a level:

```text
0 = LOW    (length >= 8)
1 = MEDIUM (length >= 8, mixed case, numbers, special chars)
2 = STRONG (length >= 8 + dictionary file check)
```

For most production servers, level 1 provides a good balance.

Respond **Y** to all remaining prompts to:
- Remove anonymous users
- Disallow remote root login
- Remove the test database
- Reload privilege tables

## Step 4 - Connect as Root

On Ubuntu 24.04, the root MySQL user authenticates via the `auth_socket` plugin.

```bash
sudo mysql
```

To switch to password authentication for the root account (optional):

```sql
ALTER USER 'root'@'localhost'
    IDENTIFIED WITH caching_sha2_password
    BY 'YourStrongRootPassword1!';
FLUSH PRIVILEGES;
```

## Step 5 - Create an Application User

Never connect your application with the root account. Create a least-privilege user instead.

```sql
CREATE DATABASE myapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'AppPassword1!';
GRANT ALL PRIVILEGES ON myapp.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;
```

Verify the user was created.

```sql
SELECT user, host, plugin FROM mysql.user WHERE user = 'myapp_user';
```

```text
+-----------+-----------+-----------------------+
| user      | host      | plugin                |
+-----------+-----------+-----------------------+
| myapp_user| localhost | caching_sha2_password |
+-----------+-----------+-----------------------+
```

## Step 6 - Enable Automatic Start

```bash
sudo systemctl enable mysql
```

## Verify the Installation

```bash
mysql --version
```

```text
mysql  Ver 8.0.x  Distrib 8.0.x, for Linux (x86_64)
```

Check the data directory and socket.

```bash
sudo ls /var/lib/mysql
ls /run/mysqld/
```

## Key Configuration Paths

```text
/etc/mysql/mysql.conf.d/mysqld.cnf   Primary server configuration
/var/lib/mysql/                       Data files
/var/log/mysql/error.log             Error log
/run/mysqld/mysqld.sock              Unix domain socket
```

## Firewall Rules

Allow MySQL traffic from a specific subnet using UFW.

```bash
sudo ufw allow from 10.0.0.0/8 to any port 3306 comment 'MySQL internal'
sudo ufw reload
sudo ufw status
```

## Summary

Installing MySQL on Ubuntu 24.04 follows the same three-step pattern as earlier Ubuntu releases: update, install, and secure. The socket-based root authentication model keeps the root account inaccessible over TCP by default. Always create a dedicated database user for each application and grant only the privileges that application needs.
