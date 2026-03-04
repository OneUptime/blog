# How to Install and Configure SNMP Agent (snmpd) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SNMP, Monitoring, Network Management, Linux

Description: Install and configure the Net-SNMP agent on RHEL to expose system metrics for monitoring tools like Zabbix, Cacti, or LibreNMS.

---

SNMP (Simple Network Management Protocol) allows monitoring systems to query hosts for performance data. The Net-SNMP daemon (snmpd) on RHEL exposes system metrics like CPU, memory, disk, and network statistics.

## Install Net-SNMP

```bash
# Install SNMP daemon and utilities
sudo dnf install -y net-snmp net-snmp-utils net-snmp-libs
```

## Configure snmpd

Back up the default configuration and create a clean one:

```bash
# Back up the original config
sudo cp /etc/snmp/snmpd.conf /etc/snmp/snmpd.conf.bak

# Create a new configuration
sudo tee /etc/snmp/snmpd.conf << 'CONF'
# System information
syslocation "Server Room, Rack 5"
syscontact "admin@example.com"
sysname rhel-server-01

# SNMPv2c community string (read-only access)
# Restrict to specific network
rocommunity mySecretCommunity 10.0.0.0/24
rocommunity mySecretCommunity 127.0.0.1

# Expose the full OID tree
view systemonly included .1

# Disk monitoring - alert when partitions exceed thresholds
disk / 10%
disk /var 10%
disk /tmp 10%

# Load average thresholds (1min, 5min, 15min)
load 8 6 4

# Process monitoring
proc sshd
proc crond

# Extend with custom scripts
extend cpu_count /bin/sh -c "nproc"

# Logging
dontLogTCPWrappersConnects yes
CONF
```

## Start and Enable snmpd

```bash
# Start the SNMP daemon
sudo systemctl enable --now snmpd

# Check the status
sudo systemctl status snmpd
```

## Configure the Firewall

```bash
# Allow SNMP traffic (UDP port 161)
sudo firewall-cmd --permanent --add-service=snmp
sudo firewall-cmd --reload
```

## Test SNMP Queries

```bash
# Query system description
snmpget -v2c -c mySecretCommunity localhost .1.3.6.1.2.1.1.1.0

# Query system uptime
snmpget -v2c -c mySecretCommunity localhost sysUpTime.0

# Walk the system OID tree
snmpwalk -v2c -c mySecretCommunity localhost system

# Get network interface information
snmpwalk -v2c -c mySecretCommunity localhost ifDescr

# Get disk usage
snmpwalk -v2c -c mySecretCommunity localhost dskPath

# Get memory usage
snmpwalk -v2c -c mySecretCommunity localhost memTotalReal.0
snmpwalk -v2c -c mySecretCommunity localhost memAvailReal.0

# Get CPU load averages
snmpwalk -v2c -c mySecretCommunity localhost laLoad
```

## Query from a Remote Host

```bash
# From a monitoring server on the same network
snmpwalk -v2c -c mySecretCommunity 10.0.0.50 system

# Test a bulk walk for efficiency
snmpbulkwalk -v2c -c mySecretCommunity -Cr25 10.0.0.50 .1.3.6.1.2.1.2.2
```

## SELinux Configuration

```bash
# If SELinux blocks snmpd, check for denials
sudo ausearch -m AVC -c snmpd -ts recent

# Allow snmpd to run custom scripts
sudo setsebool -P snmpd_exec_user_scripts 1
```

## Troubleshooting

```bash
# Test configuration without starting the daemon
snmpd -f -Lo -C -c /etc/snmp/snmpd.conf

# Check which OIDs are available
snmpwalk -v2c -c mySecretCommunity localhost .1 | head -50

# Verify snmpd is listening
ss -ulnp | grep :161
```

With snmpd configured, your RHEL host is ready to be monitored by any SNMP-compatible network management system.
