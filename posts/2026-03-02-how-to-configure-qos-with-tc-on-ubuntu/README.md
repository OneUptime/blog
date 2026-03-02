# How to Configure QoS with tc on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, QoS, Linux

Description: Use the tc (traffic control) command on Ubuntu to configure Quality of Service, control bandwidth, manage queues, and prioritize network traffic for critical applications.

---

The `tc` (traffic control) command is the standard Linux tool for managing network queuing disciplines, shaping traffic, and enforcing policies. It is part of the `iproute2` package and is available on every Ubuntu installation. Understanding `tc` lets you control how traffic is scheduled and rate-limited on any Linux interface.

## Understanding Traffic Control Concepts

Linux traffic control has a few key concepts:

- **Queuing Discipline (qdisc)** - the algorithm that determines the order in which packets are sent. The default is `pfifo_fast` (a simple priority FIFO).
- **Class** - a subdivision within a classful qdisc. Classes form a hierarchy.
- **Filter** - rules that classify packets into classes based on fields like source IP, destination port, or DSCP marking.
- **Handle** - a numeric identifier for qdiscs and classes in the format `major:minor`.

Traffic control applies to **egress** (outgoing) traffic by default. Controlling ingress (incoming) traffic requires a virtual `ifb` device.

## Viewing Current Configuration

```bash
# Show all qdiscs on an interface
tc qdisc show dev eth0

# Show all classes
tc class show dev eth0

# Show all filters
tc filter show dev eth0

# Or show everything
tc -s qdisc show dev eth0
tc -s class show dev eth0
```

## Simple Rate Limiting with tbf (Token Bucket Filter)

The simplest form of rate limiting uses the `tbf` qdisc to cap an interface's output rate.

```bash
# Limit outbound traffic on eth0 to 10 Mbit/s
tc qdisc add dev eth0 root tbf \
    rate 10mbit \
    burst 32kbit \
    latency 400ms

# Parameters:
# rate    - the desired output rate
# burst   - the bucket size (how much can burst above rate)
# latency - maximum time a packet can wait in the queue

# Verify
tc qdisc show dev eth0

# Remove the limit
tc qdisc del dev eth0 root
```

## Checking the Default Qdisc

```bash
# Ubuntu 22.04 uses fq_codel as the default qdisc (good choice for most scenarios)
tc qdisc show dev eth0
# qdisc fq_codel 0: root refcnt 2 limit 10240p flows 1024 quantum 1514 target 5ms interval 100ms memory_limit 32Mb ecn drop_batch 64

# fq_codel (Fair Queuing with Controlled Delay) reduces bufferbloat
# It is the recommended default for most Ubuntu systems
```

## Setting Up HTB for Traffic Shaping

HTB (Hierarchical Token Bucket) is the most commonly used classful qdisc for QoS. It allows you to define classes with guaranteed and maximum rates.

```bash
# Example: 100 Mbit interface with traffic classes
IFACE=eth0

# Step 1: Replace root qdisc with HTB
tc qdisc add dev $IFACE root handle 1: htb default 30

# Step 2: Create root class (100 Mbit ceiling = full link)
tc class add dev $IFACE parent 1: classid 1:1 htb rate 100mbit burst 15k

# Step 3: Create child classes for different traffic types
# High priority: SSH, DNS, management (guaranteed 20 Mbit, can borrow up to 100 Mbit)
tc class add dev $IFACE parent 1:1 classid 1:10 htb \
    rate 20mbit ceil 100mbit burst 15k prio 0

# Medium priority: Web traffic (guaranteed 40 Mbit)
tc class add dev $IFACE parent 1:1 classid 1:20 htb \
    rate 40mbit ceil 100mbit burst 15k prio 1

# Default/best-effort: Everything else (guaranteed 20 Mbit)
tc class add dev $IFACE parent 1:1 classid 1:30 htb \
    rate 20mbit ceil 80mbit burst 15k prio 2

# Step 4: Add leaf qdiscs to each class (fq_codel reduces bufferbloat)
tc qdisc add dev $IFACE parent 1:10 handle 10: fq_codel
tc qdisc add dev $IFACE parent 1:20 handle 20: fq_codel
tc qdisc add dev $IFACE parent 1:30 handle 30: fq_codel
```

## Adding Filters to Classify Traffic

Filters assign packets to classes based on various matching criteria.

```bash
IFACE=eth0

# Classify SSH traffic (port 22) to high priority class 1:10
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
    match ip dport 22 0xffff flowid 1:10

# Classify DNS traffic (port 53) to high priority
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
    match ip dport 53 0xffff flowid 1:10

# Classify HTTP/HTTPS to medium priority class 1:20
tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 \
    match ip dport 80 0xffff flowid 1:20

tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 \
    match ip dport 443 0xffff flowid 1:20

# Classify by source IP (e.g., bulk backup server)
tc filter add dev $IFACE parent 1: protocol ip prio 3 u32 \
    match ip src 10.0.0.50/32 flowid 1:30

# All other traffic falls to the default class (1:30) via 'default 30' in htb
```

## Classifying Traffic Using DSCP Marks

DSCP (Differentiated Services Code Point) marks in the IP header allow end-to-end QoS.

```bash
# Classify traffic based on DSCP value
# DSCP EF (Expedited Forwarding) = 0xb8 in the TOS field
tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
    match ip tos 0xb8 0xfc flowid 1:10

# DSCP AF11 (Assured Forwarding) = 0x28
tc filter add dev eth0 parent 1: protocol ip prio 2 u32 \
    match ip tos 0x28 0xfc flowid 1:20
```

## Making QoS Configuration Persistent

tc rules are lost on reboot. Use a systemd service to restore them.

```bash
# Save the tc commands to a script
cat > /usr/local/bin/setup-qos.sh << 'SCRIPT'
#!/bin/bash
IFACE=eth0

# Remove existing rules
tc qdisc del dev $IFACE root 2>/dev/null || true

# Add root HTB qdisc
tc qdisc add dev $IFACE root handle 1: htb default 30

# Root class
tc class add dev $IFACE parent 1: classid 1:1 htb rate 100mbit burst 15k

# Child classes
tc class add dev $IFACE parent 1:1 classid 1:10 htb rate 20mbit ceil 100mbit prio 0
tc class add dev $IFACE parent 1:1 classid 1:20 htb rate 40mbit ceil 100mbit prio 1
tc class add dev $IFACE parent 1:1 classid 1:30 htb rate 20mbit ceil 80mbit prio 2

# Leaf qdiscs
tc qdisc add dev $IFACE parent 1:10 handle 10: fq_codel
tc qdisc add dev $IFACE parent 1:20 handle 20: fq_codel
tc qdisc add dev $IFACE parent 1:30 handle 30: fq_codel

# Filters
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 match ip dport 22 0xffff flowid 1:10
tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 match ip dport 80 0xffff flowid 1:20
tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 match ip dport 443 0xffff flowid 1:20

echo "QoS rules applied to $IFACE"
SCRIPT

chmod +x /usr/local/bin/setup-qos.sh

# Create systemd service
cat > /etc/systemd/system/qos.service << 'EOF'
[Unit]
Description=Apply QoS Traffic Shaping Rules
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-qos.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now qos.service
```

## Monitoring and Statistics

```bash
# View statistics for all classes (bytes, packets, drops)
tc -s class show dev eth0

# Watch statistics refresh every second
watch -n 1 'tc -s class show dev eth0'

# Get statistics for a specific class
tc -s class show dev eth0 classid 1:10
```

## Resetting All Rules

```bash
# Remove all tc rules on an interface (reset to default)
sudo tc qdisc del dev eth0 root

# Verify it's clean
tc qdisc show dev eth0
# Default qdisc should reappear: qdisc fq_codel or pfifo_fast
```

Understanding `tc` is essential for managing network quality in environments where bandwidth is constrained or where certain traffic types (like VoIP, SSH sessions, or database traffic) must be protected from bulk transfers consuming all available bandwidth.
