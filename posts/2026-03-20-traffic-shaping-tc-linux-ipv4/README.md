# How to Configure Traffic Shaping with tc on Linux for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, Traffic Shaping, IPv4, Linux, QoS, iproute2

Description: Use the Linux tc (traffic control) command to shape and control IPv4 packet flows using qdiscs, classes, and filters.

The Linux `tc` command is the primary tool for network traffic control. It can limit bandwidth, prioritize certain flows, add artificial latency, and shape IPv4 traffic in sophisticated ways using queuing disciplines (qdiscs).

## Core Concepts

```text
tc architecture:
  Interface → Root qdisc → Classes → Leaf qdiscs → Packets
                    ↕
                 Filters (classify packets to classes)
```

- **qdisc** (queuing discipline): algorithm that controls how packets are queued and sent
- **class**: a subdivision of a qdisc that can have its own rate/priority
- **filter**: rules that assign packets to classes based on IP, port, or mark

## Step 1: View Current tc Configuration

```bash
# View all qdiscs on an interface

sudo tc qdisc show dev eth0

# View classes
sudo tc class show dev eth0

# View filters
sudo tc filter show dev eth0

# View qdisc stats (bytes, packets, drops)
sudo tc -s qdisc show dev eth0
```

## Step 2: Basic Rate Limiting with TBF

The Token Bucket Filter (TBF) is the simplest way to limit an interface rate:

```bash
# Limit eth0 to 10 Mbps outbound
sudo tc qdisc add dev eth0 root tbf \
  rate 10mbit \
  burst 32kb \
  latency 400ms

# Remove the qdisc
sudo tc qdisc del dev eth0 root
```

## Step 3: Hierarchical Bandwidth Allocation with HTB

HTB allows you to divide bandwidth into classes and guarantee minimums:

```bash
# Set up a root HTB qdisc with a default class
sudo tc qdisc add dev eth0 root handle 1: htb default 30

# Total available bandwidth: 100 Mbps
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit

# High priority class: guaranteed 60 Mbps, can borrow up to 100 Mbps
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 60mbit ceil 100mbit prio 1

# Normal class: guaranteed 30 Mbps, can borrow up to 100 Mbps
sudo tc class add dev eth0 parent 1:1 classid 1:20 htb rate 30mbit ceil 100mbit prio 2

# Default class (catch-all): 10 Mbps
sudo tc class add dev eth0 parent 1:1 classid 1:30 htb rate 10mbit ceil 100mbit prio 3
```

## Step 4: Add Filters to Classify Traffic

```bash
# Send traffic to TCP port 22 (SSH) to the high priority class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip protocol 6 0xff \
  match ip dport 22 0xffff flowid 1:10

# Send traffic to port 80/443 (HTTP/HTTPS) to normal class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip protocol 6 0xff \
  match ip dport 80 0xffff flowid 1:20
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip protocol 6 0xff \
  match ip dport 443 0xffff flowid 1:20
```

## Step 5: Make Rules Persistent

`tc` rules are lost on reboot. Add them to a startup script, use ifupdown hooks, or on Netplan systems use networkd-dispatcher/NetworkManager dispatcher hooks:

```bash
#!/bin/bash
# /etc/network/if-up.d/tc-shaping (ifupdown systems)
/sbin/tc qdisc add dev eth0 root tbf rate 10mbit burst 32kb latency 400ms
```

```bash
sudo chmod +x /etc/network/if-up.d/tc-shaping
```

With `tc`, you have full control over how IPv4 traffic is shaped, prioritized, and scheduled on Linux systems.
