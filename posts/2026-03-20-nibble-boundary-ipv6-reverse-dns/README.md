# How to Understand the Nibble-Boundary Format for IPv6 Reverse DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Reverse DNS, Ip6.arpa, Nibble Format

Description: A detailed explanation of the nibble-boundary format used for IPv6 reverse DNS zone delegation in ip6.arpa, including how to calculate zone boundaries correctly.

## Why Nibble Boundaries Matter for IPv6 rDNS

IPv6 reverse DNS uses nibble-by-nibble representation, meaning each hex digit occupies one DNS label. Because DNS zones can only be delegated at label boundaries, IPv6 reverse DNS can only be delegated at **nibble boundaries** - multiples of 4 bits.

This is a fundamental difference from IPv4, where delegation happens at octet (8-bit) boundaries.

## The Nibble Format Explained

The IPv6 address `2001:0db8:0000:0001:0000:0000:0000:0001` expanded to 32 hex digits is:

```text
2 0 0 1 0 d b 8 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1
```

Reversed nibble by nibble:

```text
1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 8 b d 0 1 0 0 2
```

With dots between each nibble and `.ip6.arpa.` appended:

```text
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.
```

## Zone Boundaries at Common Prefix Lengths

| Prefix Length | Nibbles (prefix length / 4) | Zone Suffix |
|---|---|---|
| /32 | 8 nibbles | `8.b.d.0.1.0.0.2.ip6.arpa` (for 2001:db8::/32) |
| /48 | 12 nibbles | `e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa` (for 2001:db8:cafe::/48) |
| /56 | 14 nibbles | `b.a.e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa` (for 2001:db8:cafe:ab00::/56) |
| /64 | 16 nibbles | `d.c.b.a.e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa` (for 2001:db8:cafe:abcd::/64) |

## Non-Nibble-Boundary Delegation Problem

If your ISP gives you a `/52` prefix like `2001:db8::/52`, there is no clean nibble boundary at /52. The nibble boundaries nearest to /52 are /48 and /56.

Options:
1. Request the ISP to delegate the full `/48` for rDNS (preferred)
2. Use RFC 2317-style classless delegation with CNAME chains (complex)
3. The ISP maintains the rDNS zone and you submit PTR records to them

## Calculating the Zone Name for Any Prefix

Use this Python script to compute the ip6.arpa zone name for any prefix:

```python
#!/usr/bin/env python3
# Calculate ip6.arpa zone name for an IPv6 prefix

# Usage: python3 ipv6-zone.py 2001:db8::/48

import ipaddress
import sys

prefix = sys.argv[1]
network = ipaddress.ip_network(prefix, strict=False)

# Get the full hex address (32 characters)
full_hex = network.network_address.exploded.replace(':', '')

# Calculate how many nibbles the prefix covers
prefix_len = network.prefixlen
nibble_count = prefix_len // 4

# Take the first nibble_count characters, reverse them
zone_nibbles = list(full_hex[:nibble_count])
zone_nibbles.reverse()

zone_name = '.'.join(zone_nibbles) + '.ip6.arpa'
print(f"Zone name: {zone_name}")
print(f"Zone file path suggestion: /var/named/{zone_name.replace('.', '-')}.rev")
```

```bash
# Usage examples
python3 ipv6-zone.py 2001:db8::/48
# Zone name: 0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa

python3 ipv6-zone.py 2001:db8:cafe::/48
# Zone name: e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa

python3 ipv6-zone.py 2001:db8::/32
# Zone name: 8.b.d.0.1.0.0.2.ip6.arpa
```

## Common Prefix Lengths and Their Zone Names

```text
ISP-level /32:
  Prefix: 2001:db8::/32
  Zone:   8.b.d.0.1.0.0.2.ip6.arpa.

Organization /48:
  Prefix: 2001:db8:cafe::/48
  Zone:   e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa.

Site /56:
  Prefix: 2001:db8:cafe:ab00::/56
  Zone:   b.a.e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa.

Subnet /64:
  Prefix: 2001:db8:cafe:abcd::/64
  Zone:   d.c.b.a.e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa.
```

## Named Zone Configuration for /48

```named
// /etc/named.conf
zone "e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa" IN {
    type master;
    file "/var/named/2001-db8-cafe.rev";
};
```

## Summary

IPv6 reverse DNS zones must align to nibble boundaries (every 4 bits of the prefix length). Each nibble becomes one DNS label in the `ip6.arpa` zone hierarchy. The zone name is computed by taking the first N nibbles of the IPv6 prefix (where N = prefix length / 4), reversing them, and appending `.ip6.arpa`. Non-nibble-boundary prefixes (e.g., /52) require special handling such as CNAME delegation or ISP coordination.
