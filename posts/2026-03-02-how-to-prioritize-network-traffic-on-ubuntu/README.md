# How to Prioritize Network Traffic on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, QoS, Linux

Description: Learn comprehensive techniques to prioritize network traffic on Ubuntu using iptables, tc, and systemd, ensuring critical applications get the bandwidth they need.

---

Prioritizing network traffic on Ubuntu means ensuring that latency-sensitive or business-critical traffic is handled before bulk or background traffic when the network is congested. This is not just about rate limiting - it is about queue ordering, scheduling, and classification working together to deliver predictable performance even under load.

## Why Traffic Prioritization Matters

Without prioritization, all traffic competes equally for bandwidth and queue position. A large file transfer can cause SSH sessions to freeze, database queries to time out, and VoIP calls to break up. Prioritization prevents this by ensuring that interactive, low-latency traffic is serviced ahead of bulk data.

## The Three-Layer Approach

Effective traffic prioritization on Ubuntu typically involves three layers:

1. **Classification** - identify which traffic belongs to which priority tier (iptables marks, DSCP, tc filters)
2. **Queuing** - arrange packets by priority (HTB, prio qdisc, SFQ/fq_codel at leaves)
3. **Scheduling** - transmit higher priority packets first

## Using the prio Qdisc for Simple Prioritization

The `prio` qdisc is the simplest priority scheduler. It has multiple bands (queues) numbered 0-3, and always services band 0 before band 1, band 1 before band 2, and so on.

```bash
# Replace root qdisc with a 3-band priority scheduler
sudo tc qdisc add dev eth0 root handle 1: prio bands 3

# By default, traffic with IP precedence bits is placed in different bands
# Band 0: highest priority (TOS bits indicating interactive)
# Band 1: medium
# Band 2: best effort

# Verify
tc qdisc show dev eth0
# qdisc prio 1: root refcnt 2 bands 3 priomap 1 2 2 2 1 2 0 0 1 1 1 1 1 1 1 1

# Add a leaf qdisc to each band for sub-scheduling
tc qdisc add dev eth0 parent 1:1 handle 10: fq_codel
tc qdisc add dev eth0 parent 1:2 handle 20: fq_codel
tc qdisc add dev eth0 parent 1:3 handle 30: fq_codel
```

## Classifying Traffic into prio Bands

```bash
# SSH and DNS go to the highest priority band (1:1)
tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
    match ip dport 22 0xffff flowid 1:1

tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
    match ip dport 53 0xffff flowid 1:1

# ICMP (ping) gets priority so latency monitoring is accurate
tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
    match ip protocol 1 0xff flowid 1:1

# HTTP/S goes to medium band (1:2)
tc filter add dev eth0 parent 1: protocol ip prio 2 u32 \
    match ip dport 80 0xffff flowid 1:2

tc filter add dev eth0 parent 1: protocol ip prio 2 u32 \
    match ip dport 443 0xffff flowid 1:2

# Bulk transfers go to low priority band (1:3)
tc filter add dev eth0 parent 1: protocol ip prio 3 u32 \
    match ip dport 873 0xffff flowid 1:3   # rsync

tc filter add dev eth0 parent 1: protocol ip prio 3 u32 \
    match ip dport 21 0xffff flowid 1:3    # FTP data
```

## Comprehensive HTB + Priority Setup

For production use, combine HTB for rate guarantees with prio/fq_codel for intra-class scheduling.

```bash
#!/bin/bash
# priority-qos.sh - Complete traffic prioritization setup

IFACE="eth0"
LINK_RATE="1gbit"

# Clean slate
tc qdisc del dev $IFACE root 2>/dev/null || true

# Root HTB - default class is low-priority bulk
tc qdisc add dev $IFACE root handle 1: htb default 40

# Root class - full link speed
tc class add dev $IFACE parent 1: classid 1:1 \
    htb rate $LINK_RATE burst 256k

# Priority class 1: Critical/Interactive
# Guaranteed 100 Mbit, can burst to full link
tc class add dev $IFACE parent 1:1 classid 1:10 \
    htb rate 100mbit ceil 1gbit burst 64k prio 0

# Priority class 2: Business applications
tc class add dev $IFACE parent 1:1 classid 1:20 \
    htb rate 400mbit ceil 1gbit burst 128k prio 1

# Priority class 3: General web traffic
tc class add dev $IFACE parent 1:1 classid 1:30 \
    htb rate 300mbit ceil 900mbit burst 128k prio 2

# Priority class 4: Bulk/background (lowest - cannot exceed 200 Mbit)
tc class add dev $IFACE parent 1:1 classid 1:40 \
    htb rate 100mbit ceil 200mbit burst 64k prio 7

# Leaf qdiscs - fq_codel provides fair per-flow queuing + AQM
tc qdisc add dev $IFACE parent 1:10 handle 10: fq_codel target 5ms interval 100ms
tc qdisc add dev $IFACE parent 1:20 handle 20: fq_codel target 5ms interval 100ms
tc qdisc add dev $IFACE parent 1:30 handle 30: fq_codel target 15ms interval 100ms
tc qdisc add dev $IFACE parent 1:40 handle 40: fq_codel target 50ms interval 100ms

# Filters - classify by port and protocol

# Class 1:10 (Critical)
for port in 22 53; do
    tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
        match ip dport $port 0xffff flowid 1:10
    tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
        match ip sport $port 0xffff flowid 1:10
done

# ICMP
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
    match ip protocol 1 0xff flowid 1:10

# Class 1:20 (Business apps)
for port in 5432 6379 3306 50051 8080 8443; do
    tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 \
        match ip dport $port 0xffff flowid 1:20
done

# Class 1:30 (Web traffic)
for port in 80 443; do
    tc filter add dev $IFACE parent 1: protocol ip prio 3 u32 \
        match ip dport $port 0xffff flowid 1:30
done

# Class 1:40 (Bulk) - match by destination IP of backup server
tc filter add dev $IFACE parent 1: protocol ip prio 5 u32 \
    match ip dst 10.0.0.200/32 flowid 1:40

echo "Traffic prioritization configured on $IFACE"
tc class show dev $IFACE
```

## Using iptables Marks for Flexible Classification

For more complex classification logic (multiple ports, application-level matching), use iptables marks that tc can then read.

```bash
# Mark packets with iptables (marks survive through the network stack to tc)

# Mark 1: Critical traffic
iptables -t mangle -A OUTPUT -p tcp --dport 22 -j MARK --set-mark 1
iptables -t mangle -A OUTPUT -p udp --dport 53 -j MARK --set-mark 1
iptables -t mangle -A OUTPUT -p icmp -j MARK --set-mark 1

# Mark 2: Application traffic
iptables -t mangle -A OUTPUT -p tcp --dport 5432 -j MARK --set-mark 2
iptables -t mangle -A OUTPUT -p tcp --dport 6379 -j MARK --set-mark 2

# Mark 3: Web traffic
iptables -t mangle -A OUTPUT -p tcp --dport 80 -j MARK --set-mark 3
iptables -t mangle -A OUTPUT -p tcp --dport 443 -j MARK --set-mark 3

# Now use tc filters to classify based on the fwmark
tc filter add dev eth0 parent 1: handle 1 fw flowid 1:10  # mark 1 -> critical
tc filter add dev eth0 parent 1: handle 2 fw flowid 1:20  # mark 2 -> business
tc filter add dev eth0 parent 1: handle 3 fw flowid 1:30  # mark 3 -> web
```

## Prioritizing by Process with cgroups v2

Ubuntu 22.04 with cgroups v2 allows per-process network priority.

```bash
# Check cgroups v2 support
mount | grep cgroup2

# Create a cgroup for your high-priority application
mkdir -p /sys/fs/cgroup/myapp

# Set I/O priority (network class via SO_PRIORITY socket option)
# Applications can set their own socket priority
python3 -c "
import socket, struct
s = socket.socket()
# Set socket priority 6 (TC_PRIO_INTERACTIVE)
s.setsockopt(socket.SOL_SOCKET, socket.SO_PRIORITY, 6)
print('Socket priority set')
"

# tc can classify based on socket priority (SO_PRIORITY)
tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
    match ip tos 0x10 0x1c flowid 1:10  # matches TOS interactive bit
```

## Monitoring the Impact of Prioritization

```bash
# Watch traffic distribution across classes in real time
watch -n 2 'tc -s class show dev eth0 | grep -A4 "class htb"'

# Check if high-priority class is emptying faster
tc -s class show dev eth0 classid 1:10
# Look at: bytes sent, drops, backlog

# Use ss to see socket priorities
ss -tipn | grep -E 'sk_prio|priority'

# tcpdump to verify DSCP/TOS markings
sudo tcpdump -i eth0 -n -v ip 2>/dev/null | grep -E 'tos|priority'
```

## Complete Automation Script

```bash
#!/bin/bash
# /usr/local/bin/apply-qos.sh
# Applied at boot via systemd

IFACE=$(ip route get 8.8.8.8 | awk '{print $5; exit}')

echo "Applying QoS on interface: $IFACE"

# Apply tc rules
/usr/local/bin/priority-qos.sh "$IFACE"

# Apply iptables marks
/usr/local/bin/mark-traffic.sh

echo "QoS applied successfully"
```

Traffic prioritization is not a set-and-forget configuration. Monitor your class statistics regularly, adjust rates as traffic patterns change, and test the impact of prioritization changes under realistic load. The goal is ensuring that when your network is busy, the traffic that matters most to your users and operations always gets through.
