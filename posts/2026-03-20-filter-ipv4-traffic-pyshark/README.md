# How to Filter IPv4 Traffic by Display Filters in PyShark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, PyShark, IPv4, Display Filters, Wireshark, Network Analysis

Description: Learn how to use Wireshark display filters in PyShark to selectively capture and analyze specific IPv4 traffic patterns.

## PyShark Display Filters vs BPF Filters

PyShark supports two filtering mechanisms:
- **BPF filters** (`bpf_filter`): Applied at capture time by the capture engine, typically in the kernel (fast, limited syntax)
- **Display filters** (`display_filter`): Applied by Wireshark/TShark using its full filter syntax (slower but more expressive)

## Basic Display Filter Usage

```python
import pyshark

# Filter using Wireshark display filter syntax

cap = pyshark.LiveCapture(
    interface="eth0",
    display_filter="ip.addr == 192.168.1.100"   # All traffic to/from this IP
)

for packet in cap.sniff_continuously(packet_count=20):
    print(f"{packet.ip.src} -> {packet.ip.dst}")
```

## Common IPv4 Display Filters

```python
import pyshark

# Filter by source IP
cap = pyshark.LiveCapture(interface="eth0", display_filter="ip.src == 10.0.0.5")

# Filter by destination IP
cap = pyshark.LiveCapture(interface="eth0", display_filter="ip.dst == 10.0.0.1")

# Filter by subnet
cap = pyshark.LiveCapture(interface="eth0", display_filter="ip.addr == 192.168.1.0/24")

# Filter by TTL
cap = pyshark.LiveCapture(interface="eth0", display_filter="ip.ttl < 10")

# Filter by IP protocol field
cap = pyshark.LiveCapture(interface="eth0", display_filter="ip.proto == 6")   # TCP only
```

## Filtering TCP by Port

```python
import pyshark

# TCP traffic on a specific port
cap = pyshark.LiveCapture(
    interface="eth0",
    display_filter="ip and tcp.port == 443"
)

for pkt in cap.sniff_continuously(packet_count=15):
    if hasattr(pkt, "tcp"):
        print(f"{pkt.ip.src}:{pkt.tcp.srcport} -> {pkt.ip.dst}:{pkt.tcp.dstport}")
```

## Compound Filters with AND/OR

```python
import pyshark

# Traffic between two specific hosts
cap = pyshark.LiveCapture(
    interface="eth0",
    display_filter="(ip.src == 10.0.0.1 and ip.dst == 10.0.0.2) or (ip.src == 10.0.0.2 and ip.dst == 10.0.0.1)"
)

# HTTP or HTTPS traffic from a specific host
cap = pyshark.LiveCapture(
    interface="eth0",
    display_filter="ip.src == 10.0.0.5 and (tcp.dstport == 80 or tcp.dstport == 443)"
)

# All IPv4 DNS queries
cap = pyshark.LiveCapture(
    interface="eth0",
    display_filter="ip and dns.flags.response == 0"
)
```

## Reading a PCAP with Display Filters

```python
import pyshark

# Apply display filter when reading an existing PCAP
cap = pyshark.FileCapture(
    "/path/to/capture.pcap",
    display_filter='ip and http.request.method == "GET"'
)

for pkt in cap:
    if hasattr(pkt, "http"):
        print(f"{pkt.ip.src} -> {pkt.ip.dst}  {pkt.http.request_full_uri}")

cap.close()
```

## Combining BPF and Display Filters

```python
import pyshark

# BPF filter applied by the capture engine (fast pre-filter)
# Display filter applied by TShark (detailed post-filter)
cap = pyshark.LiveCapture(
    interface="eth0",
    bpf_filter="tcp port 80 or tcp port 443",   # Fast capture-time filter
    display_filter="ip and http.response.code == 200"   # Detailed filter
)

for pkt in cap.sniff_continuously(packet_count=10):
    if hasattr(pkt, "http"):
        print(f"HTTP 200: {pkt.ip.src} -> {pkt.ip.dst}")
```

## Useful Display Filter Syntax Reference

| Filter | Description |
|--------|-------------|
| `ip` | All IPv4 packets |
| `ip.addr == x.x.x.x` | Traffic involving specific IP |
| `ip.src == x.x.x.x` | Traffic from specific source |
| `ip.dst == x.x.x.x` | Traffic to specific destination |
| `tcp` | All TCP packets |
| `tcp.flags.syn == 1` | TCP SYN packets |
| `udp.port == N` | UDP on specific port |
| `icmp` | All ICMP packets |
| `http` | HTTP protocol |
| `dns` | DNS protocol |

## Conclusion

PyShark's display filter support gives you access to Wireshark's comprehensive filter syntax for precise traffic selection. For best performance, combine a broad BPF pre-filter with a specific display filter to minimize the work TShark must do. Use `FileCapture` for offline analysis and `LiveCapture` for real-time monitoring.
