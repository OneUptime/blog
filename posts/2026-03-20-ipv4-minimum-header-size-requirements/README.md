# How to Understand IPv4 Minimum Header Size Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Header Structure, TCP/IP, Packet Analysis

Description: The minimum IPv4 header is 20 bytes (five 32-bit words), covering all mandatory fields with no options, and this baseline is used to calculate payload offsets and validate incoming packets.

## The Fixed Minimum: 20 Bytes

The IPv4 header contains the following mandatory fields, totaling exactly 20 bytes:

| Field | Size | Offset |
|-------|------|--------|
| Version + IHL | 1 byte | 0 |
| DS field (DSCP + ECN) | 1 byte | 1 |
| Total Length | 2 bytes | 2 |
| Identification | 2 bytes | 4 |
| Flags + Fragment Offset | 2 bytes | 6 |
| Time to Live | 1 byte | 8 |
| Protocol | 1 byte | 9 |
| Header Checksum | 2 bytes | 10 |
| Source Address | 4 bytes | 12 |
| Destination Address | 4 bytes | 16 |
| **Total** | **20 bytes** | |

## The IHL Field

The Internet Header Length (IHL) occupies the low nibble of byte 0. It is measured in 32-bit words:
- Minimum: IHL = 5 → 5 × 4 = **20 bytes** (no options)
- Maximum: IHL = 15 → 15 × 4 = **60 bytes** (up to 40 bytes for options and padding)

## Validating Header Length in Code

```python
def validate_ipv4_header(packet: bytes) -> bool:
    """
    Check that the packet is at least the minimum IPv4 header size
    and that IHL and Total Length are consistent with the packet length.
    """
    MIN_HEADER = 20
    if len(packet) < MIN_HEADER:
        print(f"Packet too short: {len(packet)} < {MIN_HEADER}")
        return False

    version = (packet[0] >> 4) & 0xF
    if version != 4:
        print(f"Not IPv4: version={version}")
        return False

    ihl = (packet[0] & 0x0F) * 4   # Header length in bytes
    if ihl < MIN_HEADER:
        print(f"IHL too small: {ihl} bytes")
        return False

    if len(packet) < ihl:
        print(f"Packet shorter than IHL: {len(packet)} < {ihl}")
        return False

    total_length = (packet[2] << 8) | packet[3]
    if total_length < ihl:
        print(f"Total Length {total_length} < IHL {ihl}")
        return False
    if len(packet) < total_length:
        print(f"Truncated packet: {len(packet)} < Total Length {total_length}")
        return False

    print(f"Valid header: IHL={ihl} bytes, Total={total_length} bytes")
    return True

# Test with a minimal 20-byte header

import struct, socket
hdr = struct.pack("!BBHHHBBH4s4s",
    0x45, 0, 20, 0, 0, 64, 17, 0,
    socket.inet_aton("10.0.0.1"),
    socket.inet_aton("10.0.0.2"),
)
validate_ipv4_header(hdr)
```

## Finding the Payload Start

```python
def get_payload(packet: bytes) -> bytes:
    """Return the IP payload from a validated packet."""
    ihl = (packet[0] & 0x0F) * 4
    total_length = (packet[2] << 8) | packet[3]
    return packet[ihl:total_length]
```

## RFC Minimum Reassembly Buffer

RFC 791 requires all IPv4 hosts to be able to reassemble datagrams of at least 576 bytes. Modern hosts handle the full 65,535-byte maximum, but 576 bytes is the guaranteed interoperable minimum for fragmented traffic.

## Key Takeaways

- The minimum IPv4 header is always 20 bytes (IHL=5).
- IHL values below 5 are invalid and should cause the packet to be dropped.
- All payload parsing must use `ihl` (not the hardcoded 20) to handle headers with options.
- RFC 791 mandates hosts handle at least 576-byte reassembly; practical implementations support 65,535.
