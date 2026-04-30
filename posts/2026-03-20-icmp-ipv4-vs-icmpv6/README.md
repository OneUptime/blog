# How to Understand ICMP in IPv4 vs ICMPv6 Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, ICMPv6, IPv4, IPv6, Networking, Protocol

Description: Compare ICMPv4 and ICMPv6, understand why ICMPv6 is far more critical to IPv6 operation than ICMPv4 is to IPv4, and learn the key new message types ICMPv6 introduces.

## Introduction

ICMPv4 and ICMPv6 share a common purpose - network error reporting and diagnostics - but their roles differ significantly. ICMPv4 is helpful but less integral to basic IPv4 operation. ICMPv6 is far more critical to IPv6: blocking key ICMPv6 messages breaks IPv6 addressing, routing, and neighbor discovery. Understanding these differences is essential for building correct dual-stack firewall policies.

## Structural Differences

| Feature | ICMPv4 | ICMPv6 |
|---|---|---|
| Protocol Number | 1 | 58 |
| Embedded in | IPv4 | IPv6 |
| ARP replacement | No (uses separate ARP) | Yes (NDP via ICMPv6) |
| Router discovery | Yes (Router Solicitation/Advertisement and Redirect) | Yes (RS, RA via ICMPv6) |
| Multicast management | IGMP (separate) | MLD via ICMPv6 |
| Criticality | Less integral | Integral to basic IPv6 operation |

## ICMPv4 vs ICMPv6 Type Comparison

| Function | ICMPv4 Type | ICMPv6 Type |
|---|---|---|
| Echo Request | 8 | 128 |
| Echo Reply | 0 | 129 |
| Destination Unreachable | 3 | 1 |
| Time Exceeded | 11 | 3 |
| Router Solicitation | 10 | 133 |
| Router Advertisement | 9 | 134 |
| Neighbor Solicitation | - | 135 |
| Neighbor Advertisement | - | 136 |
| Redirect | 5 | 137 |
| MLDv2 Report | - | 143 |

## Why You Cannot Block ICMPv6

```bash
# ICMPv6 Types 133-136 carry key Neighbor Discovery Protocol (NDP) messages

# NDP replaces ARP in IPv6 - blocking it breaks everything

# ICMPv6 Type 135: Neighbor Solicitation (equivalent to ARP request)
# ICMPv6 Type 136: Neighbor Advertisement (equivalent to ARP reply)
# Without these: no on-link MAC address resolution, so local IPv6 communication fails

# ICMPv6 Types 133-134: Router Solicitation / Advertisement
# Without these: stateless address autoconfiguration (SLAAC) fails
# Hosts cannot automatically learn prefixes or a default gateway

# Test ICMPv6 on a system with IPv6
ping -6 ::1                        # Loopback
ping -6 fe80::1%eth0               # Example link-local target with interface scope
ip -6 neigh show                   # Neighbor cache (ICMPv6 NDP results)
```

## Firewall Rules for ICMPv6

```bash
# ip6tables: allow core required ICMPv6 types
# CRITICAL: never block ICMPv6 without these specific allows first

# Allow NDP (Neighbor Discovery)
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-solicitation -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement -j ACCEPT

# Allow Router Discovery (needed for SLAAC)
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-solicitation -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT

# Allow Echo (ping)
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT

# Allow error messages
ip6tables -A INPUT -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
```

## ICMPv6 Packet Too Big (PMTUD Replacement)

```bash
# ICMPv6 Type 2 = Packet Too Big (ICMPv4 equivalent: Type 3 Code 4)
# IPv6 does NOT fragment in transit - routers drop oversized packets
# and send ICMPv6 Packet Too Big back to the sender
# This must be allowed through all firewalls

ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
```

## Conclusion

ICMPv6 is a far more integral part of IPv6 than ICMPv4 is to IPv4. It subsumes ARP, router discovery, and multicast group management in addition to error reporting. Any IPv6 firewall that blocks ICMPv6 without careful exceptions will break basic IPv6 functionality. Always allow NDP types (133-136), Packet Too Big (2), other core error messages such as Destination Unreachable (1), Time Exceeded (3), and Parameter Problem (4), and echo (128/129) at minimum on any IPv6 network.
