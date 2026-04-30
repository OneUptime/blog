# How to Understand the IPv4 Version Field and Its Purpose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Packet Header, IP Version, TCP/IP

Description: Learn the purpose of the 4-bit Version field in the IPv4 header, how it enables protocol coexistence, and how network devices use it to distinguish IPv4 from IPv6.

## Introduction

The Version field is the first 4 bits of every IP packet. It tells the receiving network device which version of the Internet Protocol the packet uses. For IPv4, this value is always 4 (binary `0100`). For IPv6, it is 6 (binary `0110`). This single field is what allows routers and hosts to correctly parse the rest of the header - without it, the remaining bytes cannot be interpreted.

## The Version Field in Context

The first byte of an IPv4 header encodes two fields: Version (upper 4 bits) and IHL (lower 4 bits).

```yaml
First byte (8 bits):
  7   6   5   4   3   2   1   0
+---+---+---+---+---+---+---+---+
| 0 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
+---+---+---+---+---+---+---+---+
|   Version = 4 |    IHL = 5    |
```

The hex value `0x45` is the most common first byte of an IPv4 packet: version 4, IHL 5 (20 bytes, no options).

## Reading the Version Field

```python
def get_ip_version(raw_packet: bytes) -> int:
    """
    Extract the IP version from the first byte.
    Works for both IPv4 and IPv6.
    """
    first_byte = raw_packet[0]
    version = first_byte >> 4  # upper 4 bits
    return version

# Dispatching to the correct parser

def parse_ip_packet(raw_bytes: bytes):
    version = get_ip_version(raw_bytes)

    if version == 4:
        return parse_ipv4(raw_bytes)
    elif version == 6:
        return parse_ipv6(raw_bytes)
    else:
        raise ValueError(f"Unknown IP version: {version}")
```

## Why the Version Field Matters

Network devices encounter mixed IPv4 and IPv6 traffic on the same interface. Once a device is parsing an IP header, the version field is the first decision point.

```bash
# Capture only IPv4 traffic (version field = 4)
tcpdump -n 'ip'

# Capture only IPv6 traffic (version field = 6)
tcpdump -n 'ip6'

# See the version field in hex dump
tcpdump -n -X -c 1 'ip' | head -5
# First byte is often 0x45 for IPv4 packets without options
```

## Common Version Field Values

| Value | Protocol | Use |
|---|---|---|
| 4 | IPv4 | Standard IPv4 traffic |
| 6 | IPv6 | Standard IPv6 traffic |
| 5 | Reserved (Historic) | Formerly used by ST datagram mode |
| 7-9 | Reserved (Historic) | Historical assignments, not in current use |
| 10-14 | Unassigned | Not currently assigned |
| 15 | Reserved | Reserved |

## Version Field in Dual-Stack Environments

Dual-stack systems run both IPv4 and IPv6. When the IP layer processes a packet, the version field tells it whether to parse an IPv4 header or an IPv6 header.

```bash
# Check if a host is dual-stack
ip addr show | grep 'inet'
# inet 192.168.1.10/24      → IPv4
# inet6 fe80::1/64          → IPv6 link-local
# inet6 2001:db8::1/64      → IPv6 global

# Force IPv4 with curl
curl -4 https://example.com

# Force IPv6 with curl
curl -6 https://example.com

# See which version is used for a given destination
ip route get 8.8.8.8   # IPv4 route
ip -6 route get 2001:4860:4860::8888  # IPv6 route
```

## Detecting Version Mismatches in Tunnels

In IPv6-in-IPv4 tunnels (6in4, protocol 41), the outer header has version=4 and the inner header has version=6.

```python
import struct

def parse_tunnel_packet(raw_bytes: bytes):
    """Parse an IPv4 packet carrying an IPv6 payload (protocol 41)."""
    outer_version = raw_bytes[0] >> 4
    outer_ihl = (raw_bytes[0] & 0x0F) * 4
    outer_protocol = raw_bytes[9]

    print(f"Outer header version: {outer_version}")  # 4
    print(f"Outer header length:  {outer_ihl} bytes")
    print(f"Outer protocol:       {outer_protocol}")  # 41 = IPv6

    if outer_protocol == 41:
        inner_start = outer_ihl
        inner_version = raw_bytes[inner_start] >> 4
        print(f"Inner header version: {inner_version}")  # 6
```

## How Routers Use the Version Field

Once a router starts parsing an IP header:

1. Read the first byte
2. Extract the upper 4 bits (version)
3. If version = 4: parse as IPv4, apply IPv4 forwarding logic
4. If version = 6: parse as IPv6, apply IPv6 forwarding logic
5. If unknown: discard the packet

The version field must be checked before any other field because the header layouts for IPv4 and IPv6 are completely different - only the version field occupies the same position in both.

## Summary

The 4-bit Version field is the first thing any IP implementation reads because IPv4 and IPv6 have completely different header structures. For IPv4, version is always 4 (`0x4` in hex), making `0x45` the most common first byte for packets without options. In dual-stack environments, the IP layer uses this field to dispatch packets to the correct parser. In tunnel protocols like 6in4, there are two version fields - one per layer - and both must be read to fully parse the packet.
