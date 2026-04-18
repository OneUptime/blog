# How to Tune TCP Receive Window Size on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Performance, Receive Window, Kernel Tuning, Networking

Description: Tune Linux kernel TCP receive window parameters to maximize throughput for high-bandwidth or high-latency network connections.

## Introduction

Linux automatically adjusts TCP receive window sizes within configured bounds. For most local network connections, the defaults are adequate. For high-bandwidth (>100 Mbps) or high-latency (>50ms RTT) connections, the default maximum buffer size may limit throughput. This guide explains how to tune these parameters correctly.

## Understanding the tcp_rmem Parameters

```bash
# tcp_rmem has three values: min default max

sysctl net.ipv4.tcp_rmem
# 4096  131072  6291456
# ^min  ^default ^max
# min: minimum receive buffer per socket (4KB)
# default: initial receive buffer per socket (128KB)
# max: maximum receive buffer per socket (6MB)
```

The kernel auto-tunes between default and max based on available memory and connection needs.

## Calculating the Right Buffer Size

```bash
# Formula: buffer = bandwidth × RTT (bandwidth-delay product)

# For a 10 Gbps link with 10ms RTT:
# BDP = 10,000,000,000 / 8 × 0.010 = 12.5 MB
# Set max buffer to at least 12.5 MB

# For a 1 Gbps link with 100ms RTT:
# BDP = 125,000,000 × 0.100 = 12.5 MB
# Same result - buffer is determined by bandwidth × RTT, not bandwidth alone
```

## Applying the Tuning

```bash
# Increase max TCP receive buffer
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
# min=4KB, default=85KB, max=16MB

# Also increase the kernel socket receive buffer maximum
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.rmem_default=87380

# Verify auto-tuning is enabled (should be 1 by default)
sysctl net.ipv4.tcp_moderate_rcvbuf   # Should be 1
sysctl net.ipv4.tcp_window_scaling    # Should be 1

# Persist all changes
cat >> /etc/sysctl.conf << EOF
net.ipv4.tcp_rmem=4096 87380 16777216
net.core.rmem_max=16777216
net.core.rmem_default=87380
net.ipv4.tcp_window_scaling=1
net.ipv4.tcp_moderate_rcvbuf=1
EOF
sysctl -p
```

## Testing the Impact

```bash
# Baseline test before tuning
iperf3 -c 10.20.0.5 -t 30

# Apply tuning above

# Post-tuning test
iperf3 -c 10.20.0.5 -t 30

# Compare throughput, retransmits, and sender/receiver window sizes
```

## Monitoring Window Size During Transfers

```bash
# Watch the receive window size that Linux advertises
ss -tin state established | grep -i "rcv_space"
# rcv_space:524288  <- kernel allocated 512KB of receive buffer

# Check what window size is actually advertised to the remote
tcpdump -i eth0 -n -v 'tcp and dst 10.20.0.5 and port 8080' | grep "win "
# win 29312 = raw 16-bit TCP header value (multiply by 2^wscale for actual bytes)
```

## Per-Application Buffer Override

```python
# Set receive buffer for a specific socket (overrides kernel default)
import socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Set receive buffer to 4MB for this connection
s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)

# Verify what was actually set (OS may cap at rmem_max/2)
actual = s.getsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF)
print(f"Actual receive buffer: {actual/1024:.0f} KB")
```

## Conclusion

TCP receive window tuning is most impactful on high-latency links where the bandwidth-delay product exceeds the default 128KB buffer. Start by calculating BDP, then set max buffer to 2-4× BDP to give the auto-tuner room to work. Always test before and after with iperf3 to confirm improvement. For most LAN connections with <20ms RTT, the defaults are already adequate.
