# How to Optimize TCP Window Size for Long-Distance Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Performance, Long Distance, WAN, Optimization

Description: Optimize TCP window sizes and related parameters for high-latency long-distance links where the bandwidth-delay product is large and default settings severely limit throughput.

## Introduction

Long-distance links introduce high latency that makes TCP's default settings severely limiting. A transcontinental link with 150ms RTT and a 128KB default window allows only about 7 Mbps - far below the available gigabit bandwidth. Optimizing TCP for long-distance requires understanding the bandwidth-delay product and tuning buffers accordingly.

## Measuring Your Long-Distance BDP

```bash
# Measure RTT to your remote endpoint

ping -c 20 remote-server.example.com
# rtt avg: 150ms

# Calculate BDP for a 1 Gbps link
# BDP = 125,000,000 bytes/sec × 0.150 sec = 18,750,000 bytes = 18 MB
# You need at least 18 MB of buffer for full line-rate at 150ms RTT

# Current theoretical maximum with 128KB default:
# Max = 131,072 / 0.150 = 873,813 bytes/sec = 7 Mbps
```

## Configuring Buffers for Long-Distance

```bash
# For a 1 Gbps, 150ms RTT link (BDP = 18MB):
sysctl -w net.ipv4.tcp_rmem="4096 262144 33554432"   # max = 32MB (>2× BDP)
sysctl -w net.ipv4.tcp_wmem="4096 262144 33554432"
sysctl -w net.core.rmem_max=33554432
sysctl -w net.core.wmem_max=33554432

# Enable all features needed for high BDP connections
sysctl -w net.ipv4.tcp_window_scaling=1
sysctl -w net.ipv4.tcp_timestamps=1   # Required for PAWS (Protection Against Wrapped Sequences) with large windows
sysctl -w net.ipv4.tcp_sack=1         # SACK for efficient loss recovery on lossy links

# Persist
cat >> /etc/sysctl.conf << EOF
net.ipv4.tcp_rmem=4096 262144 33554432
net.ipv4.tcp_wmem=4096 262144 33554432
net.core.rmem_max=33554432
net.core.wmem_max=33554432
net.ipv4.tcp_window_scaling=1
net.ipv4.tcp_timestamps=1
net.ipv4.tcp_sack=1
EOF
```

## Choosing the Right Congestion Control

```bash
# BBR is particularly effective for long-distance links:
# - Doesn't rely on packet loss signals to control rate
# - Maintains high throughput even with some loss
# - Better on paths with large bandwidth-delay products

sysctl -w net.ipv4.tcp_congestion_control=bbr
sysctl net.ipv4.tcp_available_congestion_control  # Verify BBR is available

# CUBIC is the default - adequate for most scenarios
# BBR: better for satellite/long-haul, high-loss environments
```

## Testing Long-Distance Throughput

```bash
# Install iperf3 on both endpoints
# On remote server:
iperf3 -s

# On local client: test with larger window
iperf3 -c remote-server -t 30 -w 16M   # Force 16MB window
iperf3 -c remote-server -t 30          # Test with auto-tuned window

# Compare results - if forced window gives more throughput:
# Auto-tuning isn't reaching the required size, increase tcp_rmem max
```

## Using Parallel Streams for Long-Distance

```bash
# Multiple parallel TCP streams can help saturate high-BDP links
# Each stream starts its own slow-start independently
iperf3 -c remote-server -t 60 -P 10   # 10 parallel streams

# When parallel streams outperform single stream:
# Single TCP stream can't ramp up fast enough (slow-start limitation)
# BBR helps single-stream performance significantly
```

## Conclusion

Long-distance TCP optimization comes down to two things: ensure buffers are at least equal to the bandwidth-delay product, and choose BBR as the congestion control algorithm. With 150ms RTT and gigabit bandwidth, you need ~18MB of buffer. Without proper tuning, you'll achieve a small fraction of available capacity regardless of bandwidth. Apply the tuning on both endpoints for maximum effect.
