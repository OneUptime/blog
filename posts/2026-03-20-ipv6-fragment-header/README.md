# How to Understand the IPv6 Fragment Header

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragmentation, Extension Headers, MTU, Networking

Description: Understand the IPv6 Fragment Header structure, how IPv6 fragmentation works differently from IPv4, and how fragments are identified and reassembled.

## Introduction

The IPv6 Fragment Header (Next Header = 44) enables packet fragmentation. In IPv6, fragmentation is fundamentally different from IPv4: only the source node can fragment packets - intermediate routers cannot. When a source needs to send data larger than the path MTU, it divides the packet into fragments, each containing the Fragment Header with identification and offset information.

## Fragment Header Format (8 bytes)

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |   Reserved    |      Fragment Offset    |Res|M|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Identification                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Next Header:      First header in the fragmentable part (for example, UDP/TCP)
Reserved:         Set to zero, ignored on receive
Fragment Offset:  Offset of this fragment in units of 8 bytes (13 bits)
Res:              Reserved bits (2 bits)
M (More fragments): 1 = more fragments follow, 0 = last fragment
Identification:   32-bit value used to match fragments from the same original packet
```

## How IPv6 Fragmentation Works

```text
Original packet (1600 bytes, MTU = 1500):

IPv6 Header (40) + Extension Headers (0) + UDP (8) + Data (1552) = 1600 bytes
Path MTU = 1500 bytes
Maximum fragment data per non-final fragment = floor((1500 - 40 - 8) / 8) × 8 = 1448 bytes

Fragment 1 (1496 bytes):
  IPv6 Header (40) + Fragment Header (8) + UDP Header (8) + Data (1440 bytes)
  Fragment Offset = 0, M = 1 (more fragments)

Fragment 2 (160 bytes):
  IPv6 Header (40) + Fragment Header (8) + Data (112 bytes)
  Fragment Offset = 181 (181 × 8 = 1448, the offset into the original fragmentable payload)
  M = 0 (last fragment)
```

## Python: IPv6 Fragmentation Implementation

```python
import struct
import socket
import os

def fragment_ipv6_packet(
    src: str, dst: str,
    next_header: int,
    payload: bytes,
    mtu: int = 1500
) -> list:
    """
    Fragment an IPv6 payload into MTU-sized packets.

    Args:
        src:         Source IPv6 address
        dst:         Destination IPv6 address
        next_header: Next Header value for the original payload
        payload:     The data to fragment (e.g., UDP header + data)
        mtu:         Path MTU in bytes

    Returns:
        List of raw IPv6 fragment bytes
    """
    IPV6_HEADER = 40
    FRAG_HEADER = 8

    # Maximum data per fragment (must be multiple of 8)
    max_frag_data = mtu - IPV6_HEADER - FRAG_HEADER
    max_frag_data = (max_frag_data // 8) * 8  # Round down to 8-byte boundary

    # Generate an Identification value for this fragmented packet
    identification = struct.unpack("!I", os.urandom(4))[0]

    src_bytes = socket.inet_pton(socket.AF_INET6, src)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst)

    fragments = []
    offset = 0

    while offset < len(payload):
        frag_data = payload[offset:offset + max_frag_data]
        more_fragments = 1 if (offset + max_frag_data) < len(payload) else 0

        # Fragment offset is in units of 8 bytes
        frag_offset_field = offset // 8

        # Build Fragment Header
        frag_header = struct.pack("!BBH",
            next_header,     # Next Header (original protocol)
            0,               # Reserved
            (frag_offset_field << 3) | more_fragments,  # Offset + M bit
        )
        frag_header += struct.pack("!I", identification)

        # Build IPv6 header
        payload_len = len(frag_header) + len(frag_data)
        first_word = (6 << 28)  # Version = 6
        ipv6_header = struct.pack("!IHBB",
            first_word,
            payload_len,
            44,   # Next Header = Fragment Header
            64    # Hop Limit
        )
        ipv6_header += src_bytes + dst_bytes

        fragments.append(ipv6_header + frag_header + frag_data)
        offset += len(frag_data)

    return fragments

# Example: fragment a 3072-byte test payload

large_payload = bytes(range(256)) * 12  # 3072 bytes
frags = fragment_ipv6_packet("2001:db8::1", "2001:db8::2", 253, large_payload)  # 253 = experimentation/testing
print(f"Original payload: {len(large_payload)} bytes")
print(f"Number of fragments: {len(frags)}")
for i, f in enumerate(frags):
    print(f"  Fragment {i+1}: {len(f)} bytes")
```

## Fragment Reassembly Rules

```text
At the destination, fragments are reassembled when:
1. All fragments with the same Identification + Source + Destination have arrived
2. The last fragment (M=0) has been received
3. No gaps in the fragment offsets

Reassembly timeout: RFC 8200 requires at least 60 seconds
If not all fragments arrive within the timeout:
  → Discard all fragments
  → Send ICMPv6 Time Exceeded (type 3, code 1) if the first fragment (offset=0) was received
```

```bash
# Monitor fragment reassembly statistics
cat /proc/net/snmp6 | grep -Ei 'frag|reasm'

# Key metrics:
# Ip6ReasmReqds:   Fragments received for reassembly
# Ip6ReasmOKs:     Successfully reassembled packets
# Ip6ReasmFails:   Failed reassembly attempts
# Ip6FragOKs:      Packets successfully fragmented by this host
# Ip6FragCreates:  Fragment packets created
```

## Conclusion

The IPv6 Fragment Header is a fixed 8-byte structure that enables source-only fragmentation. The key fields - Fragment Offset (in 8-byte units), More Fragments bit, and Identification - allow the destination to reassemble fragments correctly. Unlike IPv4 where any router could fragment, IPv6's source-only fragmentation model places the burden on the source to discover the path MTU and create appropriately-sized packets. This simplifies router processing but requires applications and the OS to implement path MTU discovery correctly.
