# How to Tune Network Kernel Parameters for High-Throughput Workloads on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel, Network, Throughput, Linux

Description: A practical guide to tuning Linux network kernel parameters on RHEL 9 for high-throughput workloads, covering buffer sizes, connection limits, TCP optimizations, and real benchmarking tips.

---

## When Default Settings Are Not Enough

RHEL 9 ships with sensible network defaults, but those defaults target a general-purpose workload. When you are pushing 10Gbps or higher, handling tens of thousands of concurrent connections, or running latency-sensitive applications, the stock settings leave performance on the table.

Network tuning is not about cranking every knob to the maximum. It is about understanding your workload and adjusting the right parameters. A database server has different needs than a load balancer or a streaming media server.

## Baseline Measurement

Before changing anything, measure your current performance so you have a baseline to compare against.

```bash
# Install iperf3 for throughput testing
sudo dnf install iperf3 -y

# Run a quick throughput test (on the server side)
iperf3 -s

# Run from a client to the server
iperf3 -c <server-ip> -t 30 -P 4

# Check current socket buffer sizes
sysctl net.core.rmem_max net.core.wmem_max net.core.rmem_default net.core.wmem_default
```

## Socket Buffer Tuning

Socket buffers determine how much data the kernel can queue for network connections. For high-throughput, the defaults are usually too small.

```bash
# Increase the maximum socket receive and send buffer sizes (16 MB)
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216

# Set reasonable defaults (256 KB)
sudo sysctl -w net.core.rmem_default=262144
sudo sysctl -w net.core.wmem_default=262144

# TCP-specific buffer auto-tuning range: min, default, max
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
```

```mermaid
flowchart LR
    A["Application"] --> B["Socket Send Buffer<br/>(wmem)"]
    B --> C["Network Stack"]
    C --> D["NIC TX Queue"]
    D --> E["Wire"]
    E --> F["NIC RX Queue"]
    F --> G["Network Stack"]
    G --> H["Socket Receive Buffer<br/>(rmem)"]
    H --> I["Application"]
```

## Connection Backlog and Queue Tuning

High-traffic servers need larger connection backlogs to avoid dropping incoming connections during bursts.

```bash
# Maximum number of connections queued for acceptance
sudo sysctl -w net.core.somaxconn=65535

# Maximum SYN backlog for half-open connections
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Increase the network device backlog queue
sudo sysctl -w net.core.netdev_max_backlog=65535
```

## TCP Optimization Parameters

```bash
# Enable TCP window scaling for high-bandwidth links
sudo sysctl -w net.ipv4.tcp_window_scaling=1

# Enable TCP timestamps for better RTT estimation
sudo sysctl -w net.ipv4.tcp_timestamps=1

# Enable selective acknowledgments to reduce retransmissions
sudo sysctl -w net.ipv4.tcp_sack=1

# Use the BBR congestion control algorithm
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Expand the local port range for outbound connections
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# Allow reusing TIME_WAIT sockets for new connections
sudo sysctl -w net.ipv4.tcp_tw_reuse=1

# Reduce FIN_WAIT2 timeout
sudo sysctl -w net.ipv4.tcp_fin_timeout=15
```

## BBR Congestion Control

BBR (Bottleneck Bandwidth and Round-trip propagation time) is a modern congestion control algorithm from Google. It performs significantly better than the default CUBIC on long-distance or lossy links.

```bash
# Load the BBR kernel module
sudo modprobe tcp_bbr

# Make BBR load at boot
echo "tcp_bbr" | sudo tee /etc/modules-load.d/bbr.conf

# Set BBR as the congestion control algorithm
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Verify it is active
sysctl net.ipv4.tcp_congestion_control

# See all available congestion control algorithms
sysctl net.ipv4.tcp_available_congestion_control
```

## Making Changes Persistent

Put all your tuning in a drop-in configuration file.

```bash
# Create persistent network tuning configuration
sudo tee /etc/sysctl.d/90-network-throughput.conf <<EOF
# Socket buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 262144
net.core.wmem_default = 262144
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Connection backlog
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65535

# TCP optimizations
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_congestion_control = bbr
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
EOF

# Apply immediately
sudo sysctl --system
```

## NIC-Level Tuning

Kernel parameters are only half the picture. The network interface card itself has tunable ring buffer sizes.

```bash
# Check current ring buffer settings
ethtool -g eth0

# Increase ring buffers to their maximum
sudo ethtool -G eth0 rx 4096 tx 4096

# Check offload features
ethtool -k eth0

# Enable generic receive offload if not already on
sudo ethtool -K eth0 gro on

# Enable large receive offload
sudo ethtool -K eth0 lro on
```

## IRQ Affinity and CPU Pinning

For multi-queue NICs, spreading interrupts across CPU cores prevents a single core from becoming a bottleneck.

```bash
# Check current IRQ affinity for network interfaces
grep eth0 /proc/interrupts

# Install the irqbalance service (usually already installed)
sudo dnf install irqbalance -y
sudo systemctl enable --now irqbalance
```

## Validating Your Changes

After tuning, run the same benchmarks you used for the baseline.

```bash
# Re-run iperf3 test
iperf3 -c <server-ip> -t 30 -P 4

# Check for dropped packets or errors
ip -s link show eth0

# Monitor network performance in real time
ss -s
```

| Metric | What to Watch |
|--------|--------------|
| Throughput | Should increase with buffer tuning |
| Retransmissions | Should decrease with SACK and BBR |
| Dropped packets | Should decrease with larger backlogs |
| Connection errors | Should decrease with higher somaxconn |

## Wrapping Up

Network tuning on RHEL 9 is a methodical process. Measure first, change one category of parameters at a time, and measure again. The parameters in this guide are a solid starting point for high-throughput workloads, but your specific numbers will depend on your hardware, link speed, and application behavior. Document every change and keep your sysctl drop-in files under version control so you can trace back what changed when.
