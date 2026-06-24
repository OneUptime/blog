# How to Determine the Number of Hosts per Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Host Count, CIDR

Description: The number of usable hosts in an IPv4 subnet is 2 to the power of the host bits minus 2, reserving the network address and broadcast address which cannot be assigned to devices.

## The Formula

```text
Host bits = 32 - prefix_length
Total addresses = 2^host_bits
Usable hosts = 2^host_bits - 2
```

For standard subnets, the -2 accounts for:
1. **Network address**: All host bits = 0 (e.g., 192.168.1.0)
2. **Broadcast address**: All host bits = 1 (e.g., 192.168.1.255)

## Host Count by Prefix

| Prefix | Host Bits | Total | Usable |
|--------|-----------|-------|--------|
| /8 | 24 | 16,777,216 | 16,777,214 |
| /16 | 16 | 65,536 | 65,534 |
| /24 | 8 | 256 | 254 |
| /25 | 7 | 128 | 126 |
| /26 | 6 | 64 | 62 |
| /27 | 5 | 32 | 30 |
| /28 | 4 | 16 | 14 |
| /29 | 3 | 8 | 6 |
| /30 | 2 | 4 | 2 |
| /31 | 1 | 2 | 2 (RFC 3021 point-to-point, no broadcast) |
| /32 | 0 | 1 | 1 (host route) |

## Python Calculation

```python
def hosts_per_subnet(prefix: int) -> dict:
    """
    Calculate address counts for a given CIDR prefix length.
    """
    if not 0 <= prefix <= 32:
        raise ValueError(f"Invalid prefix /{prefix}")

    host_bits = 32 - prefix
    total = 2 ** host_bits

    # Special cases: /31 and /32
    if prefix == 31:
        usable = 2   # RFC 3021: both addresses usable for P2P
    elif prefix == 32:
        usable = 1   # Single host route
    else:
        usable = total - 2

    return {
        "prefix": prefix,
        "host_bits": host_bits,
        "total_addresses": total,
        "usable_hosts": usable,
    }

# Print table

for p in [8, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32]:
    info = hosts_per_subnet(p)
    print(f"/{p:2d}: host_bits={info['host_bits']:2d}  "
          f"total={info['total_addresses']:8d}  "
          f"usable={info['usable_hosts']:8d}")
```

## Choosing the Right Prefix

```python
import math

def prefix_for_hosts(num_hosts: int) -> int:
    """Return the smallest prefix for a standard subnet host requirement."""
    if not 2 <= num_hosts <= (2 ** 32 - 2):
        raise ValueError("For standard subnets, num_hosts must be 2..4294967294")

    # For standard subnets, need num_hosts usable addresses: 2^n - 2 >= num_hosts
    # Handle /31 and /32 separately.
    # So n = ceil(log2(num_hosts + 2))
    host_bits = math.ceil(math.log2(num_hosts + 2))
    return 32 - host_bits

for required in [2, 10, 50, 100, 254, 500, 1000]:
    pfx = prefix_for_hosts(required)
    info = hosts_per_subnet(pfx)
    print(f"Need {required:5d} hosts -> /{pfx} provides {info['usable_hosts']} usable")
```

## Key Takeaways

- Usable hosts = 2^(32 − prefix) − 2 for standard subnets.
- /31 (RFC 3021) provides 2 usable addresses on point-to-point links without a broadcast address.
- /32 is a host route with a single address.
- For standard subnets, add 2 to your required host count before calculating the prefix to account for network and broadcast addresses.
