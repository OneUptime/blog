# How to Understand the Dummy IPv6 Prefix (100:0:0:1::/64)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Dummy Prefix, 100:0:0:1::/64, RFC 9003, Routing, Null Route

Description: Understand the IPv6 Dummy Prefix 100:0:0:1::/64 (RFC 9003), its use for dummy routing purposes, and how it differs from the Discard-Only block 100::/64.

## Introduction

`100:0:0:1::/64` is a special-purpose IPv6 prefix allocated as the Dummy IPv6 Prefix by RFC 9780. It is distinct from the `100::/64` discard-only address block defined by RFC 6666. RFC 9780 introduces it for destination IPv6 addresses used in IP/UDP encapsulation of management, control, and OAM packets, replacing the use of IPv6-mapped IPv4 loopback addresses for that role.

## Relationship to the Discard-Only Block

```text
100::/64 - Discard-Only Address Block (RFC 6666)
  Separate special-purpose /64
  Used for IPv6 RTBH (Remote Triggered Black Hole) filtering
  Commonly pointed at a discard or null interface within an AS

100:0:0:1::/64 - Dummy IPv6 Prefix (RFC 9780)
  Separate special-purpose /64
  Not a subnet of 100::/64
  Used as a dummy destination prefix for certain IP/UDP-encapsulated
  management, control, and OAM packets
```

## Use Cases for Dummy Prefixes

```text
1. Multipoint BFD over point-to-multipoint MPLS
   RFC 9780 updates RFC 8562 and says the sender SHOULD use an address
   from 100:0:0:1::/64 as the IPv6 destination address in the IP/UDP
   encapsulation.

2. Active OAM in Geneve
   RFC 9772 says that for IPv6, the inner destination address MUST be
   selected from 100:0:0:1::/64.

3. Replacing IPv6-mapped IPv4 loopback placeholders
   RFC 9780 introduces this prefix specifically to avoid using an
   IPv6-mapped IPv4 loopback address for these encapsulated packets.
```

## Python: Identifying Dummy vs Discard Prefixes

```python
import ipaddress

DISCARD_BLOCK = ipaddress.IPv6Network("100::/64")
DUMMY_PREFIX = ipaddress.IPv6Network("100:0:0:1::/64")

def classify_100_prefix(addr_str: str) -> str:
    """Classify the special-purpose 100::/64 and 100:0:0:1::/64 ranges."""
    try:
        # Try as network
        net = ipaddress.IPv6Network(addr_str, strict=False)
        if net.subnet_of(DUMMY_PREFIX):
            return "Dummy Prefix (RFC 9780)"
        if net.subnet_of(DISCARD_BLOCK):
            return "Discard-Only (RFC 6666)"
    except ValueError:
        pass

    try:
        addr = ipaddress.IPv6Address(addr_str)
        if addr in DUMMY_PREFIX:
            return "Dummy Prefix (RFC 9780)"
        if addr in DISCARD_BLOCK:
            return "Discard-Only (RFC 6666)"
    except ValueError:
        pass

    return "Not in either special-purpose block"

# Tests
print(classify_100_prefix("100:0:0:1::/64"))   # Dummy Prefix
print(classify_100_prefix("100:0:0:1::1"))     # Dummy Prefix
print(classify_100_prefix("100::1"))            # Discard-Only
print(classify_100_prefix("100::"))             # Discard-Only
print(classify_100_prefix("100:0:0:2::1"))      # Not in either special-purpose block
```

## Protocol Examples

```text
RFC 9780 (updates RFC 8562)
  For IPv6, the sender SHOULD use an address from 100:0:0:1::/64 as the
  destination address in the IP/UDP encapsulation for multipoint BFD over
  point-to-multipoint MPLS.

RFC 9772
  For IPv6 active OAM carried in Geneve IP/UDP encapsulation, the inner
  destination IP address MUST be selected from 100:0:0:1::/64.

RFC 4291 context
  RFC 9780 exists in part because an IPv6 loopback destination (::1/128)
  must never be sent outside a single node.
```

## Conclusion

The dummy IPv6 prefix `100:0:0:1::/64` is a special-purpose /64 allocated by RFC 9780 for specific IP/UDP-encapsulated management, control, and OAM traffic. It is not a subnet of `100::/64`, and it is not defined as a general routing placeholder. If you are building policy around these prefixes, treat `100::/64` and `100:0:0:1::/64` as separate special-purpose allocations.
