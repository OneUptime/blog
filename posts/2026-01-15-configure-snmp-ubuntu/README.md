# How to Configure SNMP on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SNMP, Network Monitoring, Management, Tutorial

Description: Complete guide to configuring SNMP agent and manager on Ubuntu for network monitoring.

---

Simple Network Management Protocol (SNMP) is a fundamental protocol for monitoring and managing network devices. Whether you're managing servers, routers, switches, or other network equipment, SNMP provides a standardized way to collect metrics, monitor performance, and receive alerts. This comprehensive guide walks you through configuring SNMP on Ubuntu, from basic setup to advanced configurations.

## Understanding SNMP Versions

Before diving into configuration, it's essential to understand the three major versions of SNMP and their differences.

### SNMP Version 1 (SNMPv1)

SNMPv1 is the original version of the protocol, introduced in 1988. While still supported for backward compatibility, it has significant limitations:

- **Security**: Uses plain-text community strings for authentication (no encryption)
- **Data Types**: Limited 32-bit counter support
- **Error Handling**: Basic error reporting capabilities
- **Use Case**: Legacy systems that don't support newer versions

### SNMP Version 2c (SNMPv2c)

SNMPv2c improved upon v1 with better performance and additional features:

- **Security**: Still uses community strings (no encryption), hence the "c" designation
- **Data Types**: Added 64-bit counters for high-bandwidth interfaces
- **Bulk Operations**: GetBulk operation for efficient data retrieval
- **Error Handling**: Enhanced error handling with detailed error codes
- **Use Case**: Most common version in production environments balancing compatibility and features

### SNMP Version 3 (SNMPv3)

SNMPv3 addresses the security shortcomings of previous versions:

- **Authentication**: User-based security model (USM) with MD5 or SHA authentication
- **Encryption**: Privacy through DES or AES encryption
- **Access Control**: View-based access control model (VACM)
- **Use Case**: Security-sensitive environments and modern deployments

## Installing SNMP Packages on Ubuntu

Ubuntu requires two main packages for SNMP functionality: `snmpd` (the SNMP daemon/agent) and `snmp` (the SNMP utilities).

```bash
# Update package index
sudo apt update

# Install SNMP daemon (agent) and utilities
sudo apt install snmpd snmp -y

# Install SNMP MIBs (Management Information Base files)
sudo apt install snmp-mibs-downloader -y
```

After installation, verify the packages:

```bash
# Check snmpd version
snmpd -v

# Check snmp utilities version
snmpget --version

# Verify snmpd service status
sudo systemctl status snmpd
```

## Configuring the SNMP Agent (snmpd.conf)

The main configuration file for the SNMP agent is `/etc/snmp/snmpd.conf`. Before making changes, back up the original:

```bash
# Backup original configuration
sudo cp /etc/snmp/snmpd.conf /etc/snmp/snmpd.conf.backup
```

### Basic SNMPv2c Configuration

Here's a well-commented basic configuration for SNMPv2c:

```bash
# /etc/snmp/snmpd.conf - SNMP Agent Configuration
# ================================================

# -----------------------------------------------------
# AGENT BEHAVIOR
# -----------------------------------------------------

# Listen on all interfaces (use specific IP for security)
# Format: agentAddress [transport:]address[:port]
# Default port is 161 for SNMP queries
agentAddress udp:0.0.0.0:161
agentAddress udp6:[::]:161

# For localhost only access (more secure):
# agentAddress udp:127.0.0.1:161

# -----------------------------------------------------
# SYSTEM INFORMATION
# -----------------------------------------------------

# System contact information (who to contact about this device)
sysContact admin@example.com

# System location (physical location of the device)
sysLocation "Data Center Rack 5, Unit 12"

# System name (hostname of the device)
sysName ubuntu-server-01

# System description (automatically populated, but can be overridden)
# sysDescr "Ubuntu 24.04 LTS Production Server"

# System services (layer model value, 72 = application layer)
sysServices 72

# -----------------------------------------------------
# SNMPv1/v2c COMMUNITY STRINGS
# -----------------------------------------------------

# Read-only community string
# Format: rocommunity COMMUNITY [SOURCE [OID | -V VIEW]]
# SOURCE can be: default, IP/MASK, or hostname
rocommunity public localhost
rocommunity monitoring_ro 192.168.1.0/24

# Read-write community string (use with caution!)
# Format: rwcommunity COMMUNITY [SOURCE [OID | -V VIEW]]
rwcommunity private localhost
# rwcommunity monitoring_rw 192.168.1.100

# -----------------------------------------------------
# ACCESS CONTROL
# -----------------------------------------------------

# Define views to restrict what OIDs are accessible
# Format: view VIEWNAME included/excluded SUBTREE [MASK]

# Full system view
view systemview included .1.3.6.1.2.1.1

# Interface statistics view
view systemview included .1.3.6.1.2.1.2

# Host resources view (CPU, memory, disk)
view systemview included .1.3.6.1.2.1.25

# Network statistics
view systemview included .1.3.6.1.2.1.31

# IP statistics
view systemview included .1.3.6.1.2.1.4

# TCP statistics
view systemview included .1.3.6.1.2.1.6

# UDP statistics
view systemview included .1.3.6.1.2.1.7

# -----------------------------------------------------
# DISK MONITORING
# -----------------------------------------------------

# Monitor disk usage
# Format: disk PATH [MINSPACE | MINPERCENT%]
disk / 10%
disk /home 10%
disk /var 10%

# Include all mounted filesystems
includeAllDisks 10%

# -----------------------------------------------------
# LOAD AVERAGE MONITORING
# -----------------------------------------------------

# Set load average thresholds (1min, 5min, 15min)
# Format: load MAX1 [MAX5 [MAX15]]
load 12 10 5

# -----------------------------------------------------
# PROCESS MONITORING
# -----------------------------------------------------

# Monitor specific processes
# Format: proc NAME [MAX [MIN]]
proc sshd
proc nginx 1 1
proc mysql 1 1
proc cron

# -----------------------------------------------------
# EXTEND SNMP WITH CUSTOM SCRIPTS
# -----------------------------------------------------

# Execute custom scripts and expose output via SNMP
# Format: extend NAME PROG [ARGS]
# extend custom_metric /usr/local/bin/custom_script.sh

# -----------------------------------------------------
# LOGGING
# -----------------------------------------------------

# Log connections (useful for debugging)
# dontLogTCPWrappersConnects yes
```

### Applying the Configuration

After modifying the configuration, restart the SNMP daemon:

```bash
# Restart snmpd service
sudo systemctl restart snmpd

# Enable snmpd to start on boot
sudo systemctl enable snmpd

# Check service status
sudo systemctl status snmpd

# View logs for troubleshooting
sudo journalctl -u snmpd -f
```

## Community Strings and Security

Community strings act as passwords for SNMP access. Proper security practices are essential.

### Best Practices for Community Strings

```bash
# /etc/snmp/snmpd.conf - Security-focused configuration
# =====================================================

# NEVER use default community strings like "public" or "private" in production!
# Use strong, unique community strings

# Read-only access for monitoring systems
# Restrict to specific monitoring server IPs
rocommunity Xk9#mP2$vL8nQ4 192.168.1.50
rocommunity Xk9#mP2$vL8nQ4 192.168.1.51

# Read-write access (avoid if possible, use SNMPv3 instead)
# Highly restricted to single management host
rwcommunity Yw7@nR5^tK3jM9 192.168.1.10

# Restrict community access to specific OID subtrees
# Only allow monitoring of system and interface info
rocommunity monitor_only 10.0.0.0/8 -V systemonly
view systemonly included .1.3.6.1.2.1.1
view systemonly included .1.3.6.1.2.1.2
```

### Securing Community Strings in Environment

```bash
# Set restrictive permissions on snmpd.conf
sudo chmod 600 /etc/snmp/snmpd.conf
sudo chown root:root /etc/snmp/snmpd.conf

# Verify permissions
ls -la /etc/snmp/snmpd.conf
```

## SNMPv3 Users and Authentication

SNMPv3 provides robust security through user-based authentication and encryption.

### Creating SNMPv3 Users

First, stop the SNMP daemon before creating users:

```bash
# Stop snmpd service
sudo systemctl stop snmpd
```

Create users using `net-snmp-create-v3-user`:

```bash
# Create a read-only user with authentication and encryption
# Format: net-snmp-create-v3-user [-ro] [-A authpass] [-X privpass] [-a MD5|SHA] [-x DES|AES] username
sudo net-snmp-create-v3-user -ro -A "AuthPassword123!" -X "PrivPassword456!" -a SHA -x AES monitoruser

# Create a read-write user (use sparingly)
sudo net-snmp-create-v3-user -A "RWAuthPass789!" -X "RWPrivPass012!" -a SHA -x AES adminuser
```

Alternatively, manually configure SNMPv3 in snmpd.conf:

```bash
# /etc/snmp/snmpd.conf - SNMPv3 Configuration
# ============================================

# -----------------------------------------------------
# SNMPv3 USER DEFINITIONS
# -----------------------------------------------------

# Create SNMPv3 user with authentication and privacy
# This is typically done via net-snmp-create-v3-user which adds
# entries to /var/lib/snmp/snmpd.conf

# -----------------------------------------------------
# SNMPv3 ACCESS CONTROL (VACM)
# -----------------------------------------------------

# Define security groups
# Format: group GROUPNAME SECURITYMODEL SECURITYNAME

# Group for read-only monitoring users
group MonitorGroup usm monitoruser
group MonitorGroup usm backupmonitor

# Group for administrative users
group AdminGroup usm adminuser

# -----------------------------------------------------
# VIEW DEFINITIONS
# -----------------------------------------------------

# Read-only view for monitoring
view MonitorView included .1.3.6.1.2.1.1       # System
view MonitorView included .1.3.6.1.2.1.2       # Interfaces
view MonitorView included .1.3.6.1.2.1.4       # IP
view MonitorView included .1.3.6.1.2.1.25      # Host Resources
view MonitorView included .1.3.6.1.4.1.2021    # UCD-SNMP-MIB

# Administrative view (full access)
view AdminView included .1

# -----------------------------------------------------
# ACCESS DEFINITIONS
# -----------------------------------------------------

# Format: access GROUPNAME CONTEXT SECURITYMODEL SECURITYLEVEL CONTEXTMATCH READVIEW WRITEVIEW NOTIFYVIEW

# Monitor group: read-only access with authentication and encryption
access MonitorGroup "" usm priv exact MonitorView none none

# Admin group: read-write access with authentication and encryption
access AdminGroup "" usm priv exact AdminView AdminView AdminView

# -----------------------------------------------------
# SECURITY LEVELS EXPLAINED
# -----------------------------------------------------
# noauth    - No authentication, no privacy (NOT RECOMMENDED)
# auth      - Authentication only (MD5/SHA)
# priv      - Authentication and privacy/encryption (RECOMMENDED)
```

Start the SNMP daemon after configuration:

```bash
# Start snmpd service
sudo systemctl start snmpd

# Test SNMPv3 connection
snmpget -v3 -u monitoruser -l authPriv -a SHA -A "AuthPassword123!" -x AES -X "PrivPassword456!" localhost sysUpTime.0
```

### SNMPv3 Security Levels

| Level | Authentication | Encryption | Use Case |
|-------|---------------|------------|----------|
| noAuthNoPriv | No | No | Testing only (never in production) |
| authNoPriv | Yes (MD5/SHA) | No | Internal networks with moderate security |
| authPriv | Yes (MD5/SHA) | Yes (DES/AES) | Production environments (recommended) |

## Extending SNMP with Custom Scripts

SNMP can be extended to expose custom metrics from your applications or system.

### Creating Custom Monitoring Scripts

Create a directory for custom scripts:

```bash
# Create scripts directory
sudo mkdir -p /usr/local/bin/snmp-scripts
```

Example script for monitoring application connections:

```bash
#!/bin/bash
# /usr/local/bin/snmp-scripts/app_connections.sh
# Returns the number of active connections to a web application

# Count established connections to port 443
CONNECTIONS=$(ss -tn state established '( dport = :443 or sport = :443 )' | wc -l)

# Output just the number (SNMP extend expects simple output)
echo "$CONNECTIONS"

exit 0
```

Example script for monitoring disk I/O:

```bash
#!/bin/bash
# /usr/local/bin/snmp-scripts/disk_io.sh
# Returns disk read/write statistics

DEVICE=${1:-sda}

# Get read and write bytes from /sys
if [ -f "/sys/block/$DEVICE/stat" ]; then
    STATS=$(cat /sys/block/$DEVICE/stat)
    READS=$(echo $STATS | awk '{print $1}')
    WRITES=$(echo $STATS | awk '{print $5}')
    echo "reads:$READS"
    echo "writes:$WRITES"
else
    echo "ERROR: Device $DEVICE not found"
    exit 1
fi

exit 0
```

Example script for monitoring memory usage:

```bash
#!/bin/bash
# /usr/local/bin/snmp-scripts/memory_percent.sh
# Returns memory usage as a percentage

# Get memory info
TOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
AVAILABLE=$(grep MemAvailable /proc/meminfo | awk '{print $2}')

# Calculate percentage used
USED=$((TOTAL - AVAILABLE))
PERCENT=$((USED * 100 / TOTAL))

echo "$PERCENT"

exit 0
```

Make scripts executable:

```bash
# Set permissions
sudo chmod +x /usr/local/bin/snmp-scripts/*.sh
```

### Configuring SNMP to Use Custom Scripts

Add extend directives to snmpd.conf:

```bash
# /etc/snmp/snmpd.conf - Custom Extensions
# ========================================

# -----------------------------------------------------
# EXTEND DIRECTIVES
# -----------------------------------------------------

# Format: extend NAME PROG [ARGS]
# Output accessible via NET-SNMP-EXTEND-MIB

# Application connection monitoring
extend app_connections /usr/local/bin/snmp-scripts/app_connections.sh

# Disk I/O statistics
extend disk_io /usr/local/bin/snmp-scripts/disk_io.sh sda

# Memory usage percentage
extend memory_percent /usr/local/bin/snmp-scripts/memory_percent.sh

# -----------------------------------------------------
# PASS-THROUGH EXTENSIONS (Advanced)
# -----------------------------------------------------

# For more control, use pass or pass_persist
# Format: pass OID PROG
# pass .1.3.6.1.4.1.99999.1 /usr/local/bin/snmp-scripts/custom_oid.sh

# Persistent scripts (stay running for better performance)
# Format: pass_persist OID PROG
# pass_persist .1.3.6.1.4.1.99999.2 /usr/local/bin/snmp-scripts/persistent_handler.py

# -----------------------------------------------------
# EXEC DIRECTIVES (Legacy method)
# -----------------------------------------------------

# Execute commands and expose via UCD-SNMP-MIB
# Format: exec NAME PROG [ARGS]
exec uptime /usr/bin/uptime
exec df_root /bin/df -h /
```

Restart snmpd and test extensions:

```bash
# Restart snmpd
sudo systemctl restart snmpd

# Query extended OIDs
snmpwalk -v2c -c public localhost NET-SNMP-EXTEND-MIB::nsExtendObjects

# Query specific extension result
snmpget -v2c -c public localhost NET-SNMP-EXTEND-MIB::nsExtendOutputFull.\"memory_percent\"
```

## Using snmpwalk and snmpget

The `snmp` package provides essential command-line tools for querying SNMP agents.

### snmpget - Retrieve Specific OIDs

```bash
# Basic snmpget usage
# Format: snmpget [OPTIONS] AGENT OID [OID]...

# SNMPv2c examples
snmpget -v2c -c public localhost sysDescr.0
snmpget -v2c -c public localhost sysUpTime.0
snmpget -v2c -c public localhost sysContact.0 sysLocation.0

# SNMPv3 examples
snmpget -v3 -u monitoruser -l authPriv -a SHA -A "AuthPassword123!" -x AES -X "PrivPassword456!" localhost sysDescr.0

# Get interface information
snmpget -v2c -c public localhost ifDescr.1 ifOperStatus.1

# Get host resources (CPU, memory)
snmpget -v2c -c public localhost hrSystemUptime.0
snmpget -v2c -c public localhost hrMemorySize.0

# Using numeric OIDs
snmpget -v2c -c public localhost .1.3.6.1.2.1.1.1.0
snmpget -v2c -c public localhost .1.3.6.1.2.1.1.3.0
```

### snmpwalk - Walk Through OID Trees

```bash
# Basic snmpwalk usage
# Format: snmpwalk [OPTIONS] AGENT [OID]

# Walk entire MIB (can be very large output!)
snmpwalk -v2c -c public localhost

# Walk system information subtree
snmpwalk -v2c -c public localhost system
snmpwalk -v2c -c public localhost .1.3.6.1.2.1.1

# Walk interface information
snmpwalk -v2c -c public localhost interfaces
snmpwalk -v2c -c public localhost ifTable

# Walk host resources
snmpwalk -v2c -c public localhost hrStorage
snmpwalk -v2c -c public localhost hrProcessorLoad
snmpwalk -v2c -c public localhost hrSWRunName

# Walk disk information
snmpwalk -v2c -c public localhost dskTable
snmpwalk -v2c -c public localhost .1.3.6.1.4.1.2021.9

# Walk load averages
snmpwalk -v2c -c public localhost laTable
snmpwalk -v2c -c public localhost .1.3.6.1.4.1.2021.10

# Walk memory statistics
snmpwalk -v2c -c public localhost memory
snmpwalk -v2c -c public localhost .1.3.6.1.4.1.2021.4

# SNMPv3 walk example
snmpwalk -v3 -u monitoruser -l authPriv -a SHA -A "AuthPassword123!" -x AES -X "PrivPassword456!" localhost system
```

### snmpbulkwalk - Efficient Bulk Retrieval (SNMPv2c/v3)

```bash
# snmpbulkwalk uses GetBulk for faster retrieval
# Format: snmpbulkwalk [OPTIONS] AGENT [OID]

# Bulk walk interfaces (faster than snmpwalk)
snmpbulkwalk -v2c -c public localhost ifTable

# Specify number of non-repeaters and max-repetitions
snmpbulkwalk -v2c -c public -Cn0 -Cr50 localhost ifTable
```

### Useful snmpget/snmpwalk Options

```bash
# Common options explained

# Output formatting
-Of    # Print full OID path
-On    # Print OIDs numerically
-Oe    # Print enums numerically
-Ov    # Print values only (no OID)
-Oq    # Quick print (less formatting)
-Os    # Print only last element of OID

# Examples with formatting
snmpwalk -v2c -c public -Of localhost system     # Full OID path
snmpwalk -v2c -c public -On localhost system     # Numeric OIDs
snmpwalk -v2c -c public -Oq localhost system     # Quick format

# Timeout and retries
-t TIMEOUT    # Timeout in seconds (default: 1)
-r RETRIES    # Number of retries (default: 5)

# Example with custom timeout
snmpwalk -v2c -c public -t 5 -r 3 localhost system

# Debug output
-d     # Dump packets
-D     # Debug specific tokens

# Example debug output
snmpget -v2c -c public -d localhost sysDescr.0
```

## MIBs and OIDs

Management Information Bases (MIBs) define the structure and meaning of SNMP data.

### Understanding OID Structure

```
OID: .1.3.6.1.2.1.1.1.0
     |  | | | | | | | |
     |  | | | | | | | +-- Instance (0 for scalar values)
     |  | | | | | | +---- sysDescr (1)
     |  | | | | | +------ system (1)
     |  | | | | +-------- mib-2 (1)
     |  | | | +---------- mgmt (2)
     |  | | +------------ internet (1)
     |  | +-------------- dod (6)
     |  +---------------- org (3)
     +------------------- iso (1)

Common OID Prefixes:
.1.3.6.1.2.1         - Standard MIB-2 objects (system, interfaces, IP, etc.)
.1.3.6.1.4.1         - Enterprise-specific MIBs (vendor-specific)
.1.3.6.1.4.1.2021    - UCD-SNMP-MIB (Net-SNMP specific extensions)
```

### Common MIB Objects Reference

| OID | Name | Description |
|-----|------|-------------|
| .1.3.6.1.2.1.1.1.0 | sysDescr | System description |
| .1.3.6.1.2.1.1.3.0 | sysUpTime | System uptime in timeticks |
| .1.3.6.1.2.1.1.4.0 | sysContact | Contact person |
| .1.3.6.1.2.1.1.5.0 | sysName | System hostname |
| .1.3.6.1.2.1.1.6.0 | sysLocation | Physical location |
| .1.3.6.1.2.1.2.1.0 | ifNumber | Number of interfaces |
| .1.3.6.1.2.1.25.1.1.0 | hrSystemUptime | Host uptime |
| .1.3.6.1.2.1.25.2.2.0 | hrMemorySize | Total memory |
| .1.3.6.1.4.1.2021.4.5.0 | memTotalReal | Total real memory |
| .1.3.6.1.4.1.2021.4.6.0 | memAvailReal | Available memory |
| .1.3.6.1.4.1.2021.4.11.0 | memTotalFree | Total free memory |
| .1.3.6.1.4.1.2021.10.1.3.1 | laLoad.1 | 1-minute load average |
| .1.3.6.1.4.1.2021.10.1.3.2 | laLoad.2 | 5-minute load average |
| .1.3.6.1.4.1.2021.10.1.3.3 | laLoad.3 | 15-minute load average |

### Enabling MIB Resolution

By default, Ubuntu disables MIB loading. Enable it:

```bash
# Edit snmp.conf to enable MIBs
sudo nano /etc/snmp/snmp.conf

# Comment out or remove this line:
# mibs :

# Replace with (to load all MIBs):
mibs +ALL

# Or load specific MIBs:
# mibs +SNMPv2-MIB:IF-MIB:HOST-RESOURCES-MIB:UCD-SNMP-MIB
```

Download and install additional MIBs:

```bash
# Download standard MIBs
sudo download-mibs

# MIBs are stored in:
# /usr/share/snmp/mibs/            - System MIBs
# ~/.snmp/mibs/                    - User MIBs

# Verify MIB loading
snmptranslate -IR sysDescr
# Should output: SNMPv2-MIB::sysDescr

# Translate OID to name
snmptranslate .1.3.6.1.2.1.1.1
# Output: SNMPv2-MIB::sysDescr

# Translate name to OID
snmptranslate -On SNMPv2-MIB::sysDescr
# Output: .1.3.6.1.2.1.1.1
```

### Custom MIB Installation

```bash
# Place custom MIBs in user directory
mkdir -p ~/.snmp/mibs
cp MY-CUSTOM-MIB.txt ~/.snmp/mibs/

# Or system-wide
sudo cp MY-CUSTOM-MIB.txt /usr/share/snmp/mibs/

# Update snmp.conf to load custom MIB
echo "mibs +MY-CUSTOM-MIB" >> ~/.snmp/snmp.conf
```

## SNMP Traps Configuration

SNMP traps are asynchronous notifications sent from agents to managers when significant events occur.

### Configuring Trap Destinations

```bash
# /etc/snmp/snmpd.conf - Trap Configuration
# =========================================

# -----------------------------------------------------
# TRAP DESTINATIONS
# -----------------------------------------------------

# SNMPv2c trap destination
# Format: trap2sink HOST [COMMUNITY [PORT]]
trap2sink 192.168.1.100 monitoring_traps
trap2sink monitoring-server.example.com public

# SNMPv1 trap destination (legacy)
# Format: trapsink HOST [COMMUNITY [PORT]]
trapsink 192.168.1.101 public

# Inform requests (acknowledged traps)
# Format: informsink HOST [COMMUNITY [PORT]]
informsink 192.168.1.100 monitoring_traps

# -----------------------------------------------------
# SNMPv3 TRAP CONFIGURATION
# -----------------------------------------------------

# Create trap user (must match receiver configuration)
# This is typically done via net-snmp-create-v3-user
# createUser trapuser SHA "TrapAuthPass123!" AES "TrapPrivPass456!"

# SNMPv3 trap destination
# Format: trapsess [OPTIONS] HOST
trapsess -v3 -u trapuser -l authPriv -a SHA -A "TrapAuthPass123!" -x AES -X "TrapPrivPass456!" 192.168.1.100:162

# -----------------------------------------------------
# TRAP GENERATION SETTINGS
# -----------------------------------------------------

# Send authentication failure traps
authtrapenable 1

# Link up/down traps (enabled by default)
linkUpDownNotifications yes

# Default trap community (for v1/v2c)
trapcommunity monitoring_traps

# -----------------------------------------------------
# AGENT TRAP SOURCE ADDRESS
# -----------------------------------------------------

# Specify which IP to use as source for traps
# trapsess -s 192.168.1.10 ...
```

### Monitor Directives for Automatic Traps

```bash
# /etc/snmp/snmpd.conf - Monitor Configuration
# ============================================

# -----------------------------------------------------
# MONITOR DIRECTIVES
# -----------------------------------------------------

# Generate traps when disk space exceeds threshold
# Format: monitor [OPTIONS] NAME EXPRESSION

# Monitor disk space (trigger if any disk > 90% full)
monitor -r 60 -o dskPath -o dskPercent "diskUsageHigh" dskPercent > 90

# Monitor CPU load
monitor -r 60 -o laNames -o laLoad "highLoad1min" laLoad.1 > 5.0

# Monitor memory usage
monitor -r 60 "lowMemory" memAvailReal < 100000

# Monitor specific process (nginx must be running)
monitor -r 60 "nginxDown" prNames.1 != "nginx"

# -----------------------------------------------------
# DEFAULT MONITORS
# -----------------------------------------------------

# Enable default monitors from DISMAN-EVENT-MIB
# These monitor common system conditions

# Memory monitoring
defaultMonitors yes

# Include disk monitoring
includeAllDisks 10%

# Link monitoring (sends linkUp/linkDown traps)
linkUpDownNotifications yes
```

### Testing Trap Generation

```bash
# Send a test trap manually
snmptrap -v2c -c monitoring_traps 192.168.1.100 '' NET-SNMP-AGENT-MIB::nsNotifyShutdown

# Send custom trap with variable bindings
snmptrap -v2c -c monitoring_traps 192.168.1.100 '' \
    SNMPv2-MIB::coldStart \
    SNMPv2-MIB::sysLocation.0 s "Test Location"

# SNMPv3 trap test
snmptrap -v3 -u trapuser -l authPriv -a SHA -A "TrapAuthPass123!" -x AES -X "TrapPrivPass456!" \
    192.168.1.100:162 '' SNMPv2-MIB::warmStart
```

### Setting Up a Trap Receiver (snmptrapd)

```bash
# Install snmptrapd if not already installed
sudo apt install snmptrapd -y

# Configure trap receiver
sudo nano /etc/snmp/snmptrapd.conf
```

Trap receiver configuration:

```bash
# /etc/snmp/snmptrapd.conf - Trap Receiver Configuration
# =====================================================

# -----------------------------------------------------
# AUTHENTICATION
# -----------------------------------------------------

# SNMPv1/v2c community strings to accept
authCommunity log,execute,net monitoring_traps
authCommunity log public

# SNMPv3 user (must exist in /var/lib/snmp/snmptrapd.conf)
# createUser trapuser SHA "TrapAuthPass123!" AES "TrapPrivPass456!"
# authUser log,execute trapuser

# Disable authorization (accept all traps - NOT RECOMMENDED for production)
# disableAuthorization yes

# -----------------------------------------------------
# TRAP HANDLING
# -----------------------------------------------------

# Log all traps to syslog
logoption s

# Log to file
# logoption f /var/log/snmptrapd.log

# Format for trap output
format2 %V\n% Agent: %A\n Enterprise: %N\n Trap: %W\n Timestamp: %T\n%v\n

# -----------------------------------------------------
# TRAP HANDLERS
# -----------------------------------------------------

# Execute script when specific trap is received
# Format: traphandle OID|default PROGRAM [ARGS]

# Handle all traps with a custom script
traphandle default /usr/local/bin/snmp-scripts/handle_trap.sh

# Handle specific trap types
# traphandle SNMPv2-MIB::coldStart /usr/local/bin/snmp-scripts/handle_coldstart.sh
# traphandle IF-MIB::linkDown /usr/local/bin/snmp-scripts/handle_linkdown.sh

# -----------------------------------------------------
# FORWARDING
# -----------------------------------------------------

# Forward traps to another destination
# forward default 10.0.0.50:162
```

Start and enable snmptrapd:

```bash
# Enable and start snmptrapd
sudo systemctl enable snmptrapd
sudo systemctl start snmptrapd

# View trap logs
sudo tail -f /var/log/syslog | grep snmptrapd
```

## Integration with Monitoring Tools

SNMP is commonly used with various monitoring platforms.

### Prometheus SNMP Exporter

```bash
# Install snmp_exporter for Prometheus
wget https://github.com/prometheus/snmp_exporter/releases/latest/download/snmp_exporter-*linux-amd64.tar.gz
tar xzf snmp_exporter-*.tar.gz
sudo mv snmp_exporter-*/snmp_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/snmp_exporter.service > /dev/null <<EOF
[Unit]
Description=Prometheus SNMP Exporter
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/snmp_exporter --config.file=/etc/snmp_exporter/snmp.yml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable snmp_exporter
sudo systemctl start snmp_exporter
```

Prometheus configuration for SNMP:

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'snmp'
    static_configs:
      - targets:
        - 192.168.1.10  # Target device to query
        - 192.168.1.11
    metrics_path: /snmp
    params:
      module: [if_mib]  # Module from snmp.yml
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: localhost:9116  # SNMP exporter address
```

### Nagios/Icinga SNMP Checks

```bash
# Install Nagios SNMP plugins
sudo apt install nagios-snmp-plugins -y

# Example check commands
# Check disk usage via SNMP
/usr/lib/nagios/plugins/check_snmp_storage.pl -H 192.168.1.10 -C public -m "/" -w 80 -c 90

# Check CPU load via SNMP
/usr/lib/nagios/plugins/check_snmp_load.pl -H 192.168.1.10 -C public -w 3,2,1 -c 5,4,3

# Check interface status
/usr/lib/nagios/plugins/check_snmp_int.pl -H 192.168.1.10 -C public -n eth0
```

### Zabbix SNMP Monitoring

Zabbix template configuration (conceptual):

```xml
<!-- SNMP interface configuration in Zabbix -->
<interfaces>
    <interface>
        <type>SNMP</type>
        <port>161</port>
        <details>
            <version>2</version>
            <community>monitoring_ro</community>
        </details>
    </interface>
</interfaces>

<!-- SNMPv3 configuration -->
<interfaces>
    <interface>
        <type>SNMP</type>
        <port>161</port>
        <details>
            <version>3</version>
            <securityname>monitoruser</securityname>
            <securitylevel>authPriv</securitylevel>
            <authprotocol>SHA</authprotocol>
            <authpassphrase>AuthPassword123!</authpassphrase>
            <privprotocol>AES</privprotocol>
            <privpassphrase>PrivPassword456!</privpassphrase>
        </details>
    </interface>
</interfaces>
```

## Firewall Configuration

Proper firewall configuration is essential for SNMP security.

### UFW (Uncomplicated Firewall)

```bash
# Allow SNMP queries (port 161/UDP) from specific hosts
sudo ufw allow from 192.168.1.100 to any port 161 proto udp comment "SNMP from monitoring server"
sudo ufw allow from 192.168.1.0/24 to any port 161 proto udp comment "SNMP from monitoring network"

# Allow SNMP traps (port 162/UDP) if running trap receiver
sudo ufw allow from any to any port 162 proto udp comment "SNMP traps"

# Check UFW status
sudo ufw status verbose

# Reload UFW
sudo ufw reload
```

### iptables

```bash
# Allow SNMP from specific monitoring server
sudo iptables -A INPUT -p udp -s 192.168.1.100 --dport 161 -j ACCEPT -m comment --comment "SNMP from monitoring"

# Allow SNMP from monitoring subnet
sudo iptables -A INPUT -p udp -s 192.168.1.0/24 --dport 161 -j ACCEPT -m comment --comment "SNMP from monitoring network"

# Block SNMP from all other sources
sudo iptables -A INPUT -p udp --dport 161 -j DROP -m comment --comment "Block unauthorized SNMP"

# Allow trap receiving
sudo iptables -A INPUT -p udp --dport 162 -j ACCEPT -m comment --comment "SNMP traps"

# Save iptables rules
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### nftables (Modern Alternative)

```bash
# /etc/nftables.conf - SNMP rules
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow established connections
        ct state established,related accept

        # Allow SNMP from monitoring network
        ip saddr 192.168.1.0/24 udp dport 161 accept comment "SNMP queries"

        # Allow SNMP traps
        udp dport 162 accept comment "SNMP traps"

        # Drop other SNMP attempts
        udp dport 161 drop comment "Block unauthorized SNMP"
    }
}
```

Apply nftables rules:

```bash
# Load nftables configuration
sudo nft -f /etc/nftables.conf

# Enable nftables service
sudo systemctl enable nftables
sudo systemctl start nftables
```

## Complete Working Configuration Example

Here's a comprehensive, production-ready configuration:

```bash
# /etc/snmp/snmpd.conf - Complete Production Configuration
# =========================================================
#
# This configuration provides:
# - SNMPv2c access for legacy systems (restricted)
# - SNMPv3 access for secure monitoring (recommended)
# - System monitoring (CPU, memory, disk, processes)
# - Custom script extensions
# - Trap generation for alerting
#
# Author: System Administrator
# Last Modified: 2026-01-15
# =========================================================

# -----------------------------------------------------
# SECTION 1: AGENT NETWORK SETTINGS
# -----------------------------------------------------

# Listen on all IPv4 interfaces for SNMP queries
# For security, consider binding to specific interface
agentAddress udp:0.0.0.0:161

# Optionally listen on IPv6
# agentAddress udp6:[::]:161

# -----------------------------------------------------
# SECTION 2: SYSTEM INFORMATION
# -----------------------------------------------------

# Administrative contact
sysContact ops-team@example.com

# Physical location of server
sysLocation "Production DC1, Rack A5, Unit 10"

# System hostname
sysName prod-web-01.example.com

# OSI layer services (72 = application layer)
sysServices 72

# -----------------------------------------------------
# SECTION 3: SNMPv2c ACCESS (Legacy/Transitional)
# -----------------------------------------------------

# Read-only community - restricted to monitoring servers only
# IMPORTANT: Change 'SecureR0Community!' to a strong unique string
rocommunity SecureR0Community! 10.0.1.50
rocommunity SecureR0Community! 10.0.1.51

# Read-only community with view restriction
rocommunity LimitedMonitor! 10.0.1.0/24 -V restrictedView

# CAUTION: Read-write community - use only if absolutely necessary
# rwcommunity SecureRWC0mmunity! 10.0.1.10

# -----------------------------------------------------
# SECTION 4: SNMPv3 ACCESS (Recommended)
# -----------------------------------------------------

# SNMPv3 users are created with net-snmp-create-v3-user
# and stored in /var/lib/snmp/snmpd.conf

# Security groups
group monitorGroup usm monitoruser
group adminGroup usm adminuser

# Access control (group, context, model, level, match, read, write, notify)
access monitorGroup "" usm priv exact monitorView none none
access adminGroup "" usm priv exact allView allView allView

# -----------------------------------------------------
# SECTION 5: VIEW DEFINITIONS
# -----------------------------------------------------

# Restricted view for limited monitoring
view restrictedView included .1.3.6.1.2.1.1          # system
view restrictedView included .1.3.6.1.2.1.2          # interfaces
view restrictedView included .1.3.6.1.2.1.25.1       # hrSystem

# Standard monitoring view
view monitorView included .1.3.6.1.2.1.1             # system
view monitorView included .1.3.6.1.2.1.2             # interfaces
view monitorView included .1.3.6.1.2.1.4             # ip
view monitorView included .1.3.6.1.2.1.6             # tcp
view monitorView included .1.3.6.1.2.1.7             # udp
view monitorView included .1.3.6.1.2.1.25            # host
view monitorView included .1.3.6.1.2.1.31            # ifMIB
view monitorView included .1.3.6.1.4.1.2021          # ucdavis

# Full view for administrative access
view allView included .1

# -----------------------------------------------------
# SECTION 6: DISK MONITORING
# -----------------------------------------------------

# Monitor specific mount points
disk / 10%
disk /home 10%
disk /var 15%
disk /var/log 20%

# Include all mounted filesystems with 10% threshold
includeAllDisks 10%

# -----------------------------------------------------
# SECTION 7: CPU/LOAD MONITORING
# -----------------------------------------------------

# Load average thresholds (1min, 5min, 15min)
# Adjust based on CPU count (values shown for 4-core system)
load 12 10 8

# -----------------------------------------------------
# SECTION 8: PROCESS MONITORING
# -----------------------------------------------------

# Critical processes - alert if not running
proc sshd 1 1
proc cron 1 1
proc rsyslogd 1 1

# Application processes (adjust max/min as needed)
proc nginx 10 1
proc php-fpm 50 5
proc mysqld 1 1

# -----------------------------------------------------
# SECTION 9: CUSTOM EXTENSIONS
# -----------------------------------------------------

# Custom monitoring scripts
extend connections /usr/local/bin/snmp-scripts/app_connections.sh
extend memPercent /usr/local/bin/snmp-scripts/memory_percent.sh
extend diskIO /usr/local/bin/snmp-scripts/disk_io.sh

# Pass-through for custom OIDs (optional)
# pass .1.3.6.1.4.1.99999 /usr/local/bin/snmp-scripts/custom_handler.sh

# -----------------------------------------------------
# SECTION 10: TRAP CONFIGURATION
# -----------------------------------------------------

# Default trap community
trapcommunity monitorTraps123!

# SNMPv2c trap destinations
trap2sink 10.0.1.50 monitorTraps123!
informsink 10.0.1.51 monitorTraps123!

# SNMPv3 trap destination (more secure)
# trapsess -v3 -u trapuser -l authPriv -a SHA -A "AuthPass" -x AES -X "PrivPass" 10.0.1.50:162

# Enable authentication failure traps
authtrapenable 1

# Enable link up/down notifications
linkUpDownNotifications yes

# -----------------------------------------------------
# SECTION 11: MONITORING THRESHOLDS FOR TRAPS
# -----------------------------------------------------

# Monitor disk usage - alert if any disk > 85%
monitor -r 300 -o dskPath -o dskPercent "diskHigh" dskPercent > 85

# Monitor load average - alert if 1min load > 8
monitor -r 60 -o laNames -o laLoad "loadHigh" laLoad.1 > 8

# Monitor available memory - alert if < 500MB free
monitor -r 60 "memoryLow" memAvailReal < 500000

# -----------------------------------------------------
# SECTION 12: LOGGING AND DEBUGGING
# -----------------------------------------------------

# Don't log TCP wrapper connections (reduces noise)
dontLogTCPWrappersConnects yes

# Log level (0-7, higher = more verbose)
# Uncomment for debugging
# logLevel 6
```

## Troubleshooting Common Issues

### SNMP Agent Not Responding

```bash
# Check if snmpd is running
sudo systemctl status snmpd

# Check if snmpd is listening on port 161
sudo ss -ulnp | grep 161

# Test local connection
snmpget -v2c -c public localhost sysDescr.0

# Check for configuration errors
sudo snmpd -f -Le -C -c /etc/snmp/snmpd.conf

# View detailed logs
sudo journalctl -u snmpd -n 50 --no-pager
```

### Permission Denied Errors

```bash
# Check file permissions
ls -la /etc/snmp/snmpd.conf
ls -la /var/lib/snmp/

# Fix ownership
sudo chown root:root /etc/snmp/snmpd.conf
sudo chmod 600 /etc/snmp/snmpd.conf
```

### Community String Issues

```bash
# Verify community string is correct
grep -i "community" /etc/snmp/snmpd.conf

# Test with explicit community
snmpget -v2c -c YOUR_COMMUNITY localhost sysDescr.0
```

### SNMPv3 Authentication Failures

```bash
# Check user exists
grep -i "createUser\|usmUser" /var/lib/snmp/snmpd.conf

# Test SNMPv3 with debug output
snmpget -v3 -u monitoruser -l authPriv -a SHA -A "AuthPass" -x AES -X "PrivPass" -d localhost sysDescr.0

# Recreate user if necessary
sudo systemctl stop snmpd
sudo net-snmp-create-v3-user -ro -A "NewAuthPass" -X "NewPrivPass" -a SHA -x AES newuser
sudo systemctl start snmpd
```

## Security Best Practices Summary

1. **Use SNMPv3 whenever possible** - Provides authentication and encryption
2. **Avoid default community strings** - Never use "public" or "private" in production
3. **Restrict access by IP** - Limit SNMP access to known monitoring servers
4. **Use firewalls** - Block port 161 from unauthorized sources
5. **Implement view-based access** - Only expose necessary OIDs
6. **Secure configuration files** - Set restrictive permissions (600) on snmpd.conf
7. **Monitor SNMP access** - Enable logging and review for unauthorized attempts
8. **Regular credential rotation** - Change community strings and SNMPv3 passwords periodically
9. **Disable unused versions** - If using SNMPv3, consider disabling v1/v2c entirely
10. **Keep software updated** - Apply security patches promptly

## Monitoring with OneUptime

While configuring SNMP manually provides granular control over your network monitoring, managing SNMP across a large infrastructure can become complex. [OneUptime](https://oneuptime.com) offers a comprehensive monitoring platform that simplifies SNMP-based monitoring alongside other monitoring capabilities.

With OneUptime, you can:

- **Unified Monitoring Dashboard**: Monitor SNMP metrics alongside HTTP endpoints, server health, and application performance in a single interface
- **Automated Alerting**: Set up intelligent alerts based on SNMP trap data and polled metrics with customizable escalation policies
- **Historical Data Analysis**: Store and analyze SNMP data over time to identify trends and capacity planning needs
- **No Infrastructure Overhead**: Skip the complexity of maintaining your own monitoring stack with OneUptime's cloud-based solution
- **Team Collaboration**: Built-in incident management, on-call scheduling, and status pages keep your entire team informed

Whether you're monitoring a handful of servers or an enterprise-scale infrastructure, OneUptime provides the tools to ensure your systems stay healthy and your team stays informed. Visit [oneuptime.com](https://oneuptime.com) to learn more about how OneUptime can enhance your monitoring strategy.
