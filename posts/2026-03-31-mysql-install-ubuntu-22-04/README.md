# How to Install MySQL on Ubuntu 22.04

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, Ubuntu, Database, Linux

Description: Install MySQL 8.0 on Ubuntu 22.04 LTS using the official APT repository, secure the installation, and verify the service is running correctly.

---

## How It Works

Ubuntu 22.04 ships MySQL 8.0 in its default APT repository. The package manager handles dependency resolution, creates the `mysql` system user, registers a systemd service, and places the default configuration at `/etc/mysql/mysql.conf.d/mysqld.cnf`.

```mermaid
flowchart LR
    A[apt update] --> B[apt install mysql-server]
    B --> C[mysqld service starts]
    C --> D[mysql_secure_installation]
    D --> E[MySQL ready for use]
```

## Prerequisites

- Ubuntu 22.04 LTS (Jammy Jellyfish)
- A user account with `sudo` privileges
- Internet access to reach the Ubuntu APT mirrors

## Step 1 - Update the Package Index

Always refresh the package list before installing new software to avoid stale metadata.

```bash
sudo apt update
```

## Step 2 - Install MySQL Server

Install the `mysql-server` package. This pulls in the server, client, and common libraries.

```bash
sudo apt install -y mysql-server
```

The installation automatically starts the `mysql` systemd service.

Confirm the service is active.

```bash
sudo systemctl status mysql
```

Expected output snippet:

```text
● mysql.service - MySQL Community Server
     Loaded: loaded (/lib/systemd/system/mysql.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
```

## Step 3 - Run the Security Script

`mysql_secure_installation` removes anonymous users, disallows remote root login, removes the test database, and lets you set a root password policy.

```bash
sudo mysql_secure_installation
```

Follow the prompts. On Ubuntu 22.04, root initially authenticates via the `auth_socket` plugin, so the wizard asks you to choose a password validation policy first. Selecting policy level 1 (MEDIUM) is a reasonable starting point for most servers.

## Step 4 - Log in to MySQL

Because the root user uses socket authentication by default, prefix the command with `sudo`.

```bash
sudo mysql
```

You should see the MySQL prompt:

```text
mysql>
```

To create a dedicated application user with password authentication:

```sql
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'StrongPassword1!';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

Exit the shell.

```sql
EXIT;
```

## Step 5 - Enable MySQL on Boot

The package installer enables the service by default, but you can verify or re-enable it explicitly.

```bash
sudo systemctl enable mysql
```

## Verifying the Installation

Check the installed version.

```bash
mysql --version
```

```text
mysql  Ver 8.0.x  Distrib 8.0.x, for Linux (x86_64) using  EditLine wrapper
```

Check the server status variables from inside MySQL.

```sql
SHOW VARIABLES LIKE 'version%';
```

```text
+-------------------------+---------------------+
| Variable_name           | Value               |
+-------------------------+---------------------+
| version                 | 8.0.x               |
| version_comment         | (Ubuntu)            |
| version_compile_os      | Linux               |
+-------------------------+---------------------+
```

## Key File Locations

```text
/etc/mysql/mysql.conf.d/mysqld.cnf   Main server configuration
/var/lib/mysql/                       Data directory
/var/log/mysql/error.log             Error log
/run/mysqld/mysqld.sock              Unix socket
```

## Firewall Configuration

If you plan to allow remote connections, open port 3306 in UFW.

```bash
sudo ufw allow from 192.168.1.0/24 to any port 3306
sudo ufw reload
```

Avoid exposing MySQL to `0.0.0.0` unless it is protected by a firewall rule or VPN.

## Summary

Installing MySQL on Ubuntu 22.04 takes three commands: `apt update`, `apt install mysql-server`, and `mysql_secure_installation`. The service starts automatically and is enabled on boot. Root access uses socket authentication out of the box, so create a dedicated application user with a strong password for day-to-day database work.
