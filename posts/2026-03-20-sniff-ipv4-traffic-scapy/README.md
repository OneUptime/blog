# How to Sniff IPv4 Network Traffic with Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scapy, IPv4, Packet Sniffing, Network Analysis, Security

Description: Learn how to capture and analyze live IPv4 network traffic using Scapy's sniff() function with filters and custom callback processing.

## Overview

Scapy's `sniff()` function captures packets on a network interface and can use promiscuous mode, depending on Scapy's configuration and platform support. It captures packets matching optional BPF (Berkeley Packet Filter) filters and is useful for network debugging, security monitoring, and protocol analysis.

## Basic Packet Sniffing

```python
from scapy.all import sniff, IP, TCP, UDP

def process_packet(pkt):
    """Callback called for each captured packet."""
    if IP in pkt:
        src = pkt[IP].src
        dst = pkt[IP].dst
        proto = pkt[IP].proto  # 6=TCP, 17=UDP, 1=ICMP

        print(f"{src} -> {dst} proto={proto} len={pkt[IP].len}")

# Capture 50 packets on the default interface

# filter uses BPF syntax (same as tcpdump)
sniff(
    filter="ip",           # Only IPv4 packets
    prn=process_packet,    # Callback for each packet
    count=50,              # Stop after 50 packets (0 = unlimited)
    store=False            # Don't store packets in memory
)
```

## Filtering by Protocol

```python
from scapy.all import sniff, IP, TCP, UDP, ICMP

def show_tcp(pkt):
    if TCP in pkt:
        flags = pkt[TCP].flags
        print(f"TCP {pkt[IP].src}:{pkt[TCP].sport} -> "
              f"{pkt[IP].dst}:{pkt[TCP].dport} [{flags}]")

def show_udp(pkt):
    if UDP in pkt:
        print(f"UDP {pkt[IP].src}:{pkt[UDP].sport} -> "
              f"{pkt[IP].dst}:{pkt[UDP].dport}")

# Capture only TCP on port 80 or 443
sniff(filter="tcp port 80 or tcp port 443", prn=show_tcp, count=20, store=False)

# Capture UDP traffic
sniff(filter="udp", prn=show_udp, count=20, store=False)
```

## Sniffing on a Specific Interface

```python
from scapy.all import sniff, get_if_list

# List available interfaces
print(get_if_list())

# Sniff on a specific interface (e.g., eth0, ens3)
sniff(
    iface="eth0",
    filter="ip and tcp",
    prn=lambda p: print(p.summary()),
    count=30,
    store=False
)
```

## Saving Captured Packets to PCAP

```python
from scapy.all import sniff, wrpcap

# Capture 100 packets and save to a PCAP file
packets = sniff(filter="ip", count=100)
wrpcap("/tmp/capture.pcap", packets)
print("Saved 100 packets to /tmp/capture.pcap")
```

## Analyzing Captured Packets

```python
from scapy.all import rdpcap, IP, TCP

# Read from PCAP and analyze
packets = rdpcap("/tmp/capture.pcap")

# Count packets by destination IP
from collections import Counter
dst_counter = Counter()

for pkt in packets:
    if IP in pkt:
        dst_counter[pkt[IP].dst] += 1

print("Top destinations:")
for ip, count in dst_counter.most_common(10):
    print(f"  {ip}: {count} packets")
```

## Sniffing with Timeout

```python
from scapy.all import sniff

# Sniff for 10 seconds, then return
packets = sniff(filter="ip", timeout=10)
print(f"Captured {len(packets)} packets in 10 seconds")
```

## Stopping a Sniff Early

```python
from scapy.all import sniff

stop_flag = {"stop": False}

def check_stop(pkt):
    """Stop sniffing after seeing a DNS response."""
    if pkt.haslayer("DNS") and pkt["DNS"].qr == 1:
        stop_flag["stop"] = True
    return stop_flag["stop"]

sniff(filter="udp port 53", stop_filter=check_stop, store=False)
```

## Conclusion

Scapy's `sniff()` is a powerful one-call packet capture tool. Use BPF filters to limit captured traffic, `prn` callbacks to process packets on the fly, and `wrpcap` to save captures for later analysis. Root/administrator or equivalent packet-capture privileges are usually required for live sniffing and promiscuous mode.
