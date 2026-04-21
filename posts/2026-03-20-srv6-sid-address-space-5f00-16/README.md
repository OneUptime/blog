# How to Understand the SRv6 SID Address Space (5f00::/16) - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, 5f00, SID, RFC 9602, IPv6 Addressing, Networking

Description: Understand the IANA-allocated 5f00::/16 address block for SRv6 Segment Identifiers, its structure, and how it simplifies SRv6 deployment and filtering.

## Introduction

RFC 9602 allocates `5f00::/16` as the dedicated SRv6 SID address space. This provides a well-known, IANA-registered prefix for SRv6 deployments, enabling simpler filtering and operational identification compared to operator-specific prefixes.

## Why 5f00::/16?

Before RFC 9602, operators used their own allocated prefixes for SIDs, so there was no universal prefix that network equipment and tooling could recognize as SRv6 SID space. The dedicated `5f00::/16` allocation allows:

1. Network devices and tooling to recognize the SRv6 SID block consistently
2. Operators to consistently filter SRv6 SIDs at network boundaries
3. Monitoring systems to identify traffic destined to SRv6 SID space

## Address Space Properties

```python
import ipaddress

# 5f00::/16 properties

block = ipaddress.IPv6Network("5f00::/16")

print(f"Network address: {block.network_address}")  # 5f00::
print(f"Last address: {block[-1]}")                  # 5f00:ffff:...
print(f"Total addresses: {block.num_addresses}")     # 2^112

# Globally reachable: No
# Source valid: Yes
# Destination valid: Yes
# Forwardable: Yes

def is_srv6_sid(addr: str) -> bool:
    """Check if an IPv6 address is in the SRv6 SID space."""
    try:
        a = ipaddress.IPv6Address(addr)
        return a in ipaddress.IPv6Network("5f00::/16")
    except ValueError:
        return False

print(is_srv6_sid("5f00:1:1::1"))  # True
print(is_srv6_sid("5f00:ffff::"))  # True
print(is_srv6_sid("5f01::"))       # False
```

## Allocating from 5f00::/16

```text
Example hierarchy (locator lengths are operator-chosen):
  5f00:<site-id>:<node-id>::/48       - Node locator
  5f00:<site-id>:<node-id>:<func-id>:: - Specific SID function

Example for a 3-site network:
  Site 1: 5f00:0001::/32
    R1:    5f00:0001:0001::/48
    R2:    5f00:0001:0002::/48
  Site 2: 5f00:0002::/32
  Site 3: 5f00:0003::/32
```

## Filtering Configuration

```bash
# Block SRv6 SIDs from external untrusted sources first
ip6tables -A FORWARD -d 5f00::/16 \
  -i eth-external -j DROP

# Allow SRv6 SID traffic within your AS
ip6tables -A FORWARD -d 5f00::/16 \
  -s 5f00::/16 -j ACCEPT  # SRv6 internal
```

## Conclusion

The `5f00::/16` SRv6 SID allocation provides a well-known, filterable prefix for SRv6 deployments. New SRv6 deployments can use this space, but IANA marks it as not globally reachable, so keep SR-domain boundary filtering in place. Use OneUptime to monitor locator prefix reachability within `5f00::/16` as a health indicator for your SRv6 infrastructure.
