# How to Use Python ipaddress Module for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Ipaddress, IPv6, Standard Library, Validation, Subnetting, RFC 5952

Description: Master Python's built-in ipaddress module for IPv6 address parsing, validation, comparison, subnetting, and network calculations without external dependencies.

## Introduction

Python's `ipaddress` module (stdlib since 3.3) provides comprehensive IPv6 support. It handles address parsing, prefix normalization, subnet operations, and address type classification - all without installing additional packages.

## Basic Address Operations

```python
import ipaddress

# Parse IPv6 address

addr = ipaddress.IPv6Address("2001:DB8::1")
print(str(addr))          # 2001:db8::1 (canonical lowercase)
print(repr(addr))         # IPv6Address('2001:db8::1')
print(addr.version)       # 6
print(addr.packed)        # b'\x20\x01...' (16 bytes)
print(addr.exploded)      # 2001:0db8:0000:0000:0000:0000:0000:0001
print(addr.compressed)    # 2001:db8::1

# Equality and comparison
a1 = ipaddress.IPv6Address("::1")
a2 = ipaddress.IPv6Address("0::1")
print(a1 == a2)  # True - same address

# Check address properties
addr = ipaddress.IPv6Address("::1")
print(addr.is_loopback)   # True
print(addr.is_private)    # True

addr = ipaddress.IPv6Address("fe80::1")
print(addr.is_link_local)  # True

addr = ipaddress.IPv6Address("2001:db8::1")
print(addr.is_global)      # False (documentation range)
```

## Network Operations

```python
import ipaddress

# Create network
net = ipaddress.IPv6Network("2001:db8::/32")
print(net.network_address)   # 2001:db8::
print(net.prefixlen)         # 32
print(net.num_addresses)     # 79228162514264337593543950336

# Check containment
addr = ipaddress.IPv6Address("2001:db8::1")
print(addr in net)  # True

# Iterate subnets
subnets = list(net.subnets(prefixlen_diff=16))  # /32 → /48
print(len(subnets))          # 65536
print(subnets[0])            # 2001:db8::/48
print(subnets[1])            # 2001:db8:1::/48

# Network overlap check
net1 = ipaddress.IPv6Network("2001:db8::/32")
net2 = ipaddress.IPv6Network("2001:db8:1::/48")
print(net1.overlaps(net2))   # True
print(net2.subnet_of(net1))  # True
print(net1.supernet_of(net2)) # True
```

## Validation Patterns

```python
import ipaddress
from typing import Optional, Union

def parse_ip(address: str) -> Optional[Union[ipaddress.IPv4Address, ipaddress.IPv6Address]]:
    """Parse IPv4 or IPv6 address, return None if invalid."""
    try:
        return ipaddress.ip_address(address)
    except ValueError:
        return None

def validate_public_ipv6(addr_str: str) -> bool:
    """Return True if addr_str is a valid, public (global) IPv6 address."""
    try:
        addr = ipaddress.IPv6Address(addr_str)
        return (
            addr.is_global and
            not addr.is_loopback and
            not addr.is_multicast and
            not addr.is_link_local and
            not addr.is_unspecified
        )
    except ValueError:
        return False

# Test
print(validate_public_ipv6("2606:4700::6810:84e5"))  # True (Cloudflare)
print(validate_public_ipv6("::1"))                   # False (loopback)
print(validate_public_ipv6("fe80::1"))               # False (link-local)
print(validate_public_ipv6("2001:db8::1"))           # False (documentation)
```

## IPv4-Mapped IPv6 Addresses

```python
import ipaddress

# IPv4-mapped IPv6: ::ffff:1.2.3.4
mapped = ipaddress.IPv6Address("::ffff:192.0.2.1")
print(mapped.ipv4_mapped)        # IPv4Address('192.0.2.1')
print(mapped.is_private)         # True (inherits embedded IPv4 classification)

# Not every embedded-IPv4 form is IPv4-mapped
not_mapped = ipaddress.IPv6Address("::192.0.2.1")
print(not_mapped.ipv4_mapped)    # None

# Normalize: extract IPv4 from mapped
def normalize_address(addr_str: str) -> str:
    try:
        addr = ipaddress.ip_address(addr_str)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return str(addr.ipv4_mapped)
        return str(addr)
    except ValueError:
        return addr_str
```

## Subnetting and IPAM

```python
import ipaddress

def allocate_customer_subnets(pool: str, prefix_len: int = 48) -> list:
    """Allocate /48 customer subnets from a /32 pool."""
    pool_net = ipaddress.IPv6Network(pool)
    return [str(subnet) for subnet in pool_net.subnets(new_prefix=prefix_len)]

# First 10 customer /48 allocations from 2001:db8::/32
customers = allocate_customer_subnets("2001:db8::/32", 48)[:10]
for i, subnet in enumerate(customers, 1):
    print(f"Customer {i}: {subnet}")
```

## Sorting and Deduplication

```python
import ipaddress

addresses = ["2001:db8::10", "::1", "2001:db8::1", "fe80::1", "2001:db8::2"]

# Sort IPv6 addresses
sorted_addrs = sorted(addresses, key=lambda a: ipaddress.ip_address(a))
print(sorted_addrs)

# Deduplicate
unique = list({str(ipaddress.ip_address(a)) for a in addresses})
```

## Conclusion

Python's built-in `ipaddress` module handles all common IPv6 operations: parsing, validation, subnet calculations, containment checks, and address type classification. Use `ip_address()` for unknown input, `IPv6Address()` when you know it's IPv6, and `IPv6Network()` for prefix operations. The module is zero-dependency and production-ready. Integrate `ipaddress` validation into OneUptime's monitoring configuration parsers.
