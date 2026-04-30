# How to Use the Type of Service Field in IPv4 Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, QoS, DSCP, Type of Service, TCP/IP

Description: Learn how the IPv4 Type of Service (ToS) byte works, how DSCP and ECN use its bits, and how to set QoS markings in Linux and applications.

## Introduction

The Type of Service (ToS) byte is the second byte of the IPv4 header. Originally defined in RFC 791 as a precedence and service type field, it was redefined by RFC 2474 as the Differentiated Services (DS) field. RFC 3168 later assigned the lower 2 bits to Explicit Congestion Notification (ECN), while the upper 6 bits carry the Differentiated Services Code Point (DSCP) used in modern Quality of Service (QoS) networks. Understanding this byte is important for ensuring voice, video, and critical application traffic gets priority treatment.

## ToS Byte Structure: Original vs. DSCP

The original RFC 791 interpretation used precedence bits and service type flags. Modern networks use the DS field interpretation, with DSCP from RFC 2474 and ECN from RFC 3168.

```text
Original (RFC 791):
  Bits: 0  1  2  3  4  5  6  7
        [Precedence ][D][T][R][0][0]
        Precedence: 0=Routine to 7=Network Control
        D: Low Delay, T: High Throughput, R: High Reliability

DS field (RFC 2474 + RFC 3168) - modern standard:
  Bits: 0  1  2  3  4  5  6  7
        [    DSCP (6 bits)    ][ECN (2 bits)]
        DSCP: differentiated services code point
        ECN:  explicit congestion notification
```

```python
def parse_tos_byte(tos: int) -> dict:
    """Parse the ToS byte into DSCP and ECN."""
    dscp = tos >> 2          # upper 6 bits
    ecn  = tos & 0b00000011  # lower 2 bits

    return {
        "raw_tos":   hex(tos),
        "dscp":      dscp,
        "dscp_class": dscp_class_name(dscp),
        "ecn":       ecn,
        "ecn_capable": ecn in (1, 2),  # ECT(1) or ECT(0)
        "congestion_experienced": ecn == 3,  # CE
    }

def dscp_class_name(dscp: int) -> str:
    classes = {
        0:  "CS0 (Best Effort)",
        8:  "CS1",
        10: "AF11", 12: "AF12", 14: "AF13",
        16: "CS2",
        18: "AF21", 20: "AF22", 22: "AF23",
        24: "CS3",
        26: "AF31", 28: "AF32", 30: "AF33",
        32: "CS4",
        34: "AF41", 36: "AF42", 38: "AF43",
        40: "CS5",
        46: "EF (Expedited Forwarding - VoIP)",
        48: "CS6 (Network Control)",
        56: "CS7",
    }
    return classes.get(dscp, f"DSCP {dscp}")
```

## Common DSCP Values

| DSCP Value | Name | Typical Use |
|---|---|---|
| 0 | CS0 / Best Effort | Default; no priority |
| 46 | EF | VoIP, real-time audio |
| 34-38 | AF41-AF43 | Video conferencing |
| 26-30 | AF31-AF33 | Mission-critical apps |
| 10-14 | AF11-AF13 | Low priority data |
| 48 | CS6 | Network control traffic (BGP, OSPF) |

## Setting DSCP in Linux

```bash
# Set DSCP on outgoing packets using iptables

# Mark VoIP traffic (UDP port 5060, 5061) with EF (DSCP 46)
iptables -t mangle -A OUTPUT \
  -p udp --dport 5060:5061 \
  -j DSCP --set-dscp 46

# Mark video conferencing traffic
iptables -t mangle -A OUTPUT \
  -p udp --dport 3478 \
  -j DSCP --set-dscp 34

# View tc QoS configuration
tc qdisc show dev eth0
tc class show dev eth0
tc filter show dev eth0

# Check DSCP on received packets
tcpdump -n -v -i eth0 'ip' | grep tos
# tos 0xb8 → DSCP 46 (0xb8 >> 2 = 46)
```

## Setting DSCP in Applications

```python
import socket

def create_socket_with_dscp(dscp_value: int) -> socket.socket:
    """
    Create a UDP socket with DSCP marking.
    The ToS byte = (DSCP << 2) | ECN
    """
    tos = dscp_value << 2  # ECN bits left as 0

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_TOS, tos)
    return sock

# VoIP socket with Expedited Forwarding
voip_socket = create_socket_with_dscp(46)
voip_socket.bind(('0.0.0.0', 5060))

# Background data transfer with low priority
bulk_socket = create_socket_with_dscp(10)  # AF11
```

## ECN: Explicit Congestion Notification

The ECN bits (lower 2 bits of the ToS byte) allow routers to signal congestion without dropping packets.

| ECN Value | Meaning |
|---|---|
| 00 | Not ECN-capable |
| 01 or 10 | ECN-capable (ECT) |
| 11 | Congestion Experienced (CE) - router set this |

```bash
# Check TCP ECN mode on Linux
cat /proc/sys/net/ipv4/tcp_ecn
# 0 = no ECN, 1 = ECN on incoming and outgoing TCP connections,
# 2 = ECN on incoming TCP connections only, 3-5 = Accurate ECN (AccECN) modes

# Enable classic ECN for TCP
sysctl -w net.ipv4.tcp_ecn=1

# Capture ECN-marked packets
tcpdump -n 'ip[1] & 0x3 == 3'  # CE bit set
```

## QoS Policy Configuration with OpenTofu

```hcl
# OpenTofu can provision an instance that applies DSCP policy.
# The DSCP marking itself is done inside the guest OS.
resource "aws_instance" "router" {
  ami           = "ami-xxxxxxxxxxxxxxxxx" # replace with a valid AMI for your region
  instance_type = "t3.micro"

  user_data = <<-EOF
    #!/bin/bash
    # Mark VoIP traffic with EF (DSCP 46)
    iptables -t mangle -A FORWARD \
      -p udp --dport 5060:5061 \
      -j DSCP --set-dscp 46
  EOF
}
```

## Summary

The ToS byte's upper 6 bits are the DSCP field, which modern routers use for QoS. The most important DSCP values are EF (46) for VoIP/real-time traffic, AF41 (34) for video, and CS0 (0) for best-effort. Set DSCP on Linux with `iptables -t mangle -j DSCP`, on sockets with `setsockopt(IP_TOS, dscp << 2)`, or read it from captures with `tcpdump -v` (look for the `tos` value in hex). The lower 2 bits are ECN - when set to `11` (CE) by a router, it signals congestion to the endpoints without dropping the packet.
