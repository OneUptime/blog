# How to Use the IPv6 Traffic Class for DSCP Marking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DSCP, QoS, Traffic Class, DiffServ

Description: Learn how to use the IPv6 Traffic Class field's DSCP bits to implement Differentiated Services quality of service policies for IPv6 traffic prioritization.

## Introduction

The upper 6 bits of the IPv6 Traffic Class byte are the DSCP (Differentiated Services Code Point) field, defined in RFC 2474. DSCP provides a Per-Hop Behavior (PHB) framework for traffic differentiation - network devices inspect DSCP markings and apply corresponding queuing and scheduling policies. This guide covers marking IPv6 traffic with DSCP and building QoS policies around those markings.

## DSCP Field Position

```yaml
Traffic Class byte (8 bits):
  Bit 7 6 5 4 3 2 | 1 0
  |<--- DSCP  --->|<ECN>|

DSCP = Traffic Class >> 2  (right-shift to remove ECN bits)
Traffic Class = DSCP << 2  (left-shift to set DSCP bits)

Example: DSCP 46 (EF) = 0b101110 = 0x2E
Traffic Class = 0x2E << 2 = 0xB8
```

## Key PHB Classes and Their Use Cases

```text
Expedited Forwarding (EF, DSCP 46):
  → VoIP, interactive video, real-time gaming
  → Lowest latency, jitter, and packet loss
  → Typically: strict priority queue

Assured Forwarding (AF, DSCP 10/12/14, 18/20/22, 26/28/30, 34/36/38):
  → Forwarding assurance with drop precedence
  → AF11-AF13: lower priority bulk data
  → AF21-AF23: medium priority business data
  → AF31-AF33: high-priority data
  → AF41-AF43: video conferencing

Class Selector (CS, DSCP 8/16/24/32/40/48/56):
  → Backward compatibility with IPv4 IP Precedence
  → CS6, CS7: network control traffic (routing protocols)
  → CS0 = Best Effort (default)

Best Effort (BE, DSCP 0):
  → Default for all unmarked traffic
```

## Marking with ip6tables/iptables

```bash
# Install iptables-persistent or nftables

# Mark outbound VoIP (SIP + RTP) with EF
sudo ip6tables -t mangle -A OUTPUT -p udp --dport 5060 -j DSCP --set-dscp-class EF
sudo ip6tables -t mangle -A OUTPUT -p udp --dport 16384:32767 -j DSCP --set-dscp-class EF

# Mark Zoom media with AF41
sudo ip6tables -t mangle -A OUTPUT -p udp --dport 8801:8803 -j DSCP --set-dscp 34

# Mark web traffic with AF21
sudo ip6tables -t mangle -A OUTPUT -p tcp --dport 443 -j DSCP --set-dscp 18

# Mark background downloads with CS1
sudo ip6tables -t mangle -A OUTPUT -p tcp --dport 80 -j DSCP --set-dscp 8

# View current mangle rules
sudo ip6tables -t mangle -L -n -v
```

## Marking with tc (Traffic Control)

```bash
# Using a classful qdisc for egress DSCP marking and queuing
sudo tc qdisc add dev eth0 root handle 1: prio bands 4 \
    priomap 2 3 3 3 2 3 1 1 2 2 2 2 2 2 2 2

# Mark outbound QUIC (UDP 443) traffic with AF41 while preserving ECN bits
sudo tc filter add dev eth0 protocol ipv6 parent 1: prio 1 \
    flower ip_proto udp dst_port 443 \
    action pedit ex munge ip6 traffic_class set 0x88 retain 0xfc \
    reclassify  # AF41 = DSCP 34 = 0x88 Traffic Class

sudo tc filter add dev eth0 protocol ipv6 parent 1: prio 2 \
    u32 match ip6 priority 0xb8 0xfc \
    flowid 1:1  # EF → highest priority band
```

## Python: Setting DSCP on a Socket

```python
import socket

# DSCP values (just the DSCP class, not shifted)
class DSCP:
    BE  = 0    # Best Effort
    CS1 = 8    # Low priority
    AF11 = 10
    AF21 = 18
    AF31 = 26
    AF41 = 34  # Video
    CS5 = 40
    EF  = 46   # Expedited Forwarding (VoIP)
    CS6 = 48   # Network control
    CS7 = 56

def set_dscp(sock: socket.socket, dscp: int):
    """Set DSCP marking on a socket for all outgoing packets."""
    if not 0 <= dscp <= 63:
        raise ValueError("DSCP must be between 0 and 63")

    # DSCP occupies bits 2-7; shift left by 2
    traffic_class = dscp << 2

    if sock.family == socket.AF_INET6:
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_TCLASS, traffic_class)
    elif sock.family == socket.AF_INET:
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_TOS, traffic_class)
    else:
        raise ValueError("Socket must be AF_INET or AF_INET6")

# VoIP socket with EF marking
voip_sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
set_dscp(voip_sock, DSCP.EF)

# Verify the setting
tos = voip_sock.getsockopt(socket.IPPROTO_IPV6, socket.IPV6_TCLASS)
dscp_value = tos >> 2
print(f"Socket DSCP: {dscp_value} (TC byte: 0x{tos:02X})")
```

## Trust Boundary Considerations

DSCP markings from untrusted sources (internet, customer networks) should be re-marked at the trust boundary:

```bash
# Re-mark all incoming IPv6 traffic to Best Effort at the edge
sudo ip6tables -t mangle -A PREROUTING -i eth0 -j DSCP --set-dscp 0

# Then re-mark based on your own classification (5-tuple, application)
sudo ip6tables -t mangle -A PREROUTING -i eth0 -p udp --dport 5060 \
    -j DSCP --set-dscp 46
```

## Conclusion

DSCP marking in the IPv6 Traffic Class byte provides the same DiffServ QoS framework as IPv4. Use EF for real-time voice, AF41 for interactive video, AF classes for business applications that need differentiated forwarding and drop precedence, and CS0 (Best Effort) for everything else. Mark traffic as close to the source as possible (application sockets or access switches), re-mark at trust boundaries to enforce your QoS policy, and configure queuing schedulers on WAN interfaces to honor the markings.
