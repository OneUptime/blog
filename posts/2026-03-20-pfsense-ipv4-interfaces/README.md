# How to Configure IPv4 Interfaces on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, IPv4, Network Configuration, Firewall, Interface, FreeBSD

Description: Configure IPv4 addresses on pfSense interfaces including WAN with DHCP or static IP, LAN with a static gateway address, and optional OPT interfaces for DMZ or VLANs.

## Introduction

pfSense is a FreeBSD-based firewall and router. Interface configuration is done through the web GUI under **Interfaces** or via the console setup wizard. Each interface gets an IPv4 address assignment type: DHCP, static, or PPPoE for WAN.

## Initial Console Setup

```text
When first booting pfSense, the console wizard asks:
  1. Assign interfaces (WAN = em0, LAN = em1, etc.)
  2. Set LAN IPv4 address
  3. Set subnet mask
  4. Set default gateway (WAN gateway entered later in GUI)
```

## WAN Interface - Static IPv4

Navigate to **Interfaces > WAN**:
- IPv4 Configuration Type: **Static IPv4**
- IPv4 Address: `203.0.113.2 /30`
- IPv4 Upstream Gateway: Add new gateway `203.0.113.1`

## WAN Interface - DHCP

Navigate to **Interfaces > WAN**:
- IPv4 Configuration Type: **DHCP**
- DHCP Hostname: (optional - set if ISP requires it)

## LAN Interface

Navigate to **Interfaces > LAN**:
- IPv4 Configuration Type: **Static IPv4**
- IPv4 Address: `192.168.1.1 /24`
- No gateway on LAN (pfSense IS the gateway)

## Add OPT Interface (DMZ)

1. Navigate to **Interfaces > Assignments**
2. Add available NIC → creates OPT1
3. Navigate to **Interfaces > OPT1**:
   - Enable interface: checked
   - Description: `DMZ`
   - IPv4 Configuration Type: Static
   - IPv4 Address: `10.1.40.1 /24`

## VLAN Interface

```bash
# Via console or GUI: Interfaces > Assignments > VLANs

# Add VLAN:
#   Parent interface: em1
#   VLAN tag: 10
#   Description: Corp

# Then assign in Interfaces > Assignments:
#   Available network ports: em1.10 → Add
```

Navigate to the new VLAN interface:
- Enable: checked
- IPv4 Address: `10.1.10.1 /24`

## pfSense CLI (via SSH/console)

```bash
# Check interface configuration
ifconfig em0
ifconfig em1

# Show routing table
netstat -rn

# Ping from pfSense itself
ping -c 4 8.8.8.8

# Show ARP table
arp -an
```

## Firewall Rules After Adding Interface

After adding a new interface (DMZ, OPT), pfSense blocks all traffic by default. Add explicit allow rules:

Navigate to **Firewall > Rules > DMZ**:
- Add rule: Proto=TCP, Source=DMZ net, Destination=any, Destination Port Range=HTTP (80) - add a second rule for HTTPS (443), or create a Ports alias (Firewall > Aliases) containing 80 and 443 and reference it in a single rule

## Conclusion

pfSense interface configuration is primarily done through the web GUI. WAN accepts DHCP or static IPv4; LAN and OPT interfaces use static IPs. After adding any new interface, create corresponding firewall rules since pfSense denies all traffic on new interfaces by default.
