# How to Understand IPv6 Security Filtering Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Filtering, Firewall, Best Practice

Description: Learn the comprehensive best practices for IPv6 traffic filtering at both perimeter and host levels, including ICMPv6 policy, bogon filtering, and extension header handling.

## Overview

IPv6 filtering best practices differ from IPv4 in key ways: ICMPv6 is integral to core protocol functions (NDP, PMTUD), some header fields have no IPv4 equivalent (Flow Label, extension headers), and first-hop security is more complex. This guide provides a complete framework for IPv6 filtering based on RFC 4890 and operational experience.

## RFC 4890: ICMPv6 Filtering Recommendations

RFC 4890 is the authoritative guide on which ICMPv6 messages to allow and which to block. It distinguishes between transit traffic and local-link configuration traffic on the firewall or host itself:

### Must Not Drop (Critical Functionality)

| Type / Code | Name | Why Critical |
|------|------|-------------|
| 1 | Destination Unreachable | Path failure notification |
| 2 | Packet Too Big | Required for PMTUD - must never be blocked |
| 3 | Time Exceeded | Code 0 is critical for hop-limit expiry; Code 1 normally should not be dropped |
| 4 | Parameter Problem | Codes 1-2 are critical; Code 0 normally should not be dropped |
| 128 | Echo Request | Reachability testing and IPv6 connectivity checks |
| 129 | Echo Reply | Response to echo request |
| 133-136 | NDP / SLAAC | Required on-link; use Hop Limit = 255 and message-specific source checks instead of assuming every message uses `fe80::/10` |

### Local-Link or Policy-Dependent Messages

| Type | Name | Policy |
|------|------|--------|
| 130-132, 143 | Multicast Listener Discovery | Allow on hosts that participate in IPv6 multicast; routers and bridges also need inbound reports; these are local-link control messages, not internet-routed traffic |
| 137 | Redirect | Case-by-case policy decision; RFC 4890 treats redirects as a security-sensitive exception |
| 144-147 | Mobile IPv6 | Usually ignored unless Mobile IPv6 is deployed; do not block if mobility support is required |
| 148-149 | SEND | Allow only if SEND is deployed |

## Complete ip6tables Best Practice Policy

```bash
#!/bin/bash
# IPv6 best practice filtering policy

# Flush existing rules

ip6tables -F
ip6tables -X

# Default policies
ip6tables -P INPUT   DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT  ACCEPT

# Allow loopback
ip6tables -A INPUT -i lo -j ACCEPT

# Allow established and related connections
ip6tables -A INPUT  -m state --state ESTABLISHED,RELATED -j ACCEPT
ip6tables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# === ICMPv6 - Critical (RFC 4890) ===
# Packet Too Big - MUST allow (PMTUD)
ip6tables -A INPUT   -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# Destination Unreachable
ip6tables -A INPUT   -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT

# Time Exceeded
ip6tables -A INPUT   -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT

# Parameter Problem
ip6tables -A INPUT   -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
ip6tables -A FORWARD -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT

# NDP / SLAAC - require Hop Limit 255; Router Advertisements must come from link-local sources
ip6tables -A INPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type router-solicitation -j ACCEPT
ip6tables -A INPUT -s fe80::/10 -p icmpv6 -m hl --hl-eq 255 --icmpv6-type router-advertisement -j ACCEPT
ip6tables -A INPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type neighbour-solicitation -j ACCEPT
ip6tables -A INPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type neighbour-advertisement -j ACCEPT

# MLD query - allow on hosts that participate in IPv6 multicast
ip6tables -A INPUT -s fe80::/10 -p icmpv6 -m hl --hl-eq 1 --icmpv6-type mld-listener-query -j ACCEPT

# Echo (ping) - allow, optionally rate-limit
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -m limit --limit 10/s -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT

# Block all other ICMPv6
ip6tables -A INPUT -p icmpv6 -j DROP

# === Bogon Source Filtering ===
# Scope ULA/link-local source filters to untrusted or perimeter-facing interfaces only.
ip6tables -A INPUT -s ::/128 -j DROP
ip6tables -A INPUT -s ::1/128 -j DROP
ip6tables -A INPUT -s ::ffff:0:0/96 -j DROP
ip6tables -A INPUT -s 2001:db8::/32 -j DROP

# === Extension Headers ===
# Block Routing Header Type 0 (deprecated)
ip6tables -A INPUT   -m rt --rt-type 0 -j DROP
ip6tables -A FORWARD -m rt --rt-type 0 -j DROP

# === Services ===
ip6tables -A INPUT -p tcp --dport 22  -j ACCEPT
ip6tables -A INPUT -p tcp --dport 80  -j ACCEPT
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# === Logging before final drop ===
ip6tables -A INPUT   -j LOG --log-prefix "IPv6-IN-DROP: "
ip6tables -A FORWARD -j LOG --log-prefix "IPv6-FWD-DROP: "
```

## nftables Best Practice Policy

```bash
#!/usr/sbin/nft -f
# nftables IPv6 best practice

table ip6 filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept

        # ICMPv6 critical
        icmpv6 type { destination-unreachable, packet-too-big, time-exceeded, parameter-problem } accept
        ip6 hoplimit 255 icmpv6 type { nd-router-solicit, nd-neighbor-solicit, nd-neighbor-advert } accept
        ip6 saddr fe80::/10 ip6 hoplimit 255 icmpv6 type nd-router-advert accept
        ip6 saddr fe80::/10 ip6 hoplimit 1 icmpv6 type mld-listener-query accept
        icmpv6 type echo-request limit rate 10/second accept
        icmpv6 type echo-reply accept
        meta l4proto ipv6-icmp drop

        # Bogon sources
        # Scope ULA/link-local source filters to untrusted or perimeter-facing interfaces only.
        ip6 saddr { ::/128, ::1/128, ::ffff:0:0/96, 2001:db8::/32 } drop

        # Services
        tcp dport { 22, 80, 443 } accept

        log prefix "IPv6-DROP: "
    }
}
```

## Perimeter vs Host Filtering

| Control | Perimeter Firewall | Host Firewall |
|---------|-------------------|---------------|
| Bogon filtering | Yes - at ingress | Optional - scope ULA/link-local filters to untrusted interfaces |
| ICMPv6 policy | Allow transit-critical ICMPv6; local-link control traffic is not normally routed across the perimeter | Allow transit-critical ICMPv6 plus host-local NDP/SLAAC traffic; allow MLD queries if the host uses multicast |
| Extension headers | Block RH0, audit others | Block RH0 |
| NDP (RS/RA/NS/NA) | Not normally forwarded by routers; drop on internet-facing paths | Allow on-link with Hop Limit 255; Router Advertisements must come from link-local sources |
| Stateful inspection | Yes | Yes |

## Summary

IPv6 filtering best practices require: (1) never blocking Packet Too Big (type 2), which breaks PMTUD; (2) allowing NDP on-link with Hop Limit 255, with Router Advertisements restricted to link-local sources; (3) filtering bogon prefixes at ingress, while scoping ULA/link-local source filters to untrusted interfaces; (4) blocking Routing Header Type 0; (5) logging drops for SIEM analysis. Use the ip6tables or nftables templates as a starting point and adapt to your service requirements. Review against RFC 4890 for ICMPv6 policy guidance.
