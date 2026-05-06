# How to Calculate Subnet Masks from CIDR Notation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, CIDR, Subnet Mask, Networking

Description: Converting a CIDR prefix length to a dotted-decimal subnet mask involves setting the first N bits to 1 and remaining bits to 0, then expressing each 8-bit group as a decimal number.

## The Conversion Process

A /N prefix length means the mask has N ones followed by (32 − N) zeros:

```text
/24 = 11111111.11111111.11111111.00000000 = 255.255.255.0
/20 = 11111111.11111111.11110000.00000000 = 255.255.240.0
/28 = 11111111.11111111.11111111.11110000 = 255.255.255.240
```

## Quick Reference Table

| CIDR | Subnet Mask | Hosts |
|------|-------------|-------|
| /8  | 255.0.0.0 | 16,777,214 |
| /16 | 255.255.0.0 | 65,534 |
| /24 | 255.255.255.0 | 254 |
| /25 | 255.255.255.128 | 126 |
| /26 | 255.255.255.192 | 62 |
| /27 | 255.255.255.224 | 30 |
| /28 | 255.255.255.240 | 14 |
| /29 | 255.255.255.248 | 6 |
| /30 | 255.255.255.252 | 2 |
| /31 | 255.255.255.254 | 2 on point-to-point links (RFC 3021, no broadcast) |
| /32 | 255.255.255.255 | 1 (host route) |

## Python: CIDR to Subnet Mask

```python
import ipaddress
import socket, struct

def cidr_to_mask(prefix: int) -> str:
    """Convert a CIDR prefix length to dotted-decimal subnet mask."""
    if not 0 <= prefix <= 32:
        raise ValueError(f"Invalid prefix: {prefix}")
    # Create a 32-bit integer with the top `prefix` bits set to 1
    mask_int = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    return socket.inet_ntoa(struct.pack("!I", mask_int))

def mask_to_cidr(mask: str) -> int:
    """Convert a dotted-decimal subnet mask to CIDR prefix length."""
    network = ipaddress.IPv4Network(f"0.0.0.0/{mask}")
    if str(network.netmask) != mask:
        raise ValueError(f"Invalid subnet mask: {mask}")
    return network.prefixlen

# Examples

for prefix in [8, 16, 20, 24, 25, 26, 27, 28, 29, 30, 31, 32]:
    mask = cidr_to_mask(prefix)
    print(f"/{prefix:2d} -> {mask}")

# Reverse
print(mask_to_cidr("255.255.240.0"))  # 20
```

## Using ipaddress Module

```python
import ipaddress

# Get mask from network object
net = ipaddress.IPv4Network("10.0.0.0/20")
print(f"Mask: {net.netmask}")        # 255.255.240.0
print(f"Wildcard: {net.hostmask}")   # 0.0.15.255
print(f"Hosts: {net.num_addresses - 2}")  # 4094
```

## Key Takeaways

- A /N mask has N bits set to 1 from the left; the remaining (32-N) bits are 0.
- Convert by bit manipulation: `(0xFFFFFFFF << (32-N)) & 0xFFFFFFFF`, then format as dotted-decimal.
- Memorize /24 through /30 for quick mental subnetting.
- Python's `ipaddress` module handles conversions reliably with built-in validation.
