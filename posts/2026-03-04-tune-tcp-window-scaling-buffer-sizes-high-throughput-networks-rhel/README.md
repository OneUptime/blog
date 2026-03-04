# How to Tune TCP Window Scaling and Buffer Sizes for High-Throughput Networks on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TCP, Networking, Performance Tuning, Buffer Sizes

Description: Tune TCP window scaling and socket buffer sizes on RHEL to maximize throughput on high-bandwidth and high-latency network links.

---

TCP window size limits how much data can be in flight before waiting for an acknowledgment. For high-bandwidth, high-latency links (such as cross-region connections), the default buffer sizes may limit throughput. Tuning these parameters can significantly improve performance.

## Understanding the Bandwidth-Delay Product

```bash
# Calculate the bandwidth-delay product (BDP)
# BDP = bandwidth (bits/sec) * round-trip time (seconds)
# Example: 10 Gbps link with 50ms RTT
# BDP = 10,000,000,000 * 0.050 = 500,000,000 bits = 62.5 MB

# The TCP buffer should be at least as large as the BDP
# to fully utilize the link
```

## Checking Current Settings

```bash
# View current TCP buffer sizes (min, default, max) in bytes
cat /proc/sys/net/core/rmem_max      # max receive buffer
cat /proc/sys/net/core/wmem_max      # max send buffer
cat /proc/sys/net/ipv4/tcp_rmem      # TCP receive buffer (min default max)
cat /proc/sys/net/ipv4/tcp_wmem      # TCP send buffer (min default max)

# Check if window scaling is enabled (should be 1)
cat /proc/sys/net/ipv4/tcp_window_scaling
```

## Tuning Buffer Sizes

```bash
# Set maximum socket buffer sizes (128 MB example for 10G+ links)
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728

# Set TCP-specific buffer sizes (min default max)
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 134217728"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 134217728"

# Set the default socket buffer sizes
sudo sysctl -w net.core.rmem_default=1048576
sudo sysctl -w net.core.wmem_default=1048576
```

## Making Changes Persistent

```bash
# Create a sysctl configuration file
sudo tee /etc/sysctl.d/99-tcp-tuning.conf << 'SYSCTL'
# TCP buffer tuning for high-throughput networks
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Enable window scaling (should already be enabled)
net.ipv4.tcp_window_scaling = 1

# Increase the maximum backlog queue
net.core.netdev_max_backlog = 5000

# Enable TCP timestamps for better RTT estimation
net.ipv4.tcp_timestamps = 1
SYSCTL

# Apply the settings
sudo sysctl -p /etc/sysctl.d/99-tcp-tuning.conf
```

## Verifying the Tuning

```bash
# Test with iperf3 before and after tuning
# On the server
iperf3 -s

# On the client (use -w to set the window size)
iperf3 -c server.example.com -t 30 -w 64M

# Check the actual window size in use
ss -ti | grep -A1 "server.example.com"
# Look for "rcv_space" and "snd_wnd" values
```

## Additional Tuning Options

```bash
# Enable TCP SACK (Selective Acknowledgment)
sudo sysctl -w net.ipv4.tcp_sack=1

# Increase the connection tracking table for busy servers
sudo sysctl -w net.netfilter.nf_conntrack_max=1048576
```

Tune based on your specific bandwidth-delay product. Over-provisioning buffers wastes memory, while under-provisioning limits throughput. Test with iperf3 before and after changes to measure the impact.
