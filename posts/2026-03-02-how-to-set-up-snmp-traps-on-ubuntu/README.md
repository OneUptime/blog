# How to Set Up SNMP Traps on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SNMP, Monitoring, Networking, Alerting

Description: Configure SNMP traps on Ubuntu to receive alerts from network devices and servers, including installing snmptrapd, configuring trap handlers, and testing with snmptrap.

---

SNMP traps are unsolicited notifications sent from a device to a management station when specific events occur - an interface going down, a threshold being crossed, a device rebooting. Unlike polling (where you ask a device for its status), traps are push-based: the device tells you something happened immediately. Setting up a trap receiver on Ubuntu lets you collect these alerts from routers, switches, servers, and other SNMP-enabled devices.

## How SNMP Traps Work

There are two variants you will encounter:

- **SNMPv1/v2c traps** - Unacknowledged notifications. The sender fires and forgets.
- **SNMPv2c/v3 informs** - Like traps, but the receiver sends an acknowledgment. If the receiver does not acknowledge, the sender retries.

SNMPv3 traps add authentication and encryption, which you should use on any network that is not fully trusted.

The default trap port is UDP 162. Your trap receiver (Ubuntu server running `snmptrapd`) listens on this port.

## Installing snmptrapd

```bash
# Install the SNMP tools package
sudo apt update
sudo apt install snmpd snmp snmp-mibs-downloader

# snmptrapd is part of the snmpd package on Ubuntu
# Verify it is installed
which snmptrapd
snmptrapd --version

# Download MIB files for human-readable trap messages
sudo download-mibs
```

## Basic snmptrapd Configuration

The main configuration file is `/etc/snmp/snmptrapd.conf`:

```bash
sudo nano /etc/snmp/snmptrapd.conf
```

For SNMPv1 and v2c with a community string:

```text
# Accept traps from any host with community string "public"
authCommunity log,execute,net public

# Accept traps from a specific network only (more secure)
# authCommunity log,execute,net mysecretcommunity 192.168.1.0/24

# Log traps to syslog
traphandle default /usr/sbin/snmptrapd-default-handler

# Log all traps
doNotLogTraps no

# Use the syslog facility
logOption s
```

The `authCommunity` directives define what to do with traps from community strings:
- `log` - Write to the log
- `execute` - Allow trap handlers to run
- `net` - Forward to other managers

## Starting snmptrapd

```bash
# Start snmptrapd and enable on boot
sudo systemctl enable snmptrapd
sudo systemctl start snmptrapd

# Check that it is running and listening
sudo systemctl status snmptrapd
sudo ss -ulnp | grep 162

# View logs
sudo journalctl -u snmptrapd -f
```

If snmptrapd is not listening, check the service file:

```bash
# View and customize the systemd service
cat /lib/systemd/system/snmptrapd.service

# Edit to add options if needed
sudo systemctl edit snmptrapd
```

Add options to the ExecStart line:

```ini
[Service]
ExecStart=
ExecStart=/usr/sbin/snmptrapd -Lsd -f -p /run/snmptrapd.pid
```

## Testing with snmptrap

Before configuring real devices, test your setup with the `snmptrap` command:

```bash
# Send a test SNMPv2c trap to localhost
sudo snmptrap -v 2c -c public localhost '' \
  .1.3.6.1.6.3.1.1.5.1 \
  .1.3.6.1.2.1.1.3.0 t 0

# Send a trap with custom OID and value
sudo snmptrap -v 2c -c public 127.0.0.1 '' \
  .1.3.6.1.6.3.1.1.5.4 \
  ifIndex i 2 \
  ifDescr s "eth0" \
  ifAdminStatus i 1

# Send SNMPv1 trap
sudo snmptrap -v 1 -c public 127.0.0.1 \
  .1.3.6.1.4.1.99999 \
  "" 6 99 "" \
  .1.3.6.1.4.1.99999.1 s "test trap message"

# Verify in logs
sudo journalctl -u snmptrapd --since "1 minute ago"
```

## Configuring Trap Handlers

Trap handlers are scripts or commands that run when a specific trap is received. This is how you integrate traps with alerting systems:

```bash
sudo nano /etc/snmp/snmptrapd.conf
```

```text
# Accept traps with this community string
authCommunity execute,log public

# Run a script for all traps from a specific OID
# The trap handler receives trap details as environment variables
traphandle .1.3.6.1.6.3.1.1.5.3 /usr/local/bin/handle-link-down.sh

# Run a script for ALL traps (default handler)
traphandle default /usr/local/bin/handle-all-traps.sh
```

Create the trap handler script:

```bash
sudo nano /usr/local/bin/handle-all-traps.sh
```

```bash
#!/bin/bash
# Trap handler for snmptrapd
# snmptrapd passes trap information to stdin
# First line: hostname of sender
# Second line: IP address of sender
# Subsequent lines: OID value pairs

# Read the trap data from stdin
TRAP_HOST=$(head -1)
TRAP_IP=$(sed -n '2p')
TRAP_DATA=$(tail -n +3)

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log to file
echo "[$TIMESTAMP] Trap from: $TRAP_HOST ($TRAP_IP)" >> /var/log/snmp-traps.log
echo "$TRAP_DATA" >> /var/log/snmp-traps.log
echo "---" >> /var/log/snmp-traps.log

# Send email alert (requires mailutils)
# echo "SNMP Trap received from $TRAP_HOST at $TIMESTAMP" | \
#   mail -s "SNMP Alert" admin@example.com

# Send to Slack webhook
# curl -s -X POST -H 'Content-type: application/json' \
#   --data "{\"text\":\"SNMP Trap from $TRAP_HOST: $TRAP_DATA\"}" \
#   "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

```bash
sudo chmod +x /usr/local/bin/handle-all-traps.sh
sudo systemctl restart snmptrapd
```

## SNMPv3 Trap Configuration

For secure trap reception with SNMPv3:

```bash
# Create an SNMPv3 user for receiving traps
# On Ubuntu, use net-snmp-create-v3-user
sudo net-snmp-create-v3-user -ro -a SHA -A "authpassword123" \
  -x AES -X "privpassword456" trapuser

# This adds to /var/lib/snmp/snmptrapd.conf automatically
# Verify the user was created
sudo cat /var/lib/snmp/snmptrapd.conf

# Update snmptrapd.conf to accept v3 traps
sudo nano /etc/snmp/snmptrapd.conf
```

Add for SNMPv3:

```text
# SNMPv3 authentication
createUser trapuser SHA "authpassword123" AES "privpassword456"
authUser log,execute,net trapuser

# Keep v2c support if needed
authCommunity log,execute,net public
```

Test with an SNMPv3 trap:

```bash
# Send a test SNMPv3 inform
sudo snmptrap -v 3 \
  -u trapuser \
  -l authPriv \
  -a SHA \
  -A "authpassword123" \
  -x AES \
  -X "privpassword456" \
  localhost '' \
  .1.3.6.1.6.3.1.1.5.1
```

## Forwarding Traps to Another Manager

You can run snmptrapd as a forwarder that passes traps to another system:

```text
# In snmptrapd.conf
# Forward all traps to a central trap manager
forward default udp:10.0.0.5:162

# Forward specific traps only
forward .1.3.6.1.6.3.1.1.5 udp:10.0.0.5:162

# Forward with modified community string
# (useful for aggregating from multiple community strings to one)
forward default udp:10.0.0.5:162 -c unified-community
```

## Configuring Network Devices to Send Traps

Each network device type has its own configuration syntax. Common examples:

```bash
# Cisco IOS router/switch - configure from device CLI
snmp-server community public RO
snmp-server host 10.0.0.100 version 2c public
snmp-server enable traps

# Linux server using snmpd as a trap sender
sudo nano /etc/snmp/snmpd.conf
```

Add to `/etc/snmp/snmpd.conf` on the device side:

```text
# Send traps to the trap receiver
trap2sink 10.0.0.100 public 162

# Or for SNMPv3
trapsink 10.0.0.100 trapuser
informsink 10.0.0.100

# Send link up/down traps
linkUpDownNotifications yes

# Send process monitoring traps
proc nginx 5 1
```

## Logging Traps to a Database

For production use, log traps to MySQL or PostgreSQL for querying:

```bash
# Install required packages
sudo apt install snmptrapd libsnmp-perl

# Use snmptt (SNMP Trap Translator) for database logging
sudo apt install snmptt

# Configure snmptt to receive from snmptrapd
# In /etc/snmp/snmptrapd.conf:
# traphandle default /usr/sbin/snmptt
```

Configure `/etc/snmptt.ini`:

```ini
[General]
mode = standalone
net_snmp_perl_enable = 1
log_enable = 1
log_file = /var/log/snmptt/snmptt.log
mysql_dbi_enable = 1
mysql_dbi_host = localhost
mysql_dbi_database = snmptt
mysql_dbi_table = snmptt
mysql_dbi_username = snmptt
mysql_dbi_password = snmpttpassword
```

Monitoring SNMP traps provides near-real-time awareness of network and system events. Combined with a proper alerting workflow, it can significantly reduce mean time to detect (MTTD) for infrastructure issues.
