# How to Understand the 6to4 Address Space (2002::/16)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6to4, 2002::/16, RFC 3056, Tunneling, Transition

Description: Understand the 6to4 address space 2002::/16 (RFC 3056), how IPv4 addresses are embedded in 6to4 addresses, and why 6to4 tunneling should be avoided in modern deployments.

## Introduction

`2002::/16` is the 6to4 address space defined in RFC 3056. 6to4 encapsulates IPv6 in IPv4 packets (proto 41), allowing IPv6 connectivity using the globally unique IPv4 address of the site or host. The next 32 bits of the /48 prefix encode the site's IPv4 address. Like Teredo, 6to4 is a legacy transition mechanism that should generally be avoided in modern deployments.

## Address Format

```yaml
 |  16 bits  |    32 bits     |  16 bits  |   64 bits  |
 +-----------+----------------+-----------+------------+
 | 2002::/16 |  IPv4 Address  | Subnet ID | Interface ID|
 +-----------+----------------+-----------+------------+

 Example:
   Example IPv4: 203.0.113.42 = 0xCB00712A
   6to4 prefix: 2002:cb00:712a::/48
   Host address: 2002:cb00:712a::1/128

 Formula: 2002:<ipv4-hex>::/48
```

## Python: 6to4 Address Generation and Parsing

```python
import ipaddress
import socket

SIXTO4_PREFIX = ipaddress.IPv6Network("2002::/16")

def ipv4_to_6to4(ipv4_str: str) -> str:
    """Generate the 6to4 /48 prefix that embeds a given IPv4 address."""
    ipv4 = ipaddress.IPv4Address(ipv4_str)
    ipv4_int = int(ipv4)

    # 2002:<hex-ipv4>:: where hex-ipv4 occupies bits 16-47
    sixto4_int = (0x2002 << 112) | (ipv4_int << 80)
    prefix = ipaddress.IPv6Network(
        f"{ipaddress.IPv6Address(sixto4_int)}/48",
        strict=False
    )
    return str(prefix)

def parse_6to4_address(ipv6_str: str) -> dict:
    """Extract the embedded IPv4 address from a 6to4 address."""
    addr = ipaddress.IPv6Address(ipv6_str)
    if addr not in SIXTO4_PREFIX:
        return {"error": "Not a 6to4 address"}

    addr_int = int(addr)
    # IPv4 is bits 16-47 (bytes 2-5 in the 16-byte address)
    ipv4_int = (addr_int >> 80) & 0xFFFFFFFF
    ipv4 = str(ipaddress.IPv4Address(ipv4_int))

    return {
        "ipv6": ipv6_str,
        "embedded_ipv4": ipv4,
        "prefix_48": f"2002:{ipv4_int >> 16:04x}:{ipv4_int & 0xFFFF:04x}::/48",
    }

# Examples

print(ipv4_to_6to4("203.0.113.42"))      # 2002:cb00:712a::/48
print(ipv4_to_6to4("8.8.8.8"))           # 2002:808:808::/48
print(parse_6to4_address("2002:cb00:712a::1"))
```

## Why 6to4 Should Be Disabled

```text
Problems with 6to4:
  1. Anycast relay discovery: anycast 6to4 uses 192.88.99.1 for relay selection
     - Anycast relays were operationally unreliable in practice
  2. Asymmetric routing: outbound and inbound paths differ
  3. No NAT traversal for end hosts: the 6to4 endpoint needs a globally unique IPv4 address
  4. RFC 7526 deprecated 192.88.99.0/24 anycast in 2015, but not 2002::/16 itself
  5. Privacy: 6to4 address directly reveals your IPv4 address

Recommendation: Disable 6to4 and use native IPv6 or explicit tunnels (6in4 with known endpoints)
```

## Disabling 6to4

```bash
# Linux: remove 6to4 tunnel if present
ip tunnel del tun6to4 2>/dev/null

# Disable sit module that enables 6to4
modprobe -r sit 2>/dev/null

# Block 6to4 relay anycast (prevent usage)
iptables -A OUTPUT -d 192.88.99.0/24 -j DROP
iptables -A FORWARD -d 192.88.99.0/24 -j DROP

# Block 6to4 addresses at network boundary
ip6tables -A FORWARD -s 2002::/16 -j DROP
ip6tables -A FORWARD -d 2002::/16 -j DROP

# macOS
networksetup -setv6off "Wi-Fi"  # Disable IPv6 on this service (nuclear option)
# If a 6to4 service exists, remove it in System Settings > Network
```

## Conclusion

The `2002::/16` 6to4 space embeds an IPv4 address in bits 16-47 of an IPv6 prefix. It was a useful transition mechanism before native IPv6 was widely available, but its common reliance on anycast relays made many deployments unreliable, and RFC 7526 deprecated the `192.88.99.0/24` anycast relay prefix. Block 6to4 at your network boundary and disable it on hosts. Monitor for 6to4 traffic that indicates misconfigured or legacy systems with OneUptime.
