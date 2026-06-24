# How to Install MySQL on Arch Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, Arch Linux, Linux, Database

Description: Install MySQL on Arch Linux using the official community repository via pacman, initialize the data directory, and configure the systemd service.

---

## How It Works

Arch Linux provides MariaDB as its MySQL implementation in the `extra` repository. When you install the `mysql` package via pacman, you receive MariaDB, which is a fully compatible drop-in replacement. Unlike Debian or RHEL-based systems, Arch requires a manual data directory initialization step after installing the package before starting the service.

```mermaid
flowchart LR
    A[pacman -S mysql] --> B[mariadb-install-db --user=mysql]
    B --> C[systemctl start mariadb]
    C --> D[mysql_secure_installation]
    D --> E[MySQL ready]
```

## Prerequisites

- Up-to-date Arch Linux installation (`sudo pacman -Syu`)
- User with `sudo` access
- Internet connection for package downloads

## Step 1 - Update the System

Always sync the package database before installing on Arch.

```bash
sudo pacman -Syu
```

## Step 2 - Install MySQL

```bash
sudo pacman -S mysql
```

At the prompt, confirm the installation. Pacman installs the MySQL-compatible server and client binaries.

Note: On Arch Linux, the `mysql` package is provided by MariaDB, which is Arch's official MySQL implementation. If you need Oracle MySQL specifically (e.g., for MySQL-specific features like Group Replication), you must install it from the AUR instead.

## Step 3 - Initialize the Data Directory

Arch Linux does not automatically initialize the MySQL data directory. You must do this manually.

```bash
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
```

This command:
- Creates `/var/lib/mysql` and sets ownership to the `mysql` user
- Initializes system tables
- Sets up root with no initial password (you will set one during the secure installation step)

## Step 4 - Start and Enable the MySQL Service

```bash
sudo systemctl enable --now mariadb
```

Verify it is running.

```bash
sudo systemctl status mariadb
```

```text
● mariadb.service - MariaDB database server
     Active: active (running)
```

## Step 5 - Secure the Installation

```bash
sudo mysql_secure_installation
```

When prompted for the current root password, press Enter (the root password is empty after initialization). You will then set a new root password. Accept all hardening prompts.

## Step 6 - Connect and Create a User

```bash
mysql -u root -p
```

```sql
CREATE DATABASE devdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dev'@'localhost' IDENTIFIED BY 'DevPwd1!Arch';
GRANT ALL PRIVILEGES ON devdb.* TO 'dev'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Verify the Installation

```bash
mysql --version
```

```text
mysql  Ver 15.1 Distrib 10.x.x-MariaDB, for Linux (x86_64) using readline 5.1
```

## Key File Locations

```text
/etc/my.cnf                   Primary configuration file
/etc/my.cnf.d/                Modular configuration directory
/var/lib/mysql/               Data directory
/run/mysqld/mysqld.sock      Unix socket
```

## Custom Configuration

Create a custom configuration file in `/etc/my.cnf.d/` to tune the server.

```ini
[mysqld]
character-set-server  = utf8mb4
collation-server      = utf8mb4_unicode_ci
innodb_buffer_pool_size = 512M
max_connections       = 200
slow_query_log        = 1
long_query_time       = 2
```

Restart after changes.

```bash
sudo systemctl restart mariadb
```

## Using MySQL with Arch Wiki Notes

Arch uses MariaDB as the default MySQL implementation due to better community packaging and open-source licensing. The `mysql` command-line client, `mysql_secure_installation`, and other tools are provided by MariaDB with full compatibility. If your application requires Oracle MySQL-specific features (e.g., Group Replication), you must install Oracle MySQL from the AUR.

Regularly check for updates as Arch's rolling-release model delivers MariaDB upgrades quickly.

```bash
sudo pacman -Syu mysql
```

## Summary

Installing MySQL on Arch Linux requires a manual `mariadb-install-db` step because Arch packages do not run post-install scripts that initialize the data directory automatically. After initialization, start the service with `systemctl` and run `mysql_secure_installation` to set a root password and apply hardening options. Arch's rolling-release model means MariaDB updates arrive quickly; run `pacman -Syu` regularly to stay current.
