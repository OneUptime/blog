# How to Monitor RHEL Hosts with Zabbix SNMP Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zabbix, SNMP, Monitoring, Templates, Linux

Description: Use Zabbix SNMP templates to monitor RHEL hosts when installing a Zabbix agent is not possible, collecting CPU, memory, disk, and network metrics via SNMP.

---

Sometimes installing a Zabbix agent on a host is not feasible. SNMP monitoring provides an alternative by querying the Net-SNMP daemon already running on the RHEL host.

## Configure SNMP on the Target Host

```bash
# Install and configure snmpd on the host to monitor
sudo dnf install -y net-snmp net-snmp-utils

sudo tee /etc/snmp/snmpd.conf << 'CONF'
# Allow read-only access from Zabbix server
rocommunity zabbixMonitor 10.0.0.100
rocommunity zabbixMonitor 127.0.0.1

# System information
syslocation "Data Center"
syscontact "admin@example.com"

# Expose full OID tree
view all included .1
access notConfigGroup "" any noauth exact all none none

# Disk monitoring
disk / 10%
disk /var 10%

# Load monitoring
load 12 10 8
CONF

sudo systemctl enable --now snmpd
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.100/32" port port="161" protocol="udp" accept'
sudo firewall-cmd --reload
```

## Verify SNMP from the Zabbix Server

```bash
# Test SNMP connectivity from the Zabbix server
snmpwalk -v2c -c zabbixMonitor 10.0.0.50 sysDescr
snmpwalk -v2c -c zabbixMonitor 10.0.0.50 hrStorageDescr
snmpwalk -v2c -c zabbixMonitor 10.0.0.50 ifDescr
```

## Add the Host in Zabbix

1. Go to Data collection > Hosts > Create host
2. Set the hostname (e.g., `rhel-snmp-host`)
3. Add an SNMP interface:
   - IP address: 10.0.0.50
   - Port: 161
   - SNMP version: SNMPv2
   - Community: `zabbixMonitor`

## Link SNMP Templates

Zabbix provides built-in SNMP templates. Link these to the host:

- **Linux SNMP** - Covers CPU, memory, disk, network
- **ICMP Ping** - Basic availability monitoring

To link templates:
1. Edit the host
2. Go to the Templates tab
3. Search for "Linux SNMP" and add it
4. Save

## Key SNMP OIDs Monitored

The Linux SNMP template monitors these OIDs:

```text
# System uptime
.1.3.6.1.2.1.1.3.0 (sysUpTime)

# CPU load averages
.1.3.6.1.4.1.2021.10.1.3.1 (laLoad 1 min)
.1.3.6.1.4.1.2021.10.1.3.2 (laLoad 5 min)
.1.3.6.1.4.1.2021.10.1.3.3 (laLoad 15 min)

# Memory
.1.3.6.1.4.1.2021.4.5.0  (memTotalReal)
.1.3.6.1.4.1.2021.4.6.0  (memAvailReal)
.1.3.6.1.4.1.2021.4.11.0 (memTotalFree)

# Disk (via HOST-RESOURCES-MIB)
.1.3.6.1.2.1.25.2.3.1 (hrStorageTable)

# Network interfaces
.1.3.6.1.2.1.2.2.1 (ifTable)
```

## Create a Custom SNMP Item

If you need to monitor something not in the default template:

1. Go to Data collection > Hosts > Items > Create item
2. Set Type: SNMPv2 agent
3. Set the SNMP OID (e.g., `.1.3.6.1.4.1.2021.11.9.0` for user CPU percentage)
4. Set value type and update interval

```text
Example custom item:
  Name: CPU User Time
  Type: SNMPv2 agent
  SNMP OID: .1.3.6.1.4.1.2021.11.9.0
  Update interval: 60s
  Value type: Numeric (float)
```

## Troubleshooting

```bash
# Check if Zabbix server can reach the SNMP agent
snmpget -v2c -c zabbixMonitor 10.0.0.50 sysUpTime.0

# Check Zabbix server log for SNMP errors
sudo grep -i snmp /var/log/zabbix/zabbix_server.log | tail -20

# Verify the SNMP interface is green in the Zabbix host list
# A red SNMP icon means the server cannot reach the agent
```

SNMP monitoring is a solid alternative when agent installation is restricted or when monitoring network equipment alongside RHEL servers.
