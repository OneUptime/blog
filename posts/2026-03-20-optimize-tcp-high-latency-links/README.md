# How to Optimize TCP Performance Over High-Latency Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Performance, High Latency, WAN, Optimization, Linux

Description: Apply a comprehensive set of TCP optimizations for high-latency links including buffer sizing, BBR, window scaling, and application-level connection pooling.

## Introduction

High-latency links (50ms+ RTT) expose every weakness in TCP's default configuration. The bandwidth-delay product is large, requiring large buffers. Slow start takes many RTTs to ramp up. Packet loss causes dramatic CWND reductions. This guide provides a complete optimization checklist for deploying services across high-latency paths.

## Measure Your Baseline

```bash
# Step 1: Measure RTT and available bandwidth

ping -c 20 remote-host     # RTT
iperf3 -c remote-host -t 10  # Bandwidth

# Step 2: Calculate bandwidth-delay product
# Example: 500 Mbps available, 120ms RTT
# BDP = (500,000,000 / 8) × 0.120 = 7,500,000 bytes = 7.5 MB

# Step 3: Note current throughput - we'll compare after optimization
```

## Complete Optimization Script

```bash
#!/bin/bash
# Apply all TCP optimizations for high-latency links

# Calculate BDP-based buffer size (adjust these values for your network)
BANDWIDTH_MBPS=500
RTT_MS=120
BDP_BYTES=$(echo "$BANDWIDTH_MBPS * 125000 * $RTT_MS / 1000" | bc)
BUFFER_SIZE=$((BDP_BYTES * 2))  # 2× BDP for headroom

echo "Calculated BDP: $BDP_BYTES bytes"
echo "Setting max buffer to: $BUFFER_SIZE bytes"

# 1. Set large receive and send buffers
sysctl -w net.ipv4.tcp_rmem="4096 262144 $BUFFER_SIZE"
sysctl -w net.ipv4.tcp_wmem="4096 262144 $BUFFER_SIZE"
sysctl -w net.core.rmem_max=$BUFFER_SIZE
sysctl -w net.core.wmem_max=$BUFFER_SIZE

# 2. Enable window scaling and auto-tuning
sysctl -w net.ipv4.tcp_window_scaling=1
sysctl -w net.ipv4.tcp_moderate_rcvbuf=1

# 3. Enable BBR congestion control (much better on lossy/latency paths)
modprobe tcp_bbr
sysctl -w net.ipv4.tcp_congestion_control=bbr
sysctl -w net.core.default_qdisc=fq

# 4. Enable SACK for efficient loss recovery
sysctl -w net.ipv4.tcp_sack=1
sysctl -w net.ipv4.tcp_dsack=1

# 5. Enable timestamps (required for PAWS with large windows)
sysctl -w net.ipv4.tcp_timestamps=1

# 6. Disable slow start after idle (keep CWND for persistent connections)
sysctl -w net.ipv4.tcp_slow_start_after_idle=0

# 7. Enable ECN for congestion signaling
sysctl -w net.ipv4.tcp_ecn=1

# 8. Increase initial congestion window to skip slow-start on high-RTT paths
ip route change default via $(ip route | awk '/default/{print $3}') initcwnd 20

echo "All optimizations applied"
```

## Application-Level Optimizations

```python
# Use connection pooling to avoid repeated slow-start ramp-ups
import httpx

# Long-lived client with connection reuse
client = httpx.Client(
    http2=True,           # HTTP/2 multiplexes requests on one connection
    timeout=httpx.Timeout(connect=10.0, read=120.0),
    limits=httpx.Limits(
        max_connections=20,
        max_keepalive_connections=10,
        keepalive_expiry=60.0
    )
)

# All requests reuse existing connections
# No slow-start penalty for subsequent requests
```

## Verifying Improvements

```bash
# After applying optimizations:
iperf3 -c remote-host -t 30

# Check that window scaling is active
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' -c 3 2>/dev/null | grep wscale

# Verify BBR is active on connections
ss -tin state established | grep -w bbr | wc -l
```

## Conclusion

High-latency TCP optimization is a checklist: large buffers (≥ 2× BDP), BBR congestion control, window scaling, SACK, timestamps, and disabled slow-start-after-idle. The BDP calculation gives you the exact buffer size needed. Application-level connection pooling and HTTP/2 multiplexing further reduce the slow-start overhead. Together, these changes can increase throughput by 10-50× on transcontinental links compared to default settings.
