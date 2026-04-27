# How to Configure IPv6 WAN Interface on OPNsense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPNsense, IPv6, WAN, DHCPv6, SLAAC

Description: Configure the WAN interface on OPNsense for SLAAC, DHCPv6, or static IPv6 connectivity from your ISP.

## Overview

Configure the WAN interface on OPNsense for SLAAC, DHCPv6, or static IPv6 connectivity from your ISP.

## Prerequisites

- OPNsense 23.x or later
- Admin access to the OPNsense WebGUI
- IPv6 connectivity or tunnel provider

## OPNsense IPv6 Quick Start

OPNsense is built on FreeBSD and uses a web interface for all IPv6 configuration. Navigate through:

- **Interfaces → [WAN/LAN]**: For interface IPv6 config
- **Services → DHCPv6**: For DHCPv6 server
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
Services → DHCPv6 → [LAN]
  ✓ Enable DHCPv6 server
  Range from: 2001:db8:lan::100
  Range to: 2001:db8:lan::200
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
Interfaces → Diagnostics → NDP Table   (shows IPv6 neighbors)
Interfaces → Diagnostics → Ping        (test IPv6)

# Packet capture with IPv6 filter
Interfaces → Diagnostics → Packet Capture
  Interface: WAN
  IP Address: [leave empty for all]
  Address Family: IPv6
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your OPNsense firewall's IPv6 interfaces. Ping monitors targeting the OPNsense LAN IPv6 address and external test addresses provide quick visibility into IPv6 connectivity status.

## Conclusion

How to Configure IPv6 WAN Interface on OPNsense uses OPNsense's web interface which mirrors pfSense's structure but with a cleaner UI. Always configure ICMPv6 passthrough rules in the firewall, use interface tracking for LAN to automatically use the delegated prefix, and verify with the built-in ping diagnostic tool.
