# How to Use the Documentation Address Space (2001:db8::/32 and 3fff::/20) - Ipv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Documentation, 2001:db8, 3fff, RFC 3849, RFC 9637

Description: Understand and correctly use the IPv6 documentation address spaces 2001:db8::/32 (RFC 3849) and 3fff::/20 (RFC 9637) in examples, test configurations, and technical writing.

## Introduction

Documentation address spaces are reserved prefixes that should only appear in documentation, examples, and educational materials - never in real network configurations. Using these addresses in examples prevents accidental configuration errors and avoids ambiguity about whether an address is real.

## Documentation Prefixes

| Prefix | RFC | Notes |
|---|---|---|
| 2001:db8::/32 | RFC 3849 (2004) | Original documentation prefix |
| 3fff::/20 | RFC 9637 (2024) | Larger block for modern documentation |

## 2001:db8::/32 - The Classic Documentation Prefix

```bash
# Correct usage in examples:

# DNS zone files
example.example.        IN AAAA 2001:db8::1
subnet-router.example.  IN AAAA 2001:db8:1::1

# Configuration examples
ip -6 addr add 2001:db8::1/64 dev eth0  # This is an EXAMPLE only

# Never use these in production - they are not routable
```

## 3fff::/20 - The Modern Documentation Prefix

```python
import ipaddress

# RFC 9637 allocates 3fff::/20 as additional documentation space
# Provides much more space than the /32

OLD_DOC = ipaddress.IPv6Network("2001:db8::/32")
NEW_DOC = ipaddress.IPv6Network("3fff::/20")

# Number of /32 sub-prefixes in each
print(f"2001:db8::/32 contains {2**(32-32)} /32 prefixes = 1")
print(f"3fff::/20 contains {2**(32-20):,} /32 prefixes = 4096")

# 3fff::/20 is useful when documentation needs to show
# multi-AS scenarios, peering, or large address allocations

example_doc_addresses = [
    "3fff::1",
    "3fff:1::/48",
    "3fff:0abc::/32",
    "3fff:0fff::/32",
]
for addr in example_doc_addresses:
    net = ipaddress.IPv6Network(addr, strict=False)
    in_doc = net.subnet_of(NEW_DOC)
    print(f"{addr}: in 3fff::/20 = {in_doc}")
```

## Guidelines for Documentation Use

```text
DO:
  - Use 2001:db8::/32 in RFC examples, blog posts, man pages
  - Use 3fff::/20 when you need more address space in documentation
  - Use AS 64496-64511 or 65536-65551 (documentation ASN ranges) in BGP examples

DO NOT:
  - Deploy 2001:db8::/32 or 3fff::/20 in production routers
  - Include these prefixes in real zone files
  - Accept BGP routes for these prefixes from peers

Example of WRONG usage (never do this):
  # /etc/network/interfaces (WRONG - do not deploy this)
  iface eth0 inet6 static
    address 2001:db8::1/64    # DOCUMENTATION ADDRESS - NOT REAL
```

## Filtering Documentation Addresses

```bash
# BIRD: reject documentation prefixes in BGP
filter reject_doc_prefixes {
    if net ~ [ 2001:db8::/32+, 3fff::/20+ ] then {
        reject;
    }
    accept;
}

# ip6tables: block documentation source/destination
ip6tables -A INPUT -s 2001:db8::/32 -j DROP
ip6tables -A INPUT -s 3fff::/20 -j DROP
ip6tables -A OUTPUT -d 2001:db8::/32 -j DROP
ip6tables -A OUTPUT -d 3fff::/20 -j DROP
```

## Python Validation

```python
import ipaddress

DOC_PREFIXES = [
    ipaddress.IPv6Network("2001:db8::/32"),
    ipaddress.IPv6Network("3fff::/20"),
]

def is_documentation_address(addr_str: str) -> bool:
    """Return True if address is a documentation/example address."""
    try:
        addr = ipaddress.IPv6Address(addr_str)
        return any(addr in doc for doc in DOC_PREFIXES)
    except ValueError:
        return False

# Validate that production config has no documentation addresses
def validate_config_addresses(addresses: list) -> list:
    return [a for a in addresses if is_documentation_address(a)]

# Test
production_addresses = ["2001:db8::1", "3fff::1", "2001:4860:4860::8888"]
bad = validate_config_addresses(production_addresses)
if bad:
    print(f"ERROR: Documentation addresses in config: {bad}")
```

## Conclusion

Always use `2001:db8::/32` or `3fff::/20` in technical documentation, blog posts, and examples. Filter these prefixes from BGP and routing configurations. The Python validator above can be integrated into configuration management pipelines to detect accidentally deployed documentation addresses. Use real addresses in OneUptime monitoring - never documentation prefixes.
