# How to Understand IPv6 Fragment Header Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragment Header, Fragmentation, RFC 8200, Packet Structure

Description: Understand the structure and purpose of each field in the IPv6 Fragment Extension Header, including Fragment Offset, More Fragments flag, and Identification.

## Introduction

The IPv6 Fragment Header (Next Header value 44) is an 8-byte extension header that the source includes when it needs to fragment a packet. Each fragment of the original packet carries a copy of this header, enabling the destination to reassemble the original packet. Understanding each field is essential for implementing IPv6 fragmentation or debugging fragment-related issues.

## Fragment Header Structure

```text
IPv6 Fragment Header (8 bytes total):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |   Reserved    |      Fragment Offset    |Res|M|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Identification                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Field breakdown:
  Next Header   [8 bits]  - Type of header following the Fragment Header
  Reserved      [8 bits]  - Must be zero, ignored on receipt
  Fragment Offset [13 bits] - Offset of this fragment's data in 8-byte units
  Res           [2 bits]  - Reserved, must be zero
  M (More)      [1 bit]   - 1 = more fragments follow; 0 = this is the last
  Identification [32 bits] - Unique ID linking all fragments of one packet
```

## Detailed Field Descriptions

```text
Next Header (8 bits):
  - Identifies the type of the header that follows the Fragment Header
  - For the first fragment: type of the first header in the original packet's Fragmentable Part (often TCP=6, UDP=17, etc.)
  - For subsequent fragments: same value (carried in every fragment)
  - Allows the destination to reconstruct the full original packet

Fragment Offset (13 bits):
  - Measured in 8-byte units (multiply by 8 to get byte offset)
  - First fragment: offset = 0
  - Second fragment: offset = (first fragment data size / 8)
  - Maximum offset: 2^13 - 1 = 8191 units = 65528 bytes
  - All fragments except the last must have data length as multiple of 8

More Fragments (M, 1 bit):
  - M=1: More fragments follow (this is not the last fragment)
  - M=0: This is the last fragment (or only fragment)
  - Fragment with offset=0 and M=0: "atomic fragment"; if received, it is processed as a fully reassembled packet, and RFC 8200 says sources must not create these whole-datagram fragments

Identification (32 bits):
  - Same value in all fragments of the same original packet
  - Must be different from other recently sent fragmented packets with the same source and destination address
  - "Recently" means within the maximum likely packet lifetime, including time spent awaiting reassembly
  - RFC 7739 describes algorithms that reduce reuse frequency and improve unpredictability
```

## Parsing the Fragment Header in Python

```python
import struct

def parse_fragment_header(data: bytes) -> dict:
    """
    Parse an IPv6 Fragment Extension Header.

    Args:
        data: 8 bytes of Fragment Header data

    Returns:
        Dictionary with decoded field values
    """
    if len(data) < 8:
        raise ValueError(f"Fragment header requires 8 bytes, got {len(data)}")

    next_header, reserved, offset_and_flags, identification = struct.unpack(
        "!BBHI", data[:8]
    )

    # offset_and_flags: 13 bits offset | 2 bits reserved | 1 bit M
    fragment_offset_units = (offset_and_flags >> 3)   # Top 13 bits
    fragment_offset_bytes = fragment_offset_units * 8  # Convert to bytes
    more_fragments = (offset_and_flags & 0x0001)       # Bottom bit

    return {
        "next_header": next_header,
        "next_header_name": {6: "TCP", 17: "UDP", 58: "ICMPv6"}.get(next_header, "Unknown"),
        "reserved": reserved,
        "fragment_offset_units": fragment_offset_units,
        "fragment_offset_bytes": fragment_offset_bytes,
        "more_fragments": bool(more_fragments),
        "identification": identification,
        "is_first_fragment": fragment_offset_units == 0,
        "is_last_fragment": not bool(more_fragments),
        "is_atomic_fragment": fragment_offset_units == 0 and not bool(more_fragments),
    }

# Example: Parse a fragment header for the second fragment

# Next Header = 6 (TCP), Offset = 184 bytes (23 units of 8), M=1, ID=0xABCD1234
second_fragment_header = struct.pack("!BBHI", 6, 0, (23 << 3) | 1, 0xABCD1234)
result = parse_fragment_header(second_fragment_header)

for key, value in result.items():
    print(f"  {key}: {value}")
```

## Building Fragment Headers

```python
def build_fragment_header(
    next_header: int,
    fragment_offset_bytes: int,
    more_fragments: bool,
    identification: int
) -> bytes:
    """
    Build an IPv6 Fragment Extension Header.

    Args:
        next_header:          Next Header type (6=TCP, 17=UDP, 58=ICMPv6)
        fragment_offset_bytes: Byte offset of this fragment (must be multiple of 8)
        more_fragments:        True if more fragments follow
        identification:        32-bit unique ID for this packet's fragments
    """
    if fragment_offset_bytes % 8 != 0:
        raise ValueError("Fragment offset must be a multiple of 8 bytes")

    offset_units = fragment_offset_bytes // 8
    more_bit = 1 if more_fragments else 0
    offset_and_flags = (offset_units << 3) | more_bit

    return struct.pack("!BBHI", next_header, 0, offset_and_flags, identification)

# Build example fragment headers using a 1448-byte first fragment
# Fragment 1: offset=0, more=True
frag1_header = build_fragment_header(17, 0, True, 0x12345678)
print(f"Fragment 1 header: {frag1_header.hex()}")

# Fragment 2: offset=1448, more=False
frag2_header = build_fragment_header(17, 1448, False, 0x12345678)
print(f"Fragment 2 header: {frag2_header.hex()}")
```

## Conclusion

The IPv6 Fragment Header is a compact 8-byte structure with four meaningful fields: Next Header (what follows), Fragment Offset (position in 13-bit units of 8 bytes), More Fragments flag (last fragment indicator), and Identification (32-bit link between all fragments of the same packet). The offset granularity of 8 bytes means all fragments except the last must have payload sizes that are multiples of 8. The Identification field must be different from other recently sent fragmented packets with the same source and destination address to prevent reassembly collisions.
