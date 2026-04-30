# How to Calculate ICMPv6 Checksums

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Checksum, IPv6 Pseudo-Header, RFC 4443, Networking

Description: Understand how ICMPv6 checksums are calculated using the IPv6 pseudo-header, implement checksum calculation in Python, and verify checksums for debugging.

## Introduction

ICMPv6 checksums differ from ICMPv4 checksums in one important way: they are mandatory and they include an IPv6 pseudo-header in the calculation. Unlike ICMPv4, which does not include a pseudo-header in its checksum, ICMPv6 incorporates IPv6 header fields into the checksum input. This helps protect against misdelivery or corruption of IPv6 header fields that ICMPv6 depends on.

## The IPv6 Pseudo-Header

The checksum calculation includes a pseudo-header that is not actually transmitted but is derived from the IPv6 header:

```text
IPv6 Pseudo-Header for checksum calculation:

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                         Source Address                        |
+                        (128 bits / 16 bytes)                  +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                      Destination Address                      |
+                        (128 bits / 16 bytes)                  +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Upper-Layer Packet Length                   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      zero            |  Next Header = 58 (ICMPv6) |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Total pseudo-header size: 16 + 16 + 4 + 4 = 40 bytes
```

## Implementing ICMPv6 Checksum

```python
import struct
import socket

def calculate_icmpv6_checksum(
    src_addr: str,
    dst_addr: str,
    icmpv6_message: bytes,
) -> int:
    """
    Calculate ICMPv6 checksum per RFC 4443.

    Args:
        src_addr:       Source IPv6 address string
        dst_addr:       Destination IPv6 address string
        icmpv6_message: ICMPv6 message bytes (with checksum field zeroed)

    Returns:
        16-bit checksum value
    """
    # Convert addresses to bytes
    src_bytes = socket.inet_pton(socket.AF_INET6, src_addr)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst_addr)

    # ICMPv6 payload length (upper-layer packet length)
    icmpv6_length = len(icmpv6_message)

    # Build the IPv6 pseudo-header (40 bytes)
    pseudo_header = (
        src_bytes +                                # 16 bytes source
        dst_bytes +                                # 16 bytes destination
        struct.pack("!I", icmpv6_length) +         # 4 bytes upper-layer length
        struct.pack("!I", 58)                      # 4 bytes: zeros + Next Header (58)
    )

    # Data to checksum = pseudo-header + ICMPv6 message
    data = pseudo_header + icmpv6_message

    # Pad to even length if necessary
    if len(data) % 2 != 0:
        data += b'\x00'

    # One's complement sum of 16-bit words
    checksum = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) | data[i + 1]
        checksum += word
        # Fold carry bits
        checksum = (checksum & 0xFFFF) + (checksum >> 16)

    # One's complement of the sum
    return ~checksum & 0xFFFF

def build_icmpv6_echo_request(
    src_addr: str,
    dst_addr: str,
    identifier: int = 1,
    sequence: int = 1,
    data: bytes = b'Hello IPv6'
) -> bytes:
    """
    Build a complete ICMPv6 Echo Request with correct checksum.
    """
    # Build message with checksum = 0
    message = struct.pack("!BBHHH",
        128,        # Type: Echo Request
        0,          # Code: 0
        0,          # Checksum: 0 (placeholder)
        identifier,
        sequence
    ) + data

    # Calculate and insert checksum
    checksum = calculate_icmpv6_checksum(src_addr, dst_addr, message)
    message = message[:2] + struct.pack("!H", checksum) + message[4:]

    return message

def verify_icmpv6_checksum(src_addr: str, dst_addr: str,
                            icmpv6_message: bytes) -> bool:
    """
    Verify ICMPv6 checksum. Returns True if valid.
    The one's complement sum of the full message should be 0xFFFF,
    so this helper returns 0x0000 for a valid packet.
    """
    # Calculate checksum over the message including the existing checksum
    result = calculate_icmpv6_checksum(src_addr, dst_addr, icmpv6_message)
    # A valid checksum results in 0x0000 after verification
    return result == 0

# Test

src = "2001:db8::1"
dst = "2001:db8::2"
echo_request = build_icmpv6_echo_request(src, dst, 12345, 1)
print(f"Echo Request ({len(echo_request)} bytes): {echo_request.hex()}")

is_valid = verify_icmpv6_checksum(src, dst, echo_request)
print(f"Checksum valid: {is_valid}")

# Extract and display the checksum
checksum = struct.unpack("!H", echo_request[2:4])[0]
print(f"Checksum value: 0x{checksum:04X}")
```

## Checksum When Source Address Changes

A subtle issue occurs when an intermediary rewrites IPv6 addresses, such as during NAT64 - the checksum must be recalculated because the source and destination addresses are part of the checksum input:

```python
def update_icmpv6_checksum_for_new_src(
    old_src: str, new_src: str,
    icmpv6_message: bytes, dst_addr: str
) -> bytes:
    """
    Recalculate ICMPv6 checksum after source address change.
    Necessary for NAT64, address rewriting, etc.
    """
    # Zero out the existing checksum
    message_zeroed = icmpv6_message[:2] + b'\x00\x00' + icmpv6_message[4:]

    # Calculate new checksum with new source address
    new_checksum = calculate_icmpv6_checksum(new_src, dst_addr, message_zeroed)

    # Insert new checksum
    return (icmpv6_message[:2] +
            struct.pack("!H", new_checksum) +
            icmpv6_message[4:])
```

## Conclusion

ICMPv6 checksums are mandatory and must cover the full message plus the IPv6 pseudo-header. The pseudo-header includes the source and destination IPv6 addresses, the ICMPv6 payload length, and the Next Header value (58 for ICMPv6). This binding to IP addresses means that any address translation or NAT operation must recalculate the checksum. The checksum algorithm is the standard Internet checksum: one's complement sum of 16-bit words, then one's complement of the result.
