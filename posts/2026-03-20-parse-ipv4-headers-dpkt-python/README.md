# How to Parse IPv4 Packet Headers Using dpkt in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Dpkt, IPv4, Packet Parsing, Networking, PCAP

Description: Learn how to parse IPv4 packet headers using the dpkt library in Python to extract source/destination addresses, TTL, and protocol fields.

## What Is dpkt?

`dpkt` is a lightweight Python library for fast packet creation and parsing. It's less feature-rich than Scapy but faster and better suited for high-throughput PCAP analysis where you only need to parse, not craft packets.

## Installation

```bash
pip install dpkt
```

## Parsing a Raw Ethernet Frame

```python
import dpkt
import socket

def parse_ethernet_frame(raw_bytes: bytes) -> None:
    """Parse an Ethernet frame and extract IPv4 header fields."""
    try:
        eth = dpkt.ethernet.Ethernet(raw_bytes)
    except dpkt.dpkt.UnpackError:
        print("Failed to parse Ethernet frame")
        return

    # Check if the payload is IPv4
    if not isinstance(eth.data, dpkt.ip.IP):
        return

    ip = eth.data

    # Convert 4-byte binary IP addresses to dotted-decimal strings
    src_ip = socket.inet_ntoa(ip.src)
    dst_ip = socket.inet_ntoa(ip.dst)

    print(f"IPv4 Packet:")
    print(f"  Source:      {src_ip}")
    print(f"  Destination: {dst_ip}")
    print(f"  TTL:         {ip.ttl}")
    print(f"  Protocol:    {ip.p}  (6=TCP, 17=UDP, 1=ICMP)")
    print(f"  Length:      {ip.len} bytes")
    print(f"  Header len:  {ip.hl * 4} bytes")
    print(f"  ID:          {ip.id}")
    print(f"  Flags:       DF={ip.df} MF={ip.mf}")
    print(f"  Frag offset: {ip.offset}")
    print(f"  Checksum:    {ip.sum:#06x}")
```

## Parsing TCP Fields from an IPv4 Packet

```python
import dpkt
import socket

def parse_tcp(ip: dpkt.ip.IP) -> None:
    """Extract TCP header fields from an IPv4/TCP packet."""
    if not isinstance(ip.data, dpkt.tcp.TCP):
        return

    tcp = ip.data
    src_ip = socket.inet_ntoa(ip.src)
    dst_ip = socket.inet_ntoa(ip.dst)

    # Decode TCP flags
    flags = []
    if tcp.flags & dpkt.tcp.TH_SYN:  flags.append("SYN")
    if tcp.flags & dpkt.tcp.TH_ACK:  flags.append("ACK")
    if tcp.flags & dpkt.tcp.TH_FIN:  flags.append("FIN")
    if tcp.flags & dpkt.tcp.TH_RST:  flags.append("RST")
    if tcp.flags & dpkt.tcp.TH_PUSH: flags.append("PSH")

    print(f"TCP: {src_ip}:{tcp.sport} -> {dst_ip}:{tcp.dport} "
          f"[{','.join(flags)}] seq={tcp.seq} ack={tcp.ack}")

    if tcp.data:
        print(f"  Payload ({len(tcp.data)} bytes): {tcp.data[:50]!r}")
```

## Parsing UDP from IPv4

```python
import dpkt
import socket

def parse_udp(ip: dpkt.ip.IP) -> None:
    """Extract UDP fields from an IPv4/UDP packet."""
    if not isinstance(ip.data, dpkt.udp.UDP):
        return

    udp = ip.data
    src_ip = socket.inet_ntoa(ip.src)
    dst_ip = socket.inet_ntoa(ip.dst)

    print(f"UDP: {src_ip}:{udp.sport} -> {dst_ip}:{udp.dport} "
          f"len={udp.ulen}")
```

## Full IPv4 Header Fields Reference

| Field | dpkt Attribute | Description |
|-------|---------------|-------------|
| Version | `ip.v` | Always 4 for IPv4 |
| Header length | `ip.hl` | Header length in 32-bit words |
| DSCP/ToS | `ip.tos` | Differentiated Services |
| Total length | `ip.len` | Total packet length |
| ID | `ip.id` | Identification for fragmentation |
| Flags | `ip.df`, `ip.mf` | Don't Fragment / More Fragments bits |
| Fragment offset | `ip.offset` | Fragment offset (13 bits) |
| TTL | `ip.ttl` | Time to Live |
| Protocol | `ip.p` | Upper layer protocol |
| Checksum | `ip.sum` | Header checksum |
| Source IP | `ip.src` | Binary source address |
| Destination IP | `ip.dst` | Binary destination address |

## Converting Binary IPs

```python
import socket
import dpkt

# Binary -> dotted decimal

src_str = socket.inet_ntoa(ip.src)

# Dotted decimal -> binary (for filtering)
target_binary = socket.inet_aton("192.168.1.1")
if ip.dst == target_binary:
    print("Packet destined for 192.168.1.1")
```

## Conclusion

`dpkt` provides fast, low-level packet parsing ideal for high-volume PCAP analysis. Use `socket.inet_ntoa()` to convert binary IP addresses to human-readable strings. For protocol-specific parsing, access `ip.data` and check its type (TCP, UDP, ICMP) before interpreting fields.
