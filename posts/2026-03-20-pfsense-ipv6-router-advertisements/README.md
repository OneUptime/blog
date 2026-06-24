# How to Configure IPv6 Router Advertisements on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, IPv6, Router Advertisement, SLAAC, Radvd

Description: Configure Router Advertisement Daemon (radvd) settings in pfSense for IPv6 SLAAC autoconfiuration on the LAN.

## Overview

Configure Router Advertisement Daemon (radvd) settings in pfSense for IPv6 SLAAC autoconfiguration on the LAN.

## Prerequisites

- pfSense 2.5+ (for improved IPv6 support)
- Admin access to the pfSense WebGUI
- IPv6 service from your ISP or tunnel provider

## Enabling IPv6 in pfSense

Navigate to **System → Advanced → Networking** and ensure:
- **Allow IPv6** is checked
- IPv6 over IPv4 tunneling options are set appropriately

```text
System → Advanced → Networking
  ✓ Allow IPv6
  ✓ IPv6 over IPv4 Tunneling (if using tunnels)
```

## WAN IPv6 Configuration

### SLAAC (Stateless Autoconfiguration)
```nginx
Interfaces → WAN
  IPv6 Configuration Type: SLAAC
  (Automatically receives IPv6 from upstream router)
```

### DHCPv6
```text
Interfaces → WAN
  IPv6 Configuration Type: DHCPv6
  Request only an IPv6 prefix: checked (for PD)
  DHCPv6 Prefix Delegation Size: 48 or 56 (check with ISP)
```

### Static IPv6
```nginx
Interfaces → WAN
  IPv6 Configuration Type: Static IPv6
  IPv6 Address: 2001:db8:wan::2/64
  IPv6 Upstream Gateway: Add New Gateway → 2001:db8:wan::1
```

## LAN IPv6 Configuration

```text
Interfaces → LAN
  IPv6 Configuration Type: Track Interface
  IPv6 Interface: WAN
  IPv6 Prefix ID: 0  (uses first /64 from delegated prefix)
```

## DHCPv6 Server Setup

```text
Services → DHCPv6 Server & RA → LAN
  ✓ Enable DHCPv6 server on interface LAN
  Range From: 2001:db8:lan::100
  Range To:   2001:db8:lan::200
  DNS Servers: 2001:4860:4860::8888
```

## Essential IPv6 Firewall Rules

```text
# Allow ICMPv6 (critical - do NOT block all ICMPv6)

Firewall → Rules → LAN → Add
  Action: Pass
  TCP/IP Version: IPv6
  Protocol: ICMP
  ICMP Type: Any (or specific: router solicitation, neighbor solicitation/advertisement)

# Allow LAN to WAN IPv6
Firewall → Rules → LAN → Add
  Action: Pass
  TCP/IP Version: IPv6
  Protocol: Any
  Source: LAN net
  Destination: any
```

## Diagnostics and Troubleshooting

```text
# pfSense built-in diagnostics
Diagnostics → Ping → IPv6 address
Diagnostics → DNS Lookup → AAAA record
Diagnostics → Traceroute → IPv6 target

# Check interfaces from CLI (via Diagnostics → Command Prompt)
ifconfig em0 | grep inet6
netstat -rn -f inet6
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your pfSense firewall's IPv6 WAN connectivity and LAN gateway availability. Configure ICMP monitors for the pfSense LAN IPv6 address and external IPv6 destinations to detect connectivity issues.

## Conclusion

How to Configure IPv6 Router Advertisements on pfSense primarily uses the pfSense WebGUI under the Interfaces and Services menus. Always allow ICMPv6 in firewall rules as it is required for IPv6 operation. Use the built-in Diagnostics tools for quick troubleshooting before diving into packet captures.
