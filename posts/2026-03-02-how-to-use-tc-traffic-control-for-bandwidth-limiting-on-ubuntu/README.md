# How to Use tc (Traffic Control) for Bandwidth Limiting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Traffic Control, Bandwidth, QoS

Description: Use the tc (traffic control) command on Ubuntu to limit bandwidth, add network delay, simulate packet loss, and prioritize traffic with queueing disciplines.

---

`tc` (traffic control) is the Linux command for managing network traffic: limiting bandwidth, adding delay, prioritizing certain types of traffic, and simulating network conditions. It operates at the kernel level using queueing disciplines (qdiscs) attached to network interfaces.

This guide covers practical `tc` usage for bandwidth limiting, traffic shaping, and network simulation.

## How tc Works

Traffic control in Linux uses a hierarchy:

- **qdisc (queueing discipline)** - the algorithm that controls how packets are queued and transmitted
- **class** - a subdivision within a qdisc (for hierarchical qdiscs like HTB)
- **filter** - rules that assign packets to specific classes

The most common qdiscs for bandwidth control:
- `tbf` (Token Bucket Filter) - simple rate limiting for a single class
- `htb` (Hierarchical Token Bucket) - hierarchical, supports multiple classes with different rates
- `netem` - network emulator (for adding delay, loss, corruption - useful for testing)
- `fq_codel` - Fair Queuing with Controlled Delay (the Ubuntu default for most interfaces)

## Checking Current qdisc Configuration

```bash
# Show qdiscs on all interfaces
tc qdisc show

# Show qdiscs on a specific interface
tc qdisc show dev eth0

# Show classes
tc class show dev eth0

# Show filters
tc filter show dev eth0
```

## Simple Bandwidth Limiting with tbf

TBF is the simplest way to limit an interface's bandwidth. It limits all traffic on the interface to a specified rate.

```bash
# Limit eth0 to 10 Mbit/s
# rate = sustained rate
# burst = how much data can be sent at once above the rate (token bucket size)
# latency = maximum time a packet can sit in the queue
sudo tc qdisc add dev eth0 root tbf rate 10mbit burst 32kbit latency 400ms
```

Verify:

```bash
tc qdisc show dev eth0
```

### Test the Limit

```bash
# Install iperf3 for bandwidth testing
sudo apt install iperf3

# On another machine, run iperf3 server
# iperf3 -s

# On this machine, test bandwidth
iperf3 -c server_ip -t 10
```

The measured bandwidth should be at or below the configured limit.

### Modify the Limit

```bash
# Change the rate (use 'change' instead of 'add')
sudo tc qdisc change dev eth0 root tbf rate 5mbit burst 32kbit latency 400ms
```

### Remove the Limit

```bash
# Remove the qdisc entirely (restores default)
sudo tc qdisc del dev eth0 root
```

## Hierarchical Bandwidth Limiting with HTB

HTB allows multiple classes with different rates - for example, limiting specific IP ranges or protocols while giving priority to others.

### Basic HTB Setup

```bash
# Step 1: Add an HTB root qdisc to eth0
# default 30 means unclassified traffic goes to class 30
sudo tc qdisc add dev eth0 root handle 1: htb default 30

# Step 2: Create a root class with the total available bandwidth
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit

# Step 3: Create child classes with different rates
# Class 10: high priority - 80 Mbit/s
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 80mbit ceil 100mbit

# Class 20: medium priority - 20 Mbit/s
sudo tc class add dev eth0 parent 1:1 classid 1:20 htb rate 20mbit ceil 50mbit

# Class 30: default class - 10 Mbit/s (for unclassified traffic)
sudo tc class add dev eth0 parent 1:1 classid 1:30 htb rate 10mbit ceil 100mbit
```

The `ceil` parameter allows a class to borrow unused bandwidth from the parent, up to the ceil limit.

### Add Filters to Direct Traffic to Classes

```bash
# Route traffic to/from 192.168.1.100 into class 10 (high priority)
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip dst 192.168.1.100/32 flowid 1:10

# Route traffic to/from 192.168.1.200 into class 20
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip dst 192.168.1.200/32 flowid 1:20

# All other traffic falls to class 30 (the default)
```

### Add FQ-CoDel Inside Each Class

For better behavior under load, attach an fq_codel leaf qdisc to each class:

```bash
# Attach a leaf qdisc to each class for better queue management
sudo tc qdisc add dev eth0 parent 1:10 handle 10: fq_codel
sudo tc qdisc add dev eth0 parent 1:20 handle 20: fq_codel
sudo tc qdisc add dev eth0 parent 1:30 handle 30: fq_codel
```

## Network Simulation with netem

`netem` (Network Emulator) simulates WAN conditions: latency, packet loss, corruption, and reordering. This is invaluable for testing how applications behave under poor network conditions.

### Adding Network Delay

```bash
# Add 100ms delay to all packets on eth0
sudo tc qdisc add dev eth0 root netem delay 100ms

# Add delay with jitter (±20ms variation)
sudo tc qdisc add dev eth0 root netem delay 100ms 20ms

# Add delay with jitter and correlation (packets tend to have similar delay)
sudo tc qdisc add dev eth0 root netem delay 100ms 20ms 25%
```

### Simulating Packet Loss

```bash
# Random 1% packet loss
sudo tc qdisc add dev eth0 root netem loss 1%

# Loss with correlation (bursty loss is more realistic)
sudo tc qdisc add dev eth0 root netem loss 1% 25%
```

### Combining Multiple Effects

```bash
# Simulate a bad satellite link: 600ms RTT, 5% loss, some jitter
sudo tc qdisc add dev eth0 root netem delay 300ms 50ms loss 5% corrupt 0.1%
```

### Adding Packet Reordering

```bash
# 10% of packets are delayed by 10ms extra (causing reordering)
sudo tc qdisc add dev eth0 root netem delay 10ms reorder 10% 25%
```

### Rate Limiting with netem

netem can also limit rate:

```bash
# Simulate a 2 Mbit/s DSL connection with 50ms latency
sudo tc qdisc add dev eth0 root netem rate 2mbit delay 50ms
```

### Removing netem

```bash
sudo tc qdisc del dev eth0 root
```

## Combining HTB and netem for Realistic Simulation

For testing how specific traffic classes behave under simulated conditions:

```bash
# Set up HTB with rate limiting
sudo tc qdisc add dev eth0 root handle 1: htb default 10
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 10mbit
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 10mbit

# Attach netem to simulate delay inside the rate limit
sudo tc qdisc add dev eth0 parent 1:10 handle 10: netem delay 50ms loss 0.5%
```

## Ingress Traffic Shaping

The standard `tc` qdiscs work on egress (outgoing) traffic. Shaping ingress traffic requires the `ifb` (Intermediate Functional Block) device:

```bash
# Load the ifb module
sudo modprobe ifb
sudo ip link set ifb0 up

# Redirect ingress traffic on eth0 to ifb0
sudo tc qdisc add dev eth0 ingress
sudo tc filter add dev eth0 parent ffff: protocol ip u32 \
  match u32 0 0 action mirred egress redirect dev ifb0

# Apply rate limiting to ifb0 (which is the ingress of eth0)
sudo tc qdisc add dev ifb0 root tbf rate 5mbit burst 32kbit latency 400ms
```

## Monitoring tc Statistics

```bash
# Show statistics for all qdiscs on eth0
tc -s qdisc show dev eth0

# Show statistics for all classes
tc -s class show dev eth0

# Watch statistics update
watch -n 1 tc -s qdisc show dev eth0
```

The `-s` flag adds packet and byte counters, dropped packet counts, and overlap statistics.

## Making tc Rules Persistent

`tc` rules are not persistent across reboots. Options for persistence:

### Using a startup script

```bash
sudo tee /etc/rc.local <<'EOF'
#!/bin/bash

# Apply bandwidth limiting on startup
tc qdisc add dev eth0 root tbf rate 10mbit burst 32kbit latency 400ms

exit 0
EOF
sudo chmod +x /etc/rc.local
```

### Using a systemd service

```bash
sudo tee /etc/systemd/system/tc-rules.service <<'EOF'
[Unit]
Description=Traffic control rules
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/apply-tc-rules.sh
ExecStop=/sbin/tc qdisc del dev eth0 root

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable tc-rules
```

`tc` is powerful but its syntax is notoriously dense. The combinations of qdiscs, classes, and filters give you very fine-grained control over traffic, but they require careful design. Start with `tbf` for simple cases and move to `htb` only when you need multiple traffic classes with different rate guarantees.
