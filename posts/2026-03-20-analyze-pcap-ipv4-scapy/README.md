# How to Analyze PCAP Files for IPv4 Traffic Using Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scapy, PCAP, IPv4, Network Analysis, Packet Analysis

Description: Learn how to read and analyze PCAP files for IPv4 traffic patterns, statistics, and protocol breakdown using Scapy in Python.

## Reading a PCAP File

```python
from scapy.all import rdpcap, IP, TCP, UDP, ICMP

# Load all packets from a PCAP file into memory

packets = rdpcap("/path/to/capture.pcap")
print(f"Loaded {len(packets)} packets")
```

## Basic IPv4 Traffic Statistics

```python
from scapy.all import rdpcap, IP, TCP, UDP, ICMP
from collections import Counter, defaultdict

packets = rdpcap("/path/to/capture.pcap")

# Counters for analysis
src_ips = Counter()
dst_ips = Counter()
protocols = Counter()
total_bytes = 0

for pkt in packets:
    if IP not in pkt:
        continue

    src_ips[pkt[IP].src] += 1
    dst_ips[pkt[IP].dst] += 1
    total_bytes += len(pkt)

    # Identify protocol by IP proto number
    proto = pkt[IP].proto
    if proto == 6:
        protocols["TCP"] += 1
    elif proto == 17:
        protocols["UDP"] += 1
    elif proto == 1:
        protocols["ICMP"] += 1
    else:
        protocols[f"Other({proto})"] += 1

print(f"\n=== Traffic Statistics ===")
print(f"Total IPv4 packets: {sum(protocols.values())}")
print(f"Total bytes: {total_bytes:,}")
print(f"\nProtocol breakdown: {dict(protocols)}")

print(f"\nTop 5 source IPs:")
for ip, count in src_ips.most_common(5):
    print(f"  {ip}: {count} packets")

print(f"\nTop 5 destination IPs:")
for ip, count in dst_ips.most_common(5):
    print(f"  {ip}: {count} packets")
```

## Extracting TCP Conversations

```python
from scapy.all import rdpcap, IP, TCP
from collections import defaultdict

packets = rdpcap("/path/to/capture.pcap")

# Group packets by bidirectional TCP endpoint pair
conversations = defaultdict(list)

for pkt in packets:
    if IP in pkt and TCP in pkt:
        src = (pkt[IP].src, pkt[TCP].sport)
        dst = (pkt[IP].dst, pkt[TCP].dport)
        # Normalize so both directions map to same key
        key = tuple(sorted([src, dst]))
        conversations[key].append(pkt)

print(f"\n=== TCP Conversations ({len(conversations)} total) ===")
for (ep1, ep2), pkts in sorted(conversations.items(), key=lambda x: -len(x[1]))[:5]:
    total = sum(len(p) for p in pkts)
    print(f"  {ep1[0]}:{ep1[1]} <-> {ep2[0]}:{ep2[1]}  "
          f"packets={len(pkts)}  bytes={total}")
```

## Extracting HTTP Payloads

```python
from scapy.all import rdpcap, IP, TCP, Raw

packets = rdpcap("/path/to/capture.pcap")

for pkt in packets:
    if IP in pkt and TCP in pkt and Raw in pkt:
        payload = pkt[Raw].load
        # Look for HTTP GET/POST requests
        if payload.startswith(b"GET ") or payload.startswith(b"POST "):
            lines = payload.split(b"\r\n")
            print(f"\nHTTP Request from {pkt[IP].src}:{pkt[TCP].sport}")
            print(f"  {lines[0].decode('utf-8', errors='replace')}")
```

## Filtering Packets by IP Address

```python
from scapy.all import rdpcap, IP

packets = rdpcap("/path/to/capture.pcap")
target_ip = "192.168.1.100"

# Get all packets to or from a specific IP
filtered = [p for p in packets if IP in p and
            (p[IP].src == target_ip or p[IP].dst == target_ip)]

print(f"Packets involving {target_ip}: {len(filtered)}")
```

## Writing Filtered Packets to a New PCAP

```python
from scapy.all import rdpcap, IP, wrpcap
from ipaddress import ip_address, ip_network

packets = rdpcap("/path/to/capture.pcap")
subnet = ip_network("192.168.1.0/24")

# Keep only packets to/from a specific subnet (192.168.1.0/24)
filtered = [p for p in packets if IP in p and
            (ip_address(p[IP].src) in subnet or ip_address(p[IP].dst) in subnet)]

wrpcap("/tmp/filtered.pcap", filtered)
print(f"Wrote {len(filtered)} packets to /tmp/filtered.pcap")
```

## Processing Large PCAPs Efficiently

For large files, use `PcapReader` to avoid loading everything into memory:

```python
from scapy.all import PcapReader, IP

with PcapReader("/path/to/large_capture.pcap") as reader:
    for i, pkt in enumerate(reader):
        if IP in pkt:
            # Process one packet at a time
            pass
        if i % 10000 == 0:
            print(f"Processed {i} packets...")
```

## Conclusion

Scapy provides `rdpcap` for loading PCAPs and `PcapReader` for streaming large files. Combined with Python's `Counter` and `defaultdict`, you can quickly build traffic statistics, extract conversations, and filter by any packet attribute. For large PCAPs, use the streaming `PcapReader` to avoid memory exhaustion.
