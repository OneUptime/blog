# How to Configure SNMP Traps over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, Traps, IPv6, Network Monitoring, Alert, Net-SNMP, Notification

Description: Configure SNMP trap sending and receiving over IPv6, enabling devices to send event notifications to monitoring systems using IPv6 transport.

---

SNMP traps are asynchronous notifications sent from network devices to management systems when events occur. Configuring trap transport over IPv6 requires using IPv6 transport/address notation for the trap destination and binding the trap receiver on IPv6.

## Configuring SNMP Trap Sending (Agent Side)

```bash
# /etc/snmp/snmpd.conf - Configure trap destinations over IPv6

# Send SNMPv2c traps to IPv6 NMS

trap2sink udp6:[2001:db8::10]:162 public

# Send to multiple NMS over IPv6
trap2sink udp6:[2001:db8::11]:162 public
trap2sink udp6:[2001:db8::12]:162 backup_community

# SNMPv3 inform (acknowledged notification)
trapsess -Ci -v 3 -l authPriv -u trapuser -a SHA -A AuthPass123 -x AES -X PrivPass123 udp6:[2001:db8::10]:162

# Configure what to trap
# Link up/down traps
linkUpDownNotifications yes

# Authentication failure traps
authtrapenable 1
```

## Configuring Trap Receiver (snmptrapd)

```bash
# /etc/snmp/snmptrapd.conf

# Accept traps from IPv6 addresses
authCommunity log,execute,net public

# Accept traps from specific IPv6 subnet
authCommunity log,execute,net monitoring_comm 2001:db8::/32

# SNMPv3 inform user
createUser trapuser SHA "AuthPass123" AES "PrivPass123"
authUser log,execute trapuser priv

# Log file
doNotLogTraps no
logOption f /var/log/snmptrapd.log

# Execute command on trap receipt
traphandle .1.3.6.1.6.3.1.1.5.3 /usr/local/bin/handle_linkdown.sh
```

```bash
# Start snmptrapd listening on IPv6
sudo snmptrapd -c /etc/snmp/snmptrapd.conf \
  -Lo \
  udp6:162

# Or with Debian/Ubuntu service defaults
# /etc/default/snmptrapd
# TRAPDOPTS='-Lsd -p /run/snmptrapd.pid udp:162 udp6:162'

sudo systemctl restart snmptrapd
sudo ss -6 -ulnp | grep 162
```

## Sending Test Traps over IPv6

```bash
# Send test SNMPv2c trap over IPv6
snmptrap \
  -v 2c \
  -c public \
  udp6:[2001:db8::10]:162 \
  '' \
  .1.3.6.1.6.3.1.1.5.3 \
  .1.3.6.1.2.1.2.2.1.1.1 i 1 \
  .1.3.6.1.2.1.2.2.1.7.1 i 1 \
  .1.3.6.1.2.1.2.2.1.8.1 i 2

# Send SNMPv3 inform over IPv6
snmpinform \
  -v 3 \
  -l authPriv \
  -u trapuser \
  -a SHA -A "AuthPass123" \
  -x AES -X "PrivPass123" \
  udp6:[2001:db8::10]:162 \
  '' \
  .1.3.6.1.6.3.1.1.5.4

# Verify receipt in log
sudo tail -f /var/log/snmptrapd.log
```

## Firewall Rules for SNMP Traps over IPv6

```bash
# Allow outbound traps (from agent to NMS)
sudo ip6tables -A OUTPUT -p udp \
  -d 2001:db8::10 \
  --dport 162 -j ACCEPT

# Allow inbound traps (at NMS)
sudo ip6tables -A INPUT -p udp \
  -s 2001:db8::/32 \
  --dport 162 -j ACCEPT

# Save rules
sudo sh -c 'ip6tables-save > /etc/ip6tables/rules.v6'
```

## Processing Traps with Handler Script

```bash
#!/bin/bash
# /usr/local/bin/handle_linkdown.sh
# Called by snmptrapd on link down trap

# SNMPTRAPD passes hostname, source address, and varbinds via stdin
read -r HOSTNAME
read -r IPADDRESS
TRAP_DATA="$(cat)"

echo "$(date): Link DOWN from ${HOSTNAME} (${IPADDRESS})" >> /var/log/trap_events.log
echo "${TRAP_DATA}" >> /var/log/trap_events.log

# Optionally page the NOC
# curl -X POST "https://api.pagerduty.com/events" \
#   -H "Content-Type: application/json" \
#   -d "{\"routing_key\":\"$PD_KEY\",\"event_action\":\"trigger\",...}"
```

## Network Device Trap Configuration

```text
! Cisco IOS - Send traps over IPv6
snmp-server enable traps
snmp-server host 2001:db8::10 version 2c public udp-port 162

! Verify trap destinations
show snmp host

! Juniper - Send traps over IPv6
set snmp trap-group monitors targets 2001:db8::10
set snmp trap-group monitors version v2
set snmp trap-group monitors categories link
commit
```

SNMP traps over IPv6 require using valid IPv6 transport/address notation in agent configurations, with `snmptrapd` handling both IPv4 and IPv6 when bound to both `udp:162` and `udp6:162` simultaneously.
