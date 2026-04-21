# How to Trace IPv4 Packet Flow Across Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Traceroute, Network Diagnostics, TCP/IP, Packet Analysis

Description: Tracing IPv4 packet flow involves using tools like traceroute, ping, and packet captures to follow a datagram's path from source to destination, identifying latency and routing issues along the way.

## Tools for Tracing Packet Flow

| Tool | Method | Best For |
|------|--------|----------|
| `traceroute` / `tracert` | TTL expiry + ICMP | Hop-by-hop path mapping |
| `ping` | ICMP Echo | Reachability and RTT |
| `mtr` | Continuous traceroute | Identifying packet loss |
| `tcpdump` / Wireshark | Packet capture | Deep inspection |
| `netstat` / `ss` | Socket state | Active connection tracking |

## Basic Traceroute

```bash
# Linux: UDP probes by default

traceroute 8.8.8.8

# ICMP-based traceroute (may require root/CAP_NET_RAW)
traceroute -I 8.8.8.8

# TCP SYN traceroute on port 80
traceroute -T -p 80 8.8.8.8

# Windows
tracert 8.8.8.8
```

## Using mtr for Continuous Monitoring

```bash
# Real-time path analysis combining ping and traceroute
mtr --report --report-cycles 10 8.8.8.8

# JSON output for automated analysis
mtr --json 8.8.8.8
```

## Scripted Traceroute with Python

```python
from scapy.all import IP, UDP, ICMP, sr1

def trace_route(destination: str, max_hops: int = 30, timeout: int = 2):
    """Perform a simple traceroute using Scapy."""
    print(f"Tracing route to {destination}")
    for ttl in range(1, max_hops + 1):
        pkt = IP(dst=destination, ttl=ttl) / UDP(dport=33434)
        reply = sr1(pkt, verbose=False, timeout=timeout)

        if reply is None:
            print(f"{ttl:2d}  * * *")
        elif reply.haslayer(ICMP):
            src = reply[IP].src
            print(f"{ttl:2d}  {src}")
            icmp = reply[ICMP]
            if icmp.type == 3 and icmp.code == 3:  # Port Unreachable = destination reached
                break

trace_route("8.8.8.8")
```

## Flow Diagram of a Packet's Journey

```mermaid
flowchart LR
    A[Source Host] -->|TTL=64| B[Router 1\nDecrement TTL]
    B -->|TTL=63| C[Router 2\nDecrement TTL]
    C -->|TTL=62| D[Router 3\nDecrement TTL]
    D -->|TTL=61| E[Destination Host]
```

## Capturing the Packet at Each Hop

On a Linux box acting as a router, capture traffic on each interface to follow the flow:

```bash
# Watch packets leaving through the WAN interface
tcpdump -i eth0 -n 'host 8.8.8.8' -w /tmp/wan.pcap &

# Watch packets arriving from the LAN interface
tcpdump -i eth1 -n 'host 8.8.8.8' -w /tmp/lan.pcap &
```

## Key Takeaways

- `traceroute`/`mtr` use TTL expiry to map each hop along a path.
- `tcpdump` captures confirm exact packet fields at specific observation points.
- Asterisks (`* * *`) in traceroute indicate no response was received before the timeout, often because ICMP Time Exceeded responses are blocked or rate-limited, not necessarily a down router.
- TCP-based traceroute (`-T`) often bypasses firewalls that block UDP/ICMP probes.
