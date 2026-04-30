# How to Interpret the Total Length Field in IPv4 Packets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Packet Header, MTU, Fragmentation, TCP/IP

Description: Learn how the 16-bit Total Length field in IPv4 headers defines packet size, how it relates to MTU and fragmentation, and how to use it in packet parsing.

## Introduction

The Total Length field is a 16-bit unsigned integer at bytes 2-3 of the IPv4 header. It specifies the total size of the packet - header plus payload - in bytes. The minimum is 20 bytes (header only, no data) and the maximum is 65,535 bytes. This field is critical for correct packet parsing, MTU management, and fragmentation handling.

## Total Length in Context

```text
IPv4 Header (bytes 0-3):
  Byte 0:  Version + IHL
  Byte 1:  Type of Service
  Bytes 2-3: Total Length  ← this field

Total Length = Header Length + Payload Length

Example:
  Total Length = 1500 bytes
  Header Length = 20 bytes (IHL=5)
  Payload Length = 1480 bytes
```

```python
import struct

def get_total_length(raw_packet: bytes) -> int:
    """Extract Total Length from IPv4 header bytes 2-3."""
    return struct.unpack('!H', raw_packet[2:4])[0]

def get_payload_length(raw_packet: bytes) -> int:
    """Calculate payload length from Total Length and IHL."""
    total_length = get_total_length(raw_packet)
    header_length = (raw_packet[0] & 0x0F) * 4
    return total_length - header_length

def validate_total_length(raw_packet: bytes) -> bool:
    """Verify Total Length is consistent with actual packet data."""
    total_length = get_total_length(raw_packet)
    header_length = (raw_packet[0] & 0x0F) * 4
    actual_length = len(raw_packet)

    if header_length < 20:
        raise ValueError(f"Header Length {header_length} < minimum 20 bytes")
    if total_length < 20:
        raise ValueError(f"Total Length {total_length} < minimum 20 bytes")
    if total_length < header_length:
        raise ValueError(f"Total Length {total_length} < header length {header_length}")
    if total_length > actual_length:
        raise ValueError(f"Total Length {total_length} > actual data {actual_length}")
    return True
```

## Relationship to MTU

The Maximum Transmission Unit (MTU) constrains Total Length at the link layer. Ethernet's standard MTU is 1500 bytes, so most IPv4 packets have Total Length ≤ 1500.

```bash
# Check interface MTU

ip link show eth0 | grep mtu
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500

# Check path MTU to a destination
tracepath 8.8.8.8
# Shows the discovered path MTU and where it changes along the route

# Test specific packet size
ping -s 1472 -M do 8.8.8.8
# -s 1472 payload + 28 header = 1500 total (matches Ethernet MTU)
# -M do = Don't Fragment
# If the path MTU is smaller, the probe fails and PMTU discovery reports it
```

## Fragmentation and Total Length

When a packet's Total Length exceeds the path MTU and the Don't Fragment bit is not set, routers fragment it. Each fragment is a new IPv4 packet with its own Total Length.

```bash
# Observe fragmentation in tcpdump
tcpdump -n -v -i eth0 'ip[6:2] & 0x2000 != 0 || ip[6:2] & 0x1fff != 0'
# Matches packets with MF bit set OR non-zero fragment offset

# Example output when fragmented:
# IP (tos 0x0, ttl 64, id 12345, offset 0, flags [+],
#     proto UDP (17), length 1500)
# IP (tos 0x0, ttl 64, id 12345, offset 1480, flags [],
#     proto UDP (17), length 532)
# Same ID=12345, first has MF (+) set, second has offset=1480
```

```python
def parse_fragment_info(raw_packet: bytes) -> dict:
    """
    Parse fragmentation-related fields.
    The 16-bit flags+offset field is at bytes 6-7.
    """
    flags_offset = struct.unpack('!H', raw_packet[6:8])[0]
    flags = flags_offset >> 13
    fragment_offset_words = flags_offset & 0x1FFF
    fragment_offset_bytes = fragment_offset_words * 8  # offset is in 8-byte units

    return {
        "identification":    struct.unpack('!H', raw_packet[4:6])[0],
        "dont_fragment":     bool(flags & 0b010),
        "more_fragments":    bool(flags & 0b001),
        "fragment_offset":   fragment_offset_bytes,
        "total_length":      get_total_length(raw_packet),
        "is_fragment":       bool(fragment_offset_bytes > 0 or (flags & 0b001)),
    }
```

## Jumbo Frames and Total Length

Some networks support jumbo frames with MTU up to 9000 bytes, allowing Total Length up to 9000 bytes.

```bash
# Enable jumbo frames on an interface
ip link set eth0 mtu 9000

# Verify with a large ping
ping -s 8972 -M do 10.0.0.1  # 8972 + 28 = 9000 total

# Wireshark filter for jumbo frames
# ip.len > 1500
```

## Detecting Abnormal Total Length Values

Malformed or malicious packets sometimes have anomalous Total Length values.

```python
def classify_packet_size(raw_packet: bytes) -> str:
    """Classify packet by its Total Length."""
    total_length = get_total_length(raw_packet)

    if total_length < 20:
        return "INVALID: below minimum"
    elif total_length == 20:
        return "Header-only: no payload"
    elif total_length <= 576:
        return "Small: within IPv4's 576-byte reassembly minimum"
    elif total_length <= 1500:
        return "Standard: fits Ethernet MTU"
    elif total_length <= 9000:
        return "Jumbo: requires jumbo frame support"
    else:
        return "Oversized: unusual"
```

```bash
# Find minimal IPv4 + TCP packets with no options (common in scans)
tcpdump -n 'tcp and ip[2:2] == 40'

# Find large packets that may cause fragmentation
tcpdump -n 'ip[2:2] > 1400 && ip[6] & 0x40 != 0'
# Large packets with DF bit set = MTU-sensitive traffic
```

## Summary

The 16-bit Total Length field (bytes 2-3) defines the complete IPv4 packet size in bytes, from the first byte of the header through the last byte of the payload. Payload length is Total Length minus (IHL × 4). For standard Ethernet networks, Total Length ≤ 1500 bytes; larger values require jumbo frame support or will be fragmented or dropped if DF is set. When parsing packets programmatically, always use Total Length to bound data extraction rather than assuming the buffer contains only one packet. Use `ping -s <size> -M do` to probe path MTU and detect when a packet would need fragmentation.
