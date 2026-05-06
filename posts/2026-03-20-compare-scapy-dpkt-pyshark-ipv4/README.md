# How to Compare Scapy, dpkt, and PyShark for IPv4 Packet Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scapy, Dpkt, PyShark, IPv4, Packet Analysis, Networking

Description: A side-by-side comparison of Scapy, dpkt, and PyShark for IPv4 packet analysis, covering their strengths, weaknesses, and ideal use cases.

## Overview

Three libraries dominate Python IPv4 packet analysis:

- **Scapy**: All-in-one library for crafting, sending, sniffing, and dissecting packets
- **dpkt**: Lightweight, fast parser focused on reading and writing packets
- **PyShark**: Python wrapper around TShark (Wireshark CLI) with rich protocol dissection

## Feature Comparison

| Feature | Scapy | dpkt | PyShark |
|---------|-------|------|---------|
| Packet crafting | Excellent | Basic (manual) | None |
| Packet sending | Yes (typically root/admin) | No | No |
| Live capture | Yes | No built-in capture | Yes |
| PCAP reading | Yes | Yes | Yes |
| Protocol coverage | Broad | Basic TCP/IP protocols | Very broad via Wireshark dissectors |
| Performance | Medium | Fast | Slowest |
| Dependencies | Python package | Python package | Python package + TShark |
| Filtering | BPF capture filters + Python callbacks | Custom code / external tools | Wireshark display filters |

## Reading an IPv4 Packet from PCAP: Side by Side

### Scapy

```python
from scapy.all import rdpcap, IP, TCP

packets = rdpcap("capture.pcap")
for pkt in packets:
    if IP in pkt and TCP in pkt:
        print(f"{pkt[IP].src}:{pkt[TCP].sport} -> {pkt[IP].dst}:{pkt[TCP].dport}")
```

### dpkt

```python
import dpkt, socket

with open("capture.pcap", "rb") as f:
    for ts, raw in dpkt.pcap.Reader(f):
        try:
            eth = dpkt.ethernet.Ethernet(raw)
            if isinstance(eth.data, dpkt.ip.IP):
                ip = eth.data
                if isinstance(ip.data, dpkt.tcp.TCP):
                    tcp = ip.data
                    src = socket.inet_ntoa(ip.src)
                    dst = socket.inet_ntoa(ip.dst)
                    print(f"{src}:{tcp.sport} -> {dst}:{tcp.dport}")
        except Exception:
            pass
```

### PyShark

```python
import pyshark

cap = pyshark.FileCapture("capture.pcap", display_filter="tcp")
for pkt in cap:
    if hasattr(pkt, "ip") and hasattr(pkt, "tcp"):
        print(f"{pkt.ip.src}:{pkt.tcp.srcport} -> {pkt.ip.dst}:{pkt.tcp.dstport}")
cap.close()
```

## Performance Expectations (Approximate)

Relative throughput for offline PCAP analysis:

```mermaid
bar
    title Relative Throughput (higher is better)
    x-axis [dpkt, Scapy, PyShark]
    y-axis 0 --> 3
    bar [3, 2, 1]
```

- **dpkt**: typically the highest throughput for offline PCAP parsing because it keeps overhead low
- **Scapy**: slower than dpkt because it builds richer packet objects
- **PyShark**: usually the slowest because it relies on TShark for full dissection

## When to Use Each

### Use Scapy when:
- You need to craft and send custom packets
- Building network tools (scanners, fuzzers, probes)
- Interactive exploration in a Python REPL
- Need protocol layering (`IP() / TCP() / Raw()`)

### Use dpkt when:
- Processing large PCAP files for statistics
- Speed is critical (log analysis pipelines)
- You only need basic protocol fields
- Minimal dependencies required

### Use PyShark when:
- You need Wireshark-quality protocol dissection
- Analyzing obscure protocols (VoIP, ICS, etc.)
- Using Wireshark display filter syntax
- Wireshark is already installed on the system

## Crafting and Sending a Packet with Scapy

```python
from scapy.all import IP, TCP, send

# Scapy provides high-level packet crafting and packet sending

pkt = IP(dst="10.0.0.1") / TCP(dport=80, flags="S")
send(pkt)
```

## Conclusion

Choose your library based on the task: dpkt for high-speed PCAP processing, Scapy for packet crafting and research, and PyShark for rich protocol analysis leveraging Wireshark's dissectors. In many workflows, multiple libraries complement each other-use dpkt for bulk analysis and Scapy for crafting specific test packets.
