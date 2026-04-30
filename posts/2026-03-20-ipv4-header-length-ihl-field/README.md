# How to Determine IPv4 Header Length Using the IHL Field

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, IHL, Packet Header, TCP/IP

Description: Learn how the Internet Header Length (IHL) field in IPv4 packets specifies the header size in 32-bit words and how to use it to locate the payload start.

## Introduction

The Internet Header Length (IHL) field occupies the lower 4 bits of the first byte in an IPv4 header. It specifies the total header length in 32-bit (4-byte) words. The minimum value is 5 (20 bytes, no options) and the maximum is 15 (60 bytes total, with up to 40 bytes of options and padding). Correctly reading the IHL is essential - it tells you exactly where the header ends and the payload (TCP, UDP, ICMP data) begins.

## IHL Field Position and Encoding

The first byte of an IPv4 packet encodes both Version and IHL.

```text
First byte:
  Bits 7-4: Version (always 4 for IPv4)
  Bits 3-0: IHL (header length in 32-bit words)

Example: 0x45
  0100 (4) = Version 4
  0101 (5) = IHL 5 → header is 5 × 4 = 20 bytes
```

```python
def get_ihl(raw_packet: bytes) -> int:
    """Extract IHL value from first byte (lower 4 bits)."""
    return raw_packet[0] & 0x0F

def get_header_length_bytes(raw_packet: bytes) -> int:
    """Get IPv4 header length in bytes."""
    ihl = get_ihl(raw_packet)
    return ihl * 4  # IHL × 4 bytes per word

def get_payload(raw_packet: bytes) -> bytes:
    """Extract the payload (everything after the IP header)."""
    header_len = get_header_length_bytes(raw_packet)
    return raw_packet[header_len:]
```

## IHL Values and Their Meanings

| IHL Value | Header Length | Meaning |
|---|---|---|
| 0-4 | - | Invalid; packet should be discarded |
| 5 | 20 bytes | Minimum; no options (most common) |
| 6 | 24 bytes | 4 bytes of options |
| 7 | 28 bytes | 8 bytes of options |
| ... | ... | ... |
| 15 | 60 bytes | Maximum; up to 40 bytes of options/padding |

## Reading IHL from Packet Captures

```bash
# tcpdump verbose output does not print IHL directly; use a hex dump
tcpdump -n -X -i eth0 -c 1 'ip' | head -3
# 0x0000:  4500 ...
# First nibble of 45 = version (4)
# Second nibble of 45 = IHL (5)

# Filter for packets with IP options (IHL > 5)
tcpdump -n 'ip[0] & 0x0f > 5'
```

## Why IHL Matters for Payload Extraction

Without IHL, you cannot reliably find the start of the TCP or UDP header. The payload always starts at `header_start + (IHL × 4)`.

```python
import struct, socket

def parse_transport_layer(raw_ip_packet: bytes) -> dict:
    """
    Parse the transport layer header by first finding
    the payload start using IHL.
    """
    ihl = (raw_ip_packet[0] & 0x0F) * 4
    protocol = raw_ip_packet[9]
    payload = raw_ip_packet[ihl:]

    if protocol == 6:  # TCP
        # TCP header: src_port, dst_port, seq, ack, offset_flags, ...
        src_port, dst_port, seq, ack = struct.unpack('!HHII', payload[:12])
        data_offset = (payload[12] >> 4) * 4  # TCP header length
        return {
            "protocol": "TCP",
            "src_port": src_port,
            "dst_port": dst_port,
            "tcp_data": payload[data_offset:]
        }

    elif protocol == 17:  # UDP
        src_port, dst_port, length = struct.unpack('!HHH', payload[:6])
        return {
            "protocol": "UDP",
            "src_port": src_port,
            "dst_port": dst_port,
            "udp_data": payload[8:]  # UDP header is always 8 bytes
        }

    return {"protocol": protocol, "payload": payload}
```

## IP Options and Variable IHL

IP options extend the header beyond 20 bytes. While rarely used in modern networks, they appear in specific scenarios.

```python
def parse_ip_options(raw_packet: bytes) -> list:
    """Parse IP options from a packet with IHL > 5."""
    ihl_bytes = (raw_packet[0] & 0x0F) * 4
    options_bytes = ihl_bytes - 20  # options start at byte 20

    if options_bytes <= 0:
        return []  # no options

    options_data = raw_packet[20:ihl_bytes]
    options = []

    i = 0
    while i < len(options_data):
        option_type = options_data[i]

        if option_type == 0:    # End of Options List
            break
        elif option_type == 1:  # No Operation (padding)
            i += 1
            continue
        else:
            option_len = options_data[i + 1]
            option_data = options_data[i + 2:i + option_len]
            options.append({"type": option_type, "data": option_data})
            i += option_len

    return options
```

Common IP option types: 68 (Timestamp), 7 (Record Route), 137 (Strict Source Route).

## Validation: IHL Must Be at Least 5

```python
def validate_ihl(raw_packet: bytes) -> bool:
    """Basic IHL validation."""
    ihl = raw_packet[0] & 0x0F
    if ihl < 5:
        raise ValueError(f"Invalid IHL: {ihl} (minimum is 5)")
    if ihl * 4 > len(raw_packet):
        raise ValueError("Packet too short for declared IHL")
    return True
```

## Summary

The IHL field is the lower 4 bits of the first byte in an IPv4 header. It encodes the header length in 32-bit words: multiply by 4 to get bytes. IHL=5 (20 bytes) is by far the most common value - packets with IP options can have IHL up to 15 (60 bytes total). Always use IHL to locate the payload start rather than assuming a fixed 20-byte offset, especially when implementing packet parsers or network tools. Use `tcpdump 'ip[0] & 0x0f > 5'` to filter for packets with options in the wild.
