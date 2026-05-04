# How to Configure IPv6 Quality of Service (QoS) Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, QoS, DSCP, Traffic Shaping, tc, Networking

Description: Configure comprehensive IPv6 QoS policies using Linux tc, DSCP marking, and traffic shaping to prioritize critical traffic and guarantee bandwidth for important services.

## Introduction

IPv6 QoS is implemented through the Traffic Class field (equivalent to IPv4 DSCP) and Linux's traffic control (tc) subsystem. Proper QoS ensures critical services get bandwidth priority during congestion while preventing low-priority bulk traffic from impacting real-time flows.

## DSCP Code Points Reference

| Traffic Type | DSCP Name | Value | Use Case |
|---|---|---|---|
| Network Control | CS6 | 48 | Routing protocols |
| VoIP/Video | EF | 46 | Real-time media |
| Video Streaming | AF41 | 34 | Video conferencing |
| Critical Apps | AF31 | 26 | Business-critical apps |
| Best Effort Plus | CS1 | 8 | Low-priority traffic |
| Scavenger | LE | 1 | Background transfers |

## Step 1: Mark IPv6 Traffic with DSCP

Use ip6tables to classify and mark traffic by service type.

```bash
# /etc/network/qos-mark.sh - DSCP marking rules

# Flush existing mangle rules

ip6tables -t mangle -F OUTPUT
ip6tables -t mangle -F POSTROUTING

# Mark VoIP traffic (RTP ports 16384-32767)
ip6tables -t mangle -A OUTPUT \
  -p udp --dport 16384:32767 \
  -j DSCP --set-dscp-class EF

# Mark HTTPS traffic for critical applications
ip6tables -t mangle -A OUTPUT \
  -p tcp --dport 443 \
  -j DSCP --set-dscp-class AF31

# Mark DNS as CS3
ip6tables -t mangle -A OUTPUT \
  -p udp --dport 53 \
  -j DSCP --set-dscp-class CS3

# Mark bulk transfers (e.g., backup port) as LE (Low Effort)
ip6tables -t mangle -A OUTPUT \
  -p tcp --dport 9000 \
  -j DSCP --set-dscp-class LE
```

## Step 2: Configure HTB QoS on Egress

```bash
#!/bin/bash
# qos-setup.sh - HTB-based IPv6 QoS

IFACE="eth0"
BANDWIDTH="1gbit"

# Remove any existing qdisc
tc qdisc del dev $IFACE root 2>/dev/null

# Add HTB root qdisc
tc qdisc add dev $IFACE root handle 1: htb default 40

# Root class
tc class add dev $IFACE parent 1: classid 1:1 \
  htb rate $BANDWIDTH

# Class 1:10 - Network Control (CS6) - 5%
tc class add dev $IFACE parent 1:1 classid 1:10 \
  htb rate 50mbit ceil $BANDWIDTH prio 0

# Class 1:20 - Real-Time (EF) - 20%
tc class add dev $IFACE parent 1:1 classid 1:20 \
  htb rate 200mbit ceil $BANDWIDTH prio 1

# Class 1:30 - Interactive (AF31-AF41) - 30%
tc class add dev $IFACE parent 1:1 classid 1:30 \
  htb rate 300mbit ceil $BANDWIDTH prio 2

# Class 1:40 - Default Best Effort - 40%
tc class add dev $IFACE parent 1:1 classid 1:40 \
  htb rate 400mbit ceil $BANDWIDTH prio 3

# Class 1:50 - Scavenger (LE/CS1) - 5%
tc class add dev $IFACE parent 1:1 classid 1:50 \
  htb rate 50mbit ceil 200mbit prio 4

# Add FQ-CoDel to each class to minimize bufferbloat
for classid in 10 20 30 40 50; do
  tc qdisc add dev $IFACE parent 1:$classid \
    handle ${classid}: fq_codel
done

# Classify IPv6 packets by DSCP. The IPv6 Traffic Class field straddles
# bytes 0-1 of the header (low nibble of byte 0 + high nibble of byte 1),
# so we match the 16-bit word at offset 0 with the DSCP bits shifted into
# bits 11-6 (mask 0x0fc0, value = DSCP << 6).

# CS6 (DSCP 48 = 0x30; 0x30 << 6 = 0x0c00)
tc filter add dev $IFACE parent 1: protocol ipv6 \
  u32 match u16 0x0c00 0x0fc0 at 0 flowid 1:10

# EF (DSCP 46 = 0x2e; 0x2e << 6 = 0x0b80)
tc filter add dev $IFACE parent 1: protocol ipv6 \
  u32 match u16 0x0b80 0x0fc0 at 0 flowid 1:20

# AF41 (DSCP 34 = 0x22; 0x22 << 6 = 0x0880)
tc filter add dev $IFACE parent 1: protocol ipv6 \
  u32 match u16 0x0880 0x0fc0 at 0 flowid 1:30

# AF31 (DSCP 26 = 0x1a; 0x1a << 6 = 0x0680)
tc filter add dev $IFACE parent 1: protocol ipv6 \
  u32 match u16 0x0680 0x0fc0 at 0 flowid 1:30

echo "QoS configured on $IFACE"
```

## Step 3: Verify QoS Configuration

```bash
# Show all tc classes and their statistics
tc -s class show dev eth0

# Show filters
tc filter show dev eth0

# Monitor class utilization in real-time
watch -n1 "tc -s class show dev eth0 | grep -A3 'class htb'"
```

## Conclusion

IPv6 QoS using DSCP + Linux HTB gives you per-class bandwidth guarantees without stateful NAT. The Traffic Class field travels end-to-end (if ISPs honor DSCP marking), giving consistent priority across the path. Use OneUptime to monitor your critical service response times and detect when QoS policies are insufficient during peak load.
