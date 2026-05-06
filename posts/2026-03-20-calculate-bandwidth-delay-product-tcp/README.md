# How to Calculate the Bandwidth Delay Product (BDP) for TCP Tuning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, BDP, Performance, Network Tuning, Sysctl, Bandwidth

Description: Learn how to calculate the Bandwidth Delay Product (BDP) for any network path and use it to correctly size TCP socket buffers for maximum throughput.

## What Is the Bandwidth Delay Product?

The Bandwidth Delay Product (BDP) is the amount of data that can be "in flight" on a network path at any given time - the product of bandwidth and round-trip time:

```text
BDP = Bandwidth (bits/sec) × Round-Trip Time (seconds)
```

To fully utilize a path, a TCP flow needs roughly this much unacknowledged data in flight. If the effective TCP window is smaller than the BDP, the flow cannot keep the pipe full and throughput is capped below link capacity.

## Step 1: Measure Round-Trip Time

```bash
# Measure RTT to a target host

ping -c 20 192.168.1.100
# Output:
# rtt min/avg/max/mdev = 0.312/0.441/0.612/0.087 ms

# Use the average RTT for BDP calculation
# Here: 0.441 ms = 0.000441 seconds

# For WAN paths, use a longer ping to get stable average
ping -c 100 8.8.8.8
# rtt min/avg/max/mdev = 12.4/14.2/18.9/1.2 ms
```

## Step 2: Calculate BDP

```text
BDP = Bandwidth × RTT

Examples:

1 Gbps LAN, 0.5ms RTT:
BDP = 1,000,000,000 bits/sec × 0.0005 sec = 500,000 bits = 62,500 bytes ≈ 61 KiB

10 Gbps LAN, 0.1ms RTT:
BDP = 10,000,000,000 × 0.0001 = 1,000,000 bits = 125,000 bytes ≈ 122 KiB

1 Gbps WAN, 50ms RTT:
BDP = 1,000,000,000 × 0.050 = 50,000,000 bits = 6,250,000 bytes ≈ 5.96 MiB

10 Gbps WAN, 100ms RTT:
BDP = 10,000,000,000 × 0.100 = 1,000,000,000 bits = 125,000,000 bytes ≈ 119 MiB
```

A quick bash calculator:

```bash
# BDP calculator (in bytes)
bandwidth_gbps=10
rtt_ms=50
bdp_bytes=$(echo "scale=0; $bandwidth_gbps * 1000000000 * $rtt_ms / 1000 / 8" | bc)
echo "BDP = $bdp_bytes bytes = $(echo "scale=2; $bdp_bytes / 1048576" | bc) MiB"
# BDP = 62500000 bytes = 59.60 MiB
```

## Step 3: Determine Required Buffer Size

Set TCP buffers to at least the BDP. On Linux, using about **2× BDP** as a practical max buffer target gives autotuning and protocol overhead some headroom:

```text
Practical target buffer = 2 × BDP

For 10 Gbps WAN, 100ms RTT:
BDP = 119 MiB
Practical target buffer = 238 MiB
```

A 2× target combines:
- One BDP of payload data in flight on the path
- Extra headroom because Linux socket buffer limits are larger than the effective TCP window
- Extra headroom for jitter and burstiness during autotuning

## Step 4: Set TCP Buffers to Match BDP

```bash
# Example: 10 Gbps link with 50ms RTT
# BDP ~= 59.60 MiB, practical target ~= 119.20 MiB
# Set a 256 MiB ceiling so autotuning has room above the target window

sudo sysctl -w net.core.rmem_max=268435456      # 256 MiB
sudo sysctl -w net.core.wmem_max=268435456
sudo sysctl -w net.ipv4.tcp_rmem="4096 1048576 268435456"
sudo sysctl -w net.ipv4.tcp_wmem="4096 1048576 268435456"
```

## Step 5: Verify TCP Is Using the Full Window

After tuning, verify that TCP is actually using large windows:

```bash
# Check active connection window scaling and socket buffer usage
ss -timn | grep -E "wscale|rcv_space|skmem"

# Look for "wscale:" to confirm window scaling is in use.
# "rcv_space:" shows the receive autotuning target, and
# "skmem:(... rb..., tb...)" shows the current receive/send buffer limits.
```

Run an iperf3 test and compare before/after:

```bash
# Before tuning (default buffers)
iperf3 -c server-ip -t 30

# After setting BDP-sized buffers
iperf3 -c server-ip -t 30
# Throughput should increase significantly on high-BDP paths
```

## Step 6: BDP for Common Network Scenarios

| Link | RTT | BDP | Required Buffer |
|---|---|---|---|
| 1G LAN | 0.5 ms | 61 KiB | 1 MiB |
| 10G LAN | 0.1 ms | 122 KiB | 1 MiB |
| 1G WAN (regional) | 20 ms | 2.38 MiB | 8 MiB |
| 1G WAN (cross-country) | 80 ms | 9.54 MiB | 32 MiB |
| 10G WAN (cross-country) | 80 ms | 95.4 MiB | 256 MiB |
| 1G Satellite | 600 ms | 71.5 MiB | 256 MiB |

## Conclusion

The BDP calculation - bandwidth multiplied by RTT - tells you roughly how much unacknowledged data a TCP flow needs in flight to fill a network pipe. Use `ping` to measure RTT, multiply by your link bandwidth, size your TCP send/receive limits above the BDP, and on Linux use about `2× BDP` as a practical starting ceiling for `net.ipv4.tcp_rmem` and `tcp_wmem` max values. For LAN connections the default buffers are usually adequate; for high-latency WAN links, buffer sizing is one of the most impactful TCP tuning changes you can make.
