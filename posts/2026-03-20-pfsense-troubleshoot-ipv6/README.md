# How to Troubleshoot IPv6 on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, IPv6, Troubleshooting, Diagnostic, Networking

Description: Diagnose and resolve common IPv6 connectivity issues on pfSense using built-in diagnostic tools and system logs.

## Overview

Diagnose and resolve common IPv6 connectivity issues on pfSense using built-in diagnostic tools and system logs.

## Prerequisites

- pfSense 2.5+ (for improved IPv6 support)
- Admin access to the pfSense WebGUI
- IPv6 service from your ISP or tunnel provider

## Enabling IPv6 in pfSense

Navigate to **System → Advanced → Networking** and ensure:
- **Allow IPv6** is checked
- IPv6 over IPv4 tunneling is enabled only if you need to forward protocol 41 to a downstream tunnel endpoint

```text
System → Advanced → Networking
  ✓ Allow IPv6
  IPv6 over IPv4 Tunneling: enable only if required
```

## WAN IPv6 Configuration

### SLAAC (Stateless Autoconfiguration)
```nginx
Interfaces → WAN
  IPv6 Configuration Type: SLAAC
  (Receives IPv6 from upstream router advertisements; usually only useful in appliance-style deployments)
```

### DHCPv6
```text
Interfaces → WAN
  IPv6 Configuration Type: DHCP6
  Request only an IPv6 prefix: checked (for PD)
  DHCPv6 Prefix Delegation Size: ISP-assigned size (commonly 48-64)
```

### Static IPv6
```nginx
Interfaces → WAN
  IPv6 Configuration Type: Static IPv6
  IPv6 Address: 2001:db8:0:1::2/64
  IPv6 Upstream Gateway: Add New Gateway → 2001:db8:0:1::1
```

## LAN IPv6 Configuration

```text
Interfaces → LAN
  IPv6 Configuration Type: Track Interface
  IPv6 Interface: WAN
  IPv6 Prefix ID: 0  (hex; uses the first /64 from the delegated prefix)
```

## DHCPv6 Server Setup

```text
Services → DHCPv6 Server → LAN
  ✓ Enable DHCPv6 server on interface LAN
  Range From: 2001:db8:1000:0::100
  Range To:   2001:db8:1000:0::200
  DNS Servers: 2001:4860:4860::8888

Services → Router Advertisement → LAN
  Router Mode: Managed or Assisted
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
# Fresh installs already include default LAN allow rules for IPv4 and IPv6.
Firewall → Rules → LAN → Verify/Add
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
Diagnostics → DNS Lookup → hostname (check for AAAA results)
Diagnostics → Traceroute → IPv6 target

# Check interfaces from CLI (via Diagnostics → Command Prompt)
ifconfig | grep inet6
netstat -rn -f inet6
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your pfSense firewall's IPv6 WAN connectivity and LAN gateway availability. Configure ICMP monitors for the pfSense LAN IPv6 address and external IPv6 destinations to detect connectivity issues.

## Conclusion

How to Troubleshoot IPv6 on pfSense primarily uses the pfSense WebGUI under the Interfaces and Services menus. Avoid blanket blocking of ICMPv6, since NDP and other control traffic are required for IPv6 operation. Use the built-in Diagnostics tools for quick troubleshooting before diving into packet captures.
