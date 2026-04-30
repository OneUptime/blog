# How to Configure ip6tables to Allow Essential ICMPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, ICMPv6, Firewall, RFC 4890

Description: Learn which ICMPv6 types are essential and must never be blocked, which can be filtered at the perimeter, and how to write correct ip6tables rules following RFC 4890.

## Overview

ICMPv6 is far more important in IPv6 than ICMP was in IPv4. Many critical IPv6 functions - Neighbor Discovery Protocol (NDP), Path MTU Discovery (PMTUD), and stateless address autoconfiguration (SLAAC) - depend on specific ICMPv6 message types. Incorrectly blocking ICMPv6 can break connectivity in subtle ways that are hard to diagnose.

## ICMPv6 Types Reference

| Type | Name | Function | Policy |
|------|------|----------|--------|
| 1 | Destination Unreachable | Path failure notification | MUST allow |
| 2 | Packet Too Big | Path MTU Discovery | MUST NEVER block |
| 3 | Time Exceeded | TTL/loop detection, traceroute | MUST allow |
| 4 | Parameter Problem | Malformed packet notification | MUST allow |
| 128 | Echo Request | Ping | MUST allow |
| 129 | Echo Reply | Ping response | MUST allow with 128 |
| 133 | Router Solicitation | Router discovery | Allow; source may be assigned or unspecified |
| 134 | Router Advertisement | SLAAC, router discovery | Allow from link-local only |
| 135 | Neighbor Solicitation | NDP (like ARP) | Allow; source may be assigned or unspecified |
| 136 | Neighbor Advertisement | NDP (like ARP reply) | Allow; not limited to link-local source |
| 137 | Redirect | Next-hop optimization | Policy decision; often block |
| 143 | MLDv2 Report | Multicast membership | Allow on LAN only |
| 130-132 | MLD | Multicast Listener Discovery | Allow on LAN, block at perimeter |
| 144-147 | Mobile IPv6 | Home agent discovery, mobile prefix | Block unless Mobile IPv6 used |

## Why Packet Too Big (Type 2) Must NEVER Be Blocked

IPv6 requires Path MTU Discovery (PMTUD, RFC 8201). Routers in IPv6 never fragment packets - they return a "Packet Too Big" ICMPv6 message to the sender, which then reduces its packet size.

If type 2 is blocked:
- Large TCP transfers silently fail after the 3-way handshake
- "Works from ping but not for large files" is a classic PMTUD symptom
- VoIP, video streaming, and any large-packet application breaks

```bash
# This rule MUST be present - NEVER remove it

ip6tables -A INPUT   -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
```

## Why Only Some NDP Must Come From Link-Local

NDP messages (types 133-137) are used for:
- Address resolution (neighbor solicitation/advertisement)
- Router discovery (router solicitation/advertisement)

Router Advertisements and Redirects must use link-local source addresses, but not every NDP message does. Router Solicitations may use an assigned address or the unspecified address (`::`), and Neighbor Solicitations may also use `::` during Duplicate Address Detection. For NDP in general, the reliable on-link check is Hop Limit 255:

```bash
# CORRECT: Router Advertisements must come from link-local;
# other NDP messages must stay on-link (Hop Limit 255)
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-solicitation -m hl --hl-eq 255 -j ACCEPT
ip6tables -A INPUT -s fe80::/10 -p icmpv6 --icmpv6-type router-advertisement -m hl --hl-eq 255 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbour-solicitation -m hl --hl-eq 255 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbour-advertisement -m hl --hl-eq 255 -j ACCEPT
# If you choose to allow Redirect, require link-local source and Hop Limit 255
# ip6tables -A INPUT -s fe80::/10 -p icmpv6 --icmpv6-type redirect -m hl --hl-eq 255 -j ACCEPT

# WRONG: Restricting all NDP to fe80::/10 breaks valid RS/NS traffic
# ip6tables -A INPUT -s fe80::/10 -p icmpv6 --icmpv6-type neighbour-solicitation -j ACCEPT
```

## Example ICMPv6 Policy for a Perimeter Host (RFC 4890-Aligned)

```bash
#!/bin/bash
# Example ICMPv6 ip6tables policy for a perimeter host

# ===== Critical - MUST allow (all directions) =====

# Destination Unreachable (all codes)
ip6tables -A INPUT   -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT

# Packet Too Big - NEVER block
ip6tables -A INPUT   -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# Time Exceeded
ip6tables -A INPUT   -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT

# Parameter Problem
ip6tables -A INPUT   -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT

# ===== NDP =====
# Router Solicitation may use an assigned address or :: during bootstrapping
ip6tables -A INPUT  -p icmpv6 --icmpv6-type router-solicitation -m hl --hl-eq 255 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type router-solicitation -j ACCEPT

# Router Advertisement must come from link-local and stay on-link
ip6tables -A INPUT  -s fe80::/10 -p icmpv6 --icmpv6-type router-advertisement -m hl --hl-eq 255 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT

# Neighbor Solicitation may use an assigned address or :: during DAD
ip6tables -A INPUT  -p icmpv6 --icmpv6-type neighbour-solicitation -m hl --hl-eq 255 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbour-solicitation -j ACCEPT

# Neighbor Advertisement uses an address assigned to the sending interface
ip6tables -A INPUT  -p icmpv6 --icmpv6-type neighbour-advertisement -m hl --hl-eq 255 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbour-advertisement -j ACCEPT

# Redirect is left blocked by default; RFC 4890 says it should be an explicit policy decision

# ===== Echo - allow inbound with rate limit =====
ip6tables -A INPUT  -p icmpv6 --icmpv6-type echo-request \
          -m limit --limit 10/second --limit-burst 30 -j ACCEPT
ip6tables -A INPUT  -p icmpv6 --icmpv6-type echo-reply -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type echo-request -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type echo-reply -j ACCEPT

# ===== Block everything else =====
# If this host participates in multicast on a LAN, add interface-specific
# allow rules for MLD (130-132, 143) before these drop rules.
ip6tables -A INPUT   -p icmpv6 -j DROP
ip6tables -A FORWARD -p icmpv6 -j DROP
```

## Verifying ICMPv6 Policy

```bash
# Test Packet Too Big handling
# From remote host, send large packets:
ping6 -c 3 -s 1500 your-host.example.com
# If this fails while small pings work → PTB is blocked

# Verify NDP works (neighbor resolution)
ip -6 neigh show   # Should show entries for local neighbors

# Test traceroute (requires Time Exceeded to be allowed)
traceroute6 -n 2001:db8::1
# Should show hops, not "* * *" (which would indicate time-exceeded is blocked)
```

## Summary

ICMPv6 requires careful filtering: never block Packet Too Big (type 2 - breaks PMTUD), Destination Unreachable (type 1), Time Exceeded (type 3), or Parameter Problem (type 4). Allow Router Advertisements (type 134) only from link-local sources (fe80::/10), verify NDP stays on-link with Hop Limit 255, and do not blanket-restrict all NDP to fe80::/10 because Router Solicitations and Neighbor Solicitations may legitimately use the unspecified address (`::`). Rate-limit inbound Echo Request (type 128) if desired, but allow Echo Request and Echo Reply through the firewall. Redirects (type 137) are a policy decision and are often blocked. Follow RFC 4890 for complete guidance on the correct ICMPv6 filtering policy.
