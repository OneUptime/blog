# How to Convert CIDR Notation to Subnet Masks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, CIDR, Subnetting, Subnet Mask, Networking

Description: Converting CIDR notation to subnet masks is a fundamental subnetting skill - you set the top N bits to 1, convert each 8-bit group to decimal, and the result is the dotted-decimal mask.

## Understanding the Conversion

CIDR notation like `192.168.1.0/24` has two parts:
- `192.168.1.0` - the network address
- `/24` - the prefix length (24 bits set to 1 in the mask)

To get the mask, fill 24 ones then 8 zeros across 32 bits:
```text
11111111.11111111.11111111.00000000
   255  .   255  .   255  .   0
= 255.255.255.0
```

## Step-by-Step for Any Prefix

For `/20`:
1. 20 ones, then 12 zeros: `11111111.11111111.11110000.00000000`
2. Convert each octet: 255, 255, 240, 0
3. Result: `255.255.240.0`

The third octet: `11110000` = 128+64+32+16 = **240**

## Python Conversion

```python
import socket
import struct

def cidr_to_dotted(prefix: int) -> str:
    """
    Convert a CIDR prefix length (0-32) to dotted-decimal subnet mask.
    """
    # Shift 32-bit all-ones mask right by (32 - prefix) bits
    mask_int = (0xFFFFFFFF >> (32 - prefix)) << (32 - prefix)
    return socket.inet_ntoa(struct.pack("!I", mask_int))

# Print conversion table

print(f"{'Prefix':>8}  {'Subnet Mask':>18}  {'Binary (last octet)'}")
for p in range(24, 33):
    mask = cidr_to_dotted(p)
    # Binary of last octet
    last_octet = int(mask.split('.')[-1])
    print(f"/{p:<7}  {mask:>18}  {last_octet:08b}")
```

Output:
```text
  Prefix         Subnet Mask  Binary (last octet)
/24            255.255.255.0  00000000
/25          255.255.255.128  10000000
/26          255.255.255.192  11000000
/27          255.255.255.224  11100000
/28          255.255.255.240  11110000
/29          255.255.255.248  11111000
/30          255.255.255.252  11111100
/31          255.255.255.254  11111110
/32          255.255.255.255  11111111
```

## Using the ipaddress Module

```python
import ipaddress

def cidr_info(cidr: str):
    """Parse CIDR and print mask, wildcard, and host count."""
    net = ipaddress.IPv4Network(cidr, strict=False)
    print(f"CIDR         : {cidr}")
    print(f"Subnet Mask  : {net.netmask}")
    print(f"Wildcard Mask: {net.hostmask}")
    print(f"Network      : {net.network_address}")
    print(f"Broadcast    : {net.broadcast_address}")
    print(f"Usable Hosts : {max(net.num_addresses - 2, 0)}")

cidr_info("10.0.0.0/22")
```

## Reverse: Dotted Mask to CIDR

```python
def mask_to_prefix(mask: str) -> int:
    """Convert dotted-decimal mask to CIDR prefix length."""
    packed = socket.inet_aton(mask)
    mask_int = struct.unpack("!I", packed)[0]
    # Count leading 1-bits
    return bin(mask_int).count("1")

print(mask_to_prefix("255.255.240.0"))  # 20
print(mask_to_prefix("255.255.255.252"))  # 30
```

## Key Takeaways

- Set top N bits to 1 across 32 bits, convert each octet to decimal.
- The critical octet (where 1s and 0s split) takes values from the set: 128, 192, 224, 240, 248, 252, 254, 255.
- Use Python's `ipaddress` module for reliable, validated conversions.
- Memorize /24–/30 masks for rapid subnetting during network planning.
