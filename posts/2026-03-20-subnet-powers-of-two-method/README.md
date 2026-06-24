# How to Subnet Using the Powers of Two Method

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Powers of Two, Networking, Mental Math

Description: The Powers of Two method for subnetting uses the observation that borrowed bits double the subnet count while halving host capacity, enabling quick mental calculation of subnet requirements...

## The Core Relationship

Every time you borrow 1 bit from the host portion:
- Subnet count × 2
- Address block size ÷ 2
- Usable hosts = 2^host_bits − 2

Starting from /24 (254 hosts, 1 subnet within its /24):

| Bits Borrowed | Prefix | Subnets in /24 | Hosts Each |
|--------------|--------|----------------|-----------|
| 0 | /24 | 1 | 254 |
| 1 | /25 | 2 | 126 |
| 2 | /26 | 4 | 62 |
| 3 | /27 | 8 | 30 |
| 4 | /28 | 16 | 14 |
| 5 | /29 | 32 | 6 |
| 6 | /30 | 64 | 2 |

## Applying the Method

**Question**: You need at least 25 hosts per subnet and want to split `192.168.5.0/24`.

1. Find the smallest 2^n − 2 ≥ 25: 2^5 − 2 = 30 ✓ → 5 host bits → /27
2. Borrowed bits = new prefix − parent prefix = 27 − 24 = 3
3. Subnets = 2^3 = 8
4. Block size = 2^5 = 32

```python
import math, ipaddress

def powers_of_two_subnet(parent: str, min_hosts: int):
    """Find optimal prefix using powers-of-two method."""
    # Host bits needed: smallest n such that 2^n - 2 >= min_hosts
    host_bits = math.ceil(math.log2(min_hosts + 2))
    prefix = 32 - host_bits
    parent_net = ipaddress.IPv4Network(parent)
    borrowed = prefix - parent_net.prefixlen
    subnets = 2 ** borrowed
    usable = 2 ** host_bits - 2

    print(f"Minimum hosts required: {min_hosts}")
    print(f"Host bits needed:       {host_bits}")
    print(f"Prefix:                 /{prefix}")
    print(f"Borrowed bits:          {borrowed}")
    print(f"Subnets created:        {subnets}")
    print(f"Usable hosts each:      {usable}")

powers_of_two_subnet("192.168.5.0/24", 25)
```

## Choosing Bits to Borrow

**Question**: You need 6 subnets from `10.1.0.0/24`.

1. Find smallest 2^n ≥ 6: 2^3 = 8 ✓ → borrow 3 bits
2. Prefix = /24 + 3 = /27
3. Hosts per subnet = 2^(8-3) − 2 = 30

## Reverse Calculation: Given Prefix, Find All Properties

```python
def from_prefix(prefix: int):
    import ipaddress
    net = ipaddress.IPv4Network(f"0.0.0.0/{prefix}")
    host_bits = 32 - prefix
    total = net.num_addresses
    usable = total if prefix >= 31 else total - 2  # /31 and /32 are special cases
    block = total  # Block size = subnet size

    print(f"/{prefix}: block={block}  total={total}  usable={usable}")

for p in range(24, 33):
    from_prefix(p)
```

## Key Takeaways

- Each additional borrowed bit: subnets × 2, address block size ÷ 2.
- To find prefix: host_bits = ⌈log₂(needed_hosts + 2)⌉, prefix = 32 − host_bits.
- To find subnets: borrowed = new_prefix − parent_prefix, subnets = 2^borrowed.
- This method works without memorizing mask tables - just powers of 2.
