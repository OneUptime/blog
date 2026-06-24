# How to Understand the Relationship Between Subnet Mask and CIDR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, CIDR, Subnet Mask, Subnetting, Networking

Description: CIDR prefix length and dotted-decimal subnet mask are two representations of the same concept - the number of leading 1-bits in a 32-bit mask - and they are directly interconvertible.

## Two Representations, One Concept

A subnet mask defines which bits of an IP address belong to the network. CIDR notation expresses this as a count of leading 1-bits:

```text
/24 = 255.255.255.0 = 24 ones followed by 8 zeros
/20 = 255.255.240.0 = 20 ones followed by 12 zeros
```

Both representations identify the same network boundary.

## Equivalence Table

| CIDR | Dotted-Decimal | Binary (last 2 octets) |
|------|---------------|----------------------|
| /16 | 255.255.0.0 | 00000000.00000000 |
| /20 | 255.255.240.0 | 11110000.00000000 |
| /24 | 255.255.255.0 | 11111111.00000000 |
| /25 | 255.255.255.128 | 11111111.10000000 |
| /26 | 255.255.255.192 | 11111111.11000000 |
| /28 | 255.255.255.240 | 11111111.11110000 |
| /30 | 255.255.255.252 | 11111111.11111100 |

## Python: Converting Between the Two

```python
import socket, struct

def prefix_to_mask(prefix: int) -> str:
    """Convert /N prefix length to dotted-decimal subnet mask."""
    mask_int = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    return socket.inet_ntoa(struct.pack("!I", mask_int))

def mask_to_prefix(mask: str) -> int:
    """Convert dotted-decimal mask to /N prefix length."""
    packed = socket.inet_aton(mask)
    mask_int = struct.unpack("!I", packed)[0]
    return bin(mask_int).count("1")

# Demonstrate bidirectional conversion

import ipaddress
for cidr_str in ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
                  "10.1.2.0/24", "10.1.2.0/26"]:
    net = ipaddress.IPv4Network(cidr_str)
    mask = str(net.netmask)
    prefix = net.prefixlen
    print(f"/{prefix:2d} <-> {mask:18s}  (wildcard: {net.hostmask})")
```

## Usage Context

| Context | Format Used | Why |
|---------|------------|-----|
| `ip addr add` (Linux) | CIDR: `192.168.1.1/24` | Compact |
| Cisco IOS `interface` | Mask: `192.168.1.1 255.255.255.0` | Historical |
| Cisco IOS `ip route` | Mask: `network mask` | Standard |
| ACLs (Cisco) | Wildcard: `0.0.0.255` | ACL filtering |
| Cisco IOS BGP `network` stmt | Mask form | Cisco syntax |
| Cisco IOS OSPF `network` stmt | Wildcard | Interface matching |

## Historical Note

CIDR was introduced in RFC 1519 (1993) and later updated by RFC 4632 (2006) to replace classful addressing. Before CIDR, the default network boundary was implied by the address class:
- Class A: /8 implied
- Class B: /16 implied
- Class C: /24 implied

CIDR made the prefix length explicit and no longer tied it to address classes, enabling arbitrary prefix lengths.

## Key Takeaways

- CIDR /N and dotted-decimal mask are equivalent for a contiguous IPv4 subnet mask; /N counts the leading 1-bits.
- Convert prefix to mask: `(0xFFFFFFFF << (32-N)) & 0xFFFFFFFF`, then format as dotted-decimal.
- Convert mask to prefix: for a valid subnet mask, count the 1-bits in the 32-bit integer representation.
- Different tools expect different formats; use Python's `ipaddress` module to work with either.
