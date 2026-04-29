# How to Calculate Upper-Layer Checksums with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Checksum, TCP, UDP, ICMPv6, Networking

Description: Learn to calculate TCP, UDP, and ICMPv6 checksums over IPv6 including the mandatory pseudo-header, with complete Python implementations for each protocol.

## Introduction

TCP, UDP, and ICMPv6 carried over IPv6 include a checksum that covers both the protocol segment and the IPv6 pseudo-header. This end-to-end integrity check is more critical in IPv6 than in IPv4 because IPv6 removed the IP header checksum, placing full responsibility for data integrity on the upper layers.

## The Checksum Algorithm

All IPv6 upper-layer checksums use the same Internet checksum algorithm:

```python
import struct

def internet_checksum(data: bytes) -> int:
    """
    Compute the Internet checksum (RFC 1071).
    1's complement sum of all 16-bit words.

    Args:
        data: bytes to checksum (padded to even length automatically)

    Returns:
        16-bit checksum value (to be stored in the checksum field)
    """
    # Pad to even length
    if len(data) % 2:
        data = data + b'\x00'

    total = 0
    # Sum all 16-bit words
    for i in range(0, len(data), 2):
        word = (data[i] << 8) | data[i + 1]
        total += word

    # Fold 32-bit sum into 16 bits
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)

    # Return 1's complement
    return ~total & 0xFFFF

def make_pseudo_header(src: str, dst: str, upper_len: int, next_hdr: int) -> bytes:
    """Build IPv6 pseudo-header."""
    import socket
    src_b = socket.inet_pton(socket.AF_INET6, src)
    dst_b = socket.inet_pton(socket.AF_INET6, dst)
    return src_b + dst_b + struct.pack("!II", upper_len, next_hdr)
```

## TCP Checksum Over IPv6

```python
def tcp_checksum_ipv6(src: str, dst: str,
                       src_port: int, dst_port: int,
                       seq: int, ack: int,
                       flags: int, window: int,
                       payload: bytes = b"") -> int:
    """
    Compute TCP checksum for an IPv6 packet.

    Covers: IPv6 pseudo-header + TCP header + TCP data
    """
    # TCP header (with checksum = 0)
    data_offset = 5  # 20 bytes / 4 = 5 (no options)
    tcp_header = struct.pack("!HHIIBBHHH",
        src_port,       # Source port
        dst_port,       # Destination port
        seq,            # Sequence number
        ack,            # Acknowledgment number
        (data_offset << 4),  # Data offset + reserved
        flags,          # TCP flags (SYN=0x02, ACK=0x10, etc.)
        window,         # Window size
        0,              # Checksum = 0 for calculation
        0,              # Urgent pointer
    )

    # Segment = TCP header + payload
    segment = tcp_header + payload
    tcp_length = len(segment)

    # Pseudo-header (Next Header = 6 for TCP)
    pseudo = make_pseudo_header(src, dst, tcp_length, 6)

    return internet_checksum(pseudo + segment)

# Example: TCP SYN segment

syn_checksum = tcp_checksum_ipv6(
    src="2001:db8::1", dst="2001:db8::2",
    src_port=54321, dst_port=443,
    seq=1000, ack=0,
    flags=0x02,  # SYN flag
    window=65535,
)
print(f"TCP SYN checksum: 0x{syn_checksum:04X}")
```

## UDP Checksum Over IPv6

```python
def udp_checksum_ipv6(src: str, dst: str,
                       src_port: int, dst_port: int,
                       payload: bytes) -> int:
    """
    Compute UDP checksum for an IPv6 packet.

    IMPORTANT: UDP checksum is mandatory by default over IPv6 (unlike IPv4 where it's optional).
    RFC 6936 defines limited tunnel-mode exceptions for zero UDP checksums.
    Set to 0xFFFF if computed checksum would be 0 (to distinguish from 'no checksum').
    """
    udp_length = 8 + len(payload)  # 8-byte UDP header + data

    # UDP header with checksum = 0
    udp_header = struct.pack("!HHHH",
        src_port, dst_port,
        udp_length,
        0  # Checksum field = 0 during calculation
    )

    # Pseudo-header (Next Header = 17 for UDP)
    pseudo = make_pseudo_header(src, dst, udp_length, 17)

    result = internet_checksum(pseudo + udp_header + payload)

    # RFC 8200: if checksum computes to 0, use 0xFFFF
    return result if result != 0 else 0xFFFF

# Example: DNS query
dns_payload = b'\xab\xcd\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00' + \
              b'\x07example\x03com\x00\x00\x01\x00\x01'

udp_csum = udp_checksum_ipv6(
    src="2001:db8::1", dst="2001:db8::53",
    src_port=54321, dst_port=53,
    payload=dns_payload
)
print(f"UDP DNS checksum: 0x{udp_csum:04X}")
```

## ICMPv6 Checksum

```python
def icmpv6_checksum(src: str, dst: str, icmpv6_message: bytes) -> int:
    """
    Compute ICMPv6 checksum.

    ICMPv6 REQUIRES pseudo-header checksum (unlike ICMPv4).
    Next Header value = 58 (0x3A).
    """
    # Pseudo-header (Next Header = 58 for ICMPv6)
    pseudo = make_pseudo_header(src, dst, len(icmpv6_message), 58)
    return internet_checksum(pseudo + icmpv6_message)

# Example: Neighbor Solicitation
def build_neighbor_solicitation(src: str, target: str) -> bytes:
    """Build an NDP Neighbor Solicitation message."""
    import socket
    target_bytes = socket.inet_pton(socket.AF_INET6, target)

    # ICMPv6 NS: type=135, code=0, checksum=0, reserved=0, target addr
    ns = struct.pack("!BBH", 135, 0, 0)  # type, code, checksum=0
    ns += struct.pack("!I", 0)             # reserved
    ns += target_bytes                     # target address

    # Compute checksum
    # For address resolution, NS destination is solicited-node multicast: ff02::1:ffXX:XXXX
    target_int = int.from_bytes(target_bytes, 'big')
    last_24 = target_int & 0xFFFFFF
    sn_prefix = 0xff0200000000000000000001ff000000
    sn_addr = str(__import__('ipaddress').IPv6Address(sn_prefix | last_24))

    csum = icmpv6_checksum(src, sn_addr, ns)
    ns = ns[:2] + struct.pack("!H", csum) + ns[4:]
    return ns

ns = build_neighbor_solicitation("2001:db8::1", "2001:db8::2")
print(f"Neighbor Solicitation: {ns.hex()}")
```

## Verifying Checksums with Scapy

```python
# Using Scapy to verify checksum calculations
from scapy.all import IPv6, UDP, ICMPv6EchoRequest

# Scapy auto-calculates checksums
pkt = IPv6(src="2001:db8::1", dst="2001:db8::2") / \
      UDP(sport=12345, dport=53) / \
      b"test payload"

# Display the computed checksum
pkt = pkt.__class__(bytes(pkt))  # Force checksum recalculation
print(f"UDP checksum: 0x{pkt[UDP].chksum:04X}")

# ICMPv6 echo request
ping = IPv6(src="2001:db8::1", dst="2001:db8::2") / ICMPv6EchoRequest()
ping = ping.__class__(bytes(ping))
print(f"ICMPv6 checksum: 0x{ping[ICMPv6EchoRequest].cksum:04X}")
```

## Conclusion

Calculating upper-layer checksums over IPv6 requires including the 40-byte IPv6 pseudo-header (source address, destination address, upper-layer length, and Next Header value). The Internet checksum algorithm is the same as IPv4, but the pseudo-header is larger. UDP checksum is mandatory by default over IPv6, ICMPv6 checksum must include the pseudo-header (unlike ICMPv4), and TCP checksum uses the same mandatory calculation. These checksums provide the end-to-end integrity that IPv6 relies on since the IP header itself has no checksum.
