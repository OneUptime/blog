# How to Configure IPv6 Firewall Rules on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, pfSense, Firewall, Stateful, FreeBSD

Description: Learn how to configure IPv6 firewall rules on pfSense, including interface rules, floating rules, ICMPv6 policy, and stateful connection tracking for IPv6 traffic.

## Overview

pfSense uses pf (Packet Filter) on FreeBSD for firewalling. IPv6 rules are configured in the same interface as IPv4 rules (Firewall → Rules), with an IPv6 address family selector. pfSense creates stateful rules by default, allowing return traffic for connections you initiate. This guide covers creating interface rules, floating rules, and IPv6-specific ICMPv6 policies.

## Prerequisites

- pfSense with IPv6 configured on WAN as provided by the ISP (for example Static IPv6, DHCP6, or SLAAC)
- IPv6 configured on the LAN interface (typically **Track Interface** or **Static IPv6**)
- Verify IPv6 is active: **Interfaces → WAN → set "IPv6 Configuration Type" to a value other than "None"**, and **System → Advanced → Networking → ensure "Allow IPv6" is enabled**

## Interface Rules for IPv6

Navigate to **Firewall → Rules → LAN**:

### Allow IPv6 from LAN to WAN

```text
Rule 1: Allow IPv6 from LAN to any
  Action:           Pass
  Interface:        LAN
  Address Family:   IPv6
  Protocol:         Any
  Source:           LAN net
  Destination:      Any
  Description:      Allow outbound IPv6 from LAN
  State Type:       Keep State (default - stateful)
```

### Allow Only Specific Services Inbound

Navigate to **Firewall → Rules → WAN**:

```text
Rule 1: Allow HTTPS from anywhere (IPv6)
  Action:           Pass
  Interface:        WAN
  Address Family:   IPv6
  Protocol:         TCP
  Source:           Any
  Destination:      WAN Address / Port 443
  Description:      Allow inbound HTTPS IPv6

Rule 2: Allow SSH from management prefix only
  Action:           Pass
  Interface:        WAN
  Address Family:   IPv6
  Protocol:         TCP
  Source:           fd12:3456:789a::/48
  Destination:      WAN Address / Port 22
  Description:      SSH from management network only
```

## ICMPv6 Rules

pfSense automatically adds rules on IPv6-enabled interfaces to permit Neighbor Discovery Protocol (NDP). Review your IPv6 policy so it does not block essential ICMPv6 traffic:

```text
Essential ICMPv6 traffic to permit where appropriate:
  - Destination Unreachable (type 1)
  - Packet Too Big (type 2) ← critical for Path MTU Discovery
  - Time Exceeded (type 3)
  - Parameter Problem (type 4)
  - Neighbor Solicitation/Advertisement on local links
  - Router Solicitation/Advertisement on interfaces where they are required
```

### Adding Custom ICMPv6 Rules

```text
Rule: Allow ping from specific prefix
  Action:           Pass
  Interface:        WAN
  Address Family:   IPv6
  Protocol:         ICMP
  ICMP Type:        Echo Request
  Source:           2001:db8:100::/48
  Destination:      WAN Address
```

## Floating Rules (Apply to All Interfaces)

Navigate to **Firewall → Rules → Floating**:

```text
# Block an unwanted IPv6 prefix on multiple interfaces

  Action:           Block
  Quick:            Checked
  Interface:        Select all relevant interfaces
  Direction:        In
  Address Family:   IPv6
  Protocol:         Any
  Source:           2001:db8:bad::/48
  Destination:      Any
  Description:      Block unwanted IPv6 prefix

# Note: pfSense does not expose Routing Header Type 0 matching in the GUI.
# RH0 itself is deprecated by RFC 5095.
```

## CLI: Inspecting PF Rules

For advanced IPv6 troubleshooting, SSH into pfSense:

```bash
# SSH to pfSense
ssh admin@pfSense.local

# View current IPv6 PF rules
pfctl -sr | grep inet6

# View generated rules from pfSense
grep inet6 /tmp/rules.debug

# View rules in anchors added by packages/features
pfSsh.php playback pfanchordrill

# View current state table (conntrack equivalent)
pfctl -s states | head -20
```

## State Table Management

pfSense's stateful firewall tracks IPv6 connections in the state table:

Navigate to **Diagnostics → States** and use the **State Filter** panel:
- **Interface** - Select a specific interface or leave it on all
- **Filter Expression** - Enter an IPv6 address or subnet to locate matching states

```bash
# CLI: View state table
pfctl -s states | head -20

# Flush all states (clears all connections)
pfctl -F states
```

## IPv6 Alias Groups

For maintainable firewall rules, create aliases:

Navigate to **Firewall → Aliases**:

```text
Name:             MGMT_IPv6
Type:             Network
Networks:
  fd12:3456:789a::/48
  2001:db8:200::/64
Description:      Management IPv6 networks

```

Then use in rules:
```text
Source: MGMT_IPv6
```

## Logging IPv6 Events

```bash
# Enable logging on firewall rules:
# Each rule has a "Log" checkbox in the UI

# View firewall logs:
# Status → System Logs → Firewall
# Use the filter pane to match IPv6 source/destination addresses, interface, or protocol as needed

# From CLI:
awk -F, '$9 == 6' /var/log/filter.log | tail -50
```

## Summary

pfSense IPv6 firewall rules are created under **Firewall → Rules** with **Address Family: IPv6** selected. The default state type (Keep State) makes rules stateful - return traffic is automatically allowed. Do not block essential ICMPv6 control traffic, especially Packet Too Big (type 2) used by Path MTU Discovery. Use Aliases for managing groups of IPv6 prefixes. Floating rules can apply IPv6 policy across multiple interfaces, and SSH is useful for inspecting the interpreted PF ruleset during advanced troubleshooting. Monitor IPv6 connections via **Diagnostics → States** using a filter expression for the IPv6 address or subnet.
