# How to Understand the Dummy IPv6 Prefix (100:0:0:1::/64) - 100

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Dummy Prefix, 100::/64, Networking, Testing, Special-Purpose

Description: Understand the 100:0:0:1::/64 dummy IPv6 prefix, its relationship to the discard-only 100::/64 block, and appropriate testing use cases.

## Introduction

The `100:0:0:1::/64` prefix is the IANA special-purpose Dummy IPv6 Prefix allocated by RFC 9780. It is distinct from the older `100::/64` discard-only block defined by RFC 6666. Understanding the difference prevents unintended behavior.

## Address Block Context

```python
import ipaddress

# 100::/64 is the discard-only block from RFC 6666.
# 100:0:0:1::/64 is the separate Dummy IPv6 Prefix from RFC 9780.

discard_block = ipaddress.IPv6Network("100::/64")
dummy_prefix = ipaddress.IPv6Network("100:0:0:1::/64")

# Check whether the dummy prefix is inside the discard block
print(dummy_prefix.subnet_of(discard_block))  # False

# Check addresses against each block
print(ipaddress.IPv6Address("100::1") in discard_block)  # True
print(ipaddress.IPv6Address("100:0:0:1::1") in discard_block)  # False
print(ipaddress.IPv6Address("100:0:0:1::1") in dummy_prefix)  # True
```

## Appropriate Use Cases and Alternatives

### MPLS OAM and Control-Plane Testing

RFC 9780 defines `100:0:0:1::/64` for destination IPv6 addresses used in IP/UDP encapsulation of management, control, and OAM packets over the MPLS data plane. Use it only when an implementation or specification explicitly calls for the Dummy IPv6 Prefix.

### Placeholder in Configuration Templates

```nginx
# Use documentation space in published config examples
upstream backend {
    server [2001:db8::1]:8080 down;   # Placeholder in documentation
    server [2001:db8::10]:8080;       # Example backend
}
```

### Black-Hole Routing Tests

```bash
# Test routing with the discard-only block from RFC 6666
ip -6 route add blackhole 100::/64

# Verify traffic to 100::/64 is discarded
ping -6 -c 3 100::1
# Traffic should fail

# Cleanup
ip -6 route del blackhole 100::/64
```

## Proper Alternatives for Documentation

For documentation and examples, use a documentation prefix such as `2001:db8::/32`:

```text
# WRONG for documentation:
ip -6 addr add 100:0:0:1::1/64 dev lo

# CORRECT for documentation:
ip -6 addr add 2001:db8::1/64 dev lo  # Use documentation space
```

## Conclusion

The `100:0:0:1::/64` block is the RFC 9780 Dummy IPv6 Prefix, and it is separate from the `100::/64` discard-only block from RFC 6666. For documentation use a documentation prefix such as `2001:db8::/32`; for black-hole routing tests use `100::/64`. Monitor your test infrastructure and ensure special-purpose addresses are used only for their intended roles.
