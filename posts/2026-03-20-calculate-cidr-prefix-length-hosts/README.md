# How to Calculate CIDR Prefix Length for a Given Number of Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, CIDR, Subnetting, Networking, Host Count

Description: To find the CIDR prefix length for a required number of hosts, calculate the ceiling of log₂(hosts + 2) to get the host bits needed, then subtract from 32 to get the prefix length.

## The Formula

```text
host_bits = ⌈log₂(required_hosts + 2)⌉
prefix = 32 - host_bits
usable_hosts = 2^host_bits - 2
```

For standard IPv4 subnets, the `+ 2` accounts for the network address and broadcast address that cannot be assigned to hosts.

## Python Implementation

```python
import math

def prefix_for_hosts(required_hosts: int) -> dict:
    """
    Calculate the CIDR prefix for a standard IPv4 subnet
    that provides at least required_hosts usable addresses.
    """
    if required_hosts <= 0:
        raise ValueError("Required hosts must be positive")

    host_bits = math.ceil(math.log2(required_hosts + 2))
    prefix = 32 - host_bits
    usable = 2 ** host_bits - 2

    return {
        "required": required_hosts,
        "host_bits": host_bits,
        "prefix": f"/{prefix}",
        "usable": usable,
        "waste": usable - required_hosts,
    }

# Calculate for common scenarios

scenarios = [2, 5, 14, 25, 50, 100, 200, 500, 1000, 4000, 65000]
print(f"{'Required':>10} {'host_bits':>10} {'Prefix':>8} {'Usable':>8} {'Waste':>8}")
print("-" * 52)
for n in scenarios:
    r = prefix_for_hosts(n)
    print(f"{r['required']:>10} {r['host_bits']:>10} {r['prefix']:>8} "
          f"{r['usable']:>8} {r['waste']:>8}")
```

## Edge Cases

```python
# /31: 2 usable on a point-to-point link (RFC 3021)
# /32: 1 address as a host route
# These are special cases, so the standard formula gives different results:

for n in [1, 2]:
    bits = math.ceil(math.log2(n + 2))
    prefix = 32 - bits
    print(f"Need {n} host(s): /{prefix} (usable={2**bits - 2})")
# Note: for n=1, the standard formula gives /30; /32 is a host-route special case.
# Note: for n=2, the standard formula gives /30, not /31; /31 is an RFC 3021 point-to-point special case.
```

## Reverse: Given Prefix, What Are Host Limits?

```python
def hosts_from_prefix(prefix: int) -> tuple:
    """Return (total_addresses, usable_hosts) for a CIDR prefix."""
    if not 0 <= prefix <= 32:
        raise ValueError("Prefix must be between 0 and 32")

    host_bits = 32 - prefix
    total = 2 ** host_bits
    if prefix == 31:
        usable = 2
    elif prefix == 32:
        usable = 1
    else:
        usable = max(total - 2, 0)

    return total, usable

# Print a selection
for p in [20, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32]:
    total, usable = hosts_from_prefix(p)
    print(f"/{p}: {usable} usable hosts ({total} total)")
```

## Common Quick-Reference Values for Standard Subnets

| Required Hosts | CIDR Prefix | Usable |
|---------------|------------|--------|
| 2 | /30 | 2 |
| 6 | /29 | 6 |
| 14 | /28 | 14 |
| 30 | /27 | 30 |
| 62 | /26 | 62 |
| 126 | /25 | 126 |
| 254 | /24 | 254 |

## Key Takeaways

- host_bits = ⌈log₂(needed + 2)⌉ for standard IPv4 subnets.
- prefix = 32 − host_bits.
- The resulting prefix gives the smallest standard subnet that fits your requirement.
- Treat /31 and /32 as special cases: /31 for RFC 3021 point-to-point links, /32 for a host route.
