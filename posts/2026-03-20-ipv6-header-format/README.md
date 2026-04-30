# How to Understand the IPv6 Header Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Packet Structure, Networking, Protocol, Header

Description: Understand the fixed 40-byte IPv6 header format, including all fields, their sizes, and how they differ from the variable-length IPv4 header.

## Introduction

The IPv6 header was redesigned from scratch with simplicity and efficiency in mind. It is fixed at exactly 40 bytes - compared to IPv4's variable-length header (20-60 bytes). All optional information has been moved to extension headers, enabling routers to process the fixed header at line rate without parsing variable-length options.

## The IPv6 Header Layout

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Traffic Class |           Flow Label                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Payload Length        |  Next Header  |   Hop Limit   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                         Source Address                        |
+                         (128 bits)                            +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                      Destination Address                      |
+                         (128 bits)                            +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

## Field Summary

| Field | Bits | Description |
|---|---|---|
| Version | 4 | Always `6` (binary: 0110) |
| Traffic Class | 8 | QoS / DSCP + ECN marking |
| Flow Label | 20 | Identifies a flow for special handling |
| Payload Length | 16 | Length of payload (not including this header) |
| Next Header | 8 | Type of the next header (like IPv4 Protocol field) |
| Hop Limit | 8 | Decremented by each router (like TTL in IPv4) |
| Source Address | 128 | Sender's IPv6 address |
| Destination Address | 128 | Recipient's IPv6 address |

Total: 4+8+20+16+8+8+128+128 = **320 bits = 40 bytes**

## Parsing the Header in Python

```python
import struct
import socket

def parse_ipv6_header(raw_bytes: bytes) -> dict:
    """
    Parse a raw IPv6 header (first 40 bytes).

    Returns a dict with all header fields.
    """
    if len(raw_bytes) < 40:
        raise ValueError("Not enough bytes for an IPv6 header (need 40)")

    # First 4 bytes contain: version(4), traffic_class(8), flow_label(20)
    first_word = struct.unpack("!I", raw_bytes[0:4])[0]
    version       = (first_word >> 28) & 0xF
    traffic_class = (first_word >> 20) & 0xFF
    flow_label    = first_word & 0xFFFFF

    # Next 4 bytes: payload_length(16), next_header(8), hop_limit(8)
    payload_length, next_header, hop_limit = struct.unpack("!HBB", raw_bytes[4:8])

    # Source and destination addresses (128 bits each = 16 bytes each)
    src_addr = socket.inet_ntop(socket.AF_INET6, raw_bytes[8:24])
    dst_addr = socket.inet_ntop(socket.AF_INET6, raw_bytes[24:40])

    return {
        "version": version,
        "traffic_class": traffic_class,
        "dscp": (traffic_class >> 2) & 0x3F,
        "ecn": traffic_class & 0x3,
        "flow_label": flow_label,
        "payload_length": payload_length,
        "next_header": next_header,
        "hop_limit": hop_limit,
        "src": src_addr,
        "dst": dst_addr,
    }

# Example: build and parse a minimal IPv6 header

def build_minimal_ipv6_header(src, dst, next_header=59, payload_len=0, hop_limit=64):
    """Build a minimal IPv6 header bytes object."""
    version_tc_fl = (6 << 28) | (0 << 20) | 0  # version=6, TC=0, FL=0
    header = struct.pack("!IHBB",
        version_tc_fl,
        payload_len,
        next_header,
        hop_limit
    )
    header += socket.inet_pton(socket.AF_INET6, src)
    header += socket.inet_pton(socket.AF_INET6, dst)
    return header

raw = build_minimal_ipv6_header("2001:db8::1", "2001:db8::2")
parsed = parse_ipv6_header(raw)
print(f"Version:       {parsed['version']}")
print(f"Hop Limit:     {parsed['hop_limit']}")
print(f"Next Header:   {parsed['next_header']}")
print(f"Source:        {parsed['src']}")
print(f"Destination:   {parsed['dst']}")
```

## Inspecting IPv6 Headers with tcpdump

```bash
# Capture IPv6 traffic and display header fields
sudo tcpdump -i eth0 -vv ip6

# Example output fields:
# 2001:db8::1 > 2001:db8::2: ICMP6, echo request, seq 1
#   (hlim 64, next-header ICMPv6 (58), length 64)

# Show raw header bytes
sudo tcpdump -i eth0 -XX ip6 | head -30

# Filter by flow label
sudo tcpdump -i eth0 "ip6 and ip6[0:4] & 0x000fffff == 0x000000ab"
```

## Conclusion

The IPv6 header's fixed 40-byte size is a deliberate design choice that simplifies router processing. Every field has a well-defined purpose: Version identifies the protocol, Traffic Class enables QoS, Flow Label identifies flows, Payload Length measures the following data, Next Header points to what follows the base header (extension header or upper-layer protocol), and Hop Limit prevents routing loops. Source and Destination addresses complete the picture at 16 bytes each.
