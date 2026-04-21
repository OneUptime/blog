# How to Use Traceroute to Map Network Paths on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traceroute, IPv4, Networking, Diagnostic, Linux, Routing

Description: Use traceroute to map the path IPv4 packets take through the network, identify the number of hops, and pinpoint where connectivity breaks down.

Traceroute reveals the path packets appear to take from your machine to a destination, showing the routers that respond along the way. This is invaluable for diagnosing routing failures, identifying likely slow links, and understanding network topology.

## How Traceroute Works

Traceroute exploits the TTL (Time To Live) field to reveal each hop:

```text
1. Send packet with TTL=1 → First router decrements to 0, sends ICMP "Time Exceeded"
   → We record first router's IP

2. Send packet with TTL=2 → Second router sends ICMP "Time Exceeded"
   → We record second router's IP

3. ... continue until the destination responds (usually ICMP "Port Unreachable" for UDP probes, ICMP Echo Reply for ICMP probes, or a TCP response for TCP probes)
```

## Basic Usage

```bash
# Install traceroute

sudo apt install traceroute -y    # Debian/Ubuntu
sudo yum install traceroute -y    # RHEL/CentOS

# Basic traceroute
traceroute google.com

# Numeric output only (faster, no DNS lookups)
traceroute -n 8.8.8.8

# Set max hops (default 30)
traceroute -m 20 8.8.8.8
```

## Reading Traceroute Output

```bash
traceroute -n 8.8.8.8

# Output:
traceroute to 8.8.8.8 (8.8.8.8), 30 hops max, 60 byte packets
 1  192.168.1.1    1.2 ms    1.1 ms    1.0 ms    ← Your gateway
 2  10.1.0.1       8.3 ms    8.1 ms    8.5 ms    ← ISP first hop
 3  72.14.0.1     12.1 ms   11.9 ms   12.2 ms    ← Transit
 4  * * *                                         ← Filtered router
 5  8.8.8.8       12.8 ms   12.7 ms   13.0 ms    ← Destination

# Three RTT values per hop = three probe packets (UDP by default on Linux)
# * * * = router didn't respond (firewall, rate limiting, or no ICMP TTL exceeded)
```

## Traceroute Over UDP vs ICMP vs TCP

Different probe types have different firewall behavior:

```bash
# Default: UDP probes (high ports 33434+)
traceroute -n 8.8.8.8

# ICMP probes (same as Windows tracert)
sudo traceroute -I -n 8.8.8.8

# TCP SYN probes (useful when UDP or ICMP probes are filtered)
sudo traceroute -T -p 80 -n 8.8.8.8
# or
sudo tcptraceroute 8.8.8.8 80
```

## Specify Source Interface or IP

```bash
# Traceroute via specific interface
traceroute -i eth1 -n 10.0.0.1

# Traceroute with specific source IP (on multi-homed hosts)
traceroute -s 192.168.2.100 -n 8.8.8.8
```

## Practical Uses

```bash
# Find where connectivity fails
traceroute -n 10.50.0.1
# If traceroute stops after hop 3 → traffic or traceroute replies are blocked beyond that point

# Compare two paths (load balancing detection)
for i in 1 2 3 4 5; do traceroute -n -m 5 8.8.8.8; done
# If hop 3 alternates between two IPs → load balancing/ECMP

# Check latency at each hop to find the slow link
traceroute -n 8.8.8.8
# If latency jumps at hop 5 and stays high afterward → the issue likely starts near hop 5

# Traceroute to detect MPLS tunnels
traceroute -e 8.8.8.8    # Shows ICMP extensions, including MPLS labels if present
```

## Script to Check Multiple Paths

```bash
#!/bin/bash
# check-paths.sh - Trace routes to multiple targets

TARGETS=("8.8.8.8" "1.1.1.1" "192.168.10.1" "10.0.0.1")

for target in "${TARGETS[@]}"; do
    echo "=== Path to $target ==="
    traceroute -n -m 15 -w 1 "$target" 2>&1 | tail -5
    echo ""
done
```

Traceroute is the standard tool for understanding network topology - when ping says "something's wrong," traceroute tells you exactly where.
