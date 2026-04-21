# How to Tune sysctl Parameters for High-Throughput Workloads on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sysctl, RHEL, Linux, Performance Tuning, TCP, High Throughput, Networking

Description: Learn how to tune Linux kernel sysctl parameters on RHEL for high-throughput network workloads, including TCP buffer sizes, connection queues, and socket settings.

---

High-throughput applications require kernel networking parameters tuned beyond the conservative RHEL defaults. These settings apply to bulk data transfer, API gateways, and high-connection-rate services.

## TCP Buffer Sizes

```bash
# /etc/sysctl.d/99-network-performance.conf

# TCP socket receive and send buffer sizes

# RHEL defaults are ~212KB; raise defaults to 256KB and max to 16MB
net.core.rmem_default = 262144
net.core.wmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# TCP-specific buffer tuning
# Values: min, default, max (in bytes)
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Enable TCP window scaling (RFC 7323)
net.ipv4.tcp_window_scaling = 1
```

## Connection Queue and Backlog

```bash
# Maximum number of queued connection requests
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Increase the number of file descriptors (system-wide)
fs.file-max = 2097152
```

## TIME_WAIT and Port Reuse

```bash
# Allow reuse of TIME_WAIT sockets (safe for outbound connections)
net.ipv4.tcp_tw_reuse = 1

# Maximum number of TIME_WAIT sockets before they are destroyed
net.ipv4.tcp_max_tw_buckets = 1440000

# Local port range for outbound connections
net.ipv4.ip_local_port_range = 1024 65535
```

## Network Interface Queue

```bash
# Increase network interface receive queue size
net.core.netdev_max_backlog = 250000

# Tune RSS with ethtool, or configure RPS via:
# /sys/class/net/eth0/queues/rx-*/rps_cpus
```

## Congestion Control

```bash
# Use BBR congestion control (Linux 4.9+, available on RHEL 8+)
# Red Hat recommends fq queueing with BBR
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Verify available algorithms
sysctl net.ipv4.tcp_available_congestion_control
```

## Applying and Verifying

```bash
# Apply all settings
sysctl -p /etc/sysctl.d/99-network-performance.conf

# Verify individual values
sysctl net.ipv4.tcp_rmem
sysctl net.core.somaxconn

# Monitor socket statistics
ss -s
cat /proc/net/sockstat
```

## Benchmarking Before and After

```bash
# iperf3 throughput test
# Server
iperf3 -s -B 10.0.0.1

# Client
iperf3 -c 10.0.0.1 -P 8 -t 30   # 8 parallel streams, 30 seconds
```

## Complete Tuning Profile

```bash
# /etc/sysctl.d/99-network-performance.conf
net.core.rmem_default = 262144
net.core.wmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_window_scaling = 1
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_max_tw_buckets = 1440000
net.ipv4.ip_local_port_range = 1024 65535
net.core.netdev_max_backlog = 250000
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
fs.file-max = 2097152
```

## Key Takeaways

- Increase maximum TCP buffer sizes (`tcp_rmem`/`tcp_wmem`) to 16MB or more for high-throughput workloads.
- Raise `somaxconn` and `tcp_max_syn_backlog` for services with high connection rates.
- Enable `tcp_tw_reuse` to recycle TIME_WAIT ports quickly on high-connection-rate services.
- Use BBR congestion control with `fq` queueing on RHEL 8+ for better throughput on high-latency or lossy links.
