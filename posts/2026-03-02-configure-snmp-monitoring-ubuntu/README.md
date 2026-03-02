# How to Configure SNMP Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, SNMP, Networking, Infrastructure

Description: Learn how to configure SNMP monitoring on Ubuntu including setting up snmpd, querying SNMP data, configuring community strings, and integrating with monitoring systems.

---

SNMP (Simple Network Management Protocol) has been the standard protocol for monitoring network devices and servers for decades. While modern exporters and agents have largely replaced SNMP for new deployments, many environments still rely on it for switches, routers, UPS units, and legacy systems that have no other monitoring interface. Understanding SNMP and how to configure it on Ubuntu is a practical skill for anyone managing heterogeneous infrastructure.

## SNMP Basics

SNMP operates on a manager/agent model. The agent runs on the monitored device and responds to queries from the manager. Data is organized in a hierarchical tree called the Management Information Base (MIB). Each data point has a unique Object Identifier (OID).

SNMP versions:
- SNMPv1: Original version, community-string authentication only, avoid
- SNMPv2c: Improved performance and error handling, still uses community strings
- SNMPv3: Adds authentication and encryption, use for production

## Installing SNMP Tools

```bash
# Install SNMP agent and tools
sudo apt update
sudo apt install -y snmpd snmp snmp-mibs-downloader

# Download MIB files (needed for human-readable OID names)
sudo download-mibs

# Enable MIB loading in snmp tools
sudo sed -i 's/mibs :/# mibs :/' /etc/snmp/snmp.conf
# Or add to /etc/snmp/snmp.conf:
echo "mibs +ALL" | sudo tee -a /etc/snmp/snmp.conf
```

## Configuring snmpd

The SNMP agent configuration file is `/etc/snmp/snmpd.conf`:

```bash
# Backup original config
sudo cp /etc/snmp/snmpd.conf /etc/snmp/snmpd.conf.orig

# Create a clean configuration
sudo tee /etc/snmp/snmpd.conf << 'EOF'
# =============================================================================
# SNMP Agent Configuration
# =============================================================================

# Agent contact and location information
sysLocation    Server Room, Rack A3
sysContact     ops-team@example.com
sysName        ubuntu-server-01
sysServices    72

# Listen on all interfaces (restrict in production)
agentAddress  udp:161,udp6:[::1]:161

# =============================================================================
# SNMPv2c Community Strings (use v3 in production)
# =============================================================================
# Read-only community string
rocommunity    public    127.0.0.1
rocommunity    monitoring 192.168.1.0/24

# Read-write community (restrict tightly)
# rwcommunity  private   127.0.0.1

# =============================================================================
# SNMPv3 Users (preferred for production)
# =============================================================================
# createUser <username> <auth-protocol> <auth-password> <priv-protocol> <priv-password>
# These lines must be in /var/lib/snmp/snmpd.conf, not this file
# See below for v3 user creation instructions

# =============================================================================
# Access Control
# =============================================================================
# Allow read access to system subtree
view   systemonly  included   .1.3.6.1.2.1.1
view   systemonly  included   .1.3.6.1.2.1.25.1

# Full access view
view   allview    included   .1

rouser authPrivUser authpriv -V allview

# =============================================================================
# Process Monitoring
# =============================================================================
# Monitor specific processes
proc  apache2 10 1
proc  sshd    5  1
proc  cron    2  1

# =============================================================================
# Disk Monitoring
# =============================================================================
# Monitor disk with minimum free space thresholds
disk /     10%   # Warn if less than 10% free
disk /var  500MB # Warn if less than 500MB free

# =============================================================================
# Load Average Monitoring
# =============================================================================
# Warn if 1min/5min/15min load exceeds these values
load  12 14 14

# =============================================================================
# Extension Scripts
# =============================================================================
# Run a script and expose the output via SNMP
# extend meminfo /bin/cat /proc/meminfo
EOF
```

## Creating SNMPv3 Users

SNMPv3 provides authentication and encryption, which SNMPv2c lacks:

```bash
# Stop snmpd before creating users
sudo systemctl stop snmpd

# Create user with authentication (SHA) and privacy (AES)
# This writes to /var/lib/snmp/snmpd.conf
sudo net-snmp-create-v3-user -ro \
  -A "authpassword123" \
  -a SHA \
  -X "privpassword123" \
  -x AES \
  monitoruser

# Start snmpd
sudo systemctl start snmpd

# Verify the user was created
sudo cat /var/lib/snmp/snmpd.conf | grep createUser
```

## Enabling and Starting snmpd

```bash
# Enable and start the SNMP agent
sudo systemctl enable --now snmpd

# Check status
sudo systemctl status snmpd

# Verify it is listening
ss -unlnp | grep 161

# Check logs
sudo journalctl -u snmpd -n 50
```

## Querying SNMP Data

With the agent running, test queries from the local machine or another host:

```bash
# SNMPv2c - get system information
snmpget -v2c -c public localhost sysDescr.0
snmpget -v2c -c public localhost 1.3.6.1.2.1.1.1.0

# SNMPv2c - walk the system subtree
snmpwalk -v2c -c public localhost system

# SNMPv3 query with authentication and encryption
snmpget -v3 \
  -u monitoruser \
  -l authPriv \
  -a SHA \
  -A "authpassword123" \
  -x AES \
  -X "privpassword123" \
  localhost sysDescr.0

# Walk all interfaces with SNMPv3
snmpwalk -v3 \
  -u monitoruser \
  -l authPriv \
  -a SHA \
  -A "authpassword123" \
  -x AES \
  -X "privpassword123" \
  localhost ifDescr

# Get CPU load
snmpwalk -v2c -c public localhost .1.3.6.1.4.1.2021.10

# Get memory statistics
snmpwalk -v2c -c public localhost .1.3.6.1.4.1.2021.4

# Get disk statistics
snmpwalk -v2c -c public localhost .1.3.6.1.4.1.2021.9
```

## Common SNMP OIDs for System Monitoring

```bash
# System description
OID: .1.3.6.1.2.1.1.1.0  (sysDescr)

# System uptime
OID: .1.3.6.1.2.1.1.3.0  (sysUpTime)

# CPU usage (UCD-SNMP-MIB)
OID: .1.3.6.1.4.1.2021.11.9.0  (ssCpuIdle - subtract from 100 for usage)

# Memory total (in KB)
OID: .1.3.6.1.4.1.2021.4.5.0  (memTotalReal)

# Memory available (in KB)
OID: .1.3.6.1.4.1.2021.4.6.0  (memAvailReal)

# Network interface traffic
# ifHCInOctets - input bytes (high capacity)
OID: .1.3.6.1.2.1.31.1.1.1.6

# ifHCOutOctets - output bytes (high capacity)
OID: .1.3.6.1.2.1.31.1.1.1.10

# Disk usage
OID: .1.3.6.1.4.1.2021.9
```

## SNMP Traps

Traps are notifications sent from the agent to the manager when events occur, rather than waiting to be polled:

```bash
# Configure trap destinations in snmpd.conf
sudo tee -a /etc/snmp/snmpd.conf << 'EOF'

# Send traps to monitoring server
trap2sink 192.168.1.100:162 public
informsink 192.168.1.100:162 public

# Enable link up/down traps
linkUpDownNotifications yes

# Enable authentication failure traps
authtrapenable 1
EOF

sudo systemctl reload snmpd

# Test sending a trap manually
snmptrap -v2c -c public 192.168.1.100 '' \
  1.3.6.1.6.3.1.1.5.1 \
  sysDescr.0 s "Test trap from ubuntu-server-01"

# Listen for traps (useful for testing)
sudo snmptrapd -f -Lo -c /etc/snmp/snmptrapd.conf
```

## Integrating with Monitoring Systems

### Nagios SNMP Checks

```bash
# Check via SNMP from Nagios
/usr/local/nagios/libexec/check_snmp \
  -H 192.168.1.20 \
  -C public \
  -o .1.3.6.1.4.1.2021.11.9.0 \
  -w 90 \
  -c 95 \
  -l "CPU Idle"

# Nagios service definition
# check_command check_snmp!-C public -o .1.3.6.1.4.1.2021.11.9.0 -w 90 -c 95
```

### SNMP Exporter for Prometheus

```bash
# Install snmp_exporter
SNMP_EXP_VERSION="0.24.1"
wget "https://github.com/prometheus/snmp_exporter/releases/download/v${SNMP_EXP_VERSION}/snmp_exporter-${SNMP_EXP_VERSION}.linux-amd64.tar.gz"
tar xzf "snmp_exporter-${SNMP_EXP_VERSION}.linux-amd64.tar.gz"
sudo cp snmp_exporter-*/snmp_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/snmp_exporter.service << 'EOF'
[Unit]
Description=SNMP Exporter for Prometheus
After=network-online.target

[Service]
User=nobody
ExecStart=/usr/local/bin/snmp_exporter \
    --config.file=/etc/snmp_exporter/snmp.yml
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now snmp_exporter

# Add to Prometheus configuration
# scrape_configs:
#   - job_name: 'snmp'
#     static_configs:
#       - targets:
#           - '192.168.1.20'  # SNMP target
#     metrics_path: /snmp
#     params:
#       module: [if_mib]
#     relabel_configs:
#       - source_labels: [__address__]
#         target_label: __param_target
#       - target_label: __address__
#         replacement: localhost:9116
```

## Firewall Configuration

```bash
# Allow SNMP from monitoring server only
sudo ufw allow from 192.168.1.100 to any port 161 proto udp
sudo ufw allow from 192.168.1.100 to any port 162 proto udp

# Deny SNMP from everywhere else
sudo ufw deny 161/udp

# Check rules
sudo ufw status
```

SNMP may feel dated compared to modern monitoring approaches, but it remains the lingua franca for network devices, enterprise hardware, and legacy systems. Configuring it correctly - using SNMPv3 with authentication and encryption, restricting community strings to specific source IPs, and minimizing the exposed OID tree - keeps the protocol useful without introducing unnecessary risk.
