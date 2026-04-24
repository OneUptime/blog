# How to Use Python netaddr for IPv6 Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Netaddr, IPv6, Subnetting, CIDR, Network Operations, IP Library

Description: Use Python's netaddr library for advanced IPv6 operations including subnetting, IP set operations, prefix manipulation, and network address calculations.

## Introduction

The `netaddr` library provides richer IPv6 operations than Python's built-in `ipaddress` module. It supports IP sets (combining multiple prefixes), iteration over subnets, CIDR merging, and address spanning - useful for firewall rule generation and IP address management.

## Installation

```bash
pip install netaddr
```

## Basic IPv6 Operations

```python
from netaddr import IPAddress, IPNetwork

# Create IPv6 address

addr = IPAddress("2001:db8::1")
print(addr.version)        # 6
print(addr.is_ipv6_unique_local())  # False
print(addr.is_loopback())  # False
print(addr.is_link_local()) # False

# Create IPv6 network
net = IPNetwork("2001:db8::/32")
print(net.network)         # 2001:db8::
print(net.prefixlen)       # 32
print(net.size)            # 79228162514264337593543950336 (2**96)
print(IPAddress(net.first))  # 2001:db8::
print(IPAddress(net.last))   # 2001:db8:ffff:ffff:ffff:ffff:ffff:ffff
```

## Subnetting IPv6

```python
from netaddr import IPNetwork

def subnet_ipv6(prefix: str, new_prefix_len: int):
    """Split an IPv6 network into subnets of new_prefix_len."""
    network = IPNetwork(prefix)
    return list(network.subnet(new_prefix_len))

# Divide a /32 into /48 subnets
subnets = subnet_ipv6("2001:db8::/32", 48)
print(f"Number of /48 subnets: {len(subnets)}")  # 65536
print(f"First: {subnets[0]}")     # 2001:db8::/48
print(f"Second: {subnets[1]}")    # 2001:db8:1::/48

# Divide a /48 into /64 subnets
lan_subnets = subnet_ipv6("2001:db8:1::/48", 64)
print(f"Number of /64 subnets: {len(lan_subnets)}")  # 65536
```

## IP Sets for Firewall Rules

```python
from netaddr import IPSet

# Define allowed IPv6 ranges
allowed = IPSet([
    "2001:db8::/32",        # Internal network
    "2001:db8:ad00::/48",   # Admin subnet
    "::1/128",              # Loopback
])

# Define blocked ranges
blocked = IPSet([
    "2001:db8:dead::/48",
])

# Final allowed set (subtract blocked)
final_allowed = allowed - blocked

# Check if an IP is in the allowed set
def is_allowed(ip: str) -> bool:
    from netaddr import IPAddress
    return IPAddress(ip) in final_allowed

print(is_allowed("2001:db8::1"))       # True
print(is_allowed("2001:db8:dead::1"))  # False
```

## CIDR Merge

```python
from netaddr import cidr_merge

# Merge multiple IPv6 prefixes into the smallest CIDR representation
prefixes = [
    "2001:db8::/48",
    "2001:db8:1::/48",
    "2001:db8:2::/48",
    "2001:db8:3::/48",
]

merged = cidr_merge(prefixes)
for net in merged:
    print(net)  # 2001:db8::/46
```

## CIDR Exclude (Punch Holes)

```python
from netaddr import IPNetwork, cidr_exclude

# Allocate from a /32 but exclude specific /48s
total = IPNetwork("2001:db8::/32")
used = [
    IPNetwork("2001:db8:0::/48"),
    IPNetwork("2001:db8:1::/48"),
]

# Get remaining available space
available = [total]
for used_net in used:
    new_available = []
    for net in available:
        new_available.extend(cidr_exclude(net, used_net))
    available = new_available

print(f"Available prefixes: {len(available)}")
print(f"First available: {available[0]}")  # 2001:db8:2::/47
```

## IPv6 Address Type Classification

```python
from netaddr import IPAddress

def classify_ipv6(addr_str: str) -> dict:
    addr = IPAddress(addr_str, version=6)
    return {
        "address": str(addr),
        "is_loopback": addr.is_loopback(),
        "is_unique_local": addr.is_ipv6_unique_local(),
        "is_link_local": addr.is_link_local(),
        "is_multicast": addr.is_multicast(),
        "is_unicast": addr.is_unicast(),
        "packed": addr.packed.hex(),
    }

for test_addr in ["::1", "fe80::1", "2001:db8::1", "ff02::1"]:
    print(classify_ipv6(test_addr))
```

## Generate IPv6 from EUI-64

```python
from netaddr import EUI, IPNetwork

def eui64_from_mac(mac: str, prefix: str) -> str:
    """Generate an IPv6 EUI-64 address from a MAC address and /64 prefix."""
    mac_addr = EUI(mac)
    net = IPNetwork(prefix)
    ipv6 = mac_addr.ipv6(net.network)
    return str(ipv6)

print(eui64_from_mac("AA:BB:CC:DD:EE:FF", "2001:db8:1::/64"))
# 2001:db8:1:0:a8bb:ccff:fedd:eeff
```

## Conclusion

`netaddr` extends Python's built-in `ipaddress` module with IP sets, CIDR merge/exclude, and MAC-to-EUI-64 conversion. Use `IPSet` for building firewall rule sets, `cidr_merge()` to aggregate prefixes for BGP, and `subnet()` for IPAM allocation. For simple address validation, `ipaddress` is sufficient; for complex network math, `netaddr` excels. Integrate these operations into OneUptime's automation scripts for IPAM management.
