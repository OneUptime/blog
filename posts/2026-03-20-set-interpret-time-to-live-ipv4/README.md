# How to Set and Interpret Time to Live in IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, TTL, Traceroute, TCP/IP, Network Diagnostics

Description: The Time to Live (TTL) field in the IPv4 header limits a packet's lifetime by counting router hops, preventing packets from circulating indefinitely and enabling traceroute diagnostics.

## What Is TTL?

TTL is an 8-bit field in the IPv4 header. Each router that forwards a packet decrements the TTL by at least 1 (normally by 1). If forwarding would reduce the TTL to 0, the router discards the packet and sends an ICMP Time Exceeded (type 11, code 0) message back to the source for non-multicast traffic. This prevents routing loops from consuming network resources forever.

## Default TTL Values by OS

| Operating System | Default TTL |
|-----------------|------------|
| Linux           | 64         |
| Windows         | 128        |
| macOS           | 64         |
| Cisco IOS       | 255        |
| Solaris         | 255        |

## Setting TTL with Python (Scapy)

```python
from scapy.all import IP, ICMP, sr1

# Send a ping with TTL=3 - should expire at the 3rd hop if the destination is farther away

pkt = IP(dst="8.8.8.8", ttl=3) / ICMP()
reply = sr1(pkt, timeout=2, verbose=False)

if reply and ICMP in reply:
    # Expect ICMP Time Exceeded (type 11, code 0) if TTL expires at a router
    print(f"Reply from {reply[IP].src}: type={reply[ICMP].type}, code={reply[ICMP].code}")
```

## How Traceroute Uses TTL

Traceroute works by sending packets with increasing TTL values (1, 2, 3, ...) and collecting ICMP Time Exceeded replies:

```bash
# Standard traceroute on Linux
traceroute 8.8.8.8

# Use ICMP instead of UDP probes
traceroute -I 8.8.8.8

# Windows equivalent
tracert 8.8.8.8
```

Each reply reveals the IP address of the router at that hop distance, building a map of the path.

## Changing Default TTL on Linux

```bash
# View current default TTL
cat /proc/sys/net/ipv4/ip_default_ttl

# Set TTL to 128 for the current session
sudo sysctl -w net.ipv4.ip_default_ttl=128

# Persist across reboots
echo "net.ipv4.ip_default_ttl = 128" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## TTL and Security

- **OS fingerprinting**: The initial TTL value helps identify the sender's operating system.
- **TTL-based filtering**: Some firewalls reject packets with unusually low TTL values.
- **Multicast TTL scoping**: Multicast packets use TTL to limit propagation scope (e.g., TTL=1 stays on the local subnet; TTL values greater than 1 may be forwarded by multicast routers).

## Interpreting TTL in Captured Traffic

```bash
# Show TTL for each packet arriving on eth0
sudo tcpdump -i eth0 -n -v ip | grep -o 'ttl [0-9]*'
```

A received TTL of 50 from a host that started with TTL=64 means the packet traversed 14 hops.

## Key Takeaways

- TTL is decremented by at least 1 by each forwarding router; when it reaches 0 the packet is discarded.
- Different operating systems start with different default TTL values.
- Traceroute exploits TTL expiration to map network paths.
- You can change the system default TTL via the kernel parameter `net.ipv4.ip_default_ttl`.
