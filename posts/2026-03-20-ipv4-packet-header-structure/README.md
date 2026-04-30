# How to Understand the IPv4 Packet Header Structure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Packet Header, TCP/IP, Protocol

Description: Learn the structure of the IPv4 packet header, what each field means, and how they work together to route packets across networks.

## Introduction

Every packet sent over an IPv4 network begins with a 20-byte header (minimum) that routers use to forward the packet to its destination. Understanding this structure is fundamental for network programming, packet analysis, and troubleshooting connectivity issues.

## IPv4 Header Layout

The IPv4 header consists of fields arranged in 32-bit (4-byte) rows.

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options                    |    Padding    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

## Field Summary

| Field | Size | Description |
|---|---|---|
| Version | 4 bits | IP version (4 for IPv4) |
| IHL | 4 bits | Header length in 32-bit words |
| Type of Service | 8 bits | DSCP/ECN markings (historically TOS) |
| Total Length | 16 bits | Total packet size in bytes |
| Identification | 16 bits | Identifies fragments of the same datagram |
| Flags | 3 bits | Fragmentation control bits (reserved, DF, MF) |
| Fragment Offset | 13 bits | Position of fragment in original datagram, in 8-byte units |
| Time to Live | 8 bits | Packet lifetime; decremented by at least 1 at each router |
| Protocol | 8 bits | Upper-layer protocol (6=TCP, 17=UDP, 1=ICMP) |
| Header Checksum | 16 bits | Error detection for the header only |
| Source Address | 32 bits | Sender's IP address |
| Destination Address | 32 bits | Recipient's IP address |
| Options | 0-40 bytes | Optional extensions (rarely used) |

## Reading a Real Header with Python

Parsing an actual IPv4 header from captured bytes shows the fields in action.

```python
import struct
import socket

def parse_ipv4_header(raw_bytes):
    """Parse an IPv4 header from raw bytes."""
    # Unpack the first 20 bytes (fixed header)
    fields = struct.unpack('!BBHHHBBH4s4s', raw_bytes[:20])

    version_ihl   = fields[0]
    version        = version_ihl >> 4          # upper 4 bits
    ihl            = version_ihl & 0x0F        # lower 4 bits
    tos            = fields[1]
    total_length   = fields[2]
    identification = fields[3]
    flags_offset   = fields[4]
    flags          = flags_offset >> 13        # upper 3 bits
    frag_offset    = flags_offset & 0x1FFF    # lower 13 bits
    ttl            = fields[5]
    protocol       = fields[6]
    checksum       = fields[7]
    src_addr       = socket.inet_ntoa(fields[8])
    dst_addr       = socket.inet_ntoa(fields[9])

    header_length_bytes = ihl * 4  # IHL is in 32-bit words

    return {
        "version":      version,
        "ihl":          ihl,
        "header_bytes": header_length_bytes,
        "tos":          tos,
        "total_length": total_length,
        "id":           identification,
        "flags":        flags,
        "frag_offset":  frag_offset,
        "ttl":          ttl,
        "protocol":     protocol,
        "checksum":     hex(checksum),
        "src":          src_addr,
        "dst":          dst_addr,
    }

# Example: parse a raw packet captured with scapy or a Linux AF_PACKET socket

# raw = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, ...).recv(65535)
# header = parse_ipv4_header(raw[14:])  # if present, skip the 14-byte Ethernet II header
```

## Inspecting Headers with Common Tools

```bash
# Capture and display IPv4 header fields with tcpdump
tcpdump -n -v -i eth0 'ip'

# -v shows TTL, TOS, ID, length, and fragmentation details
# Output example:
# IP (tos 0x0, ttl 64, id 12345, offset 0, flags [DF],
#     proto TCP (6), length 60)
#     192.168.1.10.43210 > 93.184.216.34.80: ...

# Display in hex to inspect raw bytes
tcpdump -n -XX -i eth0 -c 1 'ip'

# Use Wireshark for graphical field-by-field breakdown
# Filter: ip.addr == 192.168.1.10
```

## The Role of Each Field in Routing

The minimal set of fields a router examines for each packet:

1. **Version** - confirm this is IPv4 (not IPv6)
2. **IHL** - find where the header ends and payload begins
3. **Total Length** - know the complete packet size
4. **TTL** - decrement; if it reaches 0, drop and send ICMP Time Exceeded
5. **Destination Address** - look up in routing table to determine next hop
6. **Header Checksum** - verify header integrity; recalculate after TTL decrement

## Summary

The IPv4 header has a 20-byte fixed portion and may include optional extensions. The most operationally significant fields are the destination address (for routing), TTL (for loop prevention), protocol (to hand off to TCP/UDP/ICMP), and total length (for reassembly). Understanding how to parse these fields - with tools like `tcpdump`, Wireshark, or Python `struct.unpack` - is essential for network debugging and building network-aware applications.
