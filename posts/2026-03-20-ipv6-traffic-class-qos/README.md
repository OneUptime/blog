# How to Use the IPv6 Traffic Class Field for QoS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, QoS, DSCP, Traffic Class, Networking

Description: Learn how to use the 8-bit IPv6 Traffic Class field to mark packets with DSCP values for Quality of Service prioritization in IPv6 networks.

## Introduction

The IPv6 Traffic Class field is an 8-bit field that serves the same purpose as the IPv4 Type of Service (TOS) byte: enabling QoS differentiation. It is divided into two sub-fields: the 6-bit DSCP (Differentiated Services Code Point) and the 2-bit ECN (Explicit Congestion Notification). Understanding how to mark and honor these bits is essential for deploying QoS in dual-stack networks.

## Traffic Class Field Layout

```text
 7  6  5  4  3  2  1  0
+--+--+--+--+--+--+--+--+
| DSCP (6 bits)  | ECN  |
+--+--+--+--+--+--+--+--+

DSCP bits [7:2]: 64 possible values (0-63)
ECN bits  [1:0]: 4 possible values (00, 01, 10, 11)
```

## Common DSCP Values

| DSCP Value | Name | Priority | Use Case |
|---|---|---|---|
| 0 (0x00) | BE/DF (Best Effort) | Default | Undifferentiated traffic |
| 8 (0x08) | CS1 | Low | Low-priority/background data |
| 10 (0x0A) | AF11 | Low+ | High-throughput or bulk data |
| 16 (0x10) | CS2 | Medium | OAM / management traffic |
| 18 (0x12) | AF21 | Medium | Low-latency data / client-server transactions |
| 26 (0x1A) | AF31 | High | Streaming audio/video |
| 34 (0x22) | AF41 | High+ | Adaptive video conferencing |
| 40 (0x28) | CS5 | Very high | Signaling and session control |
| 46 (0x2E) | EF (Expedited Fwd) | Highest | IP telephony / interactive voice |
| 48 (0x30) | CS6 | Network control | Routing protocols |
| 56 (0x38) | CS7 | Reserved | Internal/reserved use; often not forwarded |

## Setting DSCP on Outgoing Packets

```bash
# Linux: set the IPv6 Traffic Class on outgoing packets using tc (traffic control)

# Mark outbound RTP over UDP port 5004 with EF (DSCP 46)

# Traffic Class value = 0xB8 when DSCP = 46 and ECN = 00
sudo tc qdisc add dev eth0 handle ffff: clsact
sudo tc filter add dev eth0 egress protocol ipv6 flower \
    ip_proto udp dst_port 5004 \
    action pedit ex munge ip6 traffic_class set 0xB8

# Using iptables to set DSCP on IPv6 packets (requires ip6tables)
# Mark VoIP (RTP) traffic with EF
sudo ip6tables -t mangle -A OUTPUT -p udp --dport 5004 \
    -j DSCP --set-dscp 46

# Mark SSH with AF21 (DSCP 18)
sudo ip6tables -t mangle -A OUTPUT -p tcp --dport 22 \
    -j DSCP --set-dscp 18

# Verify the installed IPv6 mangle rules
sudo ip6tables -t mangle -S OUTPUT
```

## Setting DSCP in Application Code

```python
import socket

def create_ipv6_socket_with_dscp(dscp_value: int) -> socket.socket:
    """
    Create an IPv6 socket with DSCP marking.

    Args:
        dscp_value: DSCP value (0-63)
    """
    if not 0 <= dscp_value <= 63:
        raise ValueError("DSCP value must be in the range 0-63")

    # DSCP occupies bits 2-7 of the Traffic Class byte
    tos_value = dscp_value << 2  # Shift left by 2 to leave room for ECN bits

    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # IPV6_TCLASS sets the Traffic Class byte for all packets
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_TCLASS, tos_value)

    return sock

# Example: priority TCP socket with Expedited Forwarding
dscp_ef = 46  # Expedited Forwarding
priority_socket = create_ipv6_socket_with_dscp(dscp_ef)
print(f"DSCP {dscp_ef} (EF) → Traffic Class byte: 0x{dscp_ef << 2:02X}")

# Example: background file transfer with CS1
dscp_cs1 = 8  # CS1 - low priority
bg_socket = create_ipv6_socket_with_dscp(dscp_cs1)
```

## Router QoS Policy Example

```bash
# Cisco IOS: match IPv6 DSCP and apply queuing

# Class-map: match EF traffic (VoIP)
# class-map match-all VOICE
#  match dscp ef

# Class-map: match AF41 (video)
# class-map match-all VIDEO
#  match dscp af41

# Policy-map: apply queuing
# policy-map QOS-POLICY
#  class VOICE
#   priority percent 30   ! LLQ - low latency
#  class VIDEO
#   bandwidth percent 40  ! Guaranteed bandwidth
#  class class-default
#   fair-queue

# Apply to interface:
# interface GigabitEthernet0/0
#  ipv6 enable
#  service-policy output QOS-POLICY
```

## Verifying DSCP Markings with tcpdump

```bash
# Capture and display DSCP values for IPv6 packets
# The Traffic Class spans the low nibble of the first byte
# and the high nibble of the second byte
sudo tcpdump -i eth0 -vv ip6 | grep "class"

# Capture only EF-marked packets (DSCP 46), regardless of ECN
sudo tcpdump -i eth0 'ip6 and (ip6[0] & 0x0f) = 0x0b and (ip6[1] & 0xc0) = 0x80'

# Capture any non-zero Traffic Class packets
sudo tcpdump -i eth0 'ip6 and ((ip6[0] & 0x0f) != 0 or (ip6[1] & 0xf0) != 0)'
```

## Conclusion

The IPv6 Traffic Class field provides the same DSCP-based QoS capabilities as IPv4's TOS byte. Using the 6-bit DSCP field, network administrators can mark packets with standardized codepoints such as EF for voice, AF classes for assured forwarding, and CS values for signaling or network-control traffic, then configure routers to queue and forward traffic accordingly. The 2-bit ECN field enables congestion notification without packet drops for TCP traffic that supports it.
