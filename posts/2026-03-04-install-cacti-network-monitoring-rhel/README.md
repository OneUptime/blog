# How to Install Cacti Network Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cacti, Monitoring, SNMP, RRDtool, Network, Linux

Description: Install Cacti on RHEL with Apache, MySQL, and PHP to create a network graphing solution that collects SNMP data and generates historical performance graphs.

---

Cacti is an open-source network monitoring and graphing tool built on RRDtool. It collects data via SNMP and produces detailed historical performance graphs. This guide covers installing Cacti on RHEL.

## Install Prerequisites

```bash
# Install EPEL repository
sudo dnf install -y epel-release

# Install Apache, MySQL, PHP, and SNMP tools
sudo dnf install -y httpd mysql-server php php-mysqlnd php-xml \
  php-mbstring php-gd php-intl php-ldap php-snmp php-posix \
  net-snmp net-snmp-utils rrdtool

# Install Cacti (from EPEL)
sudo dnf install -y cacti
```

## Configure MySQL

```bash
# Start MySQL
sudo systemctl enable --now mysqld
sudo mysql_secure_installation

# Create the Cacti database
sudo mysql -u root -p << 'SQL'
CREATE DATABASE cacti DEFAULT CHARACTER SET utf8mb4;
CREATE USER 'cactiuser'@'localhost' IDENTIFIED BY 'CactiPass123!';
GRANT ALL PRIVILEGES ON cacti.* TO 'cactiuser'@'localhost';
GRANT SELECT ON mysql.time_zone_name TO 'cactiuser'@'localhost';
FLUSH PRIVILEGES;
SQL

# Import timezone data into MySQL
mysql_tzinfo_to_sql /usr/share/zoneinfo | sudo mysql -u root -p mysql

# Import the Cacti database schema
sudo mysql -u cactiuser -p'CactiPass123!' cacti < /usr/share/cacti/cacti.sql
```

## Configure Cacti

```bash
# Edit the Cacti database configuration
sudo tee /usr/share/cacti/include/config.php << 'PHP'
<?php
$database_type     = 'mysql';
$database_default  = 'cacti';
$database_hostname = 'localhost';
$database_username = 'cactiuser';
$database_password = 'CactiPass123!';
$database_port     = '3306';
$database_retries  = 5;
$database_ssl      = false;
$database_ssl_key  = '';
$database_ssl_cert = '';
$database_ssl_ca   = '';
PHP
```

## Configure MySQL for Cacti Requirements

```bash
# Cacti requires specific MySQL settings
sudo tee /etc/my.cnf.d/cacti.cnf << 'CNF'
[mysqld]
max_heap_table_size = 256M
tmp_table_size = 256M
join_buffer_size = 128M
innodb_file_format = Barracuda
innodb_large_prefix = 1
innodb_buffer_pool_size = 1G
innodb_flush_log_at_timeout = 3
innodb_read_io_threads = 32
innodb_write_io_threads = 16
innodb_io_capacity = 5000
innodb_io_capacity_max = 10000
max_allowed_packet = 16M
collation-server = utf8mb4_unicode_ci
character-set-server = utf8mb4
CNF

sudo systemctl restart mysqld
```

## Configure Apache for Cacti

```bash
# Edit the Cacti Apache configuration
sudo vi /etc/httpd/conf.d/cacti.conf

# Change "Require host localhost" to allow your network:
# Require ip 10.0.0.0/24

sudo systemctl enable --now httpd
```

## Configure PHP

```bash
# Adjust PHP settings for Cacti
sudo tee /etc/php.d/99-cacti.ini << 'INI'
memory_limit = 512M
max_execution_time = 60
date.timezone = America/New_York
INI

sudo systemctl restart php-fpm httpd
```

## Set Up the Cacti Poller

```bash
# Configure cron for the Cacti poller (runs every 5 minutes)
sudo tee /etc/cron.d/cacti << 'CRON'
*/5 * * * * apache /usr/bin/php /usr/share/cacti/poller.php >> /var/log/cacti/poller.log 2>&1
CRON
```

## Firewall and SELinux

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

sudo setsebool -P httpd_can_network_connect 1
```

## Complete the Installation

1. Navigate to `http://your-server/cacti/`
2. Follow the installation wizard
3. Default credentials: admin / admin (change immediately)
4. Accept the license agreement and verify prerequisites

After installation, add devices via Console > Management > Devices and start creating graphs for your network infrastructure.
