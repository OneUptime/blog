# How to Install LibreNMS Network Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LibreNMS, Monitoring, SNMP, Network, Linux

Description: Install LibreNMS on RHEL with Nginx, PHP-FPM, and MariaDB to create a full-featured network monitoring system with auto-discovery and alerting.

---

LibreNMS is a community-driven network monitoring system that auto-discovers network devices via SNMP and provides detailed performance graphs. This guide covers installation on RHEL.

## Install Prerequisites

```bash
# Install EPEL
sudo dnf install -y epel-release

# Install required packages
sudo dnf install -y nginx mariadb-server php-fpm php-cli php-mysqlnd \
  php-gd php-xml php-mbstring php-curl php-zip php-snmp php-json \
  php-process php-pear php-intl python3 python3-pip python3-pymysql \
  net-snmp net-snmp-utils rrdtool fping git cronie unzip
```

## Create the LibreNMS User

```bash
# Create a dedicated user
sudo useradd librenms -d /opt/librenms -M -r -s /bin/bash
```

## Download LibreNMS

```bash
cd /opt
sudo git clone https://github.com/librenms/librenms.git

# Set ownership
sudo chown -R librenms:librenms /opt/librenms
sudo chmod 771 /opt/librenms

# Set the sticky bit on required directories
sudo setfacl -d -m g::rwx /opt/librenms/rrd /opt/librenms/logs \
  /opt/librenms/bootstrap/cache /opt/librenms/storage
sudo setfacl -R -m g::rwx /opt/librenms/rrd /opt/librenms/logs \
  /opt/librenms/bootstrap/cache /opt/librenms/storage
```

## Install PHP Dependencies

```bash
sudo -u librenms bash -c 'cd /opt/librenms && ./scripts/composer_wrapper.php install --no-dev'
```

## Configure MariaDB

```bash
sudo systemctl enable --now mariadb
sudo mysql_secure_installation

# Create the database
sudo mysql -u root -p << 'SQL'
CREATE DATABASE librenms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'librenms'@'localhost' IDENTIFIED BY 'LibreNMSPass123!';
GRANT ALL PRIVILEGES ON librenms.* TO 'librenms'@'localhost';
FLUSH PRIVILEGES;
SQL

# Configure MariaDB settings
sudo tee /etc/my.cnf.d/librenms.cnf << 'CNF'
[mysqld]
innodb_file_per_table=1
lower_case_table_names=0
CNF

sudo systemctl restart mariadb
```

## Configure PHP-FPM

```bash
# Create a PHP-FPM pool for LibreNMS
sudo tee /etc/php-fpm.d/librenms.conf << 'CONF'
[librenms]
user = librenms
group = librenms
listen = /run/php-fpm/librenms.sock
listen.owner = nginx
listen.group = nginx
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 10
CONF

# Set the timezone in PHP
sudo sed -i 's|^;date.timezone.*|date.timezone = America/New_York|' /etc/php.ini

sudo systemctl restart php-fpm
```

## Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/librenms.conf << 'CONF'
server {
    listen 80;
    server_name nms.example.com;
    root /opt/librenms/html;
    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php-fpm/librenms.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
CONF

sudo nginx -t && sudo systemctl enable --now nginx
```

## Configure SNMP

```bash
sudo cp /opt/librenms/snmpd.conf.example /etc/snmp/snmpd.conf
sudo sed -i 's/RANDOMSTRINGGOESHERE/librenms_community/' /etc/snmp/snmpd.conf
sudo systemctl enable --now snmpd
```

## Set Up Cron and Scheduler

```bash
sudo cp /opt/librenms/dist/librenms.cron /etc/cron.d/librenms
sudo cp /opt/librenms/dist/librenms-scheduler.service /etc/systemd/system/
sudo cp /opt/librenms/dist/librenms-scheduler.timer /etc/systemd/system/
sudo systemctl enable --now librenms-scheduler.timer
```

## Firewall and SELinux

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

sudo setsebool -P httpd_can_network_connect 1
sudo chcon -R -t httpd_sys_rw_content_t /opt/librenms
```

Navigate to `http://nms.example.com/install` to complete the web installer. After setup, run `sudo -u librenms /opt/librenms/validate.php` to check for issues.
