# How to Read PCAP Files and Extract IPv4 Data with dpkt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Dpkt, PCAP, IPv4, Packet Analysis, Networking

Description: Learn how to read PCAP capture files and extract IPv4 traffic data using the dpkt library for efficient packet analysis in Python.

## Reading a PCAP File with dpkt

dpkt can read standard PCAP files with `pcap.Reader` and PCAPNG files with `pcapng.Reader`.

```python
import dpkt
import socket

def read_pcap(filename: str) -> None:
    """Read and print a summary of all IPv4 packets in a PCAP file."""
    with open(filename, "rb") as f:
        pcap = dpkt.pcap.Reader(f)

        packet_count = 0
        ipv4_count = 0

        for ts, raw in pcap:
            packet_count += 1

            try:
                eth = dpkt.ethernet.Ethernet(raw)
            except dpkt.dpkt.UnpackError:
                continue

            if not isinstance(eth.data, dpkt.ip.IP):
                continue

            ip = eth.data
            ipv4_count += 1

            src = socket.inet_ntoa(ip.src)
            dst = socket.inet_ntoa(ip.dst)

            # Determine transport protocol name
            proto_map = {6: "TCP", 17: "UDP", 1: "ICMP"}
            proto = proto_map.get(ip.p, f"proto={ip.p}")

            print(f"{ts:.6f}  {src:>16} -> {dst:<16}  {proto}  {ip.len}B")

        print(f"\nTotal packets: {packet_count}, IPv4 packets: {ipv4_count}")

read_pcap("/path/to/capture.pcap")
```

## Extracting HTTP Traffic

```python
import dpkt
import socket

def extract_http_requests(filename: str) -> list[dict]:
    """Extract HTTP GET/POST requests contained in a single TCP packet."""
    requests = []

    with open(filename, "rb") as f:
        for ts, raw in dpkt.pcap.Reader(f):
            try:
                eth = dpkt.ethernet.Ethernet(raw)
                if not isinstance(eth.data, dpkt.ip.IP):
                    continue
                ip = eth.data
                if not isinstance(ip.data, dpkt.tcp.TCP):
                    continue
                tcp = ip.data

                if not tcp.data:
                    continue

                request = dpkt.http.Request(tcp.data)
                if request.method not in {"GET", "POST"}:
                    continue

                requests.append({
                    "timestamp": ts,
                    "src": f"{socket.inet_ntoa(ip.src)}:{tcp.sport}",
                    "dst": f"{socket.inet_ntoa(ip.dst)}:{tcp.dport}",
                    "request": f"{request.method} {request.uri} HTTP/{request.version}",
                })
            except (dpkt.dpkt.NeedData, dpkt.dpkt.UnpackError, AttributeError):
                continue

    return requests

reqs = extract_http_requests("/path/to/capture.pcap")
for r in reqs[:10]:
    print(f"[{r['timestamp']:.2f}] {r['src']} -> {r['dst']}  {r['request']}")
```

## Building a Traffic Statistics Report

```python
import dpkt
import socket
from collections import Counter

def traffic_report(filename: str) -> dict:
    """Generate a traffic statistics report from a PCAP file."""
    stats = {
        "total_packets": 0,
        "ipv4_packets": 0,
        "total_bytes": 0,
        "protocols": Counter(),
        "top_src": Counter(),
        "top_dst": Counter(),
        "port_stats": Counter(),
    }

    with open(filename, "rb") as f:
        for ts, raw in dpkt.pcap.Reader(f):
            stats["total_packets"] += 1
            stats["total_bytes"] += len(raw)

            try:
                eth = dpkt.ethernet.Ethernet(raw)
                if not isinstance(eth.data, dpkt.ip.IP):
                    continue
                ip = eth.data
                stats["ipv4_packets"] += 1

                src = socket.inet_ntoa(ip.src)
                dst = socket.inet_ntoa(ip.dst)
                stats["top_src"][src] += 1
                stats["top_dst"][dst] += 1

                if ip.p == 6 and isinstance(ip.data, dpkt.tcp.TCP):
                    stats["protocols"]["TCP"] += 1
                    stats["port_stats"][ip.data.dport] += 1
                elif ip.p == 17 and isinstance(ip.data, dpkt.udp.UDP):
                    stats["protocols"]["UDP"] += 1
                elif ip.p == 1:
                    stats["protocols"]["ICMP"] += 1

            except (dpkt.dpkt.UnpackError, AttributeError):
                continue

    return stats

report = traffic_report("/path/to/capture.pcap")
print(f"IPv4 Packets: {report['ipv4_packets']}")
print(f"Protocol breakdown: {dict(report['protocols'])}")
print(f"Top 5 src IPs: {report['top_src'].most_common(5)}")
```

## Conclusion

`dpkt` is an efficient PCAP parser well-suited for large capture files. Its `pcap.Reader` iterates packets lazily (no loading entire file into memory), and direct struct access makes protocol field extraction fast. For analysis requiring packet modification or crafting, Scapy is more appropriate.
