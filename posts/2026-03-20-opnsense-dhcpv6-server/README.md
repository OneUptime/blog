# How to Configure DHCPv6 Server on OPNsense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPNsense, DHCPv6, IPv6, Kea, DHCP

Description: Enable the Kea DHCPv6 server in OPNsense to provide stateful IPv6 address assignment to LAN clients.

## Overview

Enable the Kea DHCPv6 server in OPNsense to provide stateful IPv6 address assignment to LAN clients.

## Prerequisites

- OPNsense 25.1 or later (Kea DHCPv6 was introduced in 25.1 "Ultimate Unicorn"; on earlier releases use the legacy ISC DHCPv6 server)
- Admin access to the OPNsense WebGUI
- IPv6 connectivity or tunnel provider

## OPNsense IPv6 Quick Start

OPNsense is built on FreeBSD and uses a web interface for all IPv6 configuration. Navigate through:

- **Interfaces → [WAN/LAN]**: For interface IPv6 config
- **Services → Kea DHCP → DHCPv6**: For DHCPv6 server (legacy ISC lives at **Services → ISC DHCPv6**)
- **Services → Router Advertisements**: For RA/SLAAC
- **Firewall → Rules**: For IPv6 firewall rules

## Interface Configuration

### WAN - DHCPv6

```text
Interfaces → WAN → IPv6 Configuration
  IPv6 Configuration Type: DHCPv6
  Request Prefix Size: /48
  Send IPv6 Prefix Hint: ✓
  Use IPv4 connectivity: unchecked (for native IPv6)
```

### WAN - Static IPv6

```nginx
Interfaces → WAN → IPv6 Configuration
  IPv6 Configuration Type: Static IPv6
  IPv6 address: 2001:db8:wan::2 / 64
  IPv6 Upstream Gateway: 2001:db8:wan::1 (add as gateway)
```

### LAN - Track Interface

```text
Interfaces → LAN → IPv6 Configuration
  IPv6 Configuration Type: Track Interface
  IPv6 Interface: WAN
  IPv6 Prefix ID: 0
  Manual Configuration: ✓ (to control RA settings)
```

## DHCPv6 Server

```text
Services → Kea DHCP → DHCPv6
  Settings tab:
    ✓ Enable
    Interfaces: LAN
  Subnets tab → Add:
    Subnet: 2001:db8:lan::/64
    Pools: 2001:db8:lan::100-2001:db8:lan::200
  Options tab → Add (or set on the subnet):
    DNS Servers: 2001:4860:4860::8888, 2001:4860:4860::8844
```

## Router Advertisements

```text
Services → Router Advertisements → [LAN]
  Router Advertisements: Assisted (RA + DHCPv6)
  # OR
  Router Advertisements: Unmanaged (SLAAC only)
  
  Advertise DNS: ✓
  DNS servers: 2001:4860:4860::8888
```

## IPv6 Firewall Rules

```text
# CRITICAL: Allow ICMPv6 first

Firewall → Rules → LAN
  Action: Pass
  TCP/IP Version: IPv6
  Protocol: ICMP
  ICMP type: any

# Allow LAN IPv6 to any
Firewall → Rules → LAN
  Action: Pass
  TCP/IP Version: IPv6
  Protocol: any
  Source: LAN net
  Destination: any
```

## Unbound DNS for IPv6

```text
Services → Unbound DNS → General
  ✓ Enable
  Network Interfaces: All (includes IPv6)
  
# Add AAAA record for internal host
Services → Unbound DNS → Host Overrides
  Host: server
  Domain: home.lab
  Type: AAAA
  IP: 2001:db8:lan::100
```

## Diagnostics

```text
# Diagnostic tools
Interfaces → Diagnostics → NDP Table  (IPv6 neighbor discovery; ARP Table is IPv4 only)
Interfaces → Diagnostics → Ping       (test IPv6)

# Packet capture with IPv6 filter
Interfaces → Diagnostics → Packet Capture
  Interface: WAN
  IP Address: [leave empty for all]
  Address Family: IPv6
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your OPNsense firewall's IPv6 interfaces. Ping monitors targeting the OPNsense LAN IPv6 address and external test addresses provide quick visibility into IPv6 connectivity status.

## Conclusion

How to Configure DHCPv6 Server on OPNsense uses OPNsense's web interface which mirrors pfSense's structure but with a cleaner UI. Always configure ICMPv6 passthrough rules in the firewall, use interface tracking for LAN to automatically use the delegated prefix, and verify with the built-in ping diagnostic tool.
