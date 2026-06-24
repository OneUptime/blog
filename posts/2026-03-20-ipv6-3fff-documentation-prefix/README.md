# How to Understand the 3fff::/20 Documentation Prefix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Documentation, RFC 9637, Networking, Addressing

Description: Understand the newer 3fff::/20 IPv6 documentation prefix assigned by RFC 9637, why it was created alongside 2001:db8::/32, and how to use both correctly.

## Introduction

In August 2024, RFC 9637 reserved a new, larger IPv6 documentation prefix: `3fff::/20`. This was created to supplement the original `2001:db8::/32` prefix defined in RFC 3849. The new prefix provides significantly more space for examples and documentation, allowing more realistic hierarchical address plan illustrations.

## Why a New Documentation Prefix?

The original `2001:db8::/32` provides only 65,536 /48 subnets for documentation use. While adequate for simple examples, several limitations existed:

1. **Too small for enterprise-scale examples**: Showing realistic ISP or large enterprise address plans within a /32 is cramped
2. **Many real allocations are larger than /32**: RFC 9637 notes that /29 was the most common recorded IPv6 allocation/assignment size in August 2023
3. **Documentation needs for larger allocations**: Authors need room to show realistic, current deployment scenarios that extend beyond a single /32

The `3fff::/20` prefix provides **4,096 /32 blocks** (each the size of the original documentation prefix), enabling richer, more realistic documentation scenarios.

## Address Range Details

```text
Prefix:        3fff::/20
First address: 3fff:0000:0000:0000:0000:0000:0000:0000
Last address:  3fff:0fff:ffff:ffff:ffff:ffff:ffff:ffff

Available /32 blocks: 4,096
Available /48 blocks: 268,435,456
Available /64 blocks: 17,592,186,044,416
```

## Usage Patterns

```text
# Large ISP allocation examples

3fff:1::/32    # ISP-A allocation
3fff:2::/32    # ISP-B allocation
3fff:100::/32  # Tier-2 ISP allocation

# Regional Internet Registry examples
3fff:100::/24  # Simulated ARIN allocation
3fff:200::/24  # Simulated RIPE allocation

# Enterprise hierarchy examples
3fff:1:1::/48  # Organization 1, Site 1
3fff:1:2::/48  # Organization 1, Site 2
3fff:2:1::/48  # Organization 2, Site 1

# Subnets within a site
3fff:1:1:0::/64   # VLAN 0 (management)
3fff:1:1:1::/64   # VLAN 1 (servers)
3fff:1:1:2::/64   # VLAN 2 (users)
```

## Comparing 2001:db8::/32 and 3fff::/20

| Property | 2001:db8::/32 | 3fff::/20 |
|---|---|---|
| RFC | RFC 3849 (2004) | RFC 9637 (2024) |
| Size | /32 (65K /48s) | /20 (268M /48s) |
| Location | 2000::/3 GUA range | 3fff::/16 range |
| Purpose | Simple examples | Complex hierarchy examples |
| ISP filtering | Required | Required |
| Actual traffic | MUST NOT be used | MUST NOT be used |

## Python: Check if an Address is in a Documentation Range

```python
import ipaddress

# Documentation prefixes (both old and new)
DOCUMENTATION_PREFIXES = [
    ipaddress.IPv6Network("2001:db8::/32"),   # RFC 3849
    ipaddress.IPv6Network("3fff::/20"),        # RFC 9637
]

def is_documentation_address(addr_str):
    """Check if an IPv6 address is in a documentation range."""
    try:
        addr = ipaddress.IPv6Address(addr_str)
        return any(addr in prefix for prefix in DOCUMENTATION_PREFIXES)
    except ValueError:
        return False

# Test
test_addresses = [
    "2001:db8::1",          # Old documentation prefix
    "3fff:1::1",            # New documentation prefix
    "2001:4860:4860::8888", # Google DNS (real address)
    "fd12:3456::1",         # ULA (private lab)
]

for addr in test_addresses:
    result = is_documentation_address(addr)
    print(f"{addr}: {'documentation' if result else 'not documentation'}")
```

## Filtering in Network Infrastructure

```bash
# Add 3fff::/20 to bogon lists alongside 2001:db8::/32
# BGP prefix-list (Cisco IOS syntax for documentation)
# ipv6 prefix-list IPV6-BOGONS seq 10 deny 2001:DB8::/32 le 128
# ipv6 prefix-list IPV6-BOGONS seq 20 deny 3FFF::/20 le 128

# Linux ip6tables
sudo ip6tables -A INPUT -s 2001:db8::/32 -j DROP
sudo ip6tables -A INPUT -s 3fff::/20 -j DROP
sudo ip6tables -A OUTPUT -d 2001:db8::/32 -j DROP
sudo ip6tables -A OUTPUT -d 3fff::/20 -j DROP

# nftables
# table inet filter {
#     chain input {
#         type filter hook input priority 0;
#         ip6 saddr 3fff::/20 drop
#         ip6 saddr 2001:db8::/32 drop
#     }
#     chain output {
#         type filter hook output priority 0;
#         ip6 daddr 3fff::/20 drop
#         ip6 daddr 2001:db8::/32 drop
#     }
# }
```

## When to Use Which Prefix

```text
For simple host address examples:
  → Use 2001:db8::1 (familiar, compact)

For subnet examples:
  → Use 2001:db8:1:1::/64 (compact, familiar)

For multi-site enterprise examples:
  → 2001:db8::/32 is still fine for small examples
  → Use 3fff::/20 for larger hierarchies

For ISP-level documentation:
  → Use 3fff:x::/32 for each simulated ISP

For realistic large-scale examples:
  → Use 3fff::/20 sub-allocations
```

## Conclusion

The `3fff::/20` documentation prefix is a welcome addition for IPv6 technical writers who need more space for realistic address plan examples. While `2001:db8::/32` remains the most recognizable documentation prefix, `3fff::/20` enables more comprehensive examples of enterprise and ISP address hierarchies. Both must be filtered from production routing tables and should not be used in actual network deployments.
