# How to Understand RFC 9099 IPv6 Operational Security Considerations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, RFC 9099, Operation, Best Practice

Description: Understand the operational security considerations for IPv6 networks as defined by RFC 9099, covering infrastructure protection, filtering, and deployment guidance.

## Overview

RFC 9099 (published August 2021) is the primary operational security guidance document for IPv6. It complements earlier work (RFC 4942), providing comprehensive guidance on how to operate IPv6 networks securely. It covers infrastructure protection, traffic filtering, address management, and protocol-specific threats.

## Key Areas Covered by RFC 9099

### 1. IPv6 Address Management

RFC 9099 emphasizes that proper address management is foundational to IPv6 security:

- Use ULA (fc00::/7, normally locally assigned from fd00::/8) for internal-only resources that should not be reachable from the internet
- Use separate prefixes for infrastructure (routers, switches) vs user devices
- Document all prefixes in IPAM systems - the large address space does not eliminate the need for address management

```bash
# Verify your prefix assignments are tracked

# ULA for internal resources
ip -6 addr show to fc00::/7

# Global unicast for external-facing services
ip -6 addr show to 2000::/3
```

### 2. Bogon Filtering

RFC 9099 recommends filtering bogon and reserved space at network edges. Common edge policies include the following categories; allow documented exceptions for services you intentionally use (for example, NAT64) and for more-specific IANA allocations:

| Prefix | Reason |
|--------|--------|
| ::/128 | Unspecified address |
| ::1/128 | Loopback |
| ::ffff:0:0/96 | IPv4-mapped |
| 64:ff9b::/96 | IPv4/IPv6 translation (allow if used) |
| 100::/64 | Discard prefix (RFC 6666) |
| 2001::/23 | IETF protocol assignments (allow valid more-specific allocations) |
| 2001:db8::/32 | Documentation prefix |
| 2002::/16 | 6to4 (deprecated) |
| fc00::/7 | ULA (shouldn't appear in internet routing) |
| fe80::/10 | Link-local (shouldn't be routed) |
| ff00::/8 | Multicast (unless expected) |

```bash
# ip6tables: Drop bogon sources
ip6tables -A INPUT -s ::/128 -j DROP
ip6tables -A INPUT -s ::1/128 -j DROP
ip6tables -A INPUT -s 2001:db8::/32 -j DROP
ip6tables -A INPUT -s fc00::/7 -j DROP
ip6tables -A INPUT -s fe80::/10 -j DROP
```

### 3. ICMPv6 Filtering Policy

RFC 9099 points operators to RFC 4890 for ICMPv6 filtering guidance. A safe policy permits the core ICMPv6 errors needed for IPv6 operation and keeps local-link control messages constrained to the local link:

**Allow / Do Not Drop Without a Policy Reason:**
- Type 1 (Destination Unreachable)
- Type 2 (Packet Too Big) - required for PMTUD
- Type 3 (Time Exceeded)
- Type 4 (Parameter Problem)
- Type 128/129 (Echo Request/Reply) - normally allowed; restrict only by explicit policy
- Types 133-136 (NDP - local link only, where the node role requires them)

**Policy Decision / Optional:**
- Type 137 (Redirect) - explicit local policy decision
- Types 148-149 (SEND) - allow if Secure Neighbor Discovery is deployed

```bash
# ip6tables: Baseline ICMPv6 policy
ip6tables -A INPUT -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT
# NDP must remain on-link; valid messages are received with hop limit 255.
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-solicitation -m hl --hl-eq 255 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -s fe80::/10 -m hl --hl-eq 255 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbour-solicitation -m hl --hl-eq 255 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbour-advertisement -m hl --hl-eq 255 -j ACCEPT
ip6tables -A INPUT -p icmpv6 -j DROP
```

### 4. Routing Infrastructure Protection

RFC 9099 recommends:

- Protect BGP/OSPF/IS-IS sessions with ACLs
- Use authentication on all routing protocols
- Filter routing prefixes with prefix lists
- Rate-limit ICMPv6 on router interfaces

```bash
# Protect router from direct attacks
ip6tables -A INPUT -p tcp --dport 179 -s 2001:db8:100::1/128 -j ACCEPT   # Replace with each trusted BGP peer
ip6tables -A INPUT -p tcp --dport 179 -j DROP   # Block others from reaching BGP
```

### 5. Extension Header Handling

RFC 9099 aligns with RFC 7045 on extension header processing:

- Security devices must fully parse the extension header chain before inspection
- Packets with illegal extension header order, repetition, or incomplete first fragments should be dropped
- Hop-by-Hop options processing on intermediate routers is explicitly configurable and should be rate-limited or filtered according to policy on transit infrastructure

### 6. First-Hop Security

RFC 9099 recommends deploying these first-hop security mechanisms:

- RA Guard (RFC 6105) on access switches
- DHCPv6 Shield (RFC 7610)
- Source Address Validation Improvement (SAVI, RFC 7039)
- Secure Neighbor Discovery (SEND, RFC 3971) - where feasible

## Checklist from RFC 9099

```text
[ ] Bogon prefix filtering at ingress/egress
[ ] ICMPv6 policy follows required/optional guidance
[ ] Extension header policy defined and enforced
[ ] RA Guard deployed on access ports
[ ] DHCPv6 Guard deployed on access ports
[ ] Routing protocol authentication enabled
[ ] Management plane separated from data plane
[ ] Addresses documented in IPAM
[ ] ULA used for internal-only resources
[ ] Logging and monitoring of IPv6 traffic
```

## Summary

RFC 9099 is the definitive operational security reference for IPv6. It covers bogon filtering, ICMPv6 policy, first-hop security, extension header handling, and routing infrastructure protection. Use its guidance to build a structured IPv6 security policy, and check off the key controls: bogon filters, ICMPv6 whitelisting, RA Guard on access ports, protocol authentication, and management plane separation.
