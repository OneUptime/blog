# How to Understand the IPv6 Next Header Field

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Next Header, Extension Headers, Networking, Protocol

Description: Understand the IPv6 Next Header field, how it replaces IPv4's Protocol field to create a chain of extension headers, and the common Next Header values.

## Introduction

The IPv6 Next Header field is an 8-bit field that identifies what follows the current header. It serves the same purpose as IPv4's Protocol field but with an important extension: it can point to an IPv6 Extension Header (like Routing, Fragment, or Hop-by-Hop Options) rather than directly to the upper-layer protocol. This creates a linked-list chain of headers that can be extended without changing the base IPv6 header.

## How the Chain Works

```text
IPv6 Base Header
  Next Header = 43 (Routing Header)
                ↓
  Routing Header
    Next Header = 6 (TCP)
                  ↓
  TCP Segment
    (application data)

Or with more extension headers:
IPv6 Base Header
  Next Header = 0 (Hop-by-Hop Options)
                ↓
  Hop-by-Hop Options Header
    Next Header = 43 (Routing)
                  ↓
  Routing Header
    Next Header = 44 (Fragment)
                  ↓
  Fragment Header
    Next Header = 58 (ICMPv6)
                  ↓
  ICMPv6 Message
```

## Common Next Header Values

| Value | Protocol/Header | Description |
|---|---|---|
| 0 | HOPOPT | IPv6 Hop-by-Hop Options |
| 4 | IPv4 | IPv4 encapsulation |
| 6 | TCP | Transmission Control Protocol |
| 17 | UDP | User Datagram Protocol |
| 41 | IPv6 | IPv6 encapsulation |
| 43 | IPv6-Route | IPv6 Routing Header |
| 44 | IPv6-Frag | IPv6 Fragment Header |
| 50 | ESP | Encapsulating Security Payload |
| 51 | AH | Authentication Header |
| 58 | ICMPv6 | Internet Control Message Protocol v6 |
| 59 | IPv6-NoNxt | No Next Header |
| 60 | IPv6-Opts | Destination Options |
| 135 | Mobility | IPv6 Mobility Header |

## Parsing the Next Header Chain

```python
import struct
import socket

NEXT_HEADER_NAMES = {
    0: "Hop-by-Hop Options",
    4: "IPv4 (tunnel)",
    6: "TCP",
    17: "UDP",
    41: "IPv6 (tunnel)",
    43: "Routing Header",
    44: "Fragment Header",
    50: "ESP",
    51: "AH",
    58: "ICMPv6",
    59: "No Next Header",
    60: "Destination Options",
    135: "Mobility Header",
}

def walk_ipv6_headers(packet: bytes) -> list:
    """
    Walk the IPv6 header chain and return a list of headers found.
    Returns list of (header_type, offset, length) tuples.
    """
    if len(packet) < 40:
        return []

    headers = []
    offset = 0

    # Start with the base IPv6 header
    next_header = packet[6]  # Next Header field at offset 6
    headers.append(("IPv6 Base Header", 0, 40))
    offset = 40

    # Headers that use an 8-octet length field after the Next Header byte
    EXTENSION_HEADERS = {0, 43, 60, 135}

    while next_header != 59 and offset < len(packet):  # 59 = No Next Header
        name = NEXT_HEADER_NAMES.get(next_header, f"Unknown ({next_header})")

        if next_header in (6, 17, 58, 4, 41):
            # Upper-layer protocol or tunneled IP - stop chain walking
            headers.append((name, offset, len(packet) - offset))
            break
        elif next_header == 44:
            # Fragment Header is exactly 8 bytes
            if offset + 8 > len(packet):
                break
            next_header = packet[offset]
            headers.append(("Fragment Header", offset, 8))
            offset += 8
        elif next_header == 51:
            # AH length is stored in 32-bit words, minus 2
            if offset + 2 > len(packet):
                break
            next_header = packet[offset]
            ext_len = (packet[offset + 1] + 2) * 4
            if offset + ext_len > len(packet):
                break
            headers.append(("AH", offset, ext_len))
            offset += ext_len
        elif next_header == 50:
            # ESP's Next Header is in the ESP trailer, so stop here
            headers.append(("ESP", offset, len(packet) - offset))
            break
        elif next_header in EXTENSION_HEADERS:
            # Variable-length extension headers
            if offset + 2 > len(packet):
                break
            next_header = packet[offset]
            ext_len = (packet[offset + 1] + 1) * 8  # Length in 8-byte units
            if offset + ext_len > len(packet):
                break
            headers.append((name, offset, ext_len))
            offset += ext_len
        else:
            headers.append((name, offset, -1))
            break

    return headers

# Display header chain

def display_chain(packet: bytes):
    chain = walk_ipv6_headers(packet)
    for i, (name, offset, length) in enumerate(chain):
        arrow = "→ " if i > 0 else ""
        print(f"{arrow}{name} (offset={offset}, len={length})")
```

## Reading Next Header with tcpdump

```bash
# Verbose output often shows the decoded IPv6 next-header value
sudo tcpdump -i eth0 -vv ip6 | grep "next-header"

# Example output fragments:
# next-header TCP (6)
# next-header UDP (17)
# next-header ICMPv6 (58)
# next-header Routing (43)
# next-header Fragment (44)

# Filter by specific protocol/header anywhere in the IPv6 header chain
# ip6[6] checks only the base IPv6 header, so use ip6 protochain here
sudo tcpdump -i eth0 "ip6 protochain 58"   # ICMPv6
sudo tcpdump -i eth0 "ip6 protochain 6"    # TCP
sudo tcpdump -i eth0 "ip6 protochain 17"   # UDP
sudo tcpdump -i eth0 "ip6 protochain 44"   # Fragment Header present
```

## No Next Header (59)

When Next Header = 59, it means there is no following header. If the IPv6 Payload Length indicates additional octets after that point, receivers must ignore them:

```bash
# Capture packets with No Next Header
sudo tcpdump -i eth0 "ip6 protochain 59"

# This is legitimate for:
# - Packets that intentionally have no upper-layer header
# - Packets where any remaining octets after that point are ignored
```

## Conclusion

The IPv6 Next Header field creates a flexible, extensible header chain that replaces IPv4's fixed Protocol field. By allowing extension headers to be chained in sequence, IPv6 can support fragmentation, routing options, security headers, and mobility features without changing the base header format. Understanding common Next Header values is essential for writing firewall rules, packet filters, and IPv6 packet parsers.
