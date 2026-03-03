# How to Monitor Ubuntu with SNMP and Cacti

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SNMP, Cacti, Monitoring, Networking

Description: Set up SNMP on Ubuntu servers and monitor them with Cacti for graphical network and system performance monitoring, covering installation, device configuration, and graph creation.

---

Cacti is a web-based network monitoring tool that uses SNMP to collect metrics from devices and generates round-robin database (RRD) graphs. It has been around for decades and remains widely used for network device monitoring, particularly in environments with many switches and routers. This guide covers setting up SNMP on Ubuntu servers and connecting them to a Cacti monitoring instance.

## Setting Up SNMP on Ubuntu Hosts to Monitor

Each Ubuntu server you want to monitor needs snmpd configured to respond to SNMP queries from the Cacti server.

```bash
# Install snmpd on each host to monitor
sudo apt update
sudo apt install snmpd snmp-mibs-downloader

# Download MIB files for human-readable metric names
sudo download-mibs
```

Configure snmpd:

```bash
sudo nano /etc/snmp/snmpd.conf
```

Replace the default content with a secure configuration:

```text
# Listen on all interfaces (change to specific IP for better security)
agentaddress  udp:161

# SNMPv2c community string (replace 'public' with something secure)
rocommunity   monitoring_secret 10.0.0.0/24
# Only allow queries from the Cacti server's subnet

# System information (shows in Cacti)
sysLocation    Server Room, Rack 3
sysContact     ops@example.com

# Enable standard system MIBs
view systemonly  included   .1.3.6.1.2.1.1
view systemonly  included   .1.3.6.1.2.1.25.1

# CPU, memory, disk (HOST-RESOURCES-MIB)
view systemonly  included   .1.3.6.1.2.1.25

# Network interfaces (IF-MIB)
view systemonly  included   .1.3.6.1.2.1.2

# TCP/UDP statistics
view systemonly  included   .1.3.6.1.2.1.6
view systemonly  included   .1.3.6.1.2.1.7

# UCD-SNMP-MIB for Linux-specific metrics (load, memory, disk)
view systemonly  included   .1.3.6.1.4.1.2021

# Disk monitoring
disk / 10%
disk /var 10%

# Process monitoring
proc nginx 10 1
proc sshd 1 1

# Load average alerting
load 12 10 5
```

```bash
# Restart snmpd
sudo systemctl enable snmpd
sudo systemctl restart snmpd

# Verify it is listening
sudo ss -ulnp | grep 161

# Test from the Cacti server
snmpwalk -v 2c -c monitoring_secret 192.168.1.50 system
```

## Installing Cacti on Ubuntu

Install Cacti on a dedicated monitoring server:

```bash
# Install LAMP stack prerequisites
sudo apt update
sudo apt install apache2 mariadb-server mariadb-client \
  php8.3 php8.3-mysql php8.3-xml php8.3-mbstring php8.3-json \
  php8.3-gd php8.3-curl rrdtool snmp snmp-mibs-downloader \
  librrds-perl

# Enable PHP modules
sudo a2enmod php8.3
sudo a2enmod rewrite

# Install Cacti
sudo apt install cacti cacti-spine
```

During installation, you will be prompted to:
1. Choose whether to configure the database automatically (say yes)
2. Set the Cacti database password

After installation, access the web interface at `http://your-server-ip/cacti`.

Default login: admin / admin (you will be prompted to change it).

## Manual Cacti Installation for Newer Versions

If you need a newer version than what is in the Ubuntu repositories:

```bash
# Install prerequisites
sudo apt install apache2 mariadb-server php8.3 php8.3-mysql \
  php8.3-xml php8.3-mbstring php8.3-gd rrdtool librrds-perl \
  snmp snmp-mibs-downloader php8.3-snmp

# Create the Cacti database
sudo mysql -u root << 'EOF'
CREATE DATABASE cacti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cacti'@'localhost' IDENTIFIED BY 'cacti_password_here';
GRANT ALL PRIVILEGES ON cacti.* TO 'cacti'@'localhost';
GRANT SELECT ON mysql.time_zone_name TO 'cacti'@'localhost';
FLUSH PRIVILEGES;
EOF

# Load timezone data
mysql_tzinfo_to_sql /usr/share/zoneinfo | sudo mysql -u root mysql

# Download latest Cacti
CACTI_VERSION=1.2.27
wget https://files.cacti.net/cacti/linux/cacti-${CACTI_VERSION}.tar.gz
tar -xzf cacti-${CACTI_VERSION}.tar.gz
sudo mv cacti-${CACTI_VERSION} /var/www/html/cacti

# Import the Cacti schema
sudo mysql -u cacti -p cacti < /var/www/html/cacti/cacti.sql

# Set file permissions
sudo chown -R www-data:www-data /var/www/html/cacti/
sudo chmod -R 755 /var/www/html/cacti/
```

Configure Cacti's database connection:

```bash
sudo nano /var/www/html/cacti/include/config.php
```

```php
<?php
$database_type     = 'mysql';
$database_default  = 'cacti';
$database_hostname = 'localhost';
$database_username = 'cacti';
$database_password = 'cacti_password_here';
$database_port     = '3306';
$database_ssl      = false;
```

## Apache Virtual Host for Cacti

```bash
sudo nano /etc/apache2/sites-available/cacti.conf
```

```apache
<VirtualHost *:80>
    ServerName monitoring.example.com
    DocumentRoot /var/www/html/cacti

    <Directory /var/www/html/cacti>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/cacti.error.log
    CustomLog ${APACHE_LOG_DIR}/cacti.access.log combined
</VirtualHost>
```

```bash
sudo a2ensite cacti.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Setting Up Cacti Poller (Cron Job)

Cacti collects data every 5 minutes via a poller script:

```bash
# Add cron job for the www-data user
sudo crontab -u www-data -e
```

Add this line:

```text
*/5 * * * * php /var/www/html/cacti/poller.php > /dev/null 2>&1
```

Or use spine (a faster C-based poller) for large installations:

```bash
# Install spine
sudo apt install cacti-spine

# Configure spine
sudo nano /etc/cacti/spine.conf
```

```text
DB_Host        localhost
DB_Database    cacti
DB_User        cacti
DB_Pass        cacti_password_here
DB_Port        3306

Cacti_Log      /var/log/cacti/cacti.log
SNMP_Clientaddr
```

## Adding Ubuntu Hosts to Cacti

After logging into the Cacti web interface:

1. Go to **Console > Device Management > Add Device**
2. Enter the host details:
   - Description: `web-server-01`
   - Hostname: `192.168.1.50` (or FQDN)
   - Host Template: `Linux/UNIX - UCD-SNMP`
   - SNMP Version: 2
   - SNMP Community: `monitoring_secret`
3. Click **Create**

Cacti will test the SNMP connection and show available metrics.

Then add graphs:

1. Click **Create Graphs for this Host**
2. Select graph types: Interface Statistics, Load Average, Memory Usage, Disk Space
3. Click **Create**

## PHP Configuration for Cacti

```bash
sudo nano /etc/php/8.3/apache2/php.ini
```

Adjust these settings:

```ini
; Increase memory for large environments
memory_limit = 512M

; Session and timeout settings
max_execution_time = 60
date.timezone = UTC

; Enable required extensions
extension=snmp
extension=gd
extension=xml
extension=mbstring
```

```bash
sudo systemctl restart apache2
```

## Troubleshooting SNMP Connectivity

If Cacti cannot connect to a host:

```bash
# Test SNMP from the Cacti server
snmpwalk -v 2c -c monitoring_secret 192.168.1.50 .1.3.6.1.2.1.1

# Test with verbose output
snmpget -v 2c -c monitoring_secret -v 192.168.1.50 .1.3.6.1.2.1.1.1.0

# Check firewall on the monitored host
sudo ufw status
# Ensure UDP 161 is open to the Cacti server
sudo ufw allow from 10.0.0.10 to any port 161 proto udp

# Check snmpd is binding to the right address
sudo ss -ulnp | grep snmpd

# Test that snmpd returns data
snmpwalk -v 2c -c monitoring_secret localhost .1.3.6.1.4.1.2021
```

## Enabling SNMPv3 on Monitored Hosts

For production environments, use SNMPv3:

```bash
# Create an SNMPv3 user on the monitored host
sudo net-snmp-create-v3-user -ro -a SHA -A "authpass123" \
  -x AES -X "privpass456" cacti_monitor

# Update snmpd.conf
echo "rouser cacti_monitor" | sudo tee -a /etc/snmp/snmpd.conf

sudo systemctl restart snmpd

# Test SNMPv3
snmpwalk -v 3 -u cacti_monitor -l authPriv \
  -a SHA -A "authpass123" \
  -x AES -X "privpass456" \
  192.168.1.50 system
```

Then configure Cacti devices to use:
- SNMP Version: 3
- Auth Protocol: SHA
- Auth Passphrase: authpass123
- Privacy Protocol: AES
- Privacy Passphrase: privpass456

Cacti generates a comprehensive picture of your infrastructure over time. The RRD (Round Robin Database) approach keeps storage usage fixed regardless of how long you collect data, making it practical for long-term trend analysis.
