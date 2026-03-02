# How to Set Up Traffic Shaping with HTB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, QoS, Linux

Description: Configure Hierarchical Token Bucket (HTB) traffic shaping on Ubuntu to guarantee bandwidth for critical services, set rate limits, and manage traffic across network classes.

---

HTB (Hierarchical Token Bucket) is the most widely used classful queuing discipline in Linux traffic control. It solves a specific problem: you have a fixed amount of bandwidth, multiple types of traffic competing for it, and you want to guarantee that critical services always get their share while allowing lower-priority traffic to use any leftover capacity.

## How HTB Works

HTB organizes traffic into a tree hierarchy of classes. Each class has:

- **rate** - the guaranteed minimum bandwidth
- **ceil** - the maximum bandwidth the class can use (including borrowed bandwidth)
- **prio** - priority used when multiple classes compete for spare bandwidth

The borrowing mechanism is key: when a high-priority class is not using its full allocation, other classes can borrow that unused bandwidth up to their `ceil` limit. This prevents waste while ensuring guarantees are met when needed.

## Scenario: Shared Server with Multiple Services

This example shapes traffic on a 1 Gbit server that runs a web application, a backup process, and management access.

```
Total: 1 Gbit
├── Management (SSH, monitoring): guaranteed 50 Mbit, max 1 Gbit
├── Web traffic (HTTP/S, API): guaranteed 600 Mbit, max 1 Gbit
├── Database (PostgreSQL, Redis): guaranteed 200 Mbit, max 800 Mbit
└── Backup/bulk transfers: guaranteed 100 Mbit, max 200 Mbit
```

## Setting Up the HTB Configuration

```bash
#!/bin/bash
# setup-htb.sh - Configure HTB traffic shaping on Ubuntu

set -euo pipefail

IFACE="${1:-eth0}"
LINK_SPEED="1gbit"

echo "Configuring HTB on $IFACE (link speed: $LINK_SPEED)"

# Clean up any existing rules
tc qdisc del dev "$IFACE" root 2>/dev/null || true

# Step 1: Add root HTB qdisc
# default 40 means unclassified traffic goes to class 1:40 (backup)
tc qdisc add dev "$IFACE" root handle 1: htb default 40

# Step 2: Root class - represents the full link capacity
tc class add dev "$IFACE" parent 1: classid 1:1 \
    htb rate "$LINK_SPEED" burst 256k

# Step 3: Child classes for each traffic type

# Management: SSH, monitoring agents, out-of-band access (highest priority)
tc class add dev "$IFACE" parent 1:1 classid 1:10 \
    htb rate 50mbit ceil 1gbit burst 64k prio 0

# Web traffic: HTTP/HTTPS (high priority)
tc class add dev "$IFACE" parent 1:1 classid 1:20 \
    htb rate 600mbit ceil 1gbit burst 256k prio 1

# Database traffic: PostgreSQL, Redis, internal RPC (medium priority)
tc class add dev "$IFACE" parent 1:1 classid 1:30 \
    htb rate 200mbit ceil 800mbit burst 128k prio 2

# Backup/bulk: rsync, backup agents (low priority, rate capped)
tc class add dev "$IFACE" parent 1:1 classid 1:40 \
    htb rate 100mbit ceil 200mbit burst 64k prio 7

# Step 4: Add leaf qdiscs to each class
# fq_codel provides good buffer management and reduces latency within each class
tc qdisc add dev "$IFACE" parent 1:10 handle 10: fq_codel
tc qdisc add dev "$IFACE" parent 1:20 handle 20: fq_codel
tc qdisc add dev "$IFACE" parent 1:30 handle 30: fq_codel
tc qdisc add dev "$IFACE" parent 1:40 handle 40: fq_codel

echo "HTB classes configured."
```

## Adding Filters to Assign Traffic to Classes

```bash
#!/bin/bash
# add-htb-filters.sh - Assign traffic to HTB classes

IFACE="${1:-eth0}"

# Management traffic -> class 1:10
# SSH
tc filter add dev "$IFACE" parent 1: protocol ip prio 1 u32 \
    match ip dport 22 0xffff flowid 1:10

# ICMP (ping, traceroute) - keeps latency-sensitive
tc filter add dev "$IFACE" parent 1: protocol ip prio 1 u32 \
    match ip protocol 1 0xff flowid 1:10

# Custom monitoring port (e.g., Prometheus node exporter)
tc filter add dev "$IFACE" parent 1: protocol ip prio 1 u32 \
    match ip dport 9100 0xffff flowid 1:10

# Web traffic -> class 1:20
# HTTP
tc filter add dev "$IFACE" parent 1: protocol ip prio 2 u32 \
    match ip dport 80 0xffff flowid 1:20

# HTTPS
tc filter add dev "$IFACE" parent 1: protocol ip prio 2 u32 \
    match ip dport 443 0xffff flowid 1:20

# Database traffic -> class 1:30
# PostgreSQL
tc filter add dev "$IFACE" parent 1: protocol ip prio 3 u32 \
    match ip dport 5432 0xffff flowid 1:30

# Redis
tc filter add dev "$IFACE" parent 1: protocol ip prio 3 u32 \
    match ip dport 6379 0xffff flowid 1:30

# Internal RPC/gRPC
tc filter add dev "$IFACE" parent 1: protocol ip prio 3 u32 \
    match ip dport 50051 0xffff flowid 1:30

# Backup server by IP -> class 1:40
tc filter add dev "$IFACE" parent 1: protocol ip prio 5 u32 \
    match ip dst 10.0.0.50/32 flowid 1:40

echo "Filters applied on $IFACE"
```

## Verifying the Configuration

```bash
# Show the full HTB hierarchy
echo "=== Qdiscs ==="
tc qdisc show dev eth0

echo ""
echo "=== Classes ==="
tc class show dev eth0

echo ""
echo "=== Filters ==="
tc filter show dev eth0

# View statistics (bytes sent, packets, drops per class)
echo ""
echo "=== Statistics ==="
tc -s class show dev eth0
```

## Testing the Traffic Shaping

Use `iperf3` to test that bandwidth limits are being applied.

```bash
# Install iperf3
sudo apt install iperf3 -y

# Start an iperf3 server on the target (in another terminal)
iperf3 -s

# Test HTTP-classified traffic (port 80) - should get class 1:20 (web) treatment
iperf3 -c remote-server -p 80 -t 30

# Test from a backup source IP (should be limited to 200 Mbit)
iperf3 -c remote-server -B 10.0.0.50 -t 30

# Test SSH-classified traffic (should have highest priority)
iperf3 -c remote-server -p 22 -t 30
```

## Handling Ingress Traffic

HTB normally shapes egress (outgoing) traffic. To shape ingress, use an `ifb` (Intermediate Functional Block) device.

```bash
# Load the ifb module
sudo modprobe ifb numifbs=1

# Bring up the ifb device
sudo ip link set ifb0 up

# Redirect ingress traffic to ifb0
tc qdisc add dev eth0 handle ffff: ingress
tc filter add dev eth0 parent ffff: protocol ip u32 \
    match u32 0 0 \
    action mirred egress redirect dev ifb0

# Now apply HTB to ifb0 (shapes what comes IN on eth0)
tc qdisc add dev ifb0 root handle 1: htb default 10

tc class add dev ifb0 parent 1: classid 1:1 htb rate 100mbit burst 15k
tc class add dev ifb0 parent 1:1 classid 1:10 htb rate 100mbit ceil 100mbit
```

## Adjusting Classes at Runtime

You can modify HTB parameters without restarting - useful for dynamic bandwidth management.

```bash
# Change the backup class rate at runtime (no traffic disruption)
tc class change dev eth0 parent 1:1 classid 1:40 \
    htb rate 50mbit ceil 100mbit prio 7

# During off-peak hours, give backup traffic more bandwidth
HOUR=$(date +%H)
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -le 5 ]; then
    # 2-5 AM: allow backup to use up to 500 Mbit
    tc class change dev eth0 parent 1:1 classid 1:40 \
        htb rate 100mbit ceil 500mbit prio 7
else
    # Business hours: cap backup at 200 Mbit
    tc class change dev eth0 parent 1:1 classid 1:40 \
        htb rate 100mbit ceil 200mbit prio 7
fi
```

## Monitoring with a Dashboard Script

```bash
#!/bin/bash
# htb-monitor.sh - Display HTB class statistics

IFACE="${1:-eth0}"

while true; do
    clear
    echo "HTB Traffic Statistics - $IFACE - $(date)"
    echo "============================================"

    tc -s class show dev "$IFACE" | awk '
    /class htb/ {
        class=$3
    }
    /Sent/ {
        split($2, bytes, "")
        sent=int($2)/1024/1024
        printf "Class %-8s Sent: %8.1f MB  Dropped: %s\n", class, sent, $6
    }'

    sleep 5
done
```

HTB is the practical choice for any Ubuntu server where you need to prevent one type of traffic (like bulk backups or large file transfers) from starving other services of bandwidth. The guarantee-and-borrow model ensures fairness without wasting available capacity.
