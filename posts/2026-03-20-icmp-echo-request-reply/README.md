# How to Understand ICMP Echo Request and Echo Reply

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, Networking, Ping, IPv4, Troubleshooting, Protocol

Description: Understand the ICMP Echo Request and Echo Reply mechanism that powers ping, including the packet format, identifier fields, and how to analyze them in packet captures.

## Introduction

ICMP Echo Request (Type 8) and Echo Reply (Type 0) are the foundation of the ping utility. A host sends an Echo Request, and the destination responds with an Echo Reply containing the same payload. This round-trip verifies bidirectional reachability and measures latency. Understanding the packet structure helps you interpret captures and build custom diagnostic tools.

## ICMP Echo Packet Format

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Type (8=Req)  |   Code (0)    |           Checksum            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Identifier          |        Sequence Number        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          Data / Payload                       |
```

- **Identifier**: Used by the sender to match replies with requests; many ping implementations set one value per session, but the exact value is implementation-specific
- **Sequence Number**: Typically increments with each request so replies can be matched and missing replies spotted
- **Data**: Arbitrary payload returned unchanged in the reply; many ping implementations place a timestamp and pattern bytes here

## Capturing Echo Request/Reply

```bash
# Capture all ICMP echo traffic

tcpdump -i eth0 -n 'icmp[0] = 8 or icmp[0] = 0'

# Verbose output showing identifier and sequence numbers
tcpdump -i eth0 -n -v icmp

# Example output:
# 10:00:01 192.168.1.10 > 8.8.8.8: ICMP echo request, id 12345, seq 1, length 64
# 10:00:01 8.8.8.8 > 192.168.1.10: ICMP echo reply, id 12345, seq 1, length 64
```

## Analyzing Echo Exchanges

```bash
# Match requests to replies by identifier and sequence number
tcpdump -i eth0 -n -w /tmp/ping.pcap 'icmp and (icmp[0]=8 or icmp[0]=0)'

# Read back and look for unanswered requests
tcpdump -r /tmp/ping.pcap -n | awk '{
  id = ""; seq = ""
  for (i = 1; i <= NF; i++) {
    if ($i == "id") id = $(i + 1)
    if ($i == "seq") seq = $(i + 1)
  }
  gsub(/,/, "", id)
  gsub(/,/, "", seq)
  key = id ":" seq
}
/request/ && id != "" && seq != "" { req[key] = $0 }
/reply/ && id != "" && seq != "" { rep[key] = $0 }
END {
  for (key in req)
    if (!(key in rep))
      print "No reply for:", req[key]
}'
```

## Building a Custom Ping with Python

```python
import struct
import socket
import os

def create_icmp_echo_request(identifier, sequence):
    """Create an ICMP Echo Request packet."""
    identifier &= 0xffff
    sequence &= 0xffff

    # Type=8, Code=0, Checksum=0 (filled later), ID, Seq
    header = struct.pack('!BBHHH', 8, 0, 0, identifier, sequence)
    data = b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh'  # 34 bytes of payload

    # Calculate checksum
    packet = header + data
    checksum = calculate_checksum(packet)
    header = struct.pack('!BBHHH', 8, 0, checksum, identifier, sequence)
    return header + data

def calculate_checksum(packet):
    """Standard Internet checksum calculation."""
    if len(packet) % 2:
        packet += b'\x00'
    s = sum(struct.unpack('!%dH' % (len(packet) // 2), packet))
    s = (s >> 16) + (s & 0xffff)
    s += s >> 16
    return ~s & 0xffff

# Usage:
# Raw ICMP sockets typically require root or CAP_NET_RAW privileges.
# sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
# packet = create_icmp_echo_request(os.getpid() & 0xffff, 1)
# sock.sendto(packet, ('8.8.8.8', 0))
```

## ICMP Echo vs Ping: One-Way vs Round-Trip

```bash
# Standard ping measures round-trip time (RTT)
# Dividing RTT by 2 is only a rough estimate, not a true one-way measurement

# The time= field reported by ping is RTT
ping -c 1 -v 8.8.8.8 | grep "bytes from"

# True one-way delay requires synchronized clocks or a different mechanism,
# such as ICMP Timestamp (Type 13/14), which is distinct from Echo Request/Reply
```

## Conclusion

ICMP Echo Request and Reply are simple but powerful. The identifier and sequence number fields let you correlate requests with replies and detect loss. Many ping implementations place a timestamp in the payload to calculate RTT. Capturing these packets gives you direct visibility into reachability and latency at the IP layer, independent of transport protocol behavior.
