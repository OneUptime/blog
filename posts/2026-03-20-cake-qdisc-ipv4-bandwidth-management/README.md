# How to Configure CAKE qdisc for IPv4 Bandwidth Management on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CAKE, tc, IPv4, Linux, QoS, Bandwidth

Description: Use the CAKE (Common Applications Kept Enhanced) qdisc to manage IPv4 bandwidth with built-in fair queuing, rate shaping, and active queue management in a single command.

CAKE is a modern Linux qdisc that combines bandwidth limiting, fair queuing, and AQM (Active Queue Management) in one unified algorithm. It's designed to be simpler to configure than HTB+fq_codel while achieving superior results.

## Installing CAKE

```bash
# CAKE is available in upstream Linux kernels starting with 4.19.
# Make sure your tc binary comes from an iproute2 build with CAKE support.

# Check if available
tc qdisc add dev lo root cake help 2>&1 | head -3

# On Ubuntu 20.04+, CAKE is included in the kernel
# Ensure iproute2 is up to date
sudo apt install iproute2 -y
```

## Basic CAKE Configuration

```bash
# Apply CAKE with a bandwidth limit on a WAN interface
# Set slightly below your ISP's speed to avoid upstream bufferbloat
sudo tc qdisc replace dev eth0 root cake bandwidth 95mbit

# For asymmetric connections (common with cable/DSL):
# Apply separate rates for upload
sudo tc qdisc replace dev eth0 root cake bandwidth 20mbit  # Upload
# Use IFB for download shaping
```

## CAKE Parameters Explained

```bash
# Link rate: 95% of ISP's rated speed
# diffserv4: Use 4-tier DSCP prioritization
# dual-srchost: Fair sharing per source host
# nat: Look up internal hosts through NAT before host isolation
# wash: Clear extra DiffServ bits after priority queuing
# split-gso: Split large GSO packets for fairer scheduling
# rtt 100ms: Typical internet round-trip time
sudo tc qdisc replace dev eth0 root cake \
  bandwidth 95mbit \
  diffserv4 \
  dual-srchost \
  nat \
  wash \
  split-gso \
  rtt 100ms
```

## CAKE Tin Configuration (Traffic Priority)

CAKE organizes traffic into "tins" based on DSCP or other criteria:

```bash
# diffserv3: 3 tins (Bulk, Best Effort, Voice)
sudo tc qdisc replace dev eth0 root cake bandwidth 95mbit diffserv3

# diffserv4: 4 tins (Bulk, Best Effort, Video, Voice)
sudo tc qdisc replace dev eth0 root cake bandwidth 95mbit diffserv4

# precedence: 8 tins mapped to legacy IP precedence bits
sudo tc qdisc replace dev eth0 root cake bandwidth 95mbit precedence
```

## Bidirectional Setup with IFB

```bash
# Create and bring up an IFB for download shaping
sudo ip link add ifb0 type ifb
sudo ip link set ifb0 up

# Redirect download traffic to IFB
sudo tc qdisc add dev eth0 ingress
sudo tc filter add dev eth0 parent ffff: protocol ip u32 match u32 0 0 \
  action mirred egress redirect dev ifb0

# CAKE on IFB for download (e.g., 100 Mbps cable download)
sudo tc qdisc add dev ifb0 root cake bandwidth 95mbit diffserv4 dual-dsthost nat ingress

# CAKE on eth0 for upload (e.g., 10 Mbps upload)
sudo tc qdisc replace dev eth0 root cake bandwidth 9mbit diffserv4 dual-srchost
```

## Monitoring CAKE Statistics

```bash
# View detailed CAKE statistics including per-tin info
sudo tc -s qdisc show dev eth0

# CAKE output includes per-tin counters and latency stats for the active preset
```

## Recommended Settings for Home Router

```bash
# Typical home gateway CAKE setup (replace speeds and framing keywords with your ISP values)
# Upload
sudo tc qdisc replace dev pppoe0 root cake \
  bandwidth 9500kbit pppoe-vcmux diffserv4 dual-srchost nat

# Download (on IFB)
sudo tc qdisc replace dev ifb0 root cake \
  bandwidth 95mbit pppoe-vcmux diffserv4 dual-dsthost nat wash ingress
```

CAKE's single-command configuration makes it far easier to deploy than multi-layer HTB+fq_codel setups, while consistently delivering better performance in tests.
