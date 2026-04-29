# How to Calculate the Number of Subnets in an IPv6 Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Subnetting, Mathematics, Networking, CIDR

Description: Learn the formula for calculating the number of IPv6 subnets of any size within a given prefix allocation, with practical examples and a Python calculator.

## Introduction

Calculating the number of IPv6 subnets within an allocation involves simple powers-of-two arithmetic. Unlike IPv4 where you might memorize tables, IPv6 subnet math scales uniformly: the number of subnets of size `/Y` within a prefix of size `/X` is `2^(Y-X)`.

## The Formula

```text
Number of /Y subnets within /X = 2^(Y - X)
  where Y >= X (if Y = X, the count is 1)

Example:
  /48 → /64 subnets: 2^(64-48) = 2^16 = 65,536
  /56 → /64 subnets: 2^(64-56) = 2^8  = 256
  /32 → /48 subnets: 2^(48-32) = 2^16 = 65,536
```

## Complete Reference Table

```python
# Python: generate a complete subnet count reference table

def subnet_count(prefix_len, target_len):
    """Calculate number of /target subnets within /prefix."""
    if target_len < prefix_len:
        return "N/A (target prefix must be >= source prefix)"
    return 2 ** (target_len - prefix_len)

# Common combinations

pairs = [
    (32, 48, "ISP /32 → org /48"),
    (32, 56, "ISP /32 → residential /56"),
    (32, 64, "ISP /32 → subnet /64"),
    (40, 48, "/40 → org /48"),
    (48, 52, "/48 → /52"),
    (48, 56, "/48 → branch /56"),
    (48, 60, "/48 → /60"),
    (48, 64, "/48 → subnet /64"),
    (56, 60, "/56 → /60"),
    (56, 64, "/56 → subnet /64"),
    (60, 64, "/60 → subnet /64"),
]

print(f"{'From':>6} → {'To':>4}  {'Count':>15}  Description")
print("-" * 60)
for prefix, target, desc in pairs:
    count = subnet_count(prefix, target)
    print(f"/{prefix:2d}    → /{target:2d}  {count:>15,}  {desc}")
```

Output:
```text
 From →   To            Count  Description
------------------------------------------------------------
/32    → /48           65,536  ISP /32 → org /48
/32    → /56       16,777,216  ISP /32 → residential /56
/32    → /64    4,294,967,296  ISP /32 → subnet /64
/40    → /48              256  /40 → org /48
/48    → /52               16  /48 → /52
/48    → /56              256  /48 → branch /56
/48    → /60            4,096  /48 → /60
/48    → /64           65,536  /48 → subnet /64
/56    → /60               16  /56 → /60
/56    → /64              256  /56 → subnet /64
/60    → /64               16  /60 → subnet /64
```

## Calculating Subnet Capacity

```python
import ipaddress

def subnet_analysis(prefix: str, target_prefix_len: int):
    """Analyze how many target-size subnets fit in prefix."""
    net = ipaddress.IPv6Network(prefix)
    prefix_len = net.prefixlen

    if target_prefix_len < prefix_len:
        print(f"Error: target /{target_prefix_len} must be /{prefix_len} or larger")
        return

    bits = target_prefix_len - prefix_len
    count = 2 ** bits
    subnet_size = 1 << (net.max_prefixlen - target_prefix_len)
    first_subnet = ipaddress.IPv6Network((net.network_address, target_prefix_len))
    last_network_address = ipaddress.IPv6Address(
        int(net.network_address) + (count - 1) * subnet_size
    )
    last_subnet = ipaddress.IPv6Network((last_network_address, target_prefix_len))

    print(f"Prefix: {prefix}")
    print(f"Target: /{target_prefix_len}")
    print(f"Available subnets: 2^{bits} = {count:,}")
    print(f"First subnet: {first_subnet}")
    print(f"Last subnet:  {last_subnet}")

# Examples
subnet_analysis("2001:db8::/48", 64)   # 65,536 /64s from /48
subnet_analysis("2001:db8::/56", 64)   # 256 /64s from /56
subnet_analysis("2001:db8::/32", 48)   # 65,536 /48s from /32
```

## Practical Questions and Answers

**Q: I have a /48. How many /64 subnets can I create?**
```text
2^(64-48) = 2^16 = 65,536 subnets
```

**Q: My ISP gave me a /56. How many VLANs can I have?**
```text
2^(64-56) = 2^8 = 256 VLANs (one /64 per VLAN)
```

**Q: I need 1,000 subnets. What allocation size do I need?**
```text
Need 2^N ≥ 1000, so N ≥ 10 (2^10 = 1024)
For 1,000 /64 subnets: need a /(64-10) = /54 prefix minimum
A /54 is the mathematical minimum; a larger allocation such as a /48 adds headroom
```

**Q: How many /56 allocations can an ISP give from a /32?**
```text
2^(56-32) = 2^24 = 16,777,216 residential customers
```

## Bits to Subnet Count Quick Reference

| Bits difference (Y-X) | Subnet count |
|---|---|
| 1 | 2 |
| 4 | 16 |
| 8 | 256 |
| 10 | 1,024 |
| 12 | 4,096 |
| 16 | 65,536 |
| 20 | 1,048,576 |
| 24 | 16,777,216 |

## Conclusion

IPv6 subnet counting is purely powers of two: `2^(target - prefix)`. There are no IPv4-style network and broadcast reservations to subtract, though IPv6 still has special-purpose addresses such as the Subnet-Router anycast address. This simplicity means IPv6 address planning focuses on structural decisions rather than tedious arithmetic - use the formula, use a calculator, and focus on designing a logical, scalable hierarchy.
