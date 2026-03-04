# How to Tune TCP Buffer Sizes and Socket Parameters on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TCP Tuning, Network Performance, Socket Parameters, Linux

Description: Learn how to tune TCP buffer sizes and socket parameters on RHEL to optimize network throughput for high-bandwidth and high-latency links.

---

TCP buffer sizes control how much data the kernel can buffer for each connection. Properly tuning these parameters is critical for achieving full throughput on high-bandwidth or high-latency network links.

## Checking Current Settings

```bash
# View current TCP buffer settings
sysctl net.ipv4.tcp_rmem
sysctl net.ipv4.tcp_wmem
sysctl net.core.rmem_max
sysctl net.core.wmem_max

# View the current default and max socket buffer sizes
sysctl net.core.rmem_default
sysctl net.core.wmem_default
```

## Tuning TCP Buffer Sizes

The `tcp_rmem` and `tcp_wmem` parameters each take three values: minimum, default, and maximum buffer sizes in bytes.

```bash
# Set TCP read buffer: min=4KB, default=128KB, max=16MB
sudo sysctl -w net.ipv4.tcp_rmem="4096 131072 16777216"

# Set TCP write buffer: min=4KB, default=128KB, max=16MB
sudo sysctl -w net.ipv4.tcp_wmem="4096 131072 16777216"

# Set the maximum receive and send socket buffer sizes
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
```

## Making Changes Persistent

```bash
# Add settings to sysctl configuration
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/99-tcp-tuning.conf
# TCP buffer sizes: min default max
net.ipv4.tcp_rmem = 4096 131072 16777216
net.ipv4.tcp_wmem = 4096 131072 16777216

# Maximum socket buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Default socket buffer sizes
net.core.rmem_default = 262144
net.core.wmem_default = 262144

# Increase the connection backlog
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1
SYSCTL

# Apply the settings
sudo sysctl -p /etc/sysctl.d/99-tcp-tuning.conf
```

## Calculating Optimal Buffer Size

The optimal buffer size depends on the Bandwidth-Delay Product (BDP):

```bash
# BDP = Bandwidth (bytes/sec) x Round-Trip Time (seconds)
# Example: 10 Gbps link with 10ms RTT
# BDP = (10,000,000,000 / 8) * 0.010 = 12,500,000 bytes (~12MB)

# Set max buffer to at least the BDP
# For the example above, 16MB is a good max value
```

## Tuning the Listen Backlog

```bash
# Increase the TCP SYN backlog for busy servers
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Increase the connection backlog
sudo sysctl -w net.core.somaxconn=65535
```

After tuning, verify improvements with iperf3 or your application's own metrics. Always test changes in a staging environment before applying to production.
