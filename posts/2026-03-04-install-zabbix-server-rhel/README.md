# How to Install Zabbix Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zabbix, Monitoring, MySQL, Nginx, Linux

Description: Install Zabbix Server on RHEL with MySQL and Nginx to set up a centralized monitoring platform for your infrastructure.

---

Zabbix is an enterprise-grade monitoring solution for networks, servers, and applications. This guide covers installing Zabbix Server 7.0 LTS on RHEL with MySQL and the Nginx web frontend.

## Install the Zabbix Repository

```bash
# Install the Zabbix 7.0 LTS repository
sudo rpm -Uvh https://repo.zabbix.com/zabbix/7.0/rhel/9/x86_64/zabbix-release-latest-7.0.el9.noarch.rpm
sudo dnf clean all
```

## Install Zabbix Components

```bash
# Install Zabbix server, frontend, and agent
sudo dnf install -y zabbix-server-mysql zabbix-web-mysql \
  zabbix-nginx-conf zabbix-sql-scripts zabbix-selinux-policy \
  zabbix-agent2
```

## Install and Configure MySQL

```bash
# Install MySQL
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld

# Secure the installation
sudo mysql_secure_installation

# Create the Zabbix database
sudo mysql -u root -p << 'SQL'
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'zabbix'@'localhost' IDENTIFIED BY 'ZabbixDBPass123!';
GRANT ALL PRIVILEGES ON zabbix.* TO 'zabbix'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;
FLUSH PRIVILEGES;
SQL

# Import the Zabbix database schema
sudo zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | \
  mysql -u zabbix -p'ZabbixDBPass123!' zabbix

# Disable log_bin_trust_function_creators after import
sudo mysql -u root -p -e "SET GLOBAL log_bin_trust_function_creators = 0;"
```

## Configure Zabbix Server

```bash
# Edit the Zabbix server configuration
sudo sed -i 's/^# DBPassword=.*/DBPassword=ZabbixDBPass123!/' /etc/zabbix/zabbix_server.conf

# Verify the key settings
grep -E '^DB(Host|Name|User|Password)' /etc/zabbix/zabbix_server.conf
```

## Configure Nginx for Zabbix

```bash
# Edit the Nginx configuration for Zabbix
sudo tee /etc/nginx/conf.d/zabbix.conf << 'CONF'
server {
    listen 80;
    server_name zabbix.example.com;

    root /usr/share/zabbix;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php-fpm/zabbix.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
CONF

# Remove or comment out the default server block if it conflicts
# sudo vi /etc/nginx/nginx.conf
```

## Configure PHP for Zabbix

```bash
# The Zabbix PHP-FPM pool is pre-configured at /etc/php-fpm.d/zabbix.conf
# Adjust timezone if needed
sudo sed -i 's|^;php_value\[date.timezone\].*|php_value[date.timezone] = America/New_York|' \
  /etc/php-fpm.d/zabbix.conf
```

## Start All Services

```bash
# Start and enable all Zabbix services
sudo systemctl enable --now zabbix-server zabbix-agent2 nginx php-fpm

# Verify services are running
sudo systemctl status zabbix-server
sudo systemctl status zabbix-agent2
```

## Firewall Configuration

```bash
# Allow HTTP and Zabbix agent port
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-port=10051/tcp
sudo firewall-cmd --reload
```

## Complete Web Setup

1. Open `http://zabbix.example.com` in your browser
2. Follow the installation wizard
3. Verify all prerequisite checks pass
4. Enter the database credentials (zabbix / ZabbixDBPass123!)
5. Set the Zabbix server name
6. Default login: Admin / zabbix (change this immediately)

## Verify Installation

```bash
# Check Zabbix server logs
sudo tail -f /var/log/zabbix/zabbix_server.log

# Verify the local agent is communicating
sudo zabbix_agent2 -t system.uptime
```

After completing the web wizard, change the default admin password and start adding hosts to monitor.
