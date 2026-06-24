# How to Enable TCP BBR Congestion Control on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, BBR, Congestion Control, Linux, Performance, Sysctl

Description: Learn how to enable Google's BBR TCP congestion control algorithm on Linux to improve throughput and reduce latency, especially on high-bandwidth connections.

## What Is TCP BBR?

BBR (Bottleneck Bandwidth and Round-trip propagation time) is a congestion control algorithm developed by Google. Unlike traditional algorithms (CUBIC, Reno) that react to packet loss, BBR models the network's current bandwidth and round-trip time to determine the optimal sending rate. This results in:

- Higher throughput on high-BDP (bandwidth-delay product) links
- Lower latency and buffer bloat
- Better performance on lossy networks (cellular, satellite)
- Faster ramp-up to full bandwidth

## Requirements

- Linux kernel 4.9+ with BBR support
- Kernel must be compiled with `CONFIG_TCP_CONG_BBR=m` or `=y`

## Step 1: Check Kernel Version and BBR Support

```bash
# Check kernel version

uname -r

# Check available congestion control algorithms
sysctl net.ipv4.tcp_available_congestion_control

# If bbr is not listed above, it may not be loaded yet
ls /lib/modules/$(uname -r)/kernel/net/ipv4/tcp_bbr.ko* 2>/dev/null && \
  echo "tcp_bbr is available as a module" || \
  echo "tcp_bbr may be built in or unavailable; verify your kernel config"
```

## Step 2: Enable BBR

```bash
# If bbr was not listed earlier and your distro ships it as a module, load it
sudo modprobe tcp_bbr

# Verify bbr is now available
sysctl net.ipv4.tcp_available_congestion_control

# Set the queuing discipline to fq on the egress interface used by the traffic
sudo tc qdisc replace dev eth0 root fq

# Set fq as the default qdisc for newly created interfaces / after reboot
sudo sysctl -w net.core.default_qdisc=fq

# Set BBR as the active congestion control algorithm
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Verify BBR is active
sysctl net.ipv4.tcp_congestion_control
# Expected: net.ipv4.tcp_congestion_control = bbr
```

## Step 3: Make BBR Persistent

```bash
sudo tee /etc/sysctl.d/99-bbr.conf > /dev/null << 'EOF'
# Enable BBR congestion control
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF

# Apply immediately
sudo sysctl -p /etc/sysctl.d/99-bbr.conf

# If BBR is built as a module, load it at boot
echo "tcp_bbr" | sudo tee /etc/modules-load.d/bbr.conf > /dev/null
```

## Step 4: Verify BBR Is Working

```bash
# Check active congestion control
sysctl net.ipv4.tcp_congestion_control

# Verify on active connections using ss
ss -tin | grep bbr

# Or check a specific connection
ss -tin dst example.com | grep "bbr"
# Look for "bbr" and, on newer iproute2 builds, "bbr:(...)" in the output
```

## Step 5: Benchmark BBR vs CUBIC

Test throughput with both algorithms:

```bash
# Test with CUBIC (default)
sudo sysctl -w net.ipv4.tcp_congestion_control=cubic
iperf3 -c server-ip -t 30 -R   # Download test
# Note the throughput

# Test with BBR
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
iperf3 -c server-ip -t 30 -R
# Note the throughput and latency difference

# BBR improvements are most noticeable on:
# - Links with higher RTTs
# - Links with some packet loss
# - High-bandwidth, high-delay paths
```

## Step 6: Monitor BBR in Action

Use `ss` to monitor congestion control state on active connections:

```bash
# Show TCP connection details including congestion algorithm
watch -n 1 "ss -tin | grep -A2 bbr | head -40"

# Key BBR fields in ss output:
# bbr:(bw:xxxbps,mrtt:xxx,pacing_gain:xxx,cwnd_gain:xxx)
# bw = estimated bottleneck bandwidth
# mrtt = minimum RTT observed (milliseconds)
# pacing_gain = current pacing gain factor
# cwnd_gain = current congestion-window gain factor
```

## Step 7: Per-Socket BBR with Application Control

Applications can select their own congestion control:

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
# Request BBR for this specific socket
sock.setsockopt(socket.SOL_TCP, socket.TCP_CONGESTION, b'bbr')
```

## BBR vs CUBIC Comparison

| Scenario | CUBIC | BBR |
|---|---|---|
| Local LAN (<1ms RTT) | Similar | Similar |
| WAN (50-100ms RTT) | Good | Better |
| Cross-continental (>100ms) | Good | Often better |
| Lossy wireless | Degrades | Resilient |
| Shared bottleneck fairness | High | Moderate |

## Conclusion

Enabling TCP BBR on Linux means selecting `bbr` as the TCP congestion control algorithm and using the `fq` qdisc for pacing. Set `net.core.default_qdisc=fq` alongside `net.ipv4.tcp_congestion_control=bbr`, persist both in `/etc/sysctl.d/`, and load the `tcp_bbr` module at boot if your kernel builds it as a module. BBR provides the greatest benefit on WAN connections and links with occasional packet loss.
