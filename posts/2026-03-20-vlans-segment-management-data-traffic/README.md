# How to Use VLANs to Segment Management and Data Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLAN, Network Segmentation, Management VLAN, Data VLAN, Security, IPv4, 802.1Q

Description: Learn how to design and implement VLANs to separate management traffic from data traffic, improving security, reducing broadcast domains, and enabling traffic prioritization.

---

Separating management traffic (SSH, SNMP, iDRAC/iLO) from data traffic (user or application data) onto dedicated VLANs improves security and prevents data plane issues from affecting device management.

## VLAN Design for Traffic Segmentation

```text
VLAN 10 - Management  (10.10.0.0/24)
  - Switches, routers, firewalls (management ports)
  - BMC/iDRAC/iLO interfaces
  - SNMP collectors, NTP servers

VLAN 20 - Servers     (10.20.0.0/24)
  - Application servers
  - Database servers

VLAN 30 - Workstations (10.30.0.0/24)
  - User endpoints

VLAN 99 - Native/Trunk (untagged)
  - Trunk ports between switches
```

## Switch Configuration (Cisco IOS)

```text
! Create VLANs
vlan 10
  name Management
vlan 20
  name Servers
vlan 30
  name Workstations

! Management VLAN interface (Layer 3 for switch management)
interface Vlan10
  ip address 10.10.0.1 255.255.255.0
  no shutdown

! Restrict SSH/Telnet to Management VLAN only
line vty 0 15
  access-class MGMT-ONLY in

ip access-list standard MGMT-ONLY
  permit 10.10.0.0 0.0.0.255
  deny   any log
```

## Linux Server: Separate Management NIC/VLAN

```bash
# /etc/network/interfaces (Debian)

# Management interface (dedicated NIC or VLAN)

auto eth1.10
iface eth1.10 inet static
  address 10.10.0.50
  netmask 255.255.255.0
  vlan-raw-device eth1
  # Management traffic only: SSH, SNMP
  up ip route add 10.10.0.0/24 dev eth1.10

# Data interface
auto eth0
iface eth0 inet static
  address 10.20.0.50
  netmask 255.255.255.0
  gateway 10.20.0.1
  # All other traffic uses this interface
```

## Firewall Rules: Restrict Management Access

```bash
# iptables: allow SSH only from management VLAN
iptables -A INPUT -i eth1.10 -s 10.10.0.0/24 -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j DROP   # Block SSH from all other sources

# Allow SNMP only from monitoring host in management VLAN
iptables -A INPUT -i eth1.10 -s 10.10.0.5 -p udp --dport 161 -j ACCEPT
iptables -A INPUT -p udp --dport 161 -j DROP
```

## SNMP Binding to Management Interface

```bash
# /etc/snmp/snmpd.conf - listen only on management VLAN
agentaddress 10.10.0.50:161

# Bind SSH daemon to management interface
# /etc/ssh/sshd_config
ListenAddress 10.10.0.50
```

## Benefits of Management VLAN Separation

| Benefit | Explanation |
|---------|-------------|
| Security | Compromise of data VLAN doesn't expose management |
| Stability | Data plane congestion doesn't affect SSH access |
| Auditability | Management traffic is separately logged and monitored |
| Compliance | PCI-DSS requires network segmentation and encrypted non-console admin access for cardholder systems |

## Key Takeaways

- Assign all device management interfaces (SSH, SNMP, iDRAC) to a dedicated management VLAN with strict ACLs.
- Bind SSH and SNMP daemons to the management interface IP to prevent access via data-plane interfaces.
- Use a separate physical NIC or VLAN interface on servers for management to achieve true traffic separation.
- Restrict management VLAN access to specific jump hosts or bastion servers via ACLs on the switch.
