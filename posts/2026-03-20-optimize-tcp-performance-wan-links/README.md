# How to Optimize TCP Performance for High-Latency WAN Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, WAN, Performance, Latency, Sysctl, Linux, High-Latency

Description: Learn how to optimize TCP for high-latency WAN links by tuning socket buffers, enabling BBR, adjusting keepalive settings, and using TCP optimization appliances.

## Why WAN TCP Performance Suffers

On high-latency WAN links (>50ms RTT), TCP performance degrades for several reasons:

1. **Small buffers** - Default buffers can't keep the pipe full (BDP constraint)
2. **CUBIC slow start** - Takes many RTTs to ramp up to full speed
3. **Packet loss sensitivity** - CUBIC halves the window on any loss event
4. **Keepalive timeouts** - Connections die prematurely over idle periods

## Step 1: Calculate Your WAN BDP

```bash
# Measure RTT to your WAN destination

ping -c 20 remote-office.example.com
# Assume avg RTT = 80ms for cross-country

# BDP = Bandwidth × RTT
# For 100 Mbps WAN with 80ms RTT:
# BDP = 100,000,000 bits × 0.080 = 8,000,000 bits = 1,000,000 bytes = 1 MB
# Required buffer = 2 × 1 MB = 2 MB minimum (set to 64 MB for headroom)
```

## Step 2: Apply WAN-Optimized TCP Settings

```bash
cat > /etc/sysctl.d/99-tcp-wan.conf << 'EOF'
# Large socket buffers for high-BDP WAN paths
net.core.rmem_max = 134217728          # 128 MB
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 1048576 134217728
net.ipv4.tcp_wmem = 4096 1048576 134217728

# BBR congestion control (performs much better than CUBIC on WAN)
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Enable window scaling
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1

# Disable cwnd reset after idle - preserves the grown congestion window so
# bursty WAN traffic does not have to slow-start back up after every idle gap
net.ipv4.tcp_slow_start_after_idle = 0

# More aggressive keepalive (defaults: 7200s / 75s / 9) so dead WAN connections
# and NAT/firewall idle-timeouts are detected faster
net.ipv4.tcp_keepalive_time = 300       # Start probing after 5 min idle
net.ipv4.tcp_keepalive_intvl = 30       # Probe every 30 seconds
net.ipv4.tcp_keepalive_probes = 10      # Drop after 10 failed probes
EOF

sudo sysctl -p /etc/sysctl.d/99-tcp-wan.conf
```

## Step 3: Disable Slow Start After Idle

When a TCP connection is idle, the congestion window resets. This causes throughput to drop every time there's a gap in traffic. Disable this for WAN applications:

```bash
# Disable slow start after idle
sudo sysctl -w net.ipv4.tcp_slow_start_after_idle=0

# Verify
sysctl net.ipv4.tcp_slow_start_after_idle
# net.ipv4.tcp_slow_start_after_idle = 0
```

## Step 4: Enable TCP Thin Streams Mode

For interactive WAN applications (SSH, Telnet, database queries) with low data rates, TCP thin streams mode reduces retransmission delays:

```bash
# Enable linear timeouts for thin streams (<4 packets in flight)
sudo sysctl -w net.ipv4.tcp_thin_linear_timeouts=1

# Uses linear (not exponential) timeouts for thin streams,
# reducing latency for interactive applications over lossy WAN.
# Note: net.ipv4.tcp_thin_dupack was removed in Linux 4.11 once
# RACK loss detection was enabled by default, so it is no longer
# needed (and not available) on modern kernels.
```

## Step 5: Tune TCP Retransmission Behavior

```bash
cat >> /etc/sysctl.d/99-tcp-wan.conf << 'EOF'
# Reduce initial retransmit timeout for faster connection failure detection
net.ipv4.tcp_syn_retries = 4        # Default 6 (each doubles the timeout)
net.ipv4.tcp_synack_retries = 3     # Server SYN-ACK retries

# Retransmission timeout limits
net.ipv4.tcp_retries1 = 3           # Attempts before informing network layer
net.ipv4.tcp_retries2 = 8           # Attempts before giving up on connection
EOF

sudo sysctl -p /etc/sysctl.d/99-tcp-wan.conf
```

## Step 6: Test WAN Performance

```bash
# Simulate WAN latency on loopback for testing
sudo tc qdisc add dev lo root netem delay 80ms loss 0.1%

# Test with single stream (CUBIC vs BBR comparison)
sudo sysctl -w net.ipv4.tcp_congestion_control=cubic
iperf3 -c 127.0.0.1 -t 30
echo "CUBIC throughput above"

sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
iperf3 -c 127.0.0.1 -t 30
echo "BBR throughput above"

# Clean up
sudo tc qdisc del dev lo root netem
```

## Conclusion

WAN TCP optimization requires matching buffer sizes to the Bandwidth-Delay Product, switching to BBR congestion control, disabling slow start after idle, and tuning keepalive for long-lived connections. BBR typically delivers 2-5× better throughput than CUBIC on lossy WAN links. Combine with window scaling enabled and SACK for maximum resilience against packet loss on intercontinental connections.
