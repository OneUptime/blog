# How to Identify IPv4 Address Classes (A, B, C, D, E)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, IP Addressing, Address Classes, Subnetting, TCP/IP

Description: IPv4 address classes (A through E) were the original addressing scheme that divided the 32-bit address space by the high-order bits of the first octet, determining default network and host boundaries.

## The Five Address Classes

| Class | Leading Bits | First Octet Range | Default Mask | Use |
|-------|-------------|------------------|-------------|-----|
| A | 0xxxxxxx | 0–127 | /8 (255.0.0.0) | Large networks |
| B | 10xxxxxx | 128–191 | /16 (255.255.0.0) | Medium networks |
| C | 110xxxxx | 192–223 | /24 (255.255.255.0) | Small networks |
| D | 1110xxxx | 224–239 | N/A | Multicast |
| E | 1111xxxx | 240–255 | N/A | Reserved/Experimental |

Note: 0.x.x.x and 127.x.x.x match the Class A bit pattern, but 0.x.x.x is a reserved 0/8 special case and 127.x.x.x is reserved for loopback.

## Identifying Class by First Octet

```python
from ipaddress import AddressValueError, IPv4Address


def classify_ipv4(ip: str) -> str:
    """Return the class or special reservation of an IPv4 address."""
    try:
        first_octet = int(str(IPv4Address(ip)).split('.')[0])
    except AddressValueError:
        return 'Invalid'

    if first_octet == 0:
        return 'Reserved (0/8 special case)'
    elif 1 <= first_octet <= 126:
        return 'A'
    elif first_octet == 127:
        return 'Loopback (reserved Class A)'
    elif 128 <= first_octet <= 191:
        return 'B'
    elif 192 <= first_octet <= 223:
        return 'C'
    elif 224 <= first_octet <= 239:
        return 'D (Multicast)'
    elif 240 <= first_octet <= 255:
        return 'E (Reserved/Experimental)'
# Test classification

for ip in ["10.1.2.3", "127.0.0.1", "172.16.0.1",
           "192.168.1.1", "224.0.0.5", "240.0.0.1"]:
    print(f"{ip:15s} -> Class {classify_ipv4(ip)}")
```

Expected output:
```text
10.1.2.3        -> Class A
127.0.0.1       -> Class Loopback (reserved Class A)
172.16.0.1      -> Class B
192.168.1.1     -> Class C
224.0.0.5       -> Class D (Multicast)
240.0.0.1       -> Class E (Reserved/Experimental)
```

## Default Network Sizes

- **Class A**: 1 network octet, 3 host octets → 16,777,214 hosts per network
- **Class B**: 2 network octets, 2 host octets → 65,534 hosts per network
- **Class C**: 3 network octets, 1 host octet → 254 hosts per network

## Why Classful Addressing Is Obsolete

Classful addressing wasted huge address blocks (e.g., a company needing 1000 hosts got a Class B with 65,534 addresses). CIDR (Classless Inter-Domain Routing, RFC 4632) replaced it, allowing arbitrary prefix lengths like /22 (1022 hosts) rather than forcing /16 or /24.

## Key Takeaways

- Classes A/B/C are unicast; D is multicast; E is reserved.
- Class membership is determined by the high-order bits of the first octet.
- 127.x.x.x is loopback, not routed despite being in Class A range.
- CIDR superseded classful addressing; classes are mainly relevant historically and for quick mental range-checking.
