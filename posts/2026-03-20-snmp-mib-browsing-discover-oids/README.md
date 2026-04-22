# How to Set Up SNMP MIB Browsing to Discover Available OIDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, MIB, OID, Network Monitoring, IPv4, Snmpwalk, Linux, Discovery

Description: Learn how to use SNMP tools to browse MIBs and discover available OIDs on network devices over IPv4, enabling custom monitoring of vendor-specific metrics.

---

SNMP MIBs (Management Information Bases) are collections of OID (Object Identifier) definitions that describe what can be monitored on a device. Before configuring custom SNMP sensors, you need to discover which OIDs are available and what data they return.

## Installing SNMP Tools

```bash
# Install SNMP utilities and MIB definitions

apt install snmp snmp-mibs-downloader -y   # Debian/Ubuntu
dnf install net-snmp-utils -y             # RHEL/Rocky
```

## Method 1: snmpwalk - Walk a Broad OID Tree

```bash
# Walk a broad SNMP subtree of a device (SNMP v2c)
snmpwalk -v2c -c public 192.168.1.10 .1.3

# Walk from a specific OID subtree
snmpwalk -v2c -c public 192.168.1.10 system
snmpwalk -v2c -c public 192.168.1.10 interfaces
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.2.2  # IF-MIB::ifTable

# Use human-readable MIB names instead of numeric OIDs
snmpwalk -v2c -c public -m ALL 192.168.1.10 system

# Save a broad walk to a file for offline browsing
snmpwalk -v2c -c public 192.168.1.10 .1.3 > /tmp/device-mibs.txt
```

## Method 2: snmpget - Query a Specific OID

```bash
# Get the system description
snmpget -v2c -c public 192.168.1.10 sysDescr.0

# Get interface speed by OID (ifSpeed for interface 1)
snmpget -v2c -c public 192.168.1.10 1.3.6.1.2.1.2.2.1.5.1

# Get multiple OIDs in one query
snmpget -v2c -c public 192.168.1.10 sysDescr.0 sysName.0 sysUpTime.0
```

## Method 3: snmptranslate - Convert OID to MIB Name

```bash
# Translate a numeric OID to human-readable name
snmptranslate -m ALL 1.3.6.1.2.1.1.1.0
# Output: SNMPv2-MIB::sysDescr.0

# Find the OID for a known MIB object
snmptranslate -On -m ALL IF-MIB::ifOperStatus
# Output: .1.3.6.1.2.1.2.2.1.8

# Get full description of an OID
snmptranslate -Td -m ALL 1.3.6.1.2.1.2.2.1.10
```

## Common OIDs to Discover

```bash
# System information
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.1

# Interface list and stats
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.2.2

# CPU utilization (UCD-SNMP)
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.4.1.2021.11

# Memory (UCD-SNMP)
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.4.1.2021.4

# Disk usage (UCD-SNMP)
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.4.1.2021.9

# BGP peer table (RFC 4273)
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.15
```

## Using MIB Browser GUI Tools

```bash
# Install tkmib (Tk/Perl MIB browser)
apt install tkmib -y
tkmib &

# Or use snmpB (cross-platform)
# Download from https://sourceforge.net/projects/snmpb/
```

## Downloading Vendor MIBs

```bash
# Load vendor-specific MIBs for better OID descriptions
# Place .mib files in /usr/share/snmp/mibs/

# Walk using a custom MIB
snmpwalk -v2c -c public -M +/path/to/vendor/mibs -m +VENDOR-MIB 192.168.1.10 enterprises
```

## Key Takeaways

- `snmpwalk` discovers available OIDs in the subtree you walk, subject to the SNMP view you are allowed to access; save the output to a file for offline analysis.
- `snmptranslate -Td` provides full descriptions of OIDs including syntax, access, and status.
- Load vendor MIBs from the device's support site for human-readable names of proprietary OIDs.
- Standard MIB subtrees like `1.3.6.1.2.1.2.2` (interfaces) are consistent across devices that implement the corresponding standard MIB.
