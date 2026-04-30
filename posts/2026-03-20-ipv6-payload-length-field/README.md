# How to Understand the IPv6 Payload Length Field

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Header, Payload Length, Networking, Jumbograms

Description: Understand the 16-bit IPv6 Payload Length field, how it differs from IPv4 Total Length, what happens when it is zero, and its role in processing IPv6 packets.

## Introduction

The IPv6 Payload Length is a 16-bit field that specifies the number of bytes following the 40-byte IPv6 header. Unlike IPv4's Total Length (which includes the header), IPv6's Payload Length counts only the payload - extension headers plus the upper-layer PDU. Understanding this field is important for implementing or debugging IPv6 packet processing.

## Field Specification

```text
IPv6 Payload Length:
  - 16-bit unsigned integer
  - Units: bytes
  - Counts: Everything AFTER the 40-byte IPv6 header
  - Includes: Extension headers + Upper-layer data (TCP/UDP/ICMPv6)
  - Does NOT include: The 40-byte IPv6 base header itself
  - Maximum value: 65,535 bytes (in standard packets)
  - Zero: Either no payload, or a Jumbogram when a Hop-by-Hop header carries the Jumbo Payload Option

IPv4 Total Length (for comparison):
  - 16-bit unsigned integer
  - Counts: IPv4 header + payload
  - Includes the header itself
```

## Calculating Payload Length

```python
import struct
import socket

def calculate_ipv6_payload_length(
    extension_headers: bytes = b"",
    upper_layer_data: bytes = b""
) -> int:
    """
    Calculate the Payload Length field value for an IPv6 packet.

    Args:
        extension_headers: Raw bytes of all extension headers
        upper_layer_data:  Raw bytes of TCP/UDP/ICMPv6 segment

    Returns:
        Payload Length value to put in the IPv6 header
    """
    # Payload Length = extension headers + upper layer data
    payload_length = len(extension_headers) + len(upper_layer_data)

    if payload_length > 65535:
        raise ValueError(
            f"Payload too large for standard Payload Length field: {payload_length}. "
            "Use Jumbogram (Hop-by-Hop option) instead."
        )
    return payload_length

# Example: TCP segment with no extension headers

tcp_segment = b"\x00\x50\xab\xcd" + b"\x00" * 16  # 20-byte TCP header (simplified)
payload_len = calculate_ipv6_payload_length(upper_layer_data=tcp_segment)
print(f"Payload Length: {payload_len} bytes")  # 20

# Example: Routing extension header + UDP
routing_header = bytes([0x11, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])  # 8 bytes
udp_datagram = bytes([0x00, 0x35] + [0x00] * 6)  # DNS query
payload_len = calculate_ipv6_payload_length(routing_header, udp_datagram)
print(f"Payload Length: {payload_len} bytes")  # 16
```

## Parsing Payload Length from a Raw Packet

```python
def parse_ipv6_header(raw_bytes: bytes) -> dict:
    """Extract Payload Length and other fields from a raw IPv6 header."""
    if len(raw_bytes) < 40:
        raise ValueError("Incomplete IPv6 header")

    # Bytes 4-5 = Payload Length
    payload_length = struct.unpack("!H", raw_bytes[4:6])[0]
    next_header    = raw_bytes[6]
    hop_limit      = raw_bytes[7]

    src_addr = socket.inet_ntop(socket.AF_INET6, raw_bytes[8:24])
    dst_addr = socket.inet_ntop(socket.AF_INET6, raw_bytes[24:40])

    if payload_length == 0:
        # Zero can mean either an empty payload or that the actual payload
        # length is carried in the Jumbo Payload option.
        total_packet_length = 40 if next_header == 59 else None
    else:
        total_packet_length = 40 + payload_length

    return {
        "payload_length": payload_length,
        "next_header": next_header,
        "hop_limit": hop_limit,
        "src": src_addr,
        "dst": dst_addr,
        "payload_start_offset": 40,
        "total_packet_length": total_packet_length,
    }
```

## Special Case: Zero Payload Length and Jumbograms

When the Payload Length field is `0`, it can mean either there is no payload or that the packet is a **Jumbogram**. In a valid Jumbogram, a Hop-by-Hop Options extension header immediately follows the IPv6 header and carries the Jumbo Payload Option with the actual payload size:

```text
Payload Length = 0
  ↓
If Next Header = Hop-by-Hop (0), parse the Hop-by-Hop Options header
  ↓
Jumbo Payload Option (option type 0xC2) contains 32-bit actual length
  ↓
Actual payload can be up to 2^32 - 1 bytes (4 GB)
```

```python
# Detect whether the IPv6 base header indicates a possible Jumbogram
def indicates_jumbogram(ipv6_header: bytes) -> bool:
    """
    Return True if this IPv6 header indicates that a Hop-by-Hop Options
    header follows and the packet may be a Jumbogram.
    Confirm by parsing the Hop-by-Hop header for a Jumbo Payload option.
    """
    payload_length = struct.unpack("!H", ipv6_header[4:6])[0]
    next_header = ipv6_header[6]
    return payload_length == 0 and next_header == 0  # 0 = Hop-by-Hop
```

## Verifying Payload Length with tcpdump

```bash
# With -vv, tcpdump shows the IPv6 payload length in the decoded header details
sudo tcpdump -n -i eth0 -vv ip6 | grep "payload length"

# Example output:
# IP6 (hlim 64, next-header ICMPv6 (58) payload length: 64) 2001:db8::1 > 2001:db8::2: ICMP6, echo request, id 1, seq 1
# "payload length: 64" = Payload Length field value = ICMPv6 header (8 bytes) + data (56 bytes)

# Check that payload_length + 40 = actual packet size for non-jumbograms
sudo tcpdump -n -i eth0 -vv ip6 | awk -F'payload length: ' '/payload length:/ {split($2, a, /[) ]/); print "Payload:", a[1], "Total:", a[1] + 40}'
```

## Conclusion

The IPv6 Payload Length field specifies the number of bytes after the 40-byte base header. Unlike IPv4, the header length is not included. For non-jumbograms, packet processing is straightforward: `total_packet_size = 40 + payload_length`. When the field is zero, you must distinguish between an empty payload and a Jumbogram by checking whether a Hop-by-Hop header carries the Jumbo Payload Option. Correct implementation of this field is essential for any IPv6 packet generator or parser.
