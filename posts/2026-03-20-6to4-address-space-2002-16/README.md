# How to Understand the 6to4 Address Space (2002::/16) - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6to4, Tunneling, RFC 3056, Transition, Networking

Description: Understand the 6to4 address space 2002::/16 (RFC 3056) that encodes an IPv4 address into an IPv6 prefix for automatic tunneling over IPv4 infrastructure.

## Introduction

6to4 (RFC 3056) is a transition mechanism that automatically tunnels IPv6 over IPv4 networks. The `2002::/16` prefix encodes a site's public IPv4 address in the `/48` prefix, enabling IPv6 connectivity without native IPv6 service from the ISP.

## 6to4 Address Format

```text
2002:AABB:CCDD::/48
  2002    = 6to4 prefix
  AABB    = first 16 bits of IPv4 address (hex)
  CCDD    = last 16 bits of IPv4 address (hex)

Example:
  IPv4: 192.0.2.1
  6to4: 2002:c000:0201::/48
  (192 = 0xC0, 0 = 0x00, 2 = 0x02, 1 = 0x01)
```

## Computing a 6to4 Address

```python
import ipaddress

def ipv4_to_6to4_prefix(ipv4: str) -> str:
    """Convert an IPv4 address to its 6to4 prefix."""
    v4 = ipaddress.IPv4Address(ipv4)
    v4_int = int(v4)

    # 6to4 = 2002::/16 + IPv4 (32 bits) + zeros
    addr_int = (0x2002 << 112) | (v4_int << 80)

    return str(ipaddress.IPv6Address(addr_int)) + "/48"

print(ipv4_to_6to4_prefix("192.0.2.1"))  # 2002:c000:201::/48

def is_6to4(addr: str) -> bool:
    a = ipaddress.IPv6Address(addr)
    return a in ipaddress.IPv6Network("2002::/16")
```

## Why 6to4 Is No Longer Recommended

6to4 has significant operational problems:
- Relies on the anycast relay address `192.88.99.1` from `192.88.99.0/24` (deprecated in RFC 7526)
- Asymmetric routing causes connectivity failures
- Spoofing and denial-of-service risks are inherent in the relay model

```bash
# Disable 6to4 on Linux

# Remove a 6to4 tunnel interface if it is named tun6to4
ip tunnel del tun6to4 2>/dev/null

# Block forwarded 6to4 traffic inside your own environment
ip6tables -A FORWARD -s 2002::/16 -j DROP
ip6tables -A FORWARD -d 2002::/16 -j DROP

# Check for active 6to4 interfaces
ip tunnel show | grep -E '6to4|sit'
```

## Conclusion

The 6to4 mechanism should not be used in new deployments. RFC 7526 deprecated the relay anycast address `192.88.99.1`, but not the `2002::/16` prefix itself. Replace any 6to4 tunnels with native IPv6 or another currently supported transition mechanism. If you are disabling 6to4 in your own environment, filter `2002::/16` locally and monitor with OneUptime for unexpected usage.
