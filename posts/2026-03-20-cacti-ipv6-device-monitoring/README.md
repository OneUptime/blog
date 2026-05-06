# How to Configure Cacti for IPv6 Device Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cacti, IPv6, SNMP, Network Monitoring, Graphing, RRDtool

Description: Configure Cacti network monitoring tool to poll and graph performance data from IPv6-addressed devices using SNMP over IPv6 transport.

---

Cacti is a complete network graphing solution using RRDtool. Configuring Cacti to monitor IPv6 devices requires adding IPv6-addressed hosts and ensuring Net-SNMP supports IPv6 polling. For IPv6 devices, prefer Spine or the external Net-SNMP tools instead of relying on the PHP SNMP extension.

## Prerequisites for IPv6 SNMP Polling

```bash
# Install the Net-SNMP command-line tools if needed
sudo apt install snmp -y

# Verify Net-SNMP is installed
snmpget --version

# Test SNMP over IPv6 from Cacti server
snmpget -v2c -c public udp6:[2001:db8::10]:161 1.3.6.1.2.1.1.1.0
```

## Installing Cacti

```bash
# Ubuntu/Debian
sudo apt install cacti cacti-spine snmp -y

# Or manual install
sudo apt install apache2 php php-cli php-curl php-gd php-gmp \
  php-intl php-ldap php-mbstring php-mysql php-xml php-zip \
  mysql-server rrdtool snmp composer -y

# Download Cacti
git clone -b 1.2.x https://github.com/Cacti/cacti.git
sudo mv cacti /var/www/html/cacti

# Install PHP dependencies
cd /var/www/html/cacti
composer install

# Setup database
mysql -u root -e "CREATE DATABASE cacti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "CREATE USER 'cactiuser'@'localhost' IDENTIFIED BY 'cactiuser';"
mysql -u root -e "GRANT ALL ON cacti.* TO 'cactiuser'@'localhost';"
mysql -u root -e "GRANT SELECT ON mysql.time_zone_name TO 'cactiuser'@'localhost'; FLUSH PRIVILEGES;"
mysql -u root cacti < /var/www/html/cacti/cacti.sql

# Configure cacti
sudo cp /var/www/html/cacti/include/config.php.dist /var/www/html/cacti/include/config.php
sudo nano /var/www/html/cacti/include/config.php
```

## Adding IPv6 Devices to Cacti

```text
Via Cacti Web Interface:
1. Go to Management > Devices > Add
2. In "Hostname" field, enter IPv6 address in brackets: [2001:db8::10]
   Or use hostname with AAAA record: device.example.com
3. Set SNMP Version (v2c or v3)
4. Enter SNMP Community: public
5. Select "Associated Template": Linux Host or applicable
6. Click Create

Important: Cacti's device form explicitly expects bracketed IPv6 literals in the Hostname field
For reliable IPv6 polling, use Spine or the external Net-SNMP tools
```

## Cacti Configuration for IPv6 SNMP

```text
In Cacti Web Interface:

1. Console > Settings > Paths
   - Set the Net-SNMP binary paths if you use external SNMP tools
   - Set the Spine binary path if you use Spine

2. Console > Settings > Poller
   - Set Poller Type to Spine for IPv6 devices
   - Adjust the default SNMP Timeout and Retries if needed

3. On each device
   - Set SNMP Version, Port, Timeout, and Retries as needed

Note: SNMP timeout and retry defaults are Cacti settings stored in the database, not $config entries in include/config.php
```

```bash
# Test Cacti can reach device over IPv6
# From Cacti server:
snmpget -v2c -c public udp6:[2001:db8::10]:161 1.3.6.1.2.1.1.1.0
```

## Spine Poller for IPv6

```ini
# /etc/spine.conf - Spine poller configuration

DB_Host       localhost
DB_Database   cacti
DB_User       cactiuser
DB_Pass       password
DB_Port       3306
```

```text
Spine uses Net-SNMP for SNMP transport. After configuring spine.conf, set the Spine binary path
in Cacti and change Poller Type to Spine so IPv6 devices are polled by Spine instead of php-snmp.
```

## Creating IPv6-Specific Graphs

```text
In Cacti Web Interface:

1. Use the existing "SNMP - Generic OID Template"
2. For the OID, enter: 1.3.6.1.2.1.4.31.1.1.4.2
   - This is IP-MIB::ipSystemStatsHCInReceives for the ipv6(2) row
3. Set the data source type to COUNTER if you want a rate graph
4. Associate the graph with the device
```

## Troubleshooting IPv6 Polling in Cacti

```bash
# Test SNMP directly from Cacti server
snmpget -v2c -c public \
  -t 2 \
  udp6:[2001:db8::10]:161 \
  1.3.6.1.2.1.1.1.0

# Check Cacti log for SNMP errors
# For a source installation under /var/www/html/cacti:
sudo tail -f /var/www/html/cacti/log/cacti.log | grep -i "error\|snmp"

# If using Spine, verify the Spine binary is installed
spine --version

# On the monitored device or its firewall, allow UDP/161 from the Cacti server
sudo ip6tables -A INPUT -p udp -s 2001:db8::100 --dport 161 -j ACCEPT
```

Cacti monitors IPv6-addressed devices by accepting bracketed IPv6 literals or hostnames with AAAA records in the device hostname field. For reliable IPv6 polling, use Spine or the external Net-SNMP tools so the underlying Net-SNMP stack handles the IPv6 SNMP transport.
