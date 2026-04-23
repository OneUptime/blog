# How to Read and Interpret IPv4 Header Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Packet Analysis, Wireshark, TCP/IP

Description: Learn how to read and interpret IPv4 header fields from packet captures using tcpdump, Wireshark, and Python to diagnose network issues.

## Introduction

Being able to read IPv4 headers from packet captures is a core network troubleshooting skill. Each field tells you something specific about how a packet is being routed, fragmented, or prioritized. This guide shows how to extract and interpret these fields using common tools.

## Reading Headers with tcpdump

The `-v` flag makes tcpdump display key IPv4 header fields.

```bash
# Capture with verbose output showing key IPv4 header fields

tcpdump -n -v -i eth0 'host 192.168.1.10'

# Example output:
# IP (tos 0x10, ttl 64, id 22847, offset 0, flags [DF],
#     proto TCP (6), length 1500, bad cksum 0 (->3a2b)!)
#     192.168.1.10.22 > 10.0.0.5.52345: Flags [P.], ...
```

Interpreting each field from the output above:
- `tos 0x10` - IPv4 TOS/DS field value; under modern DiffServ/ECN interpretation, DSCP = 4 and ECN = 0
- `ttl 64` - common Linux default; decremented at each hop
- `id 22847` - fragment group identifier
- `offset 0` - this is the first (or only) fragment
- `flags [DF]` - Don't Fragment bit is set
- `proto TCP (6)` - payload is TCP
- `length 1500` - total IPv4 packet length is 1500 bytes; that matches a common Ethernet MTU and can matter on smaller-MTU paths

## Reading Headers with Wireshark

Wireshark displays each field with its decoded meaning.

```text
Internet Protocol Version 4, Src: 192.168.1.10, Dst: 93.184.216.34
  0100 .... = Version: 4
  .... 0101 = Header Length: 20 bytes (5)
  Differentiated Services Field: 0x00 (DSCP: CS0, ECN: Not-ECT)
  Total Length: 1500
  Identification: 0x593f (22847)
  Flags: 0x4000, Don't fragment
  ...0 0000 0000 0000 = Fragment Offset: 0
  Time to Live: 64
  Protocol: TCP (6)
  Header Checksum: 0x3a2b [correct]
  Source Address: 192.168.1.10
  Destination Address: 93.184.216.34
```

Use Wireshark display filters to isolate specific field values.

```text
# Filter by TTL to find packets near expiry
ip.ttl < 5

# Find fragmented packets
ip.flags.mf == 1 || ip.frag_offset > 0

# Find packets with Don't Fragment set
ip.flags.df == 1

# Find specific protocol
ip.proto == 17  # UDP

# Find large DF-set packets (potential MTU issues)
ip.len > 1400 && ip.flags.df == 1
```

## Parsing Headers Programmatically

```python
import struct
import socket

def interpret_flags(flags_offset_field):
    """Decode the 16-bit Flags+Fragment Offset field."""
    flags = flags_offset_field >> 13
    fragment_offset = flags_offset_field & 0x1FFF

    return {
        "reserved":        bool(flags & 0b100),
        "dont_fragment":   bool(flags & 0b010),
        "more_fragments":  bool(flags & 0b001),
        "fragment_offset": fragment_offset * 8,  # offset in bytes
    }

def interpret_protocol(proto):
    """Map protocol number to name."""
    protocols = {1: "ICMP", 2: "IGMP", 6: "TCP", 17: "UDP",
                 41: "IPv6 encapsulation", 47: "GRE", 89: "OSPF"}
    return protocols.get(proto, f"Unknown({proto})")

def interpret_ipv4_header(raw_bytes):
    """Interpret the fixed IPv4 header fields."""
    ihl = (raw_bytes[0] & 0x0F) * 4
    packed = struct.unpack('!BBHHHBBH4s4s', raw_bytes[:20])

    flags_info = interpret_flags(packed[4])
    ttl = packed[5]

    print(f"Version:          {packed[0] >> 4}")
    print(f"Header Length:    {ihl} bytes")
    print(f"DS Field:         {hex(packed[1])} (DSCP {packed[1] >> 2}, ECN {packed[1] & 0x03})")
    print(f"Total Length:     {packed[2]} bytes")
    print(f"ID:               {packed[3]} ({hex(packed[3])})")
    print(f"Don't Fragment:   {flags_info['dont_fragment']}")
    print(f"More Fragments:   {flags_info['more_fragments']}")
    print(f"Fragment Offset:  {flags_info['fragment_offset']} bytes")
    print(f"TTL:              {ttl} hops remaining")
    print(f"Protocol:         {interpret_protocol(packed[6])}")
    print(f"Checksum:         {hex(packed[7])}")
    print(f"Source:           {socket.inet_ntoa(packed[8])}")
    print(f"Destination:      {socket.inet_ntoa(packed[9])}")
```

## What Header Fields Tell You About Problems

| Observation | Likely Problem |
|---|---|
| TTL = 1 in received packet | Packet nearly expired; if unexpected, long path or routing loop possible |
| `flags [DF]` + length near 1500 | MTU mismatch may cause fragmentation failure |
| `flags [+]` (More Fragments set) | Packet is fragmented; reassembly required |
| ID increments predictably across packets | Predictable IP ID generation; weak fingerprint only, not proof of host identity |
| `bad cksum` in tcpdump | Checksum offloading or packet corruption |
| TTL decreasing differently than expected | Packet taking unexpected routing path |

## Diagnosing MTU Path Discovery Failures

```bash
# On Linux, test if ICMP fragmentation-needed messages are being blocked
# This breaks PMTUD (Path MTU Discovery)
ping -M do -s 1472 192.168.1.1  # 1472 + 28 bytes of IPv4+ICMP header = 1500-byte packet

# If the large ping fails but a smaller size works, the path MTU is smaller
# somewhere or the ICMP fragmentation-needed messages are not getting back:
ping -M do -s 1200 192.168.1.1  # success

# Check whether a router is sending fragmentation-needed ICMP
tcpdump -n -i eth0 'icmp[icmptype] == icmp-unreach and icmp[icmpcode] == 4'
```

## Summary

Reading IPv4 headers with `tcpdump -v` gives you immediate visibility into TTL, flags, protocol, and length. In Wireshark, use display filters like `ip.flags.df == 1` and `ip.ttl < 5` to isolate specific field values. Programmatically, Python's `struct.unpack('!BBHHHBBH4s4s', ...)` decodes the fixed 20-byte base header. Key diagnostic signals: DF flag + large packet size can indicate MTU issues; unexpectedly low TTL values can indicate routing problems; `bad cksum` in tcpdump is usually checksum offloading (not a real error).
