# How to Understand IPv6 Multicast vs IPv4 Multicast (IGMP)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, IGMP, MLD, Protocol Comparison

Description: A comparative analysis of IPv6 multicast (MLD) and IPv4 multicast (IGMP), highlighting the differences in protocol design, address ranges, and deployment considerations.

## Overview

Both IPv4 and IPv6 support multicast, but they use different protocols for group management:
- IPv4: **IGMP** (Internet Group Management Protocol) - IGMPv1, v2, v3
- IPv6: **MLD** (Multicast Listener Discovery) - MLDv1, v2

MLD is essentially IGMP redesigned as part of ICMPv6 with IPv6 address support.

## Protocol Comparison

| Feature | IPv4 IGMP | IPv6 MLD |
|---|---|---|
| RFC | RFC 9776 (IGMPv3) | RFC 9777 (MLDv2) |
| Part of | Standalone IP protocol | ICMPv6 (type 130-132, 143) |
| IP version | IPv4 only | IPv6 only |
| Message transport | IPv4 with Router Alert option | IPv6 with Hop-by-Hop Router Alert |
| Group address range | 224.0.0.0/4 | ff00::/8 |
| ASM range | Any multicast group outside 232.0.0.0/8 | Any multicast group outside ff3x::/32 |
| SSM range | 232.0.0.0/8 | ff3x::/32 (allocated today from ff3x::/96) |
| Link-local range | 224.0.0.0/24 | Scope value 0x2 in the multicast address |
| Source-specific (v3/v2) | IGMPv3 | MLDv2 |

## Address Range Differences

IPv4 multicast uses Class D addresses (224.0.0.0/4):
```text
224.0.0.0/24     - Local Network Control Block (routers don't forward)
224.0.1.0-231.255.255.255, 233.0.0.0-238.255.255.255  - non-SSM multicast space
232.0.0.0/8      - SSM range
239.0.0.0/8      - Administratively scoped multicast
239.192.0.0/14   - Organization-local scope
```

IPv6 multicast uses the ff00::/8 prefix with embedded scope:
```text
Scope 0x2        - Link-local multicast scope (for example, ff02::1)
Scope 0x5        - Site-local multicast scope
Scope 0xE        - Global multicast scope
ff3x::/32        - SSM range (allocated today from ff3x::/96)
```

## Key Protocol Differences

### 1. Protocol Encapsulation

**IGMP**: Carried directly in IPv4 as a separate protocol (protocol number 2):
```text
IPv4 Header (proto=2) | IGMP Message
```

**MLD**: Carried as ICMPv6 (protocol 58), with mandatory Hop-by-Hop Router Alert:
```text
IPv6 Header | Hop-by-Hop Options (Router Alert) | ICMPv6 (MLD Message)
```

The Hop-by-Hop extension header is mandatory for all MLD messages, ensuring on-link multicast routers examine the MLD packet even if they are not the IPv6 destination.

### 2. Link-Local Source Address Requirement

**IGMP**: Uses the interface's IPv4 address as source.

**MLD**: Normally uses a link-local IPv6 address as source. MLDv2 Reports may use the unspecified address (`::`) before a valid link-local address is available (RFC 3590 / RFC 9777). This is why MLD works even before an interface gets a global IPv6 address.

```bash
# Verify MLDv2 Reports and inspect their source address

tcpdump -i eth0 -n -vv 'ip6 protochain 58 and ip6[48] == 143'
# Source is usually fe80::/10; during DAD it may be ::
```

### 3. Report Suppression

**IGMPv2**: Hosts suppress their reports when they hear another host already reporting for the same group.

**MLDv2**: No report suppression - each host reports independently. This is simpler but generates more traffic on busy links.

### 4. Scope Awareness

**IGMP**: IPv4 scope is primarily conveyed by the multicast destination range (for example, 224.0.0.0/24 is never forwarded and 239.0.0.0/8 is administratively scoped). TTL thresholds have also historically been used to limit multicast reach.

**MLD**: Uses the scope field embedded in the multicast address (scope 0x2 = link-local, scope 0x5 = site-local). Routers make forwarding decisions based on the address itself, not packet headers.

## Configuring Both in a Dual-Stack Environment

For dual-stack networks, you need both IGMP and MLD:

```bash
# Inspect both on Linux
cat /proc/net/igmp6    # IPv6 multicast groups joined by this host
cat /proc/net/igmp     # IPv4 IGMP state

# IPv4 multicast groups
ip maddr show
# IPv6 multicast groups
ip -6 maddr show
```

## Routing Protocol Comparison

| Routing Feature | IPv4 | IPv6 |
|---|---|---|
| Dense Mode | PIM-DM | PIM-DM (same RFC) |
| Sparse Mode | PIM-SM (RFC 7761) | PIM-SM (RFC 7761) |
| Source-Specific | PIM-SSM | PIM-SSM (same concept) |
| MSDP for RP sync | Yes | No standardized IPv6 equivalent |
| Embedded RP | No | Optional ASM mechanism (RFC 3956) |

## Summary

IPv6 MLD and IPv4 IGMP serve the same purpose (multicast group management) but have design differences: MLD is part of ICMPv6 (requires Hop-by-Hop extension header), normally uses link-local source addresses, supports scope via address embedding, and has no report suppression in MLDv2. IPv6 also has an optional Embedded RP mechanism for some ASM deployments. For source-specific deployments, MLDv2 with PIM-SSM is the relevant standards-based combination.
