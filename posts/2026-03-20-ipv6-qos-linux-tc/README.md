# How to Configure IPv6 QoS on Linux with tc

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, IPv6, QoS, tc, Traffic Control, DSCP, HTB, Linux Networking

Description: Configure IPv6 Quality of Service on Linux using the tc (traffic control) tool with HTB queuing discipline, DSCP classification, and bandwidth allocation for different traffic classes.

---

Linux's `tc` (traffic control) command provides powerful QoS capabilities for IPv6 traffic. Using Hierarchical Token Bucket (HTB) with DSCP-based classification enables bandwidth guarantees and prioritization for IPv6 traffic streams.

## Understanding Linux QoS Architecture

```text
Linux QoS Components for IPv6:
1. qdisc (queuing discipline): Defines scheduling algorithm (HTB, PRIO, etc.)
2. class: Bandwidth allocation within a qdisc
3. filter: Classification rules that assign packets to classes
4. police/shape: Rate limiting/shaping

Flow:
IPv6 Packet → qdisc → filter classifies → class schedules → egress
```

## Setting Up HTB for IPv6 QoS

```bash
#!/bin/bash
# configure_ipv6_qos.sh - Configure IPv6 QoS with tc HTB

IFACE="eth0"
RATE="100mbit"  # Total interface bandwidth

# Clear existing rules

sudo tc qdisc del dev $IFACE root 2>/dev/null || true

# Add root HTB qdisc
sudo tc qdisc add dev $IFACE root handle 1: htb default 40

# Root class - total bandwidth
sudo tc class add dev $IFACE parent 1: classid 1:1 \
  htb rate $RATE burst 15k

# Class for VoIP (30% guaranteed, highest HTB priority)
sudo tc class add dev $IFACE parent 1:1 classid 1:10 \
  htb rate 30mbit ceil 30mbit burst 10k prio 1

# Class for Video (25% guaranteed)
sudo tc class add dev $IFACE parent 1:1 classid 1:20 \
  htb rate 25mbit ceil 50mbit burst 15k prio 2

# Class for Interactive/SSH (10% guaranteed)
sudo tc class add dev $IFACE parent 1:1 classid 1:30 \
  htb rate 10mbit ceil 30mbit burst 10k prio 3

# Default class (bulk/best-effort)
sudo tc class add dev $IFACE parent 1:1 classid 1:40 \
  htb rate 35mbit ceil 100mbit burst 15k prio 4

echo "HTB classes configured for $IFACE"
```

## Classifying IPv6 Traffic by DSCP

```bash
#!/bin/bash
# classify_ipv6_dscp.sh - Add filters to classify IPv6 by DSCP

IFACE="eth0"

# Match IPv6 EF (DSCP 46 = 0x2e) -> VoIP class 1:10
# tc's ip6 priority selector matches the IPv6 Traffic Class octet.
# DSCP occupies the upper 6 bits, so mask with 0xfc to ignore ECN.

sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 prio 1 \
  u32 \
  match ip6 priority 0xb8 0xfc \
  flowid 1:10

# Match IPv6 AF41 (DSCP 34 = 0x22) -> Video class 1:20
# AF41 = 34, so Traffic Class value is 0x88 when ECN bits are ignored
sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 prio 2 \
  u32 \
  match ip6 priority 0x88 0xfc \
  flowid 1:20

# Match IPv6 AF31 (DSCP 26) -> Interactive class 1:30
# AF31 = 26, so Traffic Class value is 0x68 when ECN bits are ignored
sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 prio 3 \
  u32 \
  match ip6 priority 0x68 0xfc \
  flowid 1:30

# Default - all other IPv6 -> bulk class 1:40
sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 prio 100 \
  u32 \
  match u32 0 0 \
  flowid 1:40

echo "IPv6 DSCP filters applied"
```

## PRIO Qdisc for Simple Priority Queuing

```bash
# Simple 3-band priority queue for IPv6

IFACE="eth0"

sudo tc qdisc del dev $IFACE root 2>/dev/null || true

# Add 3-band PRIO qdisc
sudo tc qdisc add dev $IFACE root handle 1: prio bands 3 \
  priomap 1 1 1 1 2 2 1 0 1 1 1 1 1 1 1 1

# Band 0 = high priority (VoIP EF)
# Band 1 = medium priority
# Band 2 = low priority (bulk)

# Add FQ-CoDel to each band for bufferbloat prevention
sudo tc qdisc add dev $IFACE parent 1:1 handle 10: fq_codel
sudo tc qdisc add dev $IFACE parent 1:2 handle 20: fq_codel
sudo tc qdisc add dev $IFACE parent 1:3 handle 30: fq_codel

# Classify IPv6 EF to band 0 (high)
sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 prio 1 \
  u32 match ip6 priority 0xb8 0xfc \
  flowid 1:1

# Default to band 1
```

## Rate Limiting IPv6 with Police

```bash
# Limit bandwidth of specific IPv6 traffic

IFACE="eth0"

# Limit UDP traffic from a specific IPv6 source
sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 \
  u32 \
  match ip6 src 2001:db8::10/128 \
  match ip6 protocol 17 0xff \
  classid 1:20 \
  action police rate 50mbit burst 500k conform-exceed drop/ok
```

## Monitoring IPv6 QoS

```bash
# View tc statistics
sudo tc -s qdisc show dev eth0
sudo tc -s class show dev eth0

# Watch queue statistics in real-time
watch -n 1 'sudo tc -s class show dev eth0'

# Check for drops
sudo tc -s qdisc show dev eth0 | grep -A2 "pkt"

# Statistics per class
sudo tc -s class ls dev eth0 | grep "class\|Sent\|Dropped"
```

Linux tc's u32 filter can match the IPv6 Traffic Class field directly with the `ip6 priority` selector for DSCP-based classification, with HTB providing bandwidth guarantees and FQ-CoDel at each class level helping reduce queueing delay and bufferbloat.
