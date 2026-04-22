# How to Configure SNMP Agents for IPv6 Transport

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, IPv6, Network Monitoring, Net-SNMP, Agent Configuration, Linux

Description: Configure SNMP agents to listen and respond on IPv6 interfaces, enabling network management systems to monitor devices over IPv6 transport.

---

SNMP (Simple Network Management Protocol) agents can be configured to listen on IPv6 addresses, enabling monitoring systems to poll device statistics, interface counters, and system information over IPv6 transport.

## Installing Net-SNMP Agent

```bash
# Ubuntu/Debian

sudo apt install snmpd snmp -y

# RHEL/CentOS
sudo dnf install net-snmp net-snmp-utils -y

# Verify installation
snmpd --version
snmpget --version
```

## Configuring snmpd for IPv6

```bash
# /etc/snmp/snmpd.conf

# Listen on all IPv6 interfaces
agentAddress udp6:161

# Listen on both IPv4 and IPv6
agentAddress udp:161,udp6:161

# Listen on specific IPv6 address
agentAddress udp6:[2001:db8::1]:161

# Listen on IPv6 loopback only
agentAddress udp6:[::1]:161

# Community string configuration
rocommunity6 public  ::1
rocommunity6 public  2001:db8::/32

# For specific NMS IPv6 address
rocommunity6 monitoring_community 2001:db8::10

# System information
sysLocation    "Data Center, Rack 5"
sysContact     admin@example.com
sysName        ipv6-server.example.com
```

## SNMPv3 over IPv6

```bash
# Add SNMPv3 user for secure polling over IPv6
sudo systemctl stop snmpd

# Create SNMPv3 user with authentication and privacy
sudo net-snmp-create-v3-user \
  -ro \
  -A "AuthPassword123" \
  -a SHA \
  -X "PrivPassword123" \
  -x AES \
  monitorv3

# /etc/snmp/snmpd.conf additions:
# rouser monitorv3 priv
# agentAddress udp6:161

sudo systemctl start snmpd
```

## Restarting and Testing the Agent

```bash
# Restart snmpd
sudo systemctl restart snmpd

# Verify listening on IPv6
ss -6 -ulnp | grep 161

# Test SNMP over IPv6 (from monitoring server)
snmpget -v2c -c public udp6:[2001:db8::20]:161 sysDescr.0

# Test with SNMPv3
snmpget -v3 -l authPriv \
  -u monitorv3 \
  -a SHA -A "AuthPassword123" \
  -x AES -X "PrivPassword123" \
  udp6:[2001:db8::20]:161 sysDescr.0

# Walk the system group over IPv6
snmpwalk -v2c -c public udp6:[2001:db8::20]:161 system
```

## Firewall Rules for SNMP over IPv6

```bash
# Allow SNMP from monitoring system
sudo ip6tables -A INPUT -p udp \
  -s 2001:db8::10 \
  --dport 161 -j ACCEPT

# Allow SNMP from monitoring subnet
sudo ip6tables -A INPUT -p udp \
  -s 2001:db8:100::/48 \
  --dport 161 -j ACCEPT

# Allow SNMP traps outbound (to NMS)
sudo ip6tables -A OUTPUT -p udp \
  -d 2001:db8::10 \
  --dport 162 -j ACCEPT

sudo sh -c 'ip6tables-save > /etc/iptables/rules.v6'
```

## Configuring SNMP on Network Devices

```text
! Cisco IOS - Enable SNMP over IPv6
snmp-server community public RO
snmp-server host 2001:db8::10 version 2c public
! Enable SNMP traps
snmp-server enable traps

! Verify
show snmp

! Juniper JunOS
set snmp community public authorization read-only
set snmp trap-group monitors targets 2001:db8::10
commit
```

## Monitoring Agent Performance

```bash
# Check snmpd process
sudo systemctl status snmpd

# Watch SNMP queries
sudo tcpdump -i eth0 -nn "udp port 161" -v

# Log source addresses and packet dumps for debugging
sudo systemctl stop snmpd
sudo snmpd -f -Lo -a -d

# Check for IPv6 interface counters via SNMP
snmpwalk -v2c -c public udp6:[2001:db8::20]:161 ipv6
```

Net-SNMP's `agentAddress` directive with the `udp6:` prefix enables SNMP monitoring over IPv6, with the dual `udp:161,udp6:161` syntax allowing simultaneous IPv4 and IPv6 polling for monitoring systems that may use either transport.
