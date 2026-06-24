# How to Prioritize IPv4 Traffic by Port Using tc Filters and Classes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, IPv4, Linux, QoS, Traffic Prioritization, HTB

Description: Use tc filters with HTB classes to prioritize IPv4 traffic by destination port, ensuring latency-sensitive applications get bandwidth priority.

Traffic prioritization ensures that critical applications like VoIP, SSH, and DNS are served before bulk transfers when the egress link is congested.

## Architecture

```text
eth0 → Root HTB (100 Mbps total)
         ├── Class 1:10 - Critical (VoIP, SSH)  - 40 Mbps guaranteed
         ├── Class 1:20 - Interactive (HTTP)    - 40 Mbps guaranteed
         └── Class 1:30 - Bulk (default)        - 20 Mbps guaranteed
```

## Step 1: Create HTB Root and Classes

```bash
# Root HTB qdisc, default traffic goes to bulk class (1:30)

sudo tc qdisc add dev eth0 root handle 1: htb default 30

# Root class encompassing all bandwidth
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit

# Critical class: VoIP, SSH - priority 1 (highest)
sudo tc class add dev eth0 parent 1:1 classid 1:10 \
  htb rate 40mbit ceil 100mbit prio 1

# Interactive class: HTTP/HTTPS - priority 2
sudo tc class add dev eth0 parent 1:1 classid 1:20 \
  htb rate 40mbit ceil 100mbit prio 2

# Bulk class: everything else - priority 3 (lowest)
sudo tc class add dev eth0 parent 1:1 classid 1:30 \
  htb rate 20mbit ceil 100mbit prio 3
```

## Step 2: Add fq_codel Leaf qdiscs

```bash
# Add fq_codel to each class for AQM (Active Queue Management)
sudo tc qdisc add dev eth0 parent 1:10 handle 10: fq_codel
sudo tc qdisc add dev eth0 parent 1:20 handle 20: fq_codel
sudo tc qdisc add dev eth0 parent 1:30 handle 30: fq_codel
```

## Step 3: Add Port-Based Filters

```bash
# SSH (TCP port 22) → critical class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 flower \
  ip_proto tcp dst_port 22 classid 1:10

# SIP signaling (UDP port 5060) → critical class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 flower \
  ip_proto udp dst_port 5060 classid 1:10

# RTP audio (ports 10000-20000) → critical class
# Mark the port range in netfilter, then classify on the fwmark in tc
sudo iptables -t mangle -A POSTROUTING -o eth0 -p udp --dport 10000:20000 -j MARK --set-mark 10
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 handle 10 fw classid 1:10

# HTTPS (TCP port 443) → interactive class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 flower \
  ip_proto tcp dst_port 443 classid 1:20

# HTTP (TCP port 80) → interactive class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 flower \
  ip_proto tcp dst_port 80 classid 1:20

# DNS over UDP (port 53) → critical class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 flower \
  ip_proto udp dst_port 53 classid 1:10

# DNS over TCP (port 53) → critical class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 flower \
  ip_proto tcp dst_port 53 classid 1:10
```

## Verifying Filter Hits

```bash
# View filter stats (shows how many packets matched each filter)
sudo tc -s filter show dev eth0

# View class statistics
sudo tc -s class show dev eth0
# Look at the 'Sent' bytes to confirm traffic is landing in the right classes
```

## Using DSCP for Vendor-Neutral Classification

```bash
# Mark packets with DSCP EF (Expedited Forwarding) for VoIP in iptables
sudo iptables -t mangle -A POSTROUTING -o eth0 -p udp --dport 5060 -j DSCP --set-dscp-class EF

# In tc, match on the IPv4 DS field (DSCP EF = 46 decimal = 0xb8 in the DS byte)
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 flower \
  ip_tos 0xb8/0xfc classid 1:10
```

With HTB classes and port-based filters, you can ensure critical applications always have the bandwidth they need even during peak usage.
