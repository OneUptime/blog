# How to Set Up Fair Queuing for IPv4 Traffic with tc fq on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, Fair Queuing, IPv4, Linux, QoS, Fq_codel

Description: Configure Linux tc fair queuing qdiscs (fq, fq_codel, CAKE) to ensure equitable bandwidth distribution among IPv4 flows without per-IP configuration.

Fair queuing distributes bandwidth equally among competing flows without requiring manual per-IP or per-port rules. This prevents any single flow (like a large download) from starving other connections.

## Available Fair Queuing qdiscs

| qdisc | Description | Best Use |
|---|---|---|
| `fq` | Per-flow fair queuing with pacing for mostly locally generated traffic | High-performance servers |
| `fq_codel` | FQ + CoDel AQM (reduces bufferbloat) | General purpose |
| `cake` | Modern all-in-one (FQ + shaping + AQM) | Edge routers, home gateways |

## Using fq (Fair Queue)

```bash
# Replace the current root qdisc with fq

sudo tc qdisc replace dev eth0 root fq

# Configure with custom parameters:
# - flow_limit 100: Max packets queued per flow
# - quantum 3028: Bytes sent per round-robin turn
# - initial_quantum 15140: Initial quantum for new flows (TCP slow start boost)
sudo tc qdisc replace dev eth0 root fq \
  flow_limit 100 \
  quantum 3028 \
  initial_quantum 15140

# View statistics
sudo tc -s qdisc show dev eth0
```

## Using fq_codel (Most Commonly Recommended)

```bash
# Apply fq_codel with defaults (good for most use cases)
sudo tc qdisc replace dev eth0 root fq_codel

# With custom parameters:
# - limit 10240: Queue size in packets
# - flows 1024: Number of flow buckets (power of 2)
# - target 5ms: Target queuing delay (CoDel target)
# - interval 100ms: CoDel interval
sudo tc qdisc replace dev eth0 root fq_codel \
  limit 10240 \
  flows 1024 \
  target 5ms \
  interval 100ms

# Check for drops and ECN marks
sudo tc -s qdisc show dev eth0
```

## Using CAKE (Recommended for Edge Routers)

CAKE (Common Applications Kept Enhanced) combines fair queuing with rate limiting and AQM:

```bash
# Load CAKE if it is built as a module (requires kernel support for sch_cake)
sudo modprobe sch_cake

# Apply CAKE with a bandwidth limit (e.g., for a 100 Mbps link)
sudo tc qdisc replace dev eth0 root cake bandwidth 95mbit

# CAKE with additional options:
# - diffserv3: Use 3-tier DSCP prioritization
# - nat: Use internal addresses when NAT runs on this router
# - dual-srchost: Fair sharing per source host on uplink traffic
sudo tc qdisc replace dev eth0 root cake \
  bandwidth 95mbit \
  diffserv3 \
  nat \
  dual-srchost
```

## Combining fq_codel with HTB Classes

For bandwidth guarantees plus fair queuing within each class:

```bash
# HTB provides class-based bandwidth guarantees
sudo tc qdisc add dev eth0 root handle 1: htb default 10
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 100mbit

# fq_codel on the leaf class provides fair queuing within the class
sudo tc qdisc add dev eth0 parent 1:10 handle 10: fq_codel
```

## Verifying Flow Fairness

```bash
# Generate multiple flows (4 parallel streams)
iperf3 -c <SERVER_IP> -P 4 -t 30

# Monitor traffic in real time
sudo iftop -i eth0 -n

# View qdisc stats including drops and backlog
sudo tc -s qdisc show dev eth0
# Key fields: backlog (current queue size), drops, ecn_mark
```

## Checking for Bufferbloat

```bash
# Measure bufferbloat impact (should be near baseline with fq_codel/CAKE)
# Run a download and simultaneously ping
wget -O /dev/null http://ipv4.download.thinkbroadband.com/1GB.zip &
ping -c 50 8.8.8.8
# With fq_codel, ping RTT should remain low even during download
```

Fair queuing qdiscs are drop-in improvements over simple FIFO queueing. Replacing the current qdisc with `fq_codel` can substantially reduce local queuing latency during congestion, while CAKE is typically most effective when you set a bandwidth limit on the bottleneck link.
