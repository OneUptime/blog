# How to Use Python netaddr for IPv6 Address Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Netaddr, IPAM, Address Management

Description: Use the Python netaddr library for advanced IPv6 address manipulation, supernet/subnet calculation, address sets, and IP range operations beyond the standard ipaddress module.

## Install and Basic Usage

```bash
pip install netaddr
```

```python
from netaddr import IPAddress, IPNetwork, IPRange, IPSet, cidr_merge, cidr_exclude, ipv6_verbose

# Parse IPv6 address

addr = IPAddress("2001:db8::1")
print(addr.version)           # 6
print(addr.is_global())       # False for the documentation prefix
print(addr.is_link_local())   # False
print(int(addr))              # integer representation
print(addr.words)             # tuple of 8 groups
print(addr.format())          # '2001:db8::1'

# Different output formats
print(addr.format(dialect=None))           # compressed
print(addr.format(ipv6_verbose))           # full expansion
```

## IPv6 Network Operations

```python
from netaddr import IPNetwork, IPAddress

# Parse a network
net = IPNetwork("2001:db8::/32")
print(net.network)      # 2001:db8::
print(net.prefixlen)    # 32
print(net.size)         # number of addresses
print(net.first)        # first address as integer
print(net.last)         # last address as integer

# Check membership
print(IPAddress("2001:db8::1") in net)   # True
print(IPAddress("2001:db9::1") in net)   # False

# Iterate subnets
subnets_48 = list(net.subnet(48))
print(f"Number of /48s in a /32: {len(subnets_48)}")
print(f"First: {subnets_48[0]}")
print(f"Last:  {subnets_48[-1]}")

# Get supernet
net48 = IPNetwork("2001:db8:1::/48")
print(net48.supernet(32)[0])   # 2001:db8::/32
```

## IP Sets for Complex Operations

```python
from netaddr import IPSet, IPNetwork

# Build a set of IPv6 networks
allocated = IPSet([
    IPNetwork("2001:db8::/48"),
    IPNetwork("2001:db8:1::/48"),
    IPNetwork("2001:db8:3::/48"),
])

# Total address space
all_space = IPSet([IPNetwork("2001:db8::/32")])

# Find unallocated space
free = all_space - allocated
print(f"Allocated CIDR blocks: {len(list(allocated.iter_cidrs()))}")

# Check for overlap
new_prefix = IPNetwork("2001:db8::/48")
if IPSet([new_prefix]) & allocated:
    print("Overlap detected!")

# Add to set
allocated.add(IPNetwork("2001:db8:4::/48"))

# Remove from set
allocated.remove(IPNetwork("2001:db8::/48"))
```

## IPAM-like Prefix Allocation

```python
from netaddr import IPNetwork, IPSet, cidr_exclude

class IPv6PrefixAllocator:
    """Simple IPv6 prefix allocator using netaddr."""

    def __init__(self, pool: str):
        self.pool = IPNetwork(pool)
        self.allocated = IPSet()

    def allocate(self, prefix_len: int) -> IPNetwork | None:
        """Allocate the next available prefix of given length."""
        for candidate in self.pool.subnet(prefix_len):
            candidate_set = IPSet([candidate])
            if not (candidate_set & self.allocated):
                self.allocated.add(candidate)
                return candidate
        return None  # Pool exhausted

    def release(self, prefix: str):
        """Release an allocated prefix back to the pool."""
        self.allocated.remove(IPNetwork(prefix))

    def utilization(self) -> float:
        """Return pool utilization percentage."""
        pool_size = self.pool.size
        used_size = sum(IPNetwork(c).size for c in self.allocated.iter_cidrs())
        return (used_size / pool_size) * 100

# Usage
allocator = IPv6PrefixAllocator("2001:db8:100::/40")

# Allocate /56 prefixes for subscribers
for i in range(5):
    prefix = allocator.allocate(56)
    print(f"Subscriber {i}: {prefix}")

print(f"Pool utilization: {allocator.utilization():.4f}%")

# Release a prefix
allocator.release("2001:db8:100::/56")
print("After release:")
new_prefix = allocator.allocate(56)
print(f"Next allocation: {new_prefix}")   # Should reuse released prefix
```

## CIDR Merge and Exclude

```python
from netaddr import cidr_merge, cidr_exclude, IPNetwork

# Merge adjacent/overlapping prefixes into minimal set
prefixes = [
    IPNetwork("2001:db8::/48"),
    IPNetwork("2001:db8:1::/48"),
    IPNetwork("2001:db8:2::/48"),
    IPNetwork("2001:db8:3::/48"),
]
merged = cidr_merge(prefixes)
print("Merged:")
for p in merged:
    print(f"  {p}")
# Result: 2001:db8::/46  (4 contiguous /48s merge into /46)

# Exclude a subnet from a block
block = IPNetwork("2001:db8::/32")
exclude = IPNetwork("2001:db8:1::/48")
remaining = list(cidr_exclude(block, exclude))
print(f"\nAfter excluding {exclude}, {len(remaining)} prefixes remain")
```

## IP Range Operations

```python
from netaddr import IPRange, cidr_merge

# Work with ranges (e.g., from imported allocation data)
addr_range = IPRange("2001:db8::", "2001:db8::ffff:ffff")
print(f"Range size: {addr_range.size}")

# Convert range to CIDR list
cidrs = list(addr_range.cidrs())
print(f"CIDR representation: {cidrs}")

# Check if address is in range
from netaddr import IPAddress
print(IPAddress("2001:db8::1234") in addr_range)  # True

# Iterate over addresses in range (use with care - large ranges!)
# for addr in IPRange("2001:db8::", "2001:db8::ff"):
#     print(addr)
```

## Conclusion

The `netaddr` library extends Python's built-in `ipaddress` module with features useful for IPAM and network engineering: `IPSet` for complex set operations (union, intersection, difference) on prefix collections, `cidr_merge()` to collapse adjacent prefixes, `cidr_exclude()` to punch holes in a prefix, and `IPRange` for address ranges. Build a prefix allocator using `IPSet` to track allocated prefixes and `subnet()` to enumerate candidates. For simple validation and parsing, Python's built-in `ipaddress` is sufficient; use `netaddr` when you need IPAM-style operations, prefix math, or set logic across many prefixes.
