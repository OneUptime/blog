# How to Set Up Zabbix for Enterprise Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Zabbix, Enterprise, Infrastructure

Description: Complete guide to installing and configuring Zabbix server on Ubuntu for enterprise-grade infrastructure monitoring with agents, templates, and alerting.

---

Zabbix is a mature, enterprise-grade monitoring platform that handles everything from server metrics to application performance monitoring. Unlike Prometheus which requires separate components for visualization and alerting, Zabbix bundles a complete monitoring solution: data collection, storage, visualization, alerting, and auto-discovery in a single package. It scales from a handful of servers to tens of thousands of monitored hosts.

## Architecture Overview

A Zabbix deployment consists of:
- **Zabbix Server**: The core component that collects data, evaluates triggers, and sends alerts
- **Zabbix Agent**: Runs on monitored hosts and collects local metrics
- **Database**: MySQL or PostgreSQL stores all configuration and historical data
- **Frontend**: PHP-based web UI for configuration and dashboards

## Installing the Database

Zabbix requires MySQL or PostgreSQL. This guide uses MySQL:

```bash
# Install MySQL
sudo apt update
sudo apt install -y mysql-server

# Start and enable MySQL
sudo systemctl enable --now mysql

# Run security hardening
sudo mysql_secure_installation

# Create Zabbix database and user
sudo mysql -u root -p << 'SQL'
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'zabbix'@'localhost' IDENTIFIED BY 'securepassword';
GRANT ALL PRIVILEGES ON zabbix.* TO 'zabbix'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;
FLUSH PRIVILEGES;
SQL
```

## Installing Zabbix Server

```bash
# Add Zabbix repository (check https://www.zabbix.com/download for latest)
ZABBIX_VERSION="6.4"
UBUNTU_VERSION="22.04"

wget "https://repo.zabbix.com/zabbix/${ZABBIX_VERSION}/ubuntu/pool/main/z/zabbix-release/zabbix-release_${ZABBIX_VERSION}-1+ubuntu${UBUNTU_VERSION}_all.deb"

sudo dpkg -i "zabbix-release_${ZABBIX_VERSION}-1+ubuntu${UBUNTU_VERSION}_all.deb"
sudo apt update

# Install Zabbix server, frontend, and agent
sudo apt install -y zabbix-server-mysql zabbix-frontend-php \
  zabbix-apache-conf zabbix-sql-scripts zabbix-agent

# Import database schema
sudo zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | \
  mysql --default-character-set=utf8mb4 -u zabbix -p zabbix

# Reset log_bin_trust_function_creators
sudo mysql -u root -p -e "SET GLOBAL log_bin_trust_function_creators = 0;"
```

## Configuring Zabbix Server

```bash
# Edit the server configuration
sudo nano /etc/zabbix/zabbix_server.conf
```

Key settings to configure:

```bash
sudo tee /etc/zabbix/zabbix_server.conf << 'EOF'
# Database connection
DBHost=localhost
DBName=zabbix
DBUser=zabbix
DBPassword=securepassword

# Server bind address
ListenIP=0.0.0.0
ListenPort=10051

# Performance settings
StartPollers=10
StartIPMIPollers=0
StartPreprocessors=3
StartPollersUnreachable=1
StartTrappers=5
StartPingers=1
StartDiscoverers=1
StartHTTPPollers=1
StartTimers=1

# Cache settings
CacheSize=32M
HistoryCacheSize=16M
TrendCacheSize=4M
ValueCacheSize=8M

# Logging
LogFile=/var/log/zabbix/zabbix_server.log
LogFileSize=10
DebugLevel=3

# External scripts directory
ExternalScripts=/usr/lib/zabbix/externalscripts

# Alert scripts directory
AlertScriptsPath=/usr/lib/zabbix/alertscripts
EOF
```

## Configuring PHP for the Frontend

```bash
# Edit PHP timezone setting
sudo tee /etc/zabbix/apache.conf << 'EOF'
Alias /zabbix /usr/share/zabbix

<Directory "/usr/share/zabbix">
    Options FollowSymLinks
    AllowOverride None
    Order allow,deny
    Allow from all

    <IfModule mod_php.c>
        php_value max_execution_time 300
        php_value memory_limit 128M
        php_value post_max_size 16M
        php_value upload_max_filesize 2M
        php_value max_input_time 300
        php_value max_input_vars 10000
        php_value always_populate_raw_post_data -1
        php_value date.timezone America/New_York
    </IfModule>
</Directory>
EOF

# Enable Apache modules
sudo a2enmod rewrite

# Start Zabbix server and agent
sudo systemctl enable --now zabbix-server zabbix-agent apache2

# Check server is running
sudo systemctl status zabbix-server

# Check logs for errors
sudo tail -50 /var/log/zabbix/zabbix_server.log
```

Access the web installer at `http://your-server/zabbix` and complete the setup wizard. Default credentials are `Admin/zabbix` - change these immediately.

## Installing Zabbix Agent on Remote Hosts

On each server you want to monitor:

```bash
# Add Zabbix repository
ZABBIX_VERSION="6.4"
UBUNTU_VERSION="22.04"
wget "https://repo.zabbix.com/zabbix/${ZABBIX_VERSION}/ubuntu/pool/main/z/zabbix-release/zabbix-release_${ZABBIX_VERSION}-1+ubuntu${UBUNTU_VERSION}_all.deb"
sudo dpkg -i "zabbix-release_${ZABBIX_VERSION}-1+ubuntu${UBUNTU_VERSION}_all.deb"
sudo apt update
sudo apt install -y zabbix-agent2

# Configure the agent
sudo tee /etc/zabbix/zabbix_agent2.conf << 'EOF'
# Passive checks - Zabbix server initiates connection
Server=192.168.1.10

# Active checks - agent initiates connection
ServerActive=192.168.1.10

# Hostname must match what you configure in Zabbix web UI
Hostname=webserver01.example.com

# Metadata for auto-registration
HostMetadata=Linux

# Logging
LogFile=/var/log/zabbix/zabbix_agent2.log
LogFileSize=10

# Performance
PidFile=/var/run/zabbix/zabbix_agent2.pid
EOF

# Enable and start agent
sudo systemctl enable --now zabbix-agent2

# Allow Zabbix server to connect (firewall)
sudo ufw allow from 192.168.1.10 to any port 10050 proto tcp
```

## Using Templates

Templates are pre-configured sets of items, triggers, and graphs that you can apply to hosts. Zabbix ships with many built-in templates:

```bash
# Common templates in Zabbix:
# - Linux by Zabbix agent
# - MySQL by Zabbix agent
# - Apache by HTTP
# - Nginx by HTTP
# - Docker by Zabbix agent

# Templates are applied through the web UI:
# Configuration > Hosts > [host] > Templates tab > Add

# Or via Zabbix API:
curl -X POST \
  -H "Content-Type: application/json" \
  http://localhost/zabbix/api_jsonrpc.php \
  -d '{
    "jsonrpc": "2.0",
    "method": "user.login",
    "params": {
      "username": "Admin",
      "password": "zabbix"
    },
    "id": 1
  }'
```

## Adding Hosts via API

```bash
# First, get authentication token
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  http://localhost/zabbix/api_jsonrpc.php \
  -d '{"jsonrpc":"2.0","method":"user.login","params":{"username":"Admin","password":"zabbix"},"id":1}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['result'])")

# Get template ID for Linux template
TEMPLATE_ID=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  http://localhost/zabbix/api_jsonrpc.php \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"template.get\",\"params\":{\"filter\":{\"host\":[\"Linux by Zabbix agent\"]}},\"auth\":\"${TOKEN}\",\"id\":2}" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['templateid'])")

# Add host with Linux template
curl -X POST \
  -H "Content-Type: application/json" \
  http://localhost/zabbix/api_jsonrpc.php \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"host.create\",
    \"params\": {
      \"host\": \"webserver01.example.com\",
      \"interfaces\": [{
        \"type\": 1,
        \"main\": 1,
        \"useip\": 1,
        \"ip\": \"192.168.1.20\",
        \"dns\": \"\",
        \"port\": \"10050\"
      }],
      \"groups\": [{\"groupid\": \"2\"}],
      \"templates\": [{\"templateid\": \"${TEMPLATE_ID}\"}]
    },
    \"auth\": \"${TOKEN}\",
    \"id\": 3
  }"
```

## Configuring Alerting

Configure media types for notifications:

```bash
# Email configuration is done in web UI:
# Administration > Media types > Email
# Configure SMTP settings

# For Slack notifications, use webhook media type:
# Administration > Media types > Create media type
# Type: Webhook
# Script:
# var params = JSON.parse(value);
# var response = new HttpRequest();
# response.addHeader('Content-Type: application/json');
# response.post(params.webhook_url, JSON.stringify({text: params.message}));
# return 'OK';
```

## Auto-Discovery

Zabbix can automatically discover and add hosts:

```bash
# Configure auto-discovery in web UI:
# Configuration > Discovery > Create discovery rule

# Example rule:
# Name: Local Network Discovery
# IP range: 192.168.1.1-254
# Update interval: 1h
# Checks: Zabbix agent (port 10050)
# Device uniqueness criteria: IP address

# Auto-registration action:
# Configuration > Actions > Autoregistration actions
# Add action to link template and add to host group
```

## Monitoring Database Performance

```bash
# Check Zabbix server performance statistics
sudo zabbix_server --runtime-control config_cache_reload

# View database size
sudo mysql -u zabbix -p zabbix -e "
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'zabbix'
ORDER BY (data_length + index_length) DESC
LIMIT 10;"

# Check history table size growth
sudo mysql -u zabbix -p zabbix -e "
SELECT COUNT(*) as rows,
       MIN(FROM_UNIXTIME(clock)) as oldest,
       MAX(FROM_UNIXTIME(clock)) as newest
FROM history;"
```

Zabbix's strength is its completeness. Auto-discovery, built-in templates, integrated alerting, and a capable API make it suitable for enterprise environments where you need monitoring to run with minimal ongoing configuration effort. The initial setup investment pays off as the system automatically discovers and monitors new infrastructure as it is provisioned.
