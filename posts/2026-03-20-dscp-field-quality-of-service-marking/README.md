# How to Use the DSCP Field for Quality of Service Marking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, QoS, DSCP, Networking, DiffServ, Traffic Management

Description: The DSCP field occupies the top 6 bits of the IPv4 ToS byte and allows routers to classify and prioritize traffic, enabling differentiated forwarding behaviors for voice, video, and data applications.

## DSCP Basics

Differentiated Services Code Point (DSCP) is a 6-bit field defined in RFC 2474. It redefined the IPv4 ToS octet as the DS field and preserved IP Precedence compatibility through class-selector codepoints. Routers read the DSCP value and apply a Per-Hop Behavior (PHB) that determines queue priority, drop probability, and bandwidth allocation.

## Key PHB Classes

| DSCP Name | Value | DS Field (ECN=00) | Use Case |
|-----------|-------|----------|----------|
| Default (DF) | 0 | 0x00 | Best effort |
| Expedited Forwarding (EF) | 46 | 0xB8 | VoIP, real-time |
| AF41 | 34 | 0x88 | Video conferencing |
| AF31 | 26 | 0x68 | Streaming video |
| AF21 | 18 | 0x48 | Transactional data |
| AF11 | 10 | 0x28 | Bulk data |
| CS6 | 48 | 0xC0 | Routing protocols |

## Setting DSCP on Linux with tc

```bash
# Create HTB qdisc as root

tc qdisc add dev eth0 root handle 1: htb default 30

# Class for EF (VoIP) - high priority, guaranteed bandwidth
tc class add dev eth0 parent 1: classid 1:10 htb rate 2mbit burst 10k prio 1

# Class for AF41 (video) - medium priority
tc class add dev eth0 parent 1: classid 1:20 htb rate 10mbit burst 50k prio 2

# Class for default traffic
tc class add dev eth0 parent 1: classid 1:30 htb rate 50mbit burst 100k prio 3

# Match EF traffic and put in class 1:10
tc filter add dev eth0 protocol ip parent 1: prio 1 \
  u32 match ip tos 0xb8 0xfc flowid 1:10

# Match AF41 traffic and put in class 1:20
tc filter add dev eth0 protocol ip parent 1: prio 2 \
  u32 match ip tos 0x88 0xfc flowid 1:20
```

## Setting DSCP in an Application (Python)

```python
import socket

def send_with_dscp(dst_ip: str, dst_port: int, data: bytes, dscp: int):
    """
    Send a UDP packet with a specific DSCP marking.
    dscp: DSCP value (0-63)
    """
    # DSCP occupies bits 7-2 of the ToS byte; ECN in bits 1-0
    tos = (dscp << 2) & 0xFF
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_TOS, tos)
    sock.sendto(data, (dst_ip, dst_port))
    sock.close()
    print(f"Sent {len(data)} bytes with DSCP={dscp} (ToS=0x{tos:02X})")

# Send a VoIP packet with EF marking
send_with_dscp("192.168.1.20", 5004, b"\x00" * 160, dscp=46)
```

## Marking with iptables DSCP Target

```bash
# Mark all SIP traffic with CS5
iptables -t mangle -A OUTPUT -p udp --dport 5060 \
  -j DSCP --set-dscp-class CS5

# Mark all RTP (audio) with EF
iptables -t mangle -A OUTPUT -p udp --dport 10000:20000 \
  -j DSCP --set-dscp 46
```

## Verifying DSCP Markings

```bash
# Show the DS field / ToS byte in tcpdump output
tcpdump -i eth0 -v -n 'udp' | grep tos

# tshark: extract DSCP from captured traffic
tshark -i eth0 -T fields -e ip.dsfield.dscp -Y "ip"
```

## Key Takeaways

- DSCP uses the top 6 bits of the IPv4 DS field (historically the ToS byte).
- EF (46) is for real-time traffic; AF classes for elastic traffic; CS6/CS7 for control plane.
- Mark DSCP at the application or network edge; routers use the value for queue scheduling.
- Use `setsockopt(IP_TOS)` in applications and `iptables -j DSCP` for system-wide marking.
