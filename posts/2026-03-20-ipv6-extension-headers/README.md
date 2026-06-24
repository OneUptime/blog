# How to Understand IPv6 Extension Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extension Headers, Networking, Protocol, RFC 8200

Description: Understand IPv6 extension headers, their purpose, how they are chained together, and which ones are processed by routers versus only by endpoints.

## Introduction

IPv6 extension headers are optional headers placed between the IPv6 base header and the upper-layer protocol header. They provide a flexible mechanism for adding features (routing, fragmentation, security, mobility) without modifying the base header. Extension headers are chained using the Next Header field - each header points to the next one in the chain.

## Extension Header Chain Structure

```text
IPv6 Base Header (40 bytes)
  Next Header = 0 → Hop-by-Hop Options Header
                ↓
  Hop-by-Hop Options Header
    Next Header = 43 → Routing Header
                   ↓
  Routing Header
    Next Header = 44 → Fragment Header
                   ↓
  Fragment Header
    Next Header = 6 → TCP
                  ↓
  TCP Segment + Application Data
```

## Common Next Header Values in IPv6 Header Chains

| Next Header Value | Extension Header | Processed By |
|---|---|---|
| 0 | Hop-by-Hop Options | Nodes along the path that are configured to process it |
| 43 | Routing Header | Nodes listed in the header + destination |
| 44 | Fragment Header | Destination only |
| 50 | ESP (IPsec) | IPsec endpoint(s) |
| 51 | AH (IPsec Auth) | IPsec endpoint(s) |
| 59 | No Next Header | - |
| 60 | Destination Options | Destination(s); before a Routing header, also listed nodes |
| 135 | Mobility Header | Mobility-aware endpoint(s) |
| 139 | HIP (Host Identity) | HIP endpoint(s) |
| 140 | Shim6 | Shim6 endpoint(s) |

## Common Format Used by Several Extension Headers

Hop-by-Hop Options, Routing, and Destination Options share a common format:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |  Hdr Ext Len  |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                   Header-specific data                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Next Header:  Identifies the next header in the chain
Hdr Ext Len:  Length of this header in 8-byte units, NOT including the first 8 bytes
              Total header length = (Hdr Ext Len + 1) × 8 bytes
```

Fragment is always 8 bytes, AH uses a different length field, and ESP carries its Next Header value in the ESP trailer rather than in the first two bytes.

## Parsing Extension Headers

```python
# Extension header type codes

GENERIC_EXT_HEADERS = {
    0:   "Hop-by-Hop Options",
    43:  "Routing Header",
    60:  "Destination Options",
    135: "Mobility Header",
}

OPAQUE_CHAINED_HEADERS = {
    50:  "ESP",
    139: "HIP",
    140: "Shim6",
}

UPPER_LAYER = {6: "TCP", 17: "UDP", 58: "ICMPv6", 4: "IPv4", 41: "IPv6"}

def parse_extension_headers(packet: bytes, start_offset: int = 40) -> list:
    """
    Walk the extension header chain starting from start_offset.

    Args:
        packet:       Raw IPv6 packet bytes
        start_offset: Byte offset where the first extension header begins
                      (40 for the first header after IPv6 base header)

    Returns:
        List of (name, next_header, offset, length) tuples.
        Opaque headers such as ESP use None for next_header and -1 for length.
    """
    if len(packet) < 40:
        raise ValueError("packet is too short to contain an IPv6 header")

    next_header = packet[6]  # From IPv6 base header
    offset = start_offset
    headers = []

    while offset <= len(packet):
        if next_header in UPPER_LAYER:
            headers.append((UPPER_LAYER[next_header], next_header, offset, -1))
            break
        elif next_header == 59:  # No Next Header
            headers.append(("No Next Header", next_header, offset, 0))
            break
        elif next_header == 44:  # Fragment Header: fixed 8 bytes
            if offset + 8 > len(packet):
                raise ValueError("truncated Fragment header")
            nh = packet[offset]
            headers.append(("Fragment Header", nh, offset, 8))
            next_header = nh
            offset += 8
        elif next_header == 51:  # AH: length is in 32-bit words, minus 2
            if offset + 2 > len(packet):
                raise ValueError("truncated AH header")
            nh = packet[offset]
            payload_len = packet[offset + 1]
            length = (payload_len + 2) * 4
            if offset + length > len(packet):
                raise ValueError("truncated AH header")
            headers.append(("AH", nh, offset, length))
            next_header = nh
            offset += length
        elif next_header in GENERIC_EXT_HEADERS:
            if offset + 2 > len(packet):
                raise ValueError(f"truncated {GENERIC_EXT_HEADERS[next_header]} header")
            nh = packet[offset]
            ext_len = packet[offset + 1]
            length = (ext_len + 1) * 8
            if offset + length > len(packet):
                raise ValueError(f"truncated {GENERIC_EXT_HEADERS[next_header]} header")
            headers.append((GENERIC_EXT_HEADERS[next_header], nh, offset, length))
            next_header = nh
            offset += length
        elif next_header in OPAQUE_CHAINED_HEADERS:
            # ESP carries its Next Header in the trailer; HIP and Shim6 have
            # their own formats, so stop here unless you parse them separately.
            headers.append((OPAQUE_CHAINED_HEADERS[next_header], None, offset, -1))
            break
        else:
            break

    return headers
```

## Hop-by-Hop vs All Others

The most critical distinction:

```text
Hop-by-Hop Options (Next Header = 0):
  ✗ Is the only header defined for hop-by-hop processing
  ✗ MUST be the FIRST extension header if present
  ✗ In RFC 8200, nodes along the path often process it only if explicitly configured
  ✗ Often causes performance issues (typically slow-pathed in hardware)
  → Used for: Router Alert, Jumbo Payload
  → In practice: Very rare in production networks

All other extension headers:
  ✓ Are not defined for hop-by-hop processing
  ✓ Usually processed by the destination, or by nodes explicitly named in the packet
  ✓ Ordinary transit routers generally forward them without examining them, though middleboxes may still inspect or filter them
  → Used for: fragmentation (44), IPsec (50,51), mobility (135)
```

## Viewing Extension Headers in Practice

```bash
# Capture packets with Hop-by-Hop header
sudo tcpdump -i eth0 -XX "ip6 protochain 0"

# Capture packets with Fragment header
sudo tcpdump -i eth0 -vv "ip6 protochain 44"

# Capture IPsec AH packets
sudo tcpdump -i eth0 "ip6 protochain 51"

# Capture IPsec ESP packets
sudo tcpdump -i eth0 "ip6 protochain 50"
```

## Extension Header Security Considerations

```bash
# Many networks drop packets with unusual extension headers
# RFC 7045 defines rules for which extension headers should be forwarded

# Check if your firewall passes the extension headers you actually use:
# Fragment header (44) needs to be allowed if you expect legitimate fragmented traffic
# AH (51) and ESP (50) need to be allowed if you expect IPsec traffic

# ip6tables: allow IPsec headers
sudo ip6tables -A INPUT -p ah -j ACCEPT
sudo ip6tables -A INPUT -p esp -j ACCEPT

# Allow fragmented packets
sudo ip6tables -A INPUT -m frag --fragmore -j ACCEPT  # More fragments
sudo ip6tables -A INPUT -m frag --fraglast -j ACCEPT  # Last fragment
```

## Conclusion

IPv6 extension headers provide a flexible mechanism for optional features that would otherwise require a larger, more complex base header. The key insight is that Hop-by-Hop Options are the only header defined for hop-by-hop processing. Most other extension headers are handled at the destination, or by nodes explicitly named in the packet, so ordinary transit routers can usually forward them without special processing. However, extension headers do present security and operational challenges, and many network operators filter them at boundaries.
