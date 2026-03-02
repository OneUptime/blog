# How to Implement Fair Queuing with SFQ on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, QoS, Linux

Description: Configure Stochastic Fair Queuing (SFQ) on Ubuntu to distribute network bandwidth fairly among competing flows, preventing any single connection from monopolizing your network.

---

Stochastic Fair Queuing (SFQ) is a queuing discipline that prevents any single network flow from monopolizing a shared network link. It hashes flows (based on source/destination IP and port) into buckets and round-robins between them, giving each active flow a roughly equal share of the available bandwidth.

The "stochastic" part means it uses a hash function to assign flows to buckets, which means multiple flows can collide into the same bucket. To avoid any flow exploiting a stable bucket assignment, SFQ periodically changes its hash function (every 10 seconds by default), so no flow can permanently benefit from a favorable assignment.

## When SFQ Is the Right Choice

SFQ is ideal as a leaf qdisc at the bottom of an HTB hierarchy, where it ensures fair scheduling within each traffic class. It is simpler than complex per-flow rate limiting and handles dynamic numbers of competing flows gracefully.

Common use cases:
- ISP or router scenarios where you need to prevent one user/connection from hogging bandwidth
- Web servers with many concurrent connections
- Shared lab or office networks
- Leaf qdisc within HTB classes to prevent flow starvation within a class

## Basic SFQ Configuration

```bash
# Replace the root qdisc with SFQ (simple, single-class approach)
sudo tc qdisc add dev eth0 root handle 1: sfq perturb 10

# Parameters:
# perturb 10 - rehash every 10 seconds (prevents flow gaming the hash)

# Verify
tc qdisc show dev eth0
# qdisc sfq 1: root refcnt 2 quantum 1514b depth 127 divisor 1024 perturb 10sec

# Remove it
sudo tc qdisc del dev eth0 root
```

## SFQ as a Leaf Qdisc within HTB

The most common deployment pattern: SFQ at the leaves of an HTB tree, providing fair queuing within each class.

```bash
#!/bin/bash
# htb-with-sfq.sh - HTB traffic shaping with SFQ leaf qdiscs

IFACE="eth0"

# Clean up
tc qdisc del dev $IFACE root 2>/dev/null || true

# Root HTB qdisc, default class is 1:30 (bulk)
tc qdisc add dev $IFACE root handle 1: htb default 30

# Root class - represents 100 Mbit uplink
tc class add dev $IFACE parent 1: classid 1:1 htb rate 100mbit burst 15k

# Interactive traffic (SSH, DNS, small web requests): 30 Mbit guaranteed
tc class add dev $IFACE parent 1:1 classid 1:10 \
    htb rate 30mbit ceil 100mbit burst 15k prio 0

# Normal web traffic: 50 Mbit guaranteed
tc class add dev $IFACE parent 1:1 classid 1:20 \
    htb rate 50mbit ceil 100mbit burst 15k prio 1

# Bulk / best effort: 20 Mbit guaranteed, max 50 Mbit
tc class add dev $IFACE parent 1:1 classid 1:30 \
    htb rate 20mbit ceil 50mbit burst 15k prio 2

# Add SFQ as leaf qdisc for each class
# SFQ provides per-flow fairness within each HTB class

# Interactive class: quick rehash, small quantum
tc qdisc add dev $IFACE parent 1:10 handle 10: sfq perturb 10

# Web class: standard settings
tc qdisc add dev $IFACE parent 1:20 handle 20: sfq perturb 10

# Bulk class: longer perturb interval is fine for bulk
tc qdisc add dev $IFACE parent 1:30 handle 30: sfq perturb 30

echo "HTB + SFQ configured on $IFACE"
```

## Adding Filters

Without filters, all traffic goes to the default class. Add filters to classify traffic into the right HTB class.

```bash
IFACE="eth0"

# Interactive traffic -> class 1:10
# SSH
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
    match ip dport 22 0xffff flowid 1:10

# DNS
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
    match ip dport 53 0xffff flowid 1:10

# ICMP
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
    match ip protocol 1 0xff flowid 1:10

# Web traffic -> class 1:20
tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 \
    match ip dport 80 0xffff flowid 1:20

tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 \
    match ip dport 443 0xffff flowid 1:20

# Everything else goes to default (bulk class 1:30) via HTB default 30
```

## Understanding SFQ Parameters

```bash
# Show detailed SFQ statistics
tc -s qdisc show dev eth0

# Example SFQ output:
# qdisc sfq 10: parent 1:10 refcnt 1 quantum 1514b depth 127 divisor 1024 perturb 10sec
#  Sent 1234567 bytes 8910 pkt (dropped 0, overlimits 0 requeues 0)
#  backlog 0b 0p requeues 0
```

Key SFQ parameters:

- **quantum** - how many bytes to send per flow before moving to the next (default = one MTU, 1514 bytes). Larger quantum increases throughput but reduces fairness.
- **depth** - queue depth per bucket (default 127). Reduce this to limit per-flow buffering.
- **divisor** - number of hash buckets (default 1024). More buckets = fewer collisions but more memory.
- **perturb** - seconds before rehashing (default 10). Setting it to 0 disables rehashing.

## Tuning SFQ for Different Scenarios

```bash
# For many competing short-lived connections (e.g., web server)
# Smaller quantum for better fairness at expense of throughput
tc qdisc add dev eth0 parent 1:20 handle 20: sfq \
    perturb 10 \
    quantum 1514

# For bulk data transfers where per-flow fairness matters more than latency
# Larger quantum improves throughput
tc qdisc add dev eth0 parent 1:30 handle 30: sfq \
    perturb 30 \
    quantum 50000

# For VoIP/streaming where predictable latency matters
# Very small queue depth to reduce buffering
tc qdisc add dev eth0 parent 1:10 handle 10: sfq \
    perturb 5 \
    depth 16
```

## Comparing SFQ with fq_codel

For most modern Ubuntu deployments, `fq_codel` (Fair Queuing with Controlled Delay) is preferred over plain SFQ because it also manages latency through the CoDel algorithm.

```bash
# Traditional SFQ leaf
tc qdisc add dev eth0 parent 1:20 handle 20: sfq perturb 10

# Modern alternative: fq_codel (better latency management)
tc qdisc add dev eth0 parent 1:20 handle 20: fq_codel \
    limit 10240 \
    flows 1024 \
    target 5ms \
    interval 100ms \
    quantum 1514

# fq_codel tracks queue delay and drops packets when
# the queue delay exceeds the target, preventing bufferbloat
```

For most new deployments, use `fq_codel` at the leaves. Use `sfq` when you need a simpler, lower-overhead option or are targeting an older kernel.

## Verifying Fair Queuing Behavior

Test that SFQ distributes bandwidth fairly between competing flows.

```bash
# Install iperf3
sudo apt install iperf3 -y

# On the receiving server, start multiple iperf3 server instances
iperf3 -s -p 5201 &
iperf3 -s -p 5202 &
iperf3 -s -p 5203 &

# From the sending server (with SFQ configured on the egress interface):
# Run three simultaneous flows
iperf3 -c remote-server -p 5201 -t 30 &
iperf3 -c remote-server -p 5202 -t 30 &
iperf3 -c remote-server -p 5203 -t 30 &
wait

# Each flow should get approximately equal bandwidth
# Without SFQ, whichever flow started first would dominate
```

## Monitoring SFQ

```bash
# Watch SFQ statistics in real time
watch -n 1 'tc -s qdisc show dev eth0'

# Extract key SFQ stats from a script
get_sfq_stats() {
    local iface="$1"
    tc -s qdisc show dev "$iface" | awk '
    /qdisc sfq/ {
        handle=$3; parent=$5
    }
    /Sent/ {
        printf "SFQ handle=%s parent=%s sent_bytes=%s pkts=%s dropped=%s\n",
               handle, parent, $2, $4, $6
    }'
}

get_sfq_stats eth0
```

## Making the Configuration Persistent

```bash
# Create a systemd service to restore tc rules at boot
cat > /etc/systemd/system/traffic-shaping.service << 'EOF'
[Unit]
Description=Network Traffic Shaping (HTB + SFQ)
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-htb-sfq.sh
ExecStop=/sbin/tc qdisc del dev eth0 root
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable traffic-shaping.service
```

SFQ is straightforward to implement and provides meaningful fairness benefits without requiring per-flow state management or complex configuration. Combined with HTB for rate limiting and class separation, it provides a solid foundation for managing network traffic on Ubuntu servers and routers.
