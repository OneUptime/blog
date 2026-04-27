# How to Optimize IPv6 Throughput on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Performance, Kernel, Sysctl, Networking

Description: Tune Linux kernel parameters and network stack settings to maximize IPv6 TCP and UDP throughput for high-bandwidth applications.

## Introduction

Linux's IPv6 stack is mature and performant, but default kernel parameters are conservative to accommodate low-memory systems. High-throughput servers benefit significantly from tuning socket buffers, TCP window scaling, and offload settings.

## Step 1: Increase Socket Buffer Sizes

Large socket buffers allow the kernel to buffer more in-flight data, critical for high-bandwidth, high-latency paths.

```bash
# /etc/sysctl.d/99-ipv6-performance.conf

# Maximum receive socket buffer size (256 MB)

net.core.rmem_max = 268435456
# Maximum send socket buffer size (256 MB)
net.core.wmem_max = 268435456
# Default socket receive buffer
net.core.rmem_default = 67108864
# Default socket send buffer
net.core.wmem_default = 67108864

# TCP-specific buffer sizes: min / default / max
net.ipv4.tcp_rmem = 4096 87380 268435456
net.ipv4.tcp_wmem = 4096 65536 268435456

# These apply to IPv6 TCP as well (IPv6 uses ipv4.tcp_* for TCP tuning)
```

Apply immediately:

```bash
sudo sysctl -p /etc/sysctl.d/99-ipv6-performance.conf
```

## Step 2: Enable TCP Window Scaling and SACK

```bash
# Enable TCP window scaling (required for buffers > 65535 bytes)
net.ipv4.tcp_window_scaling = 1

# Enable selective acknowledgements (reduces retransmissions)
net.ipv4.tcp_sack = 1

# Increase the maximum number of packets in the per-CPU receive (input) backlog queue
net.core.netdev_max_backlog = 250000

# Increase the socket listen backlog
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
```

## Step 3: Enable Hardware Offloads

Offloading TCP segmentation to the NIC reduces CPU overhead and increases throughput.

```bash
# Check current offload settings for your interface
ethtool -k eth0 | grep -E "scatter|offload|generic"

# Enable TCP Segmentation Offload (TSO) - also used for IPv6
sudo ethtool -K eth0 tso on

# Enable Generic Segmentation Offload
sudo ethtool -K eth0 gso on

# Enable Generic Receive Offload (reduces interrupt rate)
sudo ethtool -K eth0 gro on

# Enable Large Receive Offload if supported
sudo ethtool -K eth0 lro on

# Check RSS queues (Receive Side Scaling)
ethtool -l eth0
# Set number of RSS queues to match CPU count
sudo ethtool -L eth0 combined $(nproc)
```

## Step 4: Tune IPv6-Specific Parameters

```bash
# Disable IPv6 router solicitations if the router is static (reduces control overhead)
net.ipv6.conf.eth0.router_solicitations = 0

# Set reasonable ND cache timeouts to reduce neighbor discovery overhead
net.ipv6.neigh.eth0.gc_stale_time = 60
net.ipv6.neigh.default.gc_thresh1 = 1024
net.ipv6.neigh.default.gc_thresh2 = 4096
net.ipv6.neigh.default.gc_thresh3 = 8192
```

## Step 5: Verify Improvements

```bash
# Measure TCP throughput before and after tuning
iperf3 -6 -c 2001:db8::1 -t 30 -P 4 --format m

# Monitor kernel buffer usage during a transfer
ss -6 -tmie | grep "rmem\|wmem"

# Check for TCP retransmissions
netstat -s | grep -i retransmit
```

## Conclusion

IPv6 throughput optimization on Linux centers on increasing socket buffers, enabling window scaling, and offloading work to the NIC. These changes apply to both IPv4 and IPv6 TCP. After tuning, use OneUptime's performance monitoring to track throughput trends over time.
