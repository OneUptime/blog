# How to Use snmpwalk to Query Server Metrics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SNMP, snmpwalk, Monitoring, Networking

Description: A comprehensive guide to using snmpwalk and related SNMP tools on Ubuntu to query server metrics, explore OID trees, and retrieve specific system statistics from network devices.

---

snmpwalk is a command-line tool that queries an SNMP agent and walks the OID (Object Identifier) tree, returning all values under a given OID. It is the primary tool for exploring what an SNMP device exposes and for retrieving specific metrics. This guide covers practical snmpwalk usage for querying Ubuntu servers and other network devices.

## Installing SNMP Tools

```bash
# Install the SNMP tools package
sudo apt update
sudo apt install snmp snmp-mibs-downloader

# Download standard MIB files so OIDs display as human-readable names
sudo download-mibs

# After download, enable MIBs in the config
sudo nano /etc/snmp/snmp.conf
```

Add or uncomment:

```
mibs +ALL
```

This tells the SNMP tools to load all downloaded MIB files, which translates numeric OIDs to meaningful names like `sysDescr.0` instead of `.1.3.6.1.2.1.1.1.0`.

## Basic snmpwalk Syntax

```
snmpwalk [options] AGENT [OID]
```

Key options:
- `-v VERSION` - SNMP version: 1, 2c, or 3
- `-c COMMUNITY` - Community string (for v1/v2c)
- `-u USER` - Username (for v3)
- `-l LEVEL` - Security level: noAuthNoPriv, authNoPriv, authPriv (v3)
- `-a PROTOCOL` - Auth protocol: MD5, SHA (v3)
- `-A PASSPHRASE` - Auth passphrase (v3)
- `-x PROTOCOL` - Privacy protocol: DES, AES (v3)
- `-X PASSPHRASE` - Privacy passphrase (v3)
- `-O` - Output options (more on this below)

## Walking the System MIB

Start by walking the `system` MIB to see basic device information:

```bash
# Walk the system subtree (works for any SNMP device)
snmpwalk -v 2c -c public 192.168.1.10 system

# Expected output:
# SNMPv2-MIB::sysDescr.0 = STRING: Linux myserver 5.15.0-91-generic #101-Ubuntu SMP
# SNMPv2-MIB::sysObjectID.0 = OID: NET-SNMP-MIB::netSnmpAgentOIDs.10
# SNMPv2-MIB::sysUpTime.0 = Timeticks: (123456789) 14 days, 6:56:07.89
# SNMPv2-MIB::sysContact.0 = STRING: ops@example.com
# SNMPv2-MIB::sysName.0 = STRING: myserver
# SNMPv2-MIB::sysLocation.0 = STRING: Server Room Rack 5
```

## Getting Specific OIDs with snmpget

snmpget retrieves a single OID rather than walking a subtree:

```bash
# Get system description
snmpget -v 2c -c public 192.168.1.10 SNMPv2-MIB::sysDescr.0

# Get uptime
snmpget -v 2c -c public 192.168.1.10 SNMPv2-MIB::sysUpTime.0

# Get hostname
snmpget -v 2c -c public 192.168.1.10 SNMPv2-MIB::sysName.0

# Using numeric OIDs directly (works without MIB files)
snmpget -v 2c -c public 192.168.1.10 .1.3.6.1.2.1.1.1.0
```

## Walking CPU and Load Metrics

The UCD-SNMP-MIB provides Linux-specific metrics:

```bash
# CPU usage by state
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::ssCpuUser
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::ssCpuSystem
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::ssCpuIdle

# 1, 5, and 15 minute load averages
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::laLoad

# More detailed load values
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::laTable

# CPU percentage as integer (easier for scripts)
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::ssCpuUser.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::ssCpuSystem.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::ssCpuIdle.0

# Walk all system stats at once
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::systemStats
```

## Memory Metrics

```bash
# Total RAM, RAM used, RAM free
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memory

# Specific memory values in KB
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memTotalReal.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memAvailReal.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memTotalFree.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memShared.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memBuffer.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memCached.0

# Swap usage
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memTotalSwap.0
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::memAvailSwap.0
```

## Disk Space Metrics

```bash
# Walk all disk usage (HOST-RESOURCES-MIB)
snmpwalk -v 2c -c public 192.168.1.10 HOST-RESOURCES-MIB::hrStorage

# More detailed disk info
snmpwalk -v 2c -c public 192.168.1.10 HOST-RESOURCES-MIB::hrStorageTable

# UCD disk monitoring (if configured in snmpd.conf)
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::dskTable

# Specific disk info
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::dskPath.1    # Mount point
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::dskTotal.1   # Total blocks
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::dskAvail.1   # Available blocks
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::dskUsed.1    # Used blocks
snmpget -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::dskPercent.1 # Percent used
```

## Network Interface Metrics

```bash
# Walk all interfaces and their stats
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifTable

# Interface names
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifDescr

# Interface speeds (in bits per second)
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifSpeed

# Bytes in/out per interface (32-bit counters, wrap on high-speed links)
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifInOctets
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifOutOctets

# 64-bit counters (use these for gigabit+ interfaces to avoid counter wrap)
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifHCInOctets
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifHCOutOctets

# Interface errors
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifInErrors
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifOutErrors

# Interface status (1=up, 2=down)
snmpwalk -v 2c -c public 192.168.1.10 IF-MIB::ifOperStatus
```

## Process Monitoring

```bash
# Walk running processes (can be very long on busy servers)
snmpwalk -v 2c -c public 192.168.1.10 HOST-RESOURCES-MIB::hrSWRunTable | head -50

# Process names
snmpwalk -v 2c -c public 192.168.1.10 HOST-RESOURCES-MIB::hrSWRunName

# Process CPU usage
snmpwalk -v 2c -c public 192.168.1.10 HOST-RESOURCES-MIB::hrSWRunPerfCPU

# Process memory usage
snmpwalk -v 2c -c public 192.168.1.10 HOST-RESOURCES-MIB::hrSWRunPerfMem

# Processes configured for monitoring in snmpd.conf (proc directives)
snmpwalk -v 2c -c public 192.168.1.10 UCD-SNMP-MIB::prTable
```

## Output Formatting

Control the output format with `-O` options:

```bash
# -On: Print numeric OIDs
snmpwalk -v 2c -c public -On 192.168.1.10 system

# -Os: Print short OID names (no module prefix)
snmpwalk -v 2c -c public -Os 192.168.1.10 system

# -Ov: Print values only (no OID)
snmpwalk -v 2c -c public -Ov 192.168.1.10 UCD-SNMP-MIB::laLoad

# -OQ: Suppress type information
snmpwalk -v 2c -c public -OQ 192.168.1.10 system

# Combine options: short OIDs with values only
snmpwalk -v 2c -c public -Os -Ov 192.168.1.10 UCD-SNMP-MIB::laLoad
```

## Scripting SNMP Queries

Here is a practical bash script that collects key metrics from a server:

```bash
#!/bin/bash
# File: snmp-server-stats.sh
# Collect key metrics from an SNMP-enabled server

HOST=${1:-localhost}
COMMUNITY=${2:-public}
VERSION="2c"

echo "=== Server Stats for $HOST ==="
echo ""

# System info
echo "--- System ---"
echo "Hostname: $(snmpget -v $VERSION -c $COMMUNITY -Ov $HOST SNMPv2-MIB::sysName.0 2>/dev/null)"
echo "Description: $(snmpget -v $VERSION -c $COMMUNITY -Ov $HOST SNMPv2-MIB::sysDescr.0 2>/dev/null)"
echo "Uptime: $(snmpget -v $VERSION -c $COMMUNITY -Ov $HOST SNMPv2-MIB::sysUpTime.0 2>/dev/null)"

# Load averages
echo ""
echo "--- Load Averages ---"
LOAD1=$(snmpget -v $VERSION -c $COMMUNITY -Ov -OQ $HOST UCD-SNMP-MIB::laLoad.1 2>/dev/null)
LOAD5=$(snmpget -v $VERSION -c $COMMUNITY -Ov -OQ $HOST UCD-SNMP-MIB::laLoad.2 2>/dev/null)
LOAD15=$(snmpget -v $VERSION -c $COMMUNITY -Ov -OQ $HOST UCD-SNMP-MIB::laLoad.3 2>/dev/null)
echo "1 min: $LOAD1  5 min: $LOAD5  15 min: $LOAD15"

# Memory (values in KB)
echo ""
echo "--- Memory (KB) ---"
TOTAL=$(snmpget -v $VERSION -c $COMMUNITY -Ov -OQ $HOST UCD-SNMP-MIB::memTotalReal.0 2>/dev/null)
FREE=$(snmpget -v $VERSION -c $COMMUNITY -Ov -OQ $HOST UCD-SNMP-MIB::memAvailReal.0 2>/dev/null)
echo "Total: $TOTAL  Free: $FREE"

# CPU
echo ""
echo "--- CPU ---"
CPU_USER=$(snmpget -v $VERSION -c $COMMUNITY -Ov -OQ $HOST UCD-SNMP-MIB::ssCpuUser.0 2>/dev/null)
CPU_IDLE=$(snmpget -v $VERSION -c $COMMUNITY -Ov -OQ $HOST UCD-SNMP-MIB::ssCpuIdle.0 2>/dev/null)
echo "User: ${CPU_USER}%  Idle: ${CPU_IDLE}%"

echo ""
echo "Done."
```

```bash
chmod +x snmp-server-stats.sh
./snmp-server-stats.sh 192.168.1.10 monitoring_secret
```

## SNMPv3 Walk

For SNMPv3, specify authentication credentials:

```bash
# Walk with SNMPv3 authPriv (full authentication and encryption)
snmpwalk -v 3 \
  -u monitoruser \
  -l authPriv \
  -a SHA \
  -A "auth_passphrase" \
  -x AES \
  -X "priv_passphrase" \
  192.168.1.10 system

# Shorter version with authNoPriv (auth only, no encryption)
snmpwalk -v 3 -u monitoruser -l authNoPriv -a SHA -A "auth_passphrase" \
  192.168.1.10 UCD-SNMP-MIB::laLoad
```

## Bulk Walking for Performance

`snmpbulkwalk` uses GETBULK requests for faster traversal of large OID trees:

```bash
# snmpbulkwalk is much faster than snmpwalk for large subtrees
snmpbulkwalk -v 2c -c public 192.168.1.10 IF-MIB::ifTable

# Control how many OIDs to request at once (default 10)
snmpbulkwalk -v 2c -c public -Cr 20 192.168.1.10 HOST-RESOURCES-MIB::hrSWRunTable
```

snmpwalk is often the first tool to reach for when troubleshooting SNMP-based monitoring. Start with the `system` MIB to verify connectivity, then walk the specific subtrees relevant to what you are monitoring.
