# How to Understand SIIT (Stateless IP/ICMP Translation)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SIIT, Protocol Translation, IPv6 Transition, Networking

Description: A detailed explanation of SIIT (Stateless IP/ICMP Translation), the foundational translation algorithm used by NAT64, 464XLAT CLAT, and other IPv6 transition technologies.

## What Is SIIT?

SIIT (Stateless IP/ICMP Translation) is defined in RFC 7915 and provides the algorithmic specification for translating between IPv4 and IPv6 packet headers. It is "stateless" because each packet is translated independently without maintaining connection state - unlike stateful NAT, which tracks sessions.

SIIT is the building block used by:
- NAT64 (which adds stateful bindings on top of SIIT)
- 464XLAT CLAT component
- Tayga (stateless NAT64)
- Jool SIIT module

## Core Translation: IPv6 to IPv4

When translating an IPv6 packet to IPv4, SIIT performs:

| IPv6 Field | IPv4 Field | Notes |
|---|---|---|
| Version (6) | Version (4) | Changed |
| Traffic Class | ToS/DSCP | Copied by default |
| Flow Label | (discarded) | No IPv4 equivalent |
| Payload Length | Total Length | Recalculated |
| Next Header | Protocol | Copied except ICMPv6 (58) → ICMPv4 (1) |
| Hop Limit | TTL | Derived from Hop Limit; decremented while forwarding |
| Source Address | Source Address | Mapped via RFC 6052 prefix or EAMT |
| Destination Address | Destination Address | Mapped via RFC 6052 prefix or EAMT |

## Core Translation: IPv4 to IPv6

When translating an IPv4 packet to IPv6:

| IPv4 Field | IPv6 Field | Notes |
|---|---|---|
| Version (4) | Version (6) | Changed |
| ToS/DSCP | Traffic Class | Copied by default |
| (none) | Flow Label | Set to 0 |
| Total Length | Payload Length | Recalculated |
| Protocol | Next Header | Copied except ICMPv4 (1) → ICMPv6 (58) |
| TTL | Hop Limit | Derived from TTL; decremented while forwarding |
| Source Address | Source Address | Mapped via RFC 6052 prefix or EAMT |
| Destination Address | Destination Address | Mapped via RFC 6052 prefix or EAMT |

## Address Translation via RFC 6052 Prefix

A common algorithmic address mapping uses a configured RFC 6052 translation prefix (for example, the Well-Known Prefix `64:ff9b::/96`). With a /96 prefix, an IPv4 address is embedded in the last 32 bits of the IPv6 address:

```text
IPv4: 93.184.216.34
In hex: 5d b8 d8 22

RFC 6052 prefix: 64:ff9b:0000:0000:0000:0000::/96
IPv6 result:  64:ff9b:0000:0000:0000:0000:5db8:d822
Short form:   64:ff9b::5db8:d822
```

## ICMP Translation

SIIT also handles translation between ICMPv4 and ICMPv6, since they share functionality but have different type codes:

```text
ICMPv4 Echo Request (type 8, code 0) → ICMPv6 Echo Request (type 128, code 0)
ICMPv4 Echo Reply  (type 0, code 0) → ICMPv6 Echo Reply  (type 129, code 0)
ICMPv4 Dest Unreach (type 3)        → ICMPv6 Dest Unreach (type 1)
ICMPv4 Time Exceeded (type 11)      → ICMPv6 Time Exceeded (type 3)
ICMPv4 Frag Needed (type 3, code 4) → ICMPv6 Packet Too Big (type 2, code 0)
```

## Fragmentation in SIIT

IPv6 does not allow router fragmentation (only source fragmentation). SIIT handles this differently for each direction:

**IPv4 fragmented → IPv6**: SIIT translates fragments independently. Existing IPv4 fragments become IPv6 packets with Fragment Headers; when DF is clear and the translated packet would exceed the configured lowest IPv6 MTU, the translator fragments before translating so the resulting IPv6 packets fit.

**IPv6 → IPv4**: IPv6 Fragment Headers are translated into IPv4 fragmentation fields. For non-fragmented packets, SIIT sets or clears the IPv4 DF bit according to RFC 7915; it must fragment only when an IPv6 packet of 1280 bytes or smaller still produces an IPv4 packet larger than the next-hop MTU.

## Stateless vs Stateful Translation

SIIT is purely stateless. Each packet contains enough information to translate it without remembering previous packets. This has trade-offs:

| Aspect | SIIT (Stateless) | NAT64 (Stateful) |
|---|---|---|
| State tracking | None | Per-session state |
| Scalability | Excellent | Limited by state table |
| Address mapping | Algorithmic (1:1) | Dynamic pool |
| IPv4-initiated? | Yes (with EAMT) | No (without static BIB) |
| CPU overhead | Lower | Higher |

## Explicit Address Mapping Table (EAMT)

For deployments where stateless 1:1 translation is needed between specific IPv4 and IPv6 addresses, SIIT uses an EAMT (Explicit Address Mapping Table) defined in RFC 7757:

```text
# EAMT example: map IPv4 /24 to IPv6 /120

# IPv4 host 192.168.1.5 maps to IPv6 2001:db8::c0a8:0105
EAMT entry: 192.168.1.0/24 ↔ 2001:db8::c0a8:0100/120
```

## Checking SIIT with Jool

```bash
# Load Jool SIIT module
modprobe jool_siit

# Create SIIT instance
jool_siit instance add --netfilter

# Add EAMT entries for specific address mappings
jool_siit eamt add 192.0.2.1/32 2001:db8::1/128
jool_siit eamt add 198.51.100.0/24 2001:db8:100::/120

# Set pool6 for algorithmic (non-EAMT) mapping
jool_siit global update pool6 64:ff9b::/96

# Display configuration
jool_siit eamt display
jool_siit global display
```

## Summary

SIIT is the stateless translation algorithm at the heart of IPv6-to-IPv4 protocol translation. It defines field-by-field header translation rules, address mapping via RFC 6052 prefixes and EAMT, and ICMP type mapping. NAT64, 464XLAT CLAT, and SIIT-based gateways all build on these foundational translation rules defined in RFC 7915.
