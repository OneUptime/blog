# How to Install MySQL on CentOS 9 Stream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, CentOS, Linux, Database

Description: Install MySQL 8.0 on CentOS 9 Stream using the official MySQL RPM repository, configure firewalld, and prepare the server for production workloads.

---

## How It Works

CentOS 9 Stream ships with MariaDB in its default AppStream repository. To install MySQL, you add the official MySQL Yum repository from dev.mysql.com, which provides MySQL 8.0 and 8.4 LTS RPM packages.

```mermaid
flowchart LR
    A[Download MySQL repo RPM] --> B[dnf install mysql-community-server]
    B --> C[systemctl start mysqld]
    C --> D[First start auto-initializes data dir]
    D --> E[Retrieve temp password]
    E --> F[mysql_secure_installation]
    F --> G[MySQL ready]
```

## Prerequisites

- CentOS 9 Stream (minimal or full install)
- User with `sudo` or root access
- SELinux and firewalld in default enforcing mode

## Step 1 - Add the MySQL Yum Repository

Download the repository configuration RPM from the MySQL website.

```bash
sudo dnf install -y https://dev.mysql.com/get/mysql84-community-release-el9-1.noarch.rpm
```

Verify the repositories were added.

```bash
sudo dnf repolist enabled | grep mysql
```

```text
mysql-8.4-lts-community   MySQL 8.4 LTS Community Server
mysql-tools-community     MySQL Tools Community
```

To install MySQL 8.0 instead of 8.4, disable the 8.4 repo and enable 8.0.

```bash
sudo dnf config-manager --disable mysql-8.4-lts-community
sudo dnf config-manager --enable mysql80-community
```

## Step 2 - Install MySQL Server

```bash
sudo dnf install -y mysql-community-server
```

## Step 3 - Start the MySQL Service

```bash
sudo systemctl enable --now mysqld
```

On the first start, MySQL initializes the data directory and generates a temporary root password written to the error log.

```bash
sudo grep 'temporary password' /var/log/mysqld.log
```

```text
[Note] [MY-010454] [Server] A temporary password is generated for root@localhost: AbCdEfGh1!
```

## Step 4 - Secure the Installation

Use the temporary password when prompted.

```bash
sudo mysql_secure_installation
```

MySQL will force you to change the temporary password before proceeding. Choose a strong password that meets the VALIDATE PASSWORD policy (uppercase, lowercase, digit, special character, length >= 8).

## Step 5 - Log in and Create an Application User

```bash
mysql -u root -p
```

```sql
CREATE DATABASE production_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'app'@'localhost' IDENTIFIED BY 'AppPass1!';
GRANT ALL PRIVILEGES ON production_db.* TO 'app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 6 - Configure the Firewall

Open port 3306 only for trusted networks.

```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/8" port port="3306" protocol="tcp" accept'
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

## SELinux Considerations

If MySQL is configured to use a non-default data directory, update the SELinux context.

```bash
sudo semanage fcontext -a -t mysqld_db_t "/data/mysql(/.*)?"
sudo restorecon -Rv /data/mysql
```

Allow MySQL to listen on a non-default port.

```bash
sudo semanage port -a -t mysqld_port_t -p tcp 3307
```

## Verify the Installation

```bash
mysql --version
```

```text
mysql  Ver 8.4.x  Distrib 8.4.x, for Linux (x86_64)
```

Check the service status.

```bash
sudo systemctl status mysqld
```

## Key File Locations

```text
/etc/my.cnf                   Main configuration file
/etc/my.cnf.d/               Drop-in configuration directory
/var/lib/mysql/               Data directory
/var/log/mysqld.log          Error log
/run/mysqld/mysqld.pid       PID file
```

## Summary

Installing MySQL on CentOS 9 Stream requires adding the official MySQL Yum repository because the distro ships MariaDB by default. After installation, MySQL writes a temporary root password to its error log. Run `mysql_secure_installation` to set a permanent password, remove test accounts, and harden the default configuration before putting the server into production.
