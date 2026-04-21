# How to Use tc htb (Hierarchical Token Bucket) for IPv4 Bandwidth Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, HTB, IPv4, Linux, QoS, Bandwidth

Description: Implement hierarchical bandwidth allocation for IPv4 traffic using tc's HTB qdisc to guarantee minimums and enforce ceilings per traffic class.

HTB (Hierarchical Token Bucket) is the most powerful and commonly used classful qdisc in Linux. It lets you define a tree of traffic classes, each with a guaranteed rate and optional ceiling for burst borrowing.

## HTB Concepts

- **rate**: guaranteed minimum bandwidth for this class
- **ceil**: maximum bandwidth this class can use (by borrowing from parent)
- **prio**: priority for borrowing unused bandwidth (lower number = higher priority)
- **burst**: maximum token bucket size used for short bursts

## Full HTB Example: Three-Tier Priority

This example shapes a 100 Mbps link into three service tiers:

```bash
# Step 1: Create the root HTB qdisc

# handle 1: assigns ID; default 40 sends unclassified traffic to class 1:40
sudo tc qdisc add dev eth0 root handle 1: htb default 40

# Step 2: Create the root class (parent of all subclasses)
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit burst 15k

# Step 3: Define traffic tiers

# Tier 1 - Critical (VoIP, SSH): 40 Mbps guaranteed, up to 100 Mbps
sudo tc class add dev eth0 parent 1:1 classid 1:10 \
  htb rate 40mbit ceil 100mbit burst 15k prio 1

# Tier 2 - Standard (web, email): 40 Mbps guaranteed, up to 80 Mbps
sudo tc class add dev eth0 parent 1:1 classid 1:20 \
  htb rate 40mbit ceil 80mbit burst 15k prio 2

# Tier 3 - Bulk (backups, downloads): 19 Mbps guaranteed, up to 60 Mbps
sudo tc class add dev eth0 parent 1:1 classid 1:30 \
  htb rate 19mbit ceil 60mbit burst 15k prio 3

# Default catch-all class
sudo tc class add dev eth0 parent 1:1 classid 1:40 \
  htb rate 1mbit ceil 10mbit burst 15k prio 4
```

## Step 4: Add Leaf qdiscs for Fairness Within Each Class

```bash
# Add fq_codel to each class for fair intra-class queuing
sudo tc qdisc add dev eth0 parent 1:10 handle 10: fq_codel
sudo tc qdisc add dev eth0 parent 1:20 handle 20: fq_codel
sudo tc qdisc add dev eth0 parent 1:30 handle 30: fq_codel
sudo tc qdisc add dev eth0 parent 1:40 handle 40: fq_codel
```

## Step 5: Add Filters to Classify IPv4 Traffic

```bash
# VoIP traffic (SIP port 5060 over UDP/TCP) → critical tier
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip protocol 17 0xff \
  match ip dport 5060 0xffff flowid 1:10
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip protocol 6 0xff \
  match ip dport 5060 0xffff flowid 1:10

# SSH traffic → critical tier
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip protocol 6 0xff \
  match ip dport 22 0xffff flowid 1:10

# HTTP/HTTPS → standard tier
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip protocol 6 0xff \
  match ip dport 80 0xffff flowid 1:20
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip protocol 6 0xff \
  match ip dport 443 0xffff flowid 1:20

# Backup server subnet → bulk tier
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 3 u32 \
  match ip dst 10.10.20.0/24 flowid 1:30
```

## Verifying HTB Statistics

```bash
# View class statistics including bytes sent and dropped packets
sudo tc -s class show dev eth0

# View the filter assignments
sudo tc filter show dev eth0
```

## Resetting All tc Rules

```bash
# Remove the root qdisc and its attached classes/filters from an interface
sudo tc qdisc del dev eth0 root
```

HTB's ability to guarantee minimum bandwidth while allowing burst borrowing from unused capacity makes it ideal for multi-service networks where fairness and priority coexist.
