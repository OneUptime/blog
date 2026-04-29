# How to Calculate IPv6 Subnets from a /48 Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Subnetting, Address Planning, Networking, CIDR

Description: Learn how to calculate and allocate IPv6 subnets from a /48 prefix allocation, including the number of available /64 subnets and practical address planning techniques.

## Introduction

A /48 prefix is a common IPv6 allocation given to organizations by their ISP or Regional Internet Registry (RIR). From a /48, you have 16 bits of subnet space (bits 49-64) to allocate subnets, yielding 65,536 individual /64 subnets. This guide shows you how to calculate, plan, and number those subnets.

## The Math

```text
/48 prefix has 128 - 48 = 80 bits remaining
/64 subnets use the next 64 - 48 = 16 bits for subnet IDs
Interface addresses use the final 64 bits

Available /64 subnets from a /48 = 2^16 = 65,536
```

## Visual Representation

```yaml
|<------ 48 bits ------>|<-- 16 bits -->|<----- 64 bits ----->|
|    Organization prefix |  Subnet ID    |  Interface ID       |
|    2001:db8:1::/48     |  0000-ffff    |  host portion       |
```

## Calculating Subnet Ranges

Given the prefix `2001:db8:acad::/48`:

```python
import ipaddress

def list_subnets_from_48(prefix_48, count=10):
    """
    List /64 subnets available from a /48 prefix.

    Args:
        prefix_48: IPv6 /48 prefix string
        count: number of subnets to list
    """
    network = ipaddress.IPv6Network(prefix_48)
    subnets = list(network.subnets(new_prefix=64))

    print(f"Prefix: {prefix_48}")
    print(f"Total /64 subnets available: {len(list(network.subnets(new_prefix=64)))}")
    print(f"\nFirst {count} subnets:")
    for i, subnet in enumerate(subnets[:count]):
        print(f"  Subnet {i:5d}: {subnet}")

    print(f"\nLast {count} subnets:")
    for subnet in subnets[-count:]:
        print(f"  {subnet}")

list_subnets_from_48("2001:db8:acad::/48", count=5)
```

Output:
```text
Prefix: 2001:db8:acad::/48
Total /64 subnets available: 65536

First 5 subnets:
  Subnet     0: 2001:db8:acad::/64
  Subnet     1: 2001:db8:acad:1::/64
  Subnet     2: 2001:db8:acad:2::/64
  Subnet     3: 2001:db8:acad:3::/64
  Subnet     4: 2001:db8:acad:4::/64

Last 5 subnets:
  2001:db8:acad:fffb::/64
  2001:db8:acad:fffc::/64
  2001:db8:acad:fffd::/64
  2001:db8:acad:fffe::/64
  2001:db8:acad:ffff::/64
```

## Subnet Numbering Strategies

### Decimal Sequential (Simplest)

```text
2001:db8:acad:0001::/64  →  VLAN 1
2001:db8:acad:0002::/64  →  VLAN 2
2001:db8:acad:0003::/64  →  VLAN 3
...
2001:db8:acad:00ff::/64  →  VLAN 255
```

### Hexadecimal with Meaning

```text
2001:db8:acad:0001::/64  →  Site 1 LAN
2001:db8:acad:0100::/64  →  Site 1 WAN/infrastructure
2001:db8:acad:0101::/64  →  Site 1 VLAN 1
2001:db8:acad:0102::/64  →  Site 1 VLAN 2
2001:db8:acad:0200::/64  →  Site 2 WAN/infrastructure
2001:db8:acad:0201::/64  →  Site 2 VLAN 1
```

### Site-Based (for Multi-Site Organizations)

```text
# 8 bits for site number, 8 bits for VLAN

2001:db8:acad:SSLL::/64
  SS = site number (00-ff = 256 sites)
  LL = VLAN/subnet number within site (00-ff = 256 subnets/site)

2001:db8:acad:0101::/64  →  Site 01, VLAN 01
2001:db8:acad:0102::/64  →  Site 01, VLAN 02
2001:db8:acad:0201::/64  →  Site 02, VLAN 01
```

## Allocating /56 Blocks within a /48

You can also carve your /48 into /56 blocks to delegate to branches:

```python
import ipaddress

def allocate_56_from_48(prefix_48):
    """Show /56 allocations within a /48."""
    network = ipaddress.IPv6Network(prefix_48)
    subnets_56 = list(network.subnets(new_prefix=56))
    print(f"Total /56 allocations from {prefix_48}: {len(subnets_56)}")
    for i, s in enumerate(subnets_56[:8]):
        print(f"  Branch {i}: {s}")

allocate_56_from_48("2001:db8:acad::/48")
# Total /56 allocations: 256
# Branch 0: 2001:db8:acad::/56   (subnets :0000: to :00ff:)
# Branch 1: 2001:db8:acad:100::/56
# ...
```

## Quick Reference

| From /48, you get... | Count |
|---|---|
| /49 subnets | 2 |
| /52 subnets | 16 |
| /56 subnets | 256 |
| /60 subnets | 4,096 |
| /64 subnets | 65,536 |
| Addresses per /64 | 2^64 ≈ 18.4 quintillion |

## Conclusion

A /48 provides a very large amount of address space, with 65,536 /64 subnets available. The key decisions are how to number your subnet IDs (bits 49-64) to make your addressing scheme readable, hierarchical, and easy to summarize in routing. Plan your subnet numbering scheme before deployment - changing it later requires renumbering.
