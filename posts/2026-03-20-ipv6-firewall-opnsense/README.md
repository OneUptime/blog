# How to Configure IPv6 Firewall Rules on OPNsense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OPNsense, Firewall, FreeBSD, Pf

Description: Learn how to configure IPv6 firewall policies on OPNsense, covering interface rules, floating rules, ICMPv6 settings, and monitoring IPv6 traffic flows.

## Overview

OPNsense is a FreeBSD-based firewall using pf, similar to pfSense but with a redesigned UI and focus on security. IPv6 firewalling is integrated throughout the rule configuration interface. Rules can be IPv6-only, IPv4-only, or both. OPNsense also shows automatic firewall rules in the rules view so you can inspect system-generated behavior alongside your own rules.

## Enabling IPv6 on Interfaces

Navigate to **Interfaces → WAN**:
- Enable: **IPv6 Configuration Type** → DHCPv6 or Static
- Note the assigned IPv6 address

Navigate to **Interfaces → LAN**:
- IPv6 Configuration Type: Track Interface or Static
- Track IPv6 Interface: WAN
- IPv6 Prefix ID: 0 (or another unique hex ID for this LAN /64)

## Creating IPv6 Firewall Rules

Navigate to **Firewall → Rules → LAN**:

### Allow IPv6 Outbound from LAN

```text
Action:           Pass
Interface:        LAN
Direction:        in
TCP/IP Version:   IPv6
Protocol:         Any
Source:           LAN net (IPv6)
Destination:      Any
State Type:       Keep state (default)
Description:      Allow all IPv6 from LAN

```

### WAN Inbound Rules

Navigate to **Firewall → Rules → WAN**:

```text
# Allow HTTPS

Action:           Pass
Interface:        WAN
TCP/IP Version:   IPv6
Protocol:         TCP
Source:           Any
Destination:      WAN address
Destination port: HTTPS (443)
Description:      Allow inbound HTTPS IPv6

# Allow SSH from management only
Action:           Pass
Interface:        WAN
TCP/IP Version:   IPv6
Protocol:         TCP
Source:           2001:db8:100::/48
Destination:      WAN address
Destination port: SSH (22)
Description:      Management SSH IPv6
```

## ICMPv6 Configuration

OPNsense supports dedicated ICMPv6 matching. In the rules view, use the automatic-rules toggle to inspect system-defined rules, and make sure your own rules do not block ICMPv6 traffic required for IPv6 to function correctly:

```text
# Important ICMPv6 traffic includes:
# Neighbor Discovery (Neighbor Solicitation/Advertisement, types 135/136)
# Router Solicitation/Advertisement (types 133/134)
# Packet Too Big (type 2, required for PMTUD)
```

### Custom ICMPv6 Rules

```text
# Allow ping from monitoring network
Action:           Pass
Interface:        WAN
TCP/IP Version:   IPv6
Protocol:         IPv6-ICMP
ICMPv6 type:      Echo Request (128)
Source:           2001:db8:200::/48
Destination:      WAN address
Description:      Allow IPv6 ping from monitoring
```

## Floating Rules (Multi-Interface)

Navigate to **Firewall → Rules → Floating**:

```text
# Example: block a specific IPv6 prefix on all interfaces
Action:           Block
Interface:        (all - checked boxes for all interfaces)
Direction:        in
TCP/IP Version:   IPv6
Source:           2001:db8::/32 (Documentation prefix)
Description:      Block IPv6 documentation prefix
```

## Aliases for IPv6 Prefixes

Navigate to **Firewall → Aliases → Add**:

```text
Name:             IPv6_Management
Type:             Network
Network(s):
  fd00:1234:5678::/48
  2001:db8:100::/64
Description:      IPv6 Management Networks
```

Use in rules as source/destination.

## State Table (Connection Tracking)

Navigate to **Firewall → Diagnostics → States**:

```text
# Filter options:
Interface:  WAN
Search:     2001:db8:

# Shows active IPv6 connections:
# State        Proto  Source                    Destination
# ESTABLISHED  TCP    [2001:db8:10::10]:54321  [2001:db8:20::20]:443
```

```bash
# From OPNsense shell:
ssh root@opnsense.local

# View IPv6 state table
pfctl -s states | grep inet6

# Count states
pfctl -s states | grep inet6 | wc -l
```

## Logging IPv6 Firewall Events

```text
# Enable logging on a rule:
# In rule editor: Log → Enable ✓

# View logs:
# Firewall → Log Files → Live View
# Add filter conditions for the relevant host, interface, or rule label

# From CLI:
tail -f /var/log/filter.log
# Add grep on a known IPv6 host or prefix when needed
```

## Key Differences: OPNsense vs pfSense IPv6 Firewall

| Feature | OPNsense | pfSense |
|---------|----------|---------|
| Rule family selection | TCP/IP Version can be IPv4, IPv6, or both | Address Family can be IPv4, IPv6, or both |
| Automatic rules visibility | Automatic rules can be shown from the rules view | Automatic rules exist and can be inspected separately |
| Diagnostics | Firewall → Diagnostics → Sessions / States | Diagnostics → States |
| Logging | Firewall → Log Files → Live View / Plain View | Status → System Logs → Firewall |

## Verify IPv6 Connectivity Through Firewall

```bash
# From behind OPNsense LAN:
ping -6 -c 3 2001:4860:4860::8888   # Google IPv6 DNS

# Check firewall isn't blocking PMTUD
ping -6 -c 3 -s 1400 2001:4860:4860::8888   # Large packet

# Traceroute to verify path
traceroute -6 ipv6.google.com
```

## Summary

OPNsense IPv6 firewall rules are configured under **Firewall → Rules** with **TCP/IP Version: IPv6**. For ICMPv6-specific policies, use **Protocol: IPv6-ICMP** and be careful not to block traffic needed for Neighbor Discovery and Path MTU Discovery. Create Aliases for common IPv6 prefixes (management networks, trusted sources) and reference them in rules for maintainability. Use Floating rules for policies that apply across all interfaces. Monitor active IPv6 connections under **Firewall → Diagnostics → States** and **Sessions**, and enable per-rule logging for audit trail.
