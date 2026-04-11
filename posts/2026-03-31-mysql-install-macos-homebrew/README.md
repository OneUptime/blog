# How to Install MySQL 8.0 on macOS with Homebrew

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, macOS, Homebrew, Database, Installation

Description: Install MySQL 8.0 on macOS using Homebrew, configure the root account, start the service, and connect with the mysql CLI.

---

## How It Works

Homebrew is the most common package manager for macOS. It manages downloads, installation, and service management for MySQL. When you install MySQL via Homebrew, it places the data directory under `/usr/local/var/mysql` (Intel) or `/opt/homebrew/var/mysql` (Apple Silicon) and registers the process with `brew services` so it starts automatically on login.

```mermaid
flowchart LR
    A[macOS Terminal] --> B[brew install mysql]
    B --> C[MySQL binaries installed]
    C --> D[brew services start mysql]
    D --> E[mysqld running]
    E --> F[mysql_secure_installation]
    F --> G[Ready to use]
```

## Prerequisites

- macOS 12 or later
- Homebrew installed (`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`)
- Command Line Tools for Xcode

## Installing MySQL 8.0

Update Homebrew and install MySQL.

```bash
brew update
brew install mysql
```

Homebrew installs the latest stable MySQL release, which may be a newer major version than 8.0. To install MySQL 8.0 specifically, use the versioned formula instead.

```bash
brew install mysql@8.0
```

After installing the versioned formula, link it so the binaries are on your PATH.

```bash
brew link mysql@8.0 --force
```

If you installed the versioned formula, use `mysql@8.0` in all service commands (e.g., `brew services start mysql@8.0`).

## Starting MySQL

Start MySQL as a background service so it restarts when you log in.

```bash
brew services start mysql
```

To start it only for the current session without registering as a login item, run:

```bash
mysql.server start
```

Check that the process is running.

```bash
brew services list
```

Expected output:

```text
Name  Status  User           File
mysql started nawazdhandala ~/Library/LaunchAgents/homebrew.mxcl.mysql.plist
```

## Securing the Installation

Run the built-in security script to set a root password and remove anonymous accounts.

```bash
mysql_secure_installation
```

The script will prompt you through several steps:

```text
Securing the MySQL server deployment.

Enter password for user root (press Enter if none): 

Would you like to setup VALIDATE PASSWORD component? [Y/N]: Y
Please enter 0 = LOW, 1 = MEDIUM and 2 = STRONG: 1
New password: ••••••••
Re-enter new password: ••••••••
Remove anonymous users? [Y/N]: Y
Disallow root login remotely? [Y/N]: Y
Remove test database and access to it? [Y/N]: Y
Reload privilege tables now? [Y/N]: Y
```

## Connecting to MySQL

Connect to the local server as root.

```bash
mysql -u root -p
```

Once connected, verify the version.

```sql
SELECT VERSION();
```

```text
+-----------+
| VERSION() |
+-----------+
| 8.0.36    |
+-----------+
```

## Creating a Development User

Avoid using the root account for application development. Create a dedicated user instead.

```sql
CREATE DATABASE myapp;
CREATE USER 'devuser'@'localhost' IDENTIFIED BY 'StrongPass!2024';
GRANT ALL PRIVILEGES ON myapp.* TO 'devuser'@'localhost';
FLUSH PRIVILEGES;
```

## Stopping and Restarting MySQL

```bash
# Stop the service
brew services stop mysql

# Restart the service
brew services restart mysql
```

## Uninstalling MySQL

If you need to remove MySQL completely, run the following commands.

```bash
brew services stop mysql
brew uninstall mysql
rm -rf /usr/local/var/mysql        # Intel Mac
# or
rm -rf /opt/homebrew/var/mysql     # Apple Silicon Mac
```

## Locating the Configuration File

Homebrew does not create a `my.cnf` by default. MySQL starts with compiled defaults. To add custom configuration, create the file at one of the default search locations.

```bash
# Intel Mac
/usr/local/etc/my.cnf

# Apple Silicon Mac
/opt/homebrew/etc/my.cnf
```

A minimal custom configuration file looks like:

```text
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 256M
slow_query_log = 1
slow_query_log_file = /tmp/mysql-slow.log
long_query_time = 1
```

After editing, restart MySQL.

```bash
brew services restart mysql
```

## Best Practices

- Use a versioned formula (`mysql@8.0`) in team projects so everyone runs the same major version.
- Do not run MySQL as root on your development machine; create per-project database users.
- Enable the slow query log during development to catch N+1 problems early.
- Back up your local databases before running `brew upgrade`.

## Summary

Installing MySQL 8.0 on macOS with Homebrew takes three commands: `brew install mysql`, `brew services start mysql`, and `mysql_secure_installation`. From there you can connect with `mysql -u root -p`, create databases and users, and customise behaviour via `/opt/homebrew/etc/my.cnf`. Homebrew's service management makes it easy to start, stop, and restart MySQL without touching system launch daemons directly.
