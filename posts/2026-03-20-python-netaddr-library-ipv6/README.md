# How to Use Python netaddr Library for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Netaddr, Networking, Address Management, IPAM

Description: Use the Python netaddr library for IPv6 address manipulation, prefix operations, and IP set operations beyond the stdlib ipaddress module.

## Why netaddr?

While Python's built-in `ipaddress` module covers most use cases, `netaddr` provides additional features:
- `IPSet` for complex set operations on IP ranges
- `IPRange` for arbitrary IP ranges (not just CIDR)
- Hierarchical prefix operations
- Address spanning and summarization

```bash
pip install netaddr
```

## Basic IPv6 with netaddr

```python
from netaddr import IPAddress, IPNetwork, IPSet, IPRange

# Create an IPv6 address

addr = IPAddress("2001:db8::1", version=6)
print(addr)              # 2001:db8::1
print(addr.version)      # 6
print(addr.is_unicast())     # True
print(addr.is_link_local())  # False
print(addr.is_global())  # False

# Integer representation
print(int(addr))         # Very large number
```

## Working with IPv6 Networks (IPNetwork)

```python
from netaddr import IPAddress, IPNetwork

net = IPNetwork("2001:db8::/32")

print(net.network)       # 2001:db8::
print(net.prefixlen)     # 32
print(net.size)          # Number of addresses (2^96)
print(net.first)         # Integer value of first address
print(net.last)          # Integer value of last address

# Check containment
addr = IPAddress("2001:db8:1::100")
print(addr in net)       # True
```

## IPv6 Subnetting with netaddr

```python
from netaddr import IPNetwork, cidr_merge, cidr_exclude

# Generate subnets
parent = IPNetwork("2001:db8:1::/48")
subnets = list(parent.subnet(64))
print(f"Generated {len(subnets)} /64 subnets")
for s in subnets[:3]:
    print(s)

# Merge adjacent networks into summaries
networks = [
    IPNetwork("2001:db8::/48"),
    IPNetwork("2001:db8:1::/48"),
    IPNetwork("2001:db8:2::/48"),
    IPNetwork("2001:db8:3::/48"),
]
merged = cidr_merge(networks)
print(f"Merged: {[str(n) for n in merged]}")   # ['2001:db8::/46']

# Exclude a subnet from a larger block
remaining = cidr_exclude(IPNetwork("2001:db8::/32"), IPNetwork("2001:db8:1::/48"))
print(f"After exclusion: {len(remaining)} networks")
```

## IPSet for Complex Set Operations

`IPSet` is one of netaddr's most powerful features - it handles arbitrary sets of IP addresses:

```python
from netaddr import IPSet, IPNetwork, IPAddress

# Create an IP set from multiple networks
permitted_set = IPSet([
    "2001:db8:100::/48",
    "2001:db8:200::/48",
])

# Check if an address is in the set
test_addr = IPAddress("2001:db8:100:1::100")
print(test_addr in permitted_set)    # True

# Set operations
blocked_set = IPSet(["2001:db8:100:bad::/64"])
allowed = permitted_set - blocked_set

print(f"Allowed count: {allowed.size}")

# Intersection
overlap = permitted_set & IPSet(["2001:db8::/32"])
print(f"Overlap: {list(overlap.iter_cidrs())[:3]}")
```

## IPRange for Non-CIDR Ranges

```python
from netaddr import IPRange

# Create a range of IPv6 addresses
addr_range = IPRange("2001:db8::100", "2001:db8::200")

print(f"Range size: {addr_range.size}")   # 257

# Iterate (careful with large ranges)
for addr in list(addr_range)[:5]:
    print(addr)

# Convert range to CIDR notation
cidrs = addr_range.cidrs()
for cidr in cidrs:
    print(cidr)
```

## Building an IPAM Tool with netaddr

```python
from netaddr import IPNetwork, IPSet

class SimpleIPAM:
    """Simple IPv6 IPAM using netaddr."""

    def __init__(self, pool_prefix: str):
        self.pool = IPNetwork(pool_prefix)
        self.allocated = IPSet()

    def allocate(self, prefix_len: int) -> IPNetwork | None:
        """Allocate the next available prefix of given length."""
        for subnet in self.pool.subnet(prefix_len):
            if not self._overlaps_allocated(subnet):
                self.allocated.add(subnet)
                return subnet
        return None

    def _overlaps_allocated(self, subnet: IPNetwork) -> bool:
        """Check if subnet overlaps with any allocated prefix."""
        return bool(IPSet([subnet]) & self.allocated)

    def release(self, prefix: str):
        """Release an allocated prefix."""
        self.allocated.remove(IPNetwork(prefix))

# Usage
ipam = SimpleIPAM("2001:db8::/40")

# Allocate /48s for customers
for i in range(3):
    prefix = ipam.allocate(48)
    print(f"Customer {i+1}: {prefix}")

# Release one and reallocate
ipam.release("2001:db8:1::/48")
new_prefix = ipam.allocate(48)
print(f"Reused: {new_prefix}")
```

## Conclusion

The `netaddr` library extends Python's IPv6 capabilities with `IPSet` for set operations, `IPRange` for non-CIDR ranges, and convenient subnet generation. It is particularly useful for IPAM tools, firewall rule analyzers, and any application that needs to perform set-theoretic operations on IP addresses.
