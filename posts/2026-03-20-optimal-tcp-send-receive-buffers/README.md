# How to Set Optimal TCP Send and Receive Buffer Sizes on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Performance, Buffer Sizes, Kernel Tuning, Networking

Description: Determine and set the optimal TCP send and receive buffer sizes on Linux for your specific network characteristics, balancing throughput and memory efficiency.

## Introduction

Setting optimal TCP buffer sizes requires knowing your network's bandwidth-delay product. Too small and you leave throughput on the table. Too large and you waste memory per connection and potentially introduce bufferbloat. This guide provides a formula-based approach to calculating and applying the right values.

## Finding Your Network Characteristics

```bash
# Step 1: Measure available bandwidth (bits per second)

iperf3 -c 10.20.0.5 -t 10   # Check sender bitrate

# Step 2: Measure RTT to key destinations
ping -c 20 10.20.0.5          # Local data center: expect 1-10ms
ping -c 20 remote.example.com  # Remote/internet: expect 10-200ms

# Step 3: Calculate BDP (Bandwidth-Delay Product)
# BDP = (bandwidth_bits_per_sec / 8) × rtt_seconds

# Example: 1 Gbps, 10ms RTT
# BDP = 125,000,000 × 0.010 = 1,250,000 bytes = 1.25 MB
```

## Calculating Optimal Buffer Size

```python
def optimal_buffer(bandwidth_gbps, rtt_ms, margin=2.0):
    """
    Calculate optimal TCP buffer size.

    margin: multiplier above BDP (2x = headroom for variance)
    """
    bandwidth_bytes = (bandwidth_gbps * 1e9) / 8
    rtt_sec = rtt_ms / 1000
    bdp = bandwidth_bytes * rtt_sec
    optimal = bdp * margin

    print(f"Network: {bandwidth_gbps} Gbps, {rtt_ms}ms RTT")
    print(f"BDP: {bdp/1024/1024:.1f} MB")
    print(f"Recommended buffer (2×BDP): {optimal/1024/1024:.1f} MB")
    print(f"Rounded up: {int(optimal/1024/1024 + 0.5)*1024*1024} bytes")
    return int(optimal)

# Examples:
optimal_buffer(1, 10)   # 1 Gbps, 10ms → 2.5 MB
optimal_buffer(1, 100)  # 1 Gbps, 100ms → 25 MB
optimal_buffer(10, 5)   # 10 Gbps, 5ms → 12.5 MB
```

## Applying the Configuration

```bash
# Set calculated buffer sizes
# Replace 8388608 (8MB) with your calculated optimal value

OPTIMAL_BUFFER=8388608  # Replace with your calculated value

sysctl -w net.ipv4.tcp_rmem="4096 262144 $OPTIMAL_BUFFER"
sysctl -w net.ipv4.tcp_wmem="4096 262144 $OPTIMAL_BUFFER"
sysctl -w net.core.rmem_max=$OPTIMAL_BUFFER
sysctl -w net.core.wmem_max=$OPTIMAL_BUFFER

# Persist
cat > /etc/sysctl.d/50-tcp-buffers.conf << EOF
net.ipv4.tcp_rmem=4096 262144 $OPTIMAL_BUFFER
net.ipv4.tcp_wmem=4096 262144 $OPTIMAL_BUFFER
net.core.rmem_max=$OPTIMAL_BUFFER
net.core.wmem_max=$OPTIMAL_BUFFER
net.ipv4.tcp_window_scaling=1
net.ipv4.tcp_moderate_rcvbuf=1
EOF
sysctl -p /etc/sysctl.d/50-tcp-buffers.conf
```

## Memory Impact Assessment

```bash
# Each TCP connection uses up to (send_buffer + receive_buffer) memory
# With 8MB buffers: 16 MB per connection (worst case with auto-tuning)
# Linux auto-tunes and doesn't allocate max unless needed

# Check current actual socket memory usage
cat /proc/net/sockstat
# TCP: inuse 1234 orphan 5 tw 100 alloc 1239 mem 12345
# mem = pages in use for socket buffers

# Calculate memory used (multiply pages by 4096 for bytes)
MEM_PAGES=$(cat /proc/net/sockstat | awk '/^TCP:/{print $11}')
echo "TCP buffer memory: $((MEM_PAGES * 4096 / 1024 / 1024)) MB"
```

## Validating the Settings

```bash
# Test throughput improvement
iperf3 -c 10.20.0.5 -t 30

# Monitor actual window sizes during transfer
ss -tin state established | grep rcv_space
# Should show values approaching your max buffer

# Check for bufferbloat (latency should not spike during transfer)
ping -c 30 -i 1 10.20.0.5 &
iperf3 -c 10.20.0.5 -t 30
# If ping RTT increases >3x during iperf: consider BBR or smaller buffers
```

## Conclusion

Optimal TCP buffer sizing is a calculation based on your network's bandwidth-delay product. Set both send and receive buffers to at least 2× BDP. Linux's auto-tuning handles the rest - it allocates memory dynamically up to the maximum you configure. The minimum field stays small to avoid excessive allocation for short-lived or low-traffic connections, while the maximum allows full-speed bulk transfers.
