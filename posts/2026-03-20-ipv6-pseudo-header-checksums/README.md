# How to Understand the IPv6 Pseudo-Header for Checksums

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Checksum, UDP, TCP, ICMPv6, Protocol

Description: Understand the IPv6 pseudo-header construction used in TCP, UDP, and ICMPv6 checksum calculations, and why it differs from the IPv4 pseudo-header.

## Introduction

Upper-layer protocols such as TCP, UDP, and ICMPv6 in IPv6 compute checksums over their own header/data plus a "pseudo-header" derived from the IPv6 packet. This pseudo-header ensures that checksums detect IP-level misdeliveries (wrong source or destination address). The IPv6 pseudo-header differs from IPv4's in that it is 40 bytes (vs IPv4's 12 bytes) and includes the full 128-bit addresses.

## IPv6 Pseudo-Header Structure

RFC 8200 defines the IPv6 pseudo-header as (using the final destination address if a Routing header is present):

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                         Source Address                        +
|                        (128 bits = 16 bytes)                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                      Destination Address                      +
|                        (128 bits = 16 bytes)                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Upper-Layer Packet Length                   |
|                         (32 bits)                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Zero (24 bits)       | Next Header (8b)  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Total: 16 + 16 + 4 + 4 = 40 bytes
```

Key differences from IPv4 pseudo-header:
- **128-bit addresses** (vs 32-bit in IPv4)
- **32-bit upper-layer length** (vs 16-bit in IPv4, needed for jumbograms)
- **Upper-layer protocol Next Header value** instead of IPv4's Protocol field

## Computing the Checksum in Python

```python
import socket
import struct

def checksum(data: bytes) -> int:
    """Compute the Internet checksum (one's complement sum)."""
    if len(data) % 2:
        data += b'\x00'  # Pad to even length

    total = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) + data[i + 1]
        total += word
        total = (total & 0xFFFF) + (total >> 16)  # Fold carries

    return ~total & 0xFFFF

def ipv6_pseudo_header(src: str, dst: str,
                        upper_length: int, next_header: int) -> bytes:
    """
    Build the IPv6 pseudo-header for checksum computation.

    Args:
        src:          Source IPv6 address string
        dst:          Destination IPv6 address string (final destination if a Routing header is present)
        upper_length: Length of the upper-layer segment (bytes)
        next_header:  Next Header value (6=TCP, 17=UDP, 58=ICMPv6)
    """
    src_bytes = socket.inet_pton(socket.AF_INET6, src)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst)

    # Pseudo-header: src(16) + dst(16) + length(4) + zeros(3) + next_header(1)
    pseudo = src_bytes + dst_bytes
    pseudo += struct.pack("!I", upper_length)   # 32-bit upper-layer length
    pseudo += struct.pack("!I", next_header)     # 3 zero bytes + next header

    return pseudo

def compute_udp_checksum(src: str, dst: str,
                          src_port: int, dst_port: int,
                          payload: bytes) -> int:
    """Compute the correct UDP/IPv6 checksum."""
    udp_length = 8 + len(payload)  # UDP header (8 bytes) + data

    # Build UDP header with checksum field = 0
    udp_header = struct.pack("!HHHH",
        src_port, dst_port,
        udp_length,
        0  # Checksum = 0 during computation
    )

    # Concatenate: pseudo-header + UDP header + payload
    pseudo = ipv6_pseudo_header(src, dst, udp_length, 17)  # 17 = UDP
    checksum_input = pseudo + udp_header + payload

    csum = checksum(checksum_input)
    return 0xFFFF if csum == 0 else csum

# Example: compute checksum for a DNS query

src = "2001:db8::1"
dst = "2001:db8::53"
dns_query = b'\x00\x01\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00' + \
            b'\x07example\x03com\x00\x00\x01\x00\x01'

csum = compute_udp_checksum(src, dst, 54321, 53, dns_query)
print(f"UDP checksum: 0x{csum:04X}")
```

## ICMPv6 Checksum (Mandatory)

Unlike ICMPv4 (where checksum covers only the ICMP message), ICMPv6 checksum MUST include the pseudo-header:

```python
def compute_icmpv6_checksum(src: str, dst: str, icmpv6_message: bytes) -> int:
    """
    Compute ICMPv6 checksum.
    ICMPv6 REQUIRES the pseudo-header (unlike ICMPv4).

    Args:
        src:              Source IPv6 address
        dst:              Destination IPv6 address
        icmpv6_message:   Complete ICMPv6 message with checksum field = 0
    """
    pseudo = ipv6_pseudo_header(src, dst, len(icmpv6_message), 58)  # 58 = ICMPv6
    return checksum(pseudo + icmpv6_message)

# Build a ping6 echo request
icmp_type = 128  # Echo Request
icmp_code = 0
icmp_id   = 1
icmp_seq  = 1
icmp_data = b'Hello, IPv6!'

echo_request = struct.pack("!BBHH", icmp_type, icmp_code, 0, icmp_id)
echo_request += struct.pack("!H", icmp_seq) + icmp_data

# Insert computed checksum
csum = compute_icmpv6_checksum("2001:db8::1", "2001:db8::2", echo_request)
echo_request = echo_request[:2] + struct.pack("!H", csum) + echo_request[4:]
print(f"ICMPv6 checksum: 0x{csum:04X}")
```

## Why the Pseudo-Header Catches Address Misdelivery

```text
Without pseudo-header in checksum:
  A packet to wrong address might still have valid TCP/UDP checksum
  → Misdelivered silently

With pseudo-header:
  Checksum covers both addresses
  If the receiver sees different source/destination addresses than the sender used, checksum fails
  → Upper-layer discards the packet instead of accepting it as valid
```

## Conclusion

The IPv6 pseudo-header is a 40-byte structure combining source address, destination address, upper-layer length, and the upper-layer protocol's Next Header value. It is included in checksum calculations for protocols such as TCP, UDP, and ICMPv6 to ensure that checksum verification catches both data corruption and address misdelivery. The key practical difference from IPv4 is the use of 128-bit addresses and a 32-bit length field to support jumbograms.
