# How to Configure SNMP Monitoring in Zabbix for Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Zabbix, SNMP, Network Monitoring, Cisco, Dashboard, Alerting

Description: Learn how to add network devices to Zabbix using SNMP, apply built-in network device templates, and set up triggers for interface up/down alerting.

## Why Zabbix for SNMP Monitoring?

Zabbix is an enterprise-grade open-source monitoring platform with excellent SNMP support. It can poll SNMP OIDs on a schedule, receive SNMP traps, auto-discover interfaces, and trigger alerts based on thresholds.

## Step 1: Install Zabbix Server

```bash
# Install Zabbix 7.0 LTS on Ubuntu 22.04 with MySQL and Nginx

wget https://repo.zabbix.com/zabbix/7.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_latest_7.0+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_latest_7.0+ubuntu22.04_all.deb
sudo apt-get update

sudo apt-get install -y mysql-server zabbix-server-mysql zabbix-frontend-php \
  zabbix-nginx-conf zabbix-sql-scripts zabbix-agent

# Create and import the Zabbix database
ZABBIX_DB_PASSWORD='ChangeMe_StrongPassword_2026!'

sudo mysql <<SQL
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'zabbix'@'localhost' IDENTIFIED BY '${ZABBIX_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON zabbix.* TO 'zabbix'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;
SQL

zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | \
  mysql --default-character-set=utf8mb4 -uzabbix -p"${ZABBIX_DB_PASSWORD}" zabbix

sudo mysql -e "SET GLOBAL log_bin_trust_function_creators = 0;"
sudo sed -i "s/^# DBPassword=/DBPassword=${ZABBIX_DB_PASSWORD}/" /etc/zabbix/zabbix_server.conf

# Configure Nginx for the Zabbix frontend
sudo sed -i 's/^#        listen          8080;/        listen          8080;/' /etc/zabbix/nginx.conf
sudo sed -i 's/^#        server_name     example.com;/        server_name     zabbix.example.com;/' /etc/zabbix/nginx.conf

# Start services
sudo systemctl enable zabbix-server zabbix-agent nginx php8.1-fpm
sudo systemctl restart zabbix-server zabbix-agent nginx php8.1-fpm
```

## Step 2: Add a Network Device Host

In the Zabbix web UI (Data collection > Hosts > Create host):

1. **Host name:** `core-router-01`
2. **Groups:** `Network Devices`
3. **Interfaces:** Add SNMP interface
   - IP Address: `192.168.1.1`
   - Port: `161`
4. **Templates:** Apply `Network Generic Device by SNMP`, or a vendor-specific template such as `Cisco IOS SNMP`

Or use the Zabbix API to add the host programmatically. Replace the group and template IDs with values from your Zabbix server:

```bash
# Add host via Zabbix API
curl -X POST http://zabbix.example.com/api_jsonrpc.php \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json-rpc" \
  -d '{
    "jsonrpc": "2.0",
    "method": "host.create",
    "params": {
      "host": "core-router-01",
      "interfaces": [{
        "type": 2,
        "main": 1,
        "useip": 1,
        "ip": "192.168.1.1",
        "dns": "",
        "port": "161",
        "details": {
          "version": 2,
          "bulk": 1,
          "community": "{$SNMP_COMMUNITY}"
        }
      }],
      "groups": [{"groupid": "YOUR_HOST_GROUP_ID"}],
      "templates": [{"templateid": "YOUR_TEMPLATE_ID"}],
      "macros": [
        {"macro": "{$SNMP_COMMUNITY}", "value": "public"}
      ]
    },
    "id": 1
  }'
```

## Step 3: Configure SNMP Macros

Set the SNMP community on the host's SNMP interface and reference a host macro:

In the Zabbix UI: Host > Interfaces > SNMP:
- Version: `SNMPv2`
- Community: `{$SNMP_COMMUNITY}`

Then set the macro in Host > Macros tab:
- `{$SNMP_COMMUNITY}` = `Net0ps_M0n!t0r`

For SNMPv3, set the SNMP interface version to SNMPv3 and reference macros in the security fields:
- `{$SNMP3_USER}` = `nmsuser`
- `{$SNMP3_AUTHPASSPHRASE}` = `AuthPass@2026!`
- `{$SNMP3_PRIVPASSPHRASE}` = `PrivPass@2026!`

## Step 4: Configure Interface Discovery

Zabbix built-in templates use SNMP Low-Level Discovery (LLD) to automatically find all interfaces:

The template `Network Generic Device by SNMP` automatically:
- Discovers interfaces from IF-MIB, including `ifDescr` (OID: 1.3.6.1.2.1.2.2.1.2)
- Monitors `ifOperStatus`, `ifInOctets`, `ifOutOctets`, and related IF-MIB counters
- Creates triggers for interface state changes

To manually add an item for interface bandwidth:

```text
# Custom SNMP item for GigabitEthernet0/0 inbound bandwidth
OID: 1.3.6.1.2.1.31.1.1.1.6.1   (ifHCInOctets for interface index 1)
Key: net.if.in[ifHCInOctets.1]
Type: SNMP agent
Value type: Numeric (unsigned)
Units: bps
Preprocessing:
  - Change per second
  - Custom multiplier: 8
Update interval: 60s
```

## Step 5: Create an Interface Down Trigger

Zabbix built-in templates include interface status triggers. To create a custom one:

```text
# Trigger expression for interface down
last(/core-router-01/net.if.status[ifOperStatus.1])=2

# This fires when ifOperStatus for interface index 1 = 2 (down)
```

Use discovery-based triggers in templates to cover all interfaces automatically.

## Step 6: Receive SNMP Traps in Zabbix

Configure Zabbix to receive SNMP traps using snmptrapd:

```bash
# Install snmptrapd and SNMP tools
sudo apt-get install -y curl snmp snmptrapd

# Configure Zabbix to read the trap file
sudo mkdir -p /var/lib/zabbix/snmptraps
sudo sed -i 's/^#\?StartSNMPTrapper=.*/StartSNMPTrapper=1/' /etc/zabbix/zabbix_server.conf
sudo sed -i 's|^#\?SNMPTrapperFile=.*|SNMPTrapperFile=/var/lib/zabbix/snmptraps/snmptraps.log|' /etc/zabbix/zabbix_server.conf

# Install the Zabbix trap handler used by snmptrapd
sudo curl -fsSL -o /usr/sbin/zabbix_trap_handler.sh \
  https://raw.githubusercontent.com/zabbix/zabbix-docker/7.0/Dockerfiles/snmptraps/alpine/conf/usr/sbin/zabbix_trap_handler.sh
sudo chmod +x /usr/sbin/zabbix_trap_handler.sh

# Configure to forward to Zabbix
sudo tee /etc/snmp/snmptrapd.conf >/dev/null << 'EOF'
authCommunity log,execute,net public
traphandle default /bin/bash /usr/sbin/zabbix_trap_handler.sh
EOF

sudo systemctl restart zabbix-server snmptrapd
```

Add a trap item to the host:
- Type: `SNMP trap`
- Key: `snmptrap.fallback`
- Type of information: `Log`

## Step 7: Verify SNMP Polling

Check that Zabbix is successfully polling the device:

1. Go to **Monitoring > Latest data**
2. Filter by the host name
3. Verify SNMP items show recent values (not "No data")

If polling fails, check:
```bash
# Test SNMP polling from Zabbix server
snmpget -v2c -c 'Net0ps_M0n!t0r' 192.168.1.1 SNMPv2-MIB::sysDescr.0
```

## Conclusion

Zabbix provides comprehensive SNMP monitoring with built-in templates for Cisco and other network devices. Add devices with SNMP interfaces, apply the appropriate template for automatic interface discovery, configure SNMP community macros, and let Zabbix handle polling and alerting. For production environments, configure SNMPv3 macros instead of community strings for secure monitoring.
