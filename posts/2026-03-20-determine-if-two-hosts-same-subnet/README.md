# How to Determine If Two Hosts Are on the Same Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Network Diagnostics, Python

Description: Two hosts are on the same subnet if applying the subnet mask to both IP addresses produces the same network address, which can be checked with bitwise AND or Python's ipaddress module.

## The Test: Bitwise AND

Two hosts are on the same subnet for a given mask if:
```text
IP_A AND mask == IP_B AND mask
```

Example with mask /24:
```text
192.168.1.50  AND 255.255.255.0 = 192.168.1.0  ✓ same
192.168.1.200 AND 255.255.255.0 = 192.168.1.0  ✓ same
192.168.2.1   AND 255.255.255.0 = 192.168.2.0  ✗ different
```

## Python Implementation

```python
import ipaddress

def same_subnet(ip1: str, ip2: str, prefix: int) -> bool:
    """
    Return True if ip1 and ip2 are in the same /<prefix> network.
    """
    if not 0 <= prefix <= 32:
        raise ValueError("prefix must be in the range 0..32")

    mask_int = (0xFFFFFFFF >> (32 - prefix)) << (32 - prefix)
    n1 = int(ipaddress.IPv4Address(ip1)) & mask_int
    n2 = int(ipaddress.IPv4Address(ip2)) & mask_int
    return n1 == n2

# Using ipaddress module (simpler)

def same_subnet_ipaddress(ip1: str, ip2: str, cidr_prefix: int) -> bool:
    """Check if two IPs are in the same subnet using ipaddress."""
    network = ipaddress.IPv4Network(f"{ip1}/{cidr_prefix}", strict=False)
    return ipaddress.IPv4Address(ip2) in network

# Tests
pairs = [
    ("192.168.1.50", "192.168.1.200", 24),
    ("192.168.1.50", "192.168.2.1",   24),
    ("10.0.5.100",   "10.0.5.200",    25),   # /25 split
    ("10.0.5.100",   "10.0.5.200",    24),   # same /24
]

for ip1, ip2, prefix in pairs:
    result = same_subnet_ipaddress(ip1, ip2, prefix)
    print(f"{ip1} and {ip2} /{prefix}: same_subnet={result}")
```

## /25 Boundary Example

```python
# 10.0.5.0/25 covers .0 to .127
# 10.0.5.128/25 covers .128 to .255
# So .100 and .200 are NOT in the same /25

ip1, ip2 = "10.0.5.100", "10.0.5.200"
print(same_subnet_ipaddress(ip1, ip2, 25))  # False
print(same_subnet_ipaddress(ip1, ip2, 24))  # True (both in /24)
```

## Practical Use: Checking Before Sending

A host checks if the destination is on-subnet to decide whether to send directly (layer 2) or via the default gateway:

```text
If (dst_ip AND my_mask) == (my_ip AND my_mask):
    → Send directly to dst_ip (ARP for MAC on Ethernet)
Else:
    → Send to default gateway
```

## Key Takeaways

- Same subnet test for a given mask: `ip1 AND mask == ip2 AND mask`.
- The subnet boundary depends on the prefix length; shorter prefixes create larger subnets.
- Hosts use this test to decide between direct delivery and gateway forwarding.
- Use Python's `ipaddress.IPv4Address(ip) in ipaddress.IPv4Network(cidr)` for clean checks.
