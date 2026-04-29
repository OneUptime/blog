# How to Understand the Mobility Header in IPv6 - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Mobile IPv6, Mobility Header, RFC 6275, Extension Headers

Description: Understand the IPv6 Mobility Header extension header, its message types, and how it enables Mobile IPv6 signaling between mobile nodes and home agents.

## Introduction

The Mobility Header is an IPv6 extension header (Next Header value 135) defined in RFC 6275. It carries Mobile IPv6 signaling messages such as Binding Updates and Binding Acknowledgments. Unlike data payloads, the Mobility Header is processed by IPv6 nodes identified by the Routing Header or by the destination address.

## Mobility Header Structure

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Payload Proto |  Header Len   |   MH Type     |   Reserved    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Checksum             |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                   Message Data ...                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **Payload Proto**: Next header after the Mobility Header
- **Header Len**: Length in 8-octet units, excluding first 8 octets
- **MH Type**: Message type (see table below)
- **Checksum**: Over the IPv6 pseudo-header + Mobility Header

## Mobility Header Message Types

| MH Type | Name | Direction |
|---|---|---|
| 0 | Binding Refresh Request | CN → MN |
| 1 | Home Test Init (HoTI) | MN → CN |
| 2 | Care-of Test Init (CoTI) | MN → CN |
| 3 | Home Test (HoT) | CN → MN |
| 4 | Care-of Test (CoT) | CN → MN |
| 5 | Binding Update (BU) | MN → HA/CN |
| 6 | Binding Acknowledgment (BA) | HA/CN → MN |
| 7 | Binding Error | CN/HA → MN |

## Binding Update Message Format

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Sequence #           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|A|H|L|K|M|R|P|F| Reserved      |           Lifetime            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Mobility Options ...
```

Key flags:
- **A**: Acknowledge requested
- **H**: Home Registration (MN registering with HA)
- **L**: Link-Local Address Compatibility
- **K**: Key Management Mobility Capability

## Capturing Mobility Header Packets

```bash
# Capture Mobility Header packets (Next Header = 135)

tcpdump -i eth0 -n "ip6 proto 135" -v

# With Wireshark display filter
# ipv6.nxt == 135
# mip6.mhtype == 5  (Binding Update only)
```

## Parsing the Mobility Header in Python

```python
import socket
import struct

def parse_mobility_header(data: bytes) -> dict:
    """
    Parse an IPv6 Mobility Header.
    data: the extension header bytes (starting after IPv6 base header)
    """
    MH_TYPES = {
        0: "Binding Refresh Request",
        1: "Home Test Init",
        2: "Care-of Test Init",
        3: "Home Test",
        4: "Care-of Test",
        5: "Binding Update",
        6: "Binding Acknowledgment",
        7: "Binding Error",
    }

    if len(data) < 8:
        return {"error": "Too short"}

    next_header, hdr_len, mh_type, reserved, checksum = struct.unpack_from("!BBBBH", data)

    return {
        "next_header": next_header,
        "header_length_bytes": (hdr_len + 1) * 8,
        "mh_type": mh_type,
        "mh_type_name": MH_TYPES.get(mh_type, f"Unknown ({mh_type})"),
        "checksum": hex(checksum),
        "message_data": data[6:].hex(),
    }
```

## Conclusion

The IPv6 Mobility Header (Next Header 135) is the signaling protocol for Mobile IPv6. Its message types - particularly Binding Update and Binding Acknowledgment - coordinate home address registration and route optimization. Use tcpdump with `ip6 proto 135` to capture and diagnose Mobile IPv6 signaling. Monitor Mobility Header traffic patterns with OneUptime to detect unexpected binding activity.
