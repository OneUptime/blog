# How to Configure SNMP Traps and Trap Receiver on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SNMP, Traps, Monitoring, Snmptrapd, Linux

Description: Set up an SNMP trap receiver on RHEL using snmptrapd to receive and process asynchronous notifications from network devices and servers.

---

SNMP traps are asynchronous notifications sent from devices to a management station when specific events occur (link down, high CPU, disk failure). This guide covers setting up the trap receiver (snmptrapd) on RHEL.

## Install SNMP Trap Daemon

```bash
# Install Net-SNMP with trap daemon support
sudo dnf install -y net-snmp net-snmp-utils net-snmp-perl
```

## Configure snmptrapd

```bash
# Create the trap daemon configuration
sudo tee /etc/snmp/snmptrapd.conf << 'CONF'
# Accept traps from any source using this community string
authCommunity log,execute,net trapCommunity123

# SNMPv3 user for authenticated traps
# createUser -e 0x8000000001020304 trapuser SHA "AuthPass123" AES "PrivPass456"
# authUser log,execute trapuser

# Log traps to a file
[snmptrapd]
doNotRetain 0

# Format the output
format2 %V\n% Agent Address: %A\n Agent Hostname: %B\n Date: %H:%J:%K - %L/%M/%Y\n Enterprise OID: %N\n Trap Type: %W\n Trap Sub-Type: %q\n Community: %P\n Uptime: %T\n Variables:\n%v\n

# Execute a script when specific traps arrive
traphandle default /usr/local/bin/trap-handler.sh
CONF
```

## Create a Trap Handler Script

```bash
sudo tee /usr/local/bin/trap-handler.sh << 'SCRIPT'
#!/bin/bash
# trap-handler.sh - Process incoming SNMP traps
# snmptrapd passes trap data via stdin

LOGFILE="/var/log/snmp/trap-handler.log"
mkdir -p /var/log/snmp

# Read trap data from stdin
read HOST
read IP
VARS=""
while read LINE; do
    VARS="${VARS}${LINE}\n"
done

# Log the trap
echo "$(date '+%Y-%m-%d %H:%M:%S') - Trap from ${HOST} (${IP})" >> "$LOGFILE"
echo -e "$VARS" >> "$LOGFILE"
echo "---" >> "$LOGFILE"

# Example: Send an email for critical traps
if echo "$VARS" | grep -q "linkDown"; then
    echo "Link down on $HOST at $(date)" | mail -s "SNMP Alert: Link Down" admin@example.com
fi
SCRIPT

sudo chmod +x /usr/local/bin/trap-handler.sh
```

## Start the Trap Receiver

```bash
# Start snmptrapd
sudo systemctl enable --now snmptrapd

# Check the status
sudo systemctl status snmptrapd

# View the trap log
sudo tail -f /var/log/messages | grep snmptrapd
```

## Configure the Firewall

```bash
# Allow SNMP trap port (UDP 162)
sudo firewall-cmd --permanent --add-port=162/udp
sudo firewall-cmd --reload
```

## Send a Test Trap

```bash
# Send a test trap from the local machine
snmptrap -v 2c -c trapCommunity123 localhost "" \
  .1.3.6.1.4.1.8072.2.3.0.1 \
  .1.3.6.1.4.1.8072.2.3.2.1 s "Test trap from RHEL"

# Send a linkDown trap
snmptrap -v 2c -c trapCommunity123 localhost "" \
  .1.3.6.1.6.3.1.1.5.3 \
  ifIndex i 2 \
  ifAdminStatus i 1 \
  ifOperStatus i 2

# Send from a remote host
snmptrap -v 2c -c trapCommunity123 10.0.0.100 "" \
  .1.3.6.1.4.1.8072.2.3.0.1 \
  .1.3.6.1.4.1.8072.2.3.2.1 s "Alert from remote host"
```

## Forward Traps to Zabbix

To send traps to Zabbix, configure the Zabbix SNMP trapper:

```bash
# Install Zabbix SNMP trap handler
sudo dnf install -y zabbix-snmptraps

# Configure snmptrapd to pass traps to Zabbix
sudo tee /etc/snmp/snmptrapd.conf << 'CONF'
authCommunity execute trapCommunity123
perl do "/usr/share/zabbix/snmptraps/zabbix_trap_receiver.pl";
CONF

sudo systemctl restart snmptrapd
```

## Verify Trap Reception

```bash
# Monitor incoming traps in real time
sudo snmptrapd -f -Lo -C -c /etc/snmp/snmptrapd.conf

# Check the trap handler log
sudo tail -f /var/log/snmp/trap-handler.log
```

SNMP traps provide real-time event notification, complementing the polling-based monitoring that SNMP GET requests provide.
