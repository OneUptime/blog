# How to Configure TCP ECN (Explicit Congestion Notification) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, ECN, Linux, Congestion Control, Networking, Performance

Description: Configure TCP Explicit Congestion Notification (ECN) to allow network devices to signal congestion to TCP endpoints without dropping packets, reducing retransmissions.

## Introduction

Explicit Congestion Notification (ECN) allows a network router to signal congestion to TCP endpoints by setting a bit in the IP header instead of dropping packets. The receiver reflects this signal back to the sender via the TCP header. The sender can then reduce its CWND proactively, avoiding packet loss while still responding to congestion.

## How ECN Works

```mermaid
sequenceDiagram
    participant S as Sender (ECN-capable)
    participant R as Router (congested)
    participant D as Destination

    S->>R: Packet with ECT bit set (ECN-Capable Transport)
    R->>D: Packet with CE bit set (Congestion Experienced)
    D->>S: TCP ACK with ECE flag (ECN-Echo)
    Note left of S: Sender reduces CWND (like loss, but without dropping)
    S->>D: TCP with CWR flag (Congestion Window Reduced)
```

## Enabling ECN on Linux

```bash
# View current ECN setting

sysctl net.ipv4.tcp_ecn

# Values:
# 0 = ECN disabled
# 1 = ECN enabled, request ECN on all outbound connections
# 2 = ECN enabled, but only accept when requested by remote (more compatible)

# Enable ECN with backwards compatibility
sysctl -w net.ipv4.tcp_ecn=1

# Make permanent
echo "net.ipv4.tcp_ecn=1" >> /etc/sysctl.conf
sysctl -p
```

## Verifying ECN Negotiation in Handshake

```bash
# Capture a TCP handshake and check for ECN flags
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' -c 5 2>/dev/null

# Look for ECN flags in the handshake:
# Flags [S]  seq ..., ECE CWR    ← SYN with both ECE and CWR = ECN-capable
# Flags [S.] ack ..., ECE        ← SYN-ACK with ECE only (not CWR) = ECN negotiated

# ECN negotiation uses TCP control bits in SYN (RFC 3168):
# ECN-capable: SYN with ECE+CWR bits set
# ECN-accepted: SYN-ACK with ECE bit set and CWR bit not set
```

## Monitoring ECN Activity

```bash
# Check ECN congestion signal statistics
nstat -a | grep -iE "ECT|CEPkts|CE"

# Key counters (in /proc/net/netstat, IpExt: and TcpExt: sections):
# IpExtInNoECTPkts: packets received with ECN field = 00 (Not-ECT)
# IpExtInECT0Pkts:  packets received with ECN field = 10 (ECT(0))
# IpExtInECT1Pkts:  packets received with ECN field = 01 (ECT(1))
# IpExtInCEPkts:    packets received with ECN field = 11 (Congestion Experienced)
# TcpExtTCPDeliveredCE: TCP segments delivered that were marked CE

# Detailed ECN stats
cat /proc/net/netstat | grep -E "^(Ip|Tcp)Ext"

# Or with nstat (show zero-valued counters too)
nstat -az | grep -iE "ECT|CEPkts|DeliveredCE"
```

## ECN and iptables

```bash
# Mark packets as ECN-capable (if not already)
iptables -t mangle -A POSTROUTING -p tcp \
  -m ecn --ecn-tcp-ece \
  -j LOG --log-prefix "ECN: "

# You can also set ECN bits in iptables
iptables -t mangle -A POSTROUTING -p tcp \
  -j ECN --ecn-tcp-remove   # Remove ECN bits (for compatibility)
```

## ECN Compatibility Concerns

```bash
# Some older middleboxes break ECN by stripping ECN bits or mishandling CE marks
# Test ECN compatibility with a remote host

# Method 1: Check if connection falls back from ECN
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' | grep ECE

# Method 2: Test with and without ECN
sysctl -w net.ipv4.tcp_ecn=0
time curl -o /dev/null http://remote-server/10mb.bin

sysctl -w net.ipv4.tcp_ecn=1
time curl -o /dev/null http://remote-server/10mb.bin
# If ECN version is slower: middlebox breaking ECN, use mode 2

# ECN mode 2 (accept if offered, don't request): safer for general use
sysctl -w net.ipv4.tcp_ecn=2
```

## Conclusion

ECN reduces packet loss by signaling congestion before the queue overflows. For networks that support it end-to-end (modern data center or cloud), ECN mode 1 enables proactive congestion response. For internet-facing services where some paths have ECN-hostile middleboxes, mode 2 provides compatibility. Monitor with nstat to verify ECN signals are being received and acted upon.
