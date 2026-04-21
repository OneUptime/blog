# How to Understand TCP Window Size and Its Impact on Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Window Size, Throughput, Performance, Linux

Description: Understand how the TCP receive window limits maximum throughput, the relationship between window size and RTT, and how window scaling overcomes the 65KB limitation.

## Introduction

The TCP receive window size is the amount of data the receiver advertises that it is willing to accept. This can cap maximum throughput: a small window on a high-latency link creates a "bandwidth-delay product" bottleneck. Understanding this relationship is key to optimizing TCP for high-throughput or high-latency networks.

## The Bandwidth-Delay Product (BDP)

```text
Window-limited Throughput = Window Size / RTT

Examples:
- Window: 65KB, RTT: 10ms → Max: 65,000 / 0.010 = 6.5 MB/s = 52 Mbps
- Window: 65KB, RTT: 100ms → Max: 65,000 / 0.100 = 650 KB/s = 5.2 Mbps
- Window: 1MB,  RTT: 100ms → Max: 1,000,000 / 0.100 = 10 MB/s = 80 Mbps
```

## Observing Window Size

```bash
# Show TCP window-related fields for active connections

ss -tin state established | grep "rcv_space\|snd_wnd"

# Alternative: watch window size in tcpdump
tcpdump -i eth0 -n -v 'tcp' | grep "win "
# Example: IP 10.20.0.5.80 > 192.168.1.10.52341: Flags [.], win 29312

# The "win" value is the raw 16-bit ADVERTISED receive window field
# Without window scaling: effective max is 65535 bytes
# With window scaling: effective window = win × 2^(negotiated scale factor)
```

## The 65KB Original Limit and Window Scaling

```bash
# TCP header's window field is only 16 bits → max 65535 bytes (64KB)
# For a 100ms RTT link: 65535 / 0.100 = 655 KB/s max (terrible for broadband!)

# Window Scaling (originally RFC 1323, now RFC 7323) extends this:
# Effective window = Window field × 2^(scale factor)
# Scale factor up to 14 → max window = 64KB × 2^14 = 1 GiB

# Check if window scaling is negotiated in the handshake
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0'
# Look for: options [... wscale 7] in SYN packets
# wscale 7 means multiply that side's later advertised windows by 2^7 = 128
# Window fields in SYN/SYN-ACK packets themselves are not scaled
```

## Current Linux Window Size Settings

```bash
# View kernel TCP buffer settings
sysctl net.ipv4.tcp_rmem
# Example: "4096 131072 6291456" = min/default/max receive buffer
# Values vary by kernel, distro, and RAM size
# Default receive buffer = 131072 bytes (128KB)

sysctl net.ipv4.tcp_wmem
# Send buffer sizes

# Check auto-tuning is enabled (dynamically adjusts window)
sysctl net.ipv4.tcp_window_scaling   # Should be 1
sysctl net.ipv4.tcp_moderate_rcvbuf  # Should be 1 (enables auto-tuning)
```

## Calculating Required Window Size

```python
def calculate_required_window(bandwidth_mbps, rtt_ms):
    """Calculate the TCP window size needed for full utilization."""
    bandwidth_bytes_per_sec = (bandwidth_mbps * 1_000_000) / 8
    rtt_sec = rtt_ms / 1000
    required_window = bandwidth_bytes_per_sec * rtt_sec
    print(f"Bandwidth: {bandwidth_mbps} Mbps")
    print(f"RTT: {rtt_ms} ms")
    print(f"Required window: {required_window/1024:.1f} KB")
    print(f"Required window: {required_window/(1024*1024):.1f} MB")

# For a 1 Gbps link with 50ms RTT:
calculate_required_window(1000, 50)
# Required window: 6103.5 KB = ~6 MB
```

## Conclusion

Window size can be the performance limiter for TCP over high-latency links. A 64KB window on a 100ms RTT path limits throughput to about 5 Mbps regardless of available bandwidth. Window scaling (enabled by default on Linux) allows effective windows up to 1 GiB, subject to OS buffer limits. The key insight is: window_needed = bandwidth × RTT. If your buffers are smaller than this product, you're leaving bandwidth on the table.
