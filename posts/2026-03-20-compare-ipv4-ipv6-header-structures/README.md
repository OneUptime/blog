# How to Compare IPv4 and IPv6 Header Structures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, IPv6, Networking, Header Structure, TCP/IP, Protocol Comparison

Description: IPv6 simplified the IP header compared to IPv4 by removing fragmentation fields, replacing the checksum, and using a fixed 40-byte base header with extension headers for optional features.

## Side-by-Side Header Comparison

| Field | IPv4 | IPv6 |
|-------|------|------|
| Version | 4-bit (value 4) | 4-bit (value 6) |
| Header length | 4-bit IHL | Fixed 40 bytes (no field needed) |
| ToS/Traffic Class | 8-bit | 8-bit Traffic Class (same DSCP/ECN) |
| Total Length | 16-bit | 16-bit Payload Length (excl. header) |
| Identification | 16-bit | Only in Fragment extension header |
| Flags | 3-bit | Removed |
| Fragment Offset | 13-bit | Removed |
| TTL | 8-bit | 8-bit Hop Limit (same purpose) |
| Protocol | 8-bit | 8-bit Next Header |
| Header Checksum | 16-bit | Removed |
| Source Address | 32-bit (4 bytes) | 128-bit (16 bytes) |
| Destination Address | 32-bit (4 bytes) | 128-bit (16 bytes) |
| Options | Variable | Extension Headers |
| Flow Label | - | 20-bit |

## IPv6 Header Improvements

1. **No checksum**: Upper-layer protocols such as TCP, UDP, and ICMPv6 provide checksums. Removing the IP header checksum eliminates per-hop recalculation, speeding up routers.
2. **Fixed size**: The 40-byte base header is always the same size, enabling hardware parsing at line rate.
3. **No router fragmentation**: Routers no longer fragment packets; hosts typically use PMTUD. The Fragment header is an extension header added by the source only when needed.
4. **Flow Label**: A 20-bit field lets a source label packets that belong to the same flow, allowing flow-specific handling without inspecting upper-layer headers.
5. **Extension Headers**: Options are moved to chained extension headers (Routing, Fragment, Authentication, etc.) appended only when needed.

## Parsing Both Headers with Python

```python
import socket, struct

def parse_ipv4(raw: bytes):
    ihl = (raw[0] & 0x0F) * 4
    ttl = raw[8]
    proto = raw[9]
    src = socket.inet_ntoa(raw[12:16])
    dst = socket.inet_ntoa(raw[16:20])
    return {"version": 4, "hdr_len": ihl, "ttl": ttl, "proto": proto,
            "src": src, "dst": dst}

def parse_ipv6(raw: bytes):
    # Version (4 bits) | Traffic Class (8 bits) | Flow Label (20 bits)
    flow_label = ((raw[1] & 0x0F) << 16) | (raw[2] << 8) | raw[3]
    payload_len = (raw[4] << 8) | raw[5]
    next_hdr = raw[6]
    hop_limit = raw[7]
    src = socket.inet_ntop(socket.AF_INET6, raw[8:24])
    dst = socket.inet_ntop(socket.AF_INET6, raw[24:40])
    return {"version": 6, "hdr_len": 40, "flow_label": flow_label,
            "next_header": next_hdr, "hop_limit": hop_limit,
            "src": src, "dst": dst}
```

## Key Takeaways

- IPv6 has a fixed 40-byte header vs IPv4's variable 20-60 bytes.
- IPv6 removed fragmentation-related and header checksum fields from the base header.
- IPv6 adds a 20-bit Flow Label to mark packets that belong to the same flow.
- Options in IPv6 are extension headers chained via the Next Header field, keeping the base header clean.
