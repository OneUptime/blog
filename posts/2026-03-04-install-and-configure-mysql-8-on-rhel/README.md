# How to Install and Configure MySQL 8.0 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MySQL, Database, Installation, Configuration, MySQL 8

Description: Install MySQL 8.0 from the official MySQL repository on RHEL, configure authentication, create databases and users, and apply basic security settings.

---

RHEL ships with MariaDB by default, but you can install MySQL 8.0 from the official Oracle MySQL repository. MySQL 8.0 includes features like CTEs, window functions, JSON improvements, and the default caching_sha2_password authentication plugin.

## Add the MySQL Repository

```bash
# Download and install the MySQL repository package
sudo dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm

# Verify the repository is enabled
sudo dnf repolist | grep mysql

# Disable the default MariaDB module if it conflicts
sudo dnf module disable -y mariadb
```

## Install MySQL 8.0

```bash
# Install MySQL server
sudo dnf install -y mysql-community-server

# Start and enable MySQL
sudo systemctl enable --now mysqld

# Check the version
mysql --version
```

## Retrieve the Temporary Root Password

MySQL 8.0 generates a temporary root password during installation.

```bash
# Find the temporary password in the log
sudo grep 'temporary password' /var/log/mysqld.log
# Output: A temporary password is generated for root@localhost: Ab3!xYz9kLmN
```

## Secure the Installation

```bash
# Log in with the temporary password
mysql -u root -p

# Change the root password immediately (MySQL 8 requires strong passwords)
ALTER USER 'root'@'localhost' IDENTIFIED BY 'MyStr0ng!Pass#2025';

# Remove anonymous users
DELETE FROM mysql.user WHERE User='';

# Remove remote root access
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

# Drop the test database
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';

FLUSH PRIVILEGES;
EXIT;
```

## Create a Database and User

```bash
mysql -u root -p

# Create a database
CREATE DATABASE appdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create a user with the default caching_sha2_password
CREATE USER 'appuser'@'%' IDENTIFIED BY 'AppUser!Pass#123';

# Grant privileges
GRANT ALL PRIVILEGES ON appdb.* TO 'appuser'@'%';

FLUSH PRIVILEGES;
EXIT;
```

## Configure MySQL

```bash
# Edit the MySQL configuration
sudo vi /etc/my.cnf

# Common settings for production
sudo tee /etc/my.cnf.d/custom.cnf << 'EOF'
[mysqld]
# Network settings
bind-address = 0.0.0.0
port = 3306

# InnoDB settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 1

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2

# Connection limits
max_connections = 200

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
EOF

# Create log directory
sudo mkdir -p /var/log/mysql
sudo chown mysql:mysql /var/log/mysql

# Restart MySQL
sudo systemctl restart mysqld
```

## Open the Firewall

```bash
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload
```

## Verify the Installation

```bash
# Connect and check status
mysql -u root -p -e "
SELECT VERSION();
SHOW DATABASES;
SHOW VARIABLES LIKE 'default_authentication_plugin';
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
"
```

## Handle the Authentication Plugin

If older clients cannot connect due to `caching_sha2_password`:

```bash
# Create a user with the older mysql_native_password plugin
mysql -u root -p -e "
CREATE USER 'legacyuser'@'%' IDENTIFIED WITH mysql_native_password BY 'Legacy!Pass#123';
GRANT ALL PRIVILEGES ON appdb.* TO 'legacyuser'@'%';
FLUSH PRIVILEGES;
"
```

MySQL 8.0 on RHEL gives you access to the latest MySQL features while running on a stable, supported enterprise platform.
