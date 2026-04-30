# How to Understand IPv6 CIDR Notation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CIDR, Networking, Subnetting, Addressing

Description: Understand IPv6 CIDR (Classless Inter-Domain Routing) notation, how prefix lengths work with 128-bit addresses, and how to read and write IPv6 network prefixes.

## Introduction

IPv6 uses CIDR (Classless Inter-Domain Routing) notation exclusively - there are no "classful" networks in IPv6. A prefix like `2001:db8:1:2::/64` consists of an IPv6 address followed by a slash and a number indicating how many bits constitute the network prefix. Understanding CIDR notation is the foundation of all IPv6 subnetting and routing.

## Anatomy of IPv6 CIDR Notation

```yaml
2001:0db8:0001:0002:0000:0000:0000:0000/64
|<------------ 64 bits --------------->|/64
        Network prefix (64 bits)

Written compactly:
2001:db8:1:2::/64

Components:
  2001:db8:1:2  = The 64-bit network prefix
  ::            = The 64-bit host portion (all zeros in the prefix representation)
  /64           = 64 prefix bits
```

## Reading IPv6 CIDR Prefixes

```python
import ipaddress

def explain_prefix(prefix_str: str):
    """Explain an IPv6 CIDR prefix in detail."""
    net = ipaddress.IPv6Network(prefix_str, strict=False)

    # Expand the address
    expanded = net.network_address.exploded
    # IPv6 has no broadcast address, so compute the last address directly.
    last_address = ipaddress.IPv6Address(int(net.network_address) + net.num_addresses - 1)

    # Show the prefix bits
    prefix_len = net.prefixlen
    binary = format(int(net.network_address), '0128b')
    prefix_part = binary[:prefix_len]
    host_part = binary[prefix_len:]

    print(f"Prefix:         {prefix_str}")
    print(f"Network addr:   {net.network_address}")
    print(f"Expanded:       {expanded}")
    print(f"Prefix length:  {prefix_len} bits")
    print(f"Host bits:      {128 - prefix_len} bits")
    print(f"Netmask:        {net.netmask}")
    print(f"First address:  {net.network_address}")
    print(f"Last address:   {last_address}")
    print()
    print(f"Binary (first 64 bits): {binary[:64]}")
    print(f"       (network part): {'^' * min(prefix_len, 64)}")

# Examples

for prefix in ["2001:db8::/32", "2001:db8:1::/48", "2001:db8:1:1::/64"]:
    explain_prefix(prefix)
    print()
```

## How Prefix Masks Work

The prefix length defines a bitmask. Only bits within the prefix are significant for routing:

```text
Prefix: 2001:db8:1::/48
Mask:   ffff:ffff:ffff:0000:0000:0000:0000:0000

Address: 2001:db8:1:cafe::1
AND mask: ffff:ffff:ffff:0000::
= 2001:db8:1:: → matches the /48 → address IS in this network

Address: 2001:db8:2::1
AND mask: ffff:ffff:ffff:0000::
= 2001:db8:2:: → does NOT match → address NOT in this network
```

```python
import ipaddress

# Check if addresses are in a network
network = ipaddress.IPv6Network("2001:db8:1::/48")

test_addresses = [
    "2001:db8:1::1",           # In the /48
    "2001:db8:1:cafe::1",      # In the /48
    "2001:db8:1:ffff::ffff",   # In the /48
    "2001:db8:2::1",           # NOT in the /48
    "2001:db8:0:1::1",         # NOT in the /48
]

for addr_str in test_addresses:
    addr = ipaddress.IPv6Address(addr_str)
    in_net = addr in network
    print(f"{addr_str:<35} {'IN' if in_net else 'NOT IN'} {network}")
```

## Prefix Notation vs Full Representation

| Compact | Expanded | Prefix bits |
|---|---|---|
| `::1/128` | `0000:0000:0000:0000:0000:0000:0000:0001/128` | 128 |
| `fe80::1/10` | `fe80:0000:0000:0000:0000:0000:0000:0001/10` | 10 |
| `2001:db8::/32` | `2001:0db8:0000:0000:0000:0000:0000:0000/32` | 32 |
| `fc00::/7` | `fc00:0000:0000:0000:0000:0000:0000:0000/7` | 7 |
| `ff02::1/128` | `ff02:0000:0000:0000:0000:0000:0000:0001/128` | 128 |

## Longest Prefix Match

Routing in IPv6 uses longest-prefix-match - the most specific route wins:

```bash
# Routing table example
ip -6 route show

# Example output:
# 2001:db8::/32      via 2001:db8::1    ← less specific
# 2001:db8:1::/48    via 2001:db8::2    ← more specific
# 2001:db8:1:1::/64  dev eth0           ← most specific (local)

# A packet to 2001:db8:1:1::42 matches all three,
# but uses the /64 route (longest match)
```

## Aggregating Prefixes

CIDR allows multiple prefixes to be summarized:

```python
import ipaddress

# Collapse adjacent prefixes
prefixes = [
    "2001:db8:1::/64",
    "2001:db8:1:1::/64",
    "2001:db8:1:2::/64",
    "2001:db8:1:3::/64",
]

nets = [ipaddress.IPv6Network(p) for p in prefixes]
collapsed = list(ipaddress.collapse_addresses(nets))
print([str(n) for n in collapsed])
# Output: ['2001:db8:1::/62']  ← four /64s become one /62
```

## Conclusion

IPv6 CIDR notation is the universal language for describing network prefixes. The prefix length after the slash defines exactly which bits identify the network, enabling both routing decisions (longest-prefix-match) and address containment checks. Mastering CIDR notation - reading prefixes, understanding masks, and knowing which addresses fall within a given prefix - is the prerequisite skill for all IPv6 networking work.
