# How to Set Up SNMP Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SNMP, Monitoring, Net-SNMP, System Administration

Description: Install and configure Net-SNMP on RHEL to expose system metrics via SNMP, allowing network monitoring tools like Nagios, Zabbix, or PRTG to poll your servers.

---

SNMP (Simple Network Management Protocol) is a standard protocol for monitoring network devices and servers. Many enterprise monitoring tools use SNMP to collect metrics. RHEL uses the Net-SNMP package to provide SNMP agent functionality.

## Install Net-SNMP

```bash
# Install the SNMP agent and utilities
sudo dnf install -y net-snmp net-snmp-utils
```

## Configure the SNMP Agent

```bash
# Back up the default configuration
sudo cp /etc/snmp/snmpd.conf /etc/snmp/snmpd.conf.bak

# Create a new configuration
sudo tee /etc/snmp/snmpd.conf << 'EOF'
# System information
syslocation "Data Center Rack 5"
syscontact "admin@example.com"

# SNMPv2c community string (read-only)
# Only allow access from the monitoring server subnet
rocommunity mySecretCommunity 192.168.1.0/24

# Expose full system OID tree
view systemview included .1

# Disk monitoring - alert if / or /var exceed 90%
disk / 10%
disk /var 10%

# Load average thresholds (1min, 5min, 15min)
load 4 3 2

# Process monitoring - ensure sshd is running
proc sshd
EOF
```

## Start the SNMP Service

```bash
# Enable and start snmpd
sudo systemctl enable --now snmpd

# Open the firewall for SNMP (UDP 161)
sudo firewall-cmd --permanent --add-service=snmp
sudo firewall-cmd --reload
```

## Test SNMP Locally

```bash
# Query the system description
snmpwalk -v2c -c mySecretCommunity localhost system

# Get system uptime
snmpget -v2c -c mySecretCommunity localhost sysUpTime.0

# Get system name
snmpget -v2c -c mySecretCommunity localhost sysName.0

# Walk the entire tree (may produce a lot of output)
snmpwalk -v2c -c mySecretCommunity localhost .1 | head -50
```

## Test from a Remote Monitoring Server

```bash
# From the monitoring server, query the RHEL host
snmpwalk -v2c -c mySecretCommunity 192.168.1.50 system

# Get CPU load averages
snmpwalk -v2c -c mySecretCommunity 192.168.1.50 .1.3.6.1.4.1.2021.10

# Get memory statistics
snmpwalk -v2c -c mySecretCommunity 192.168.1.50 .1.3.6.1.4.1.2021.4

# Get disk usage
snmpwalk -v2c -c mySecretCommunity 192.168.1.50 .1.3.6.1.4.1.2021.9
```

## Configure SNMPv3 for Better Security

SNMPv2c sends community strings in plain text. For production, use SNMPv3:

```bash
# Stop snmpd before creating the user
sudo systemctl stop snmpd

# Create an SNMPv3 user with authentication and encryption
sudo net-snmp-create-v3-user -ro -A authPassword123 -X privPassword123 \
    -a SHA -x AES monitoruser

# Start snmpd
sudo systemctl start snmpd

# Test SNMPv3
snmpwalk -v3 -u monitoruser -l authPriv \
    -a SHA -A authPassword123 \
    -x AES -X privPassword123 \
    localhost system
```

## Common OIDs for Monitoring

```bash
# System uptime:    .1.3.6.1.2.1.1.3.0
# CPU load 1 min:   .1.3.6.1.4.1.2021.10.1.3.1
# Total RAM:        .1.3.6.1.4.1.2021.4.5.0
# Available RAM:    .1.3.6.1.4.1.2021.4.6.0
# Disk usage:       .1.3.6.1.4.1.2021.9.1
# Network ifaces:   .1.3.6.1.2.1.2.2.1
```

Once SNMP is configured, point your monitoring system at the RHEL host using the community string or SNMPv3 credentials, and it will start collecting metrics automatically.
