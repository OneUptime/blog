# How to Fix Slow TCP Transfers Caused by Small Window Sizes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Performance, Window Size, Tuning, Networking

Description: Diagnose and fix slow TCP transfer speeds caused by small window sizes by tuning kernel buffer parameters and application socket settings.

## Introduction

If TCP transfers are slower than the available bandwidth should allow, a small window size is often the culprit. The effective TCP window is a fundamental bottleneck on high-latency connections: throughput is roughly window / RTT. Diagnosing small windows and increasing buffer sizes is often the easiest way to dramatically improve TCP performance without any hardware changes.

## Diagnosing Small Window as the Bottleneck

```bash
# Step 1: Measure actual throughput

iperf3 -c 10.20.0.5 -t 30
# Suppose result: 45 Mbps

# Step 2: Measure RTT
ping -c 10 10.20.0.5
# Approximate RTT: 82ms

# Step 3: Calculate theoretical maximum
# With 128KB window and 82ms RTT:
# Max = 131072 / 0.082 = 1,598,439 bytes/sec = 12.8 Mbps
# But we're getting 45 Mbps... so window isn't the bottleneck here

# With 1MB window and 82ms RTT:
# Max = 1,048,576 / 0.082 = 12,787,512 bytes/sec = 102 Mbps
# If iperf shows 45 Mbps but max is 102 Mbps: something else is probably limiting throughput

# Verify: inspect the TCP socket during the transfer
ss -tim state established
# Look for skmem:(...rb...,tb...), rtt:, cwnd:, and snd_wnd: on the iperf3 connection
```

## Step 1: Check Current Buffer Configuration

```bash
# Current TCP buffer settings
sysctl net.ipv4.tcp_rmem   # receive buffer: min/default/max
sysctl net.ipv4.tcp_wmem   # send buffer: min/default/max
sysctl net.core.rmem_max   # system max receive buffer
sysctl net.core.wmem_max   # system max send buffer

# For a 100ms RTT, 100 Mbps connection:
# Required window = 100,000,000 / 8 × 0.1 = 1.25 MB
# Compare that to your current tcp_rmem/tcp_wmem values.
# With auto-tuning enabled, Linux starts from the configured default values and can grow toward the configured max values
```

## Step 2: Increase Buffer Sizes

```bash
# Set larger buffers - values are in bytes
sysctl -w net.ipv4.tcp_rmem="4096 262144 16777216"
#                             min   default  max
# default 256KB starts larger, max 16MB gives auto-tuning more headroom

sysctl -w net.ipv4.tcp_wmem="4096 262144 16777216"
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216

# Persist the changes
cat >> /etc/sysctl.conf << EOF
net.ipv4.tcp_rmem=4096 262144 16777216
net.ipv4.tcp_wmem=4096 262144 16777216
net.core.rmem_max=16777216
net.core.wmem_max=16777216
EOF
sysctl -p
```

## Step 3: Verify Auto-Tuning is Active

```bash
# Receive-buffer auto-tuning and large TCP windows depend on these being enabled
sysctl net.ipv4.tcp_moderate_rcvbuf   # Should be 1
sysctl net.ipv4.tcp_window_scaling    # Should be 1

# Enable if not set
sysctl -w net.ipv4.tcp_moderate_rcvbuf=1
sysctl -w net.ipv4.tcp_window_scaling=1
```

## Step 4: Re-Test Throughput

```bash
# Test again after tuning
iperf3 -c 10.20.0.5 -t 30

# Also test with specific buffer size override
iperf3 -c 10.20.0.5 -t 30 -w 4M   # Request 4 MiB socket buffers on both ends

# If -w 4M version is faster than default: buffer sizing was likely the bottleneck
# If same speed: something else is limiting (congestion, CPU, NIC)
```

## Application-Level Buffer Setting

```bash
# For specific high-throughput applications, set SO_RCVBUF directly
python3 -c "
import socket
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4*1024*1024)  # Request 4 MiB
actual = s.getsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF)
# Linux returns the doubled value for bookkeeping overhead
print(f'Receive buffer set to: {actual/1024:.0f} KB')
"
```

## Conclusion

Small window sizes silently limit TCP throughput on high-latency connections. The diagnostic path is: measure actual throughput, calculate the theoretical maximum from the effective window and RTT, and if actual throughput is close to that ceiling, increase buffer sizes. After tuning, re-run iperf3 to confirm improvement. On Linux, raising `tcp_rmem`/`tcp_wmem` and the corresponding `net.core` limits can remove this bottleneck when the current defaults are too small.
