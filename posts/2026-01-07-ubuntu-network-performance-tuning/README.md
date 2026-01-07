# How to Tune Ubuntu for High-Performance Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Networking, Performance, TCP Tuning

Description: Tune Ubuntu for high-performance networking with sysctl parameters, TCP optimization, and kernel settings for maximum throughput.

---

## Introduction

High-performance networking is critical for modern applications, especially those handling large volumes of traffic, real-time data processing, or serving as network infrastructure components. Ubuntu, while providing sensible defaults, ships with conservative network settings designed for general-purpose use. These defaults often leave significant performance on the table for demanding workloads.

This comprehensive guide walks you through tuning Ubuntu for maximum network throughput and reduced latency. We will cover TCP buffer optimization, connection handling, kernel parameters, hardware-level tuning, and benchmarking techniques to validate your improvements.

Whether you are running high-traffic web servers, database clusters, load balancers, or data processing pipelines, these optimizations can dramatically improve your network performance.

## Prerequisites

Before diving into the tuning process, ensure you have:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS (commands work on all versions)
- Root or sudo access
- Basic understanding of Linux networking concepts
- A backup of your current system configuration

Let us start by checking your current kernel and network configuration:

```bash
# Check Ubuntu version and kernel
lsb_release -a
uname -r

# View current network interfaces
ip link show

# Check current sysctl network settings
sysctl -a | grep -E "net\.(core|ipv4)" | head -50
```

## Understanding sysctl and Network Parameters

The `sysctl` utility allows you to view and modify kernel parameters at runtime. Network-related parameters are organized under the `net` namespace and control everything from buffer sizes to connection handling behavior.

### Viewing Current Settings

Before making changes, document your current configuration:

```bash
# Export all current network settings for backup
sudo sysctl -a | grep "^net\." > /tmp/network-sysctl-backup.conf

# View specific TCP settings
sysctl net.ipv4.tcp_rmem
sysctl net.ipv4.tcp_wmem
sysctl net.core.rmem_max
sysctl net.core.wmem_max
```

### Making Changes Persistent

There are two ways to apply sysctl changes:

```bash
# Temporary change (lost on reboot)
sudo sysctl -w net.core.rmem_max=16777216

# Persistent change - add to configuration file
echo "net.core.rmem_max = 16777216" | sudo tee -a /etc/sysctl.d/99-network-tuning.conf

# Apply all settings from configuration files
sudo sysctl --system
```

## TCP Buffer Size Optimization

TCP buffers are fundamental to network performance. They determine how much data can be held in memory while waiting to be processed or transmitted. Undersized buffers cause frequent stalls and reduced throughput, especially on high-bandwidth or high-latency connections.

### Understanding TCP Buffer Parameters

The kernel uses three values for each buffer setting: minimum, default, and maximum. These are specified in bytes:

```bash
# TCP receive buffer: min, default, max
sysctl net.ipv4.tcp_rmem

# TCP send buffer: min, default, max
sysctl net.ipv4.tcp_wmem
```

### Calculating Optimal Buffer Sizes

The optimal buffer size depends on your bandwidth-delay product (BDP):

```
BDP = Bandwidth (bytes/sec) x Round-Trip Time (seconds)
```

For a 10 Gbps link with 10ms RTT:
```
BDP = (10,000,000,000 / 8) x 0.010 = 12,500,000 bytes (~12 MB)
```

### Recommended TCP Buffer Settings

Create a dedicated sysctl configuration file for network tuning:

```bash
# Create network tuning configuration file
sudo tee /etc/sysctl.d/99-network-tuning.conf << 'EOF'
# ============================================
# TCP Buffer Size Optimization
# ============================================

# Maximum receive socket buffer size (16 MB)
# This is the hard limit that applications can request
net.core.rmem_max = 16777216

# Maximum send socket buffer size (16 MB)
net.core.wmem_max = 16777216

# Default receive socket buffer size (1 MB)
# Used when applications do not explicitly set buffer size
net.core.rmem_default = 1048576

# Default send socket buffer size (1 MB)
net.core.wmem_default = 1048576

# TCP receive buffer sizes: min (4KB), default (128KB), max (16MB)
# The kernel auto-tunes between these values based on memory pressure
net.ipv4.tcp_rmem = 4096 131072 16777216

# TCP send buffer sizes: min (4KB), default (128KB), max (16MB)
net.ipv4.tcp_wmem = 4096 131072 16777216

# Maximum amount of memory allocated to all TCP sockets
# Values are in pages (typically 4KB each): min, pressure, max
net.ipv4.tcp_mem = 786432 1048576 1572864

# Enable TCP window scaling for high-throughput connections
# Required for windows larger than 64KB
net.ipv4.tcp_window_scaling = 1

# Enable timestamps for better RTT calculation
# Helps the kernel make better buffer size decisions
net.ipv4.tcp_timestamps = 1

# Enable selective acknowledgments for better loss recovery
net.ipv4.tcp_sack = 1
EOF
```

### Applying Buffer Settings

Apply the new settings immediately:

```bash
# Apply all sysctl settings
sudo sysctl --system

# Verify the changes
sysctl net.core.rmem_max net.core.wmem_max
sysctl net.ipv4.tcp_rmem net.ipv4.tcp_wmem
```

## Connection Backlog Tuning

The connection backlog determines how many pending connections the kernel can queue before refusing new ones. This is critical for servers handling many simultaneous connection requests.

### Understanding the Backlog

When a client initiates a TCP connection, it goes through the three-way handshake:

1. Client sends SYN
2. Server responds with SYN-ACK (connection enters SYN queue)
3. Client sends ACK (connection moves to accept queue)

Both queues have size limits that can cause connection drops under load.

### SYN Backlog Settings

Configure the SYN queue for high connection rates:

```bash
# Add to /etc/sysctl.d/99-network-tuning.conf
sudo tee -a /etc/sysctl.d/99-network-tuning.conf << 'EOF'

# ============================================
# Connection Backlog Tuning
# ============================================

# Maximum number of connections in SYN_RECV state (SYN queue)
# Increase for servers with high connection rates
net.ipv4.tcp_max_syn_backlog = 65536

# Maximum number of pending connections in the accept queue
# This is the system-wide limit; applications can set lower values
net.core.somaxconn = 65536

# Enable SYN cookies for protection against SYN flood attacks
# When the SYN queue is full, the kernel can still accept connections
net.ipv4.tcp_syncookies = 1

# Number of times to retry SYN-ACK for passive connections
# Lower values reduce wait time for failed connections
net.ipv4.tcp_synack_retries = 2

# Number of times to retry SYN for active connections
net.ipv4.tcp_syn_retries = 2

# Maximum number of orphaned sockets (not attached to any process)
net.ipv4.tcp_max_orphans = 262144

# Maximum number of connection tracking entries
# Increase for servers with many concurrent connections
net.netfilter.nf_conntrack_max = 1048576
EOF
```

### Application-Level Backlog

Applications must also set appropriate backlog values:

```bash
# Example: Nginx configuration
# In /etc/nginx/nginx.conf, ensure listen directive includes backlog

# server {
#     listen 80 backlog=65536;
#     listen 443 ssl backlog=65536;
# }

# Example: Check current listen backlog for a socket
ss -ltn | grep :80
```

## TIME_WAIT Optimization

TIME_WAIT is a TCP state that prevents old packets from being confused with new connections. While necessary for correctness, excessive TIME_WAIT connections can exhaust port resources on high-traffic servers.

### Understanding TIME_WAIT

After a TCP connection closes, it enters TIME_WAIT state for 2x MSL (Maximum Segment Lifetime), typically 60 seconds on Linux. This ensures all packets from the old connection have expired.

### Checking TIME_WAIT Connections

Monitor your TIME_WAIT situation:

```bash
# Count connections by state
ss -s

# Count TIME_WAIT connections specifically
ss -tan state time-wait | wc -l

# View TIME_WAIT connections with ports
ss -tan state time-wait | head -20
```

### TIME_WAIT Tuning Options

Configure TIME_WAIT handling for better port reuse:

```bash
# Add to /etc/sysctl.d/99-network-tuning.conf
sudo tee -a /etc/sysctl.d/99-network-tuning.conf << 'EOF'

# ============================================
# TIME_WAIT Optimization
# ============================================

# Enable TCP TIME_WAIT socket reuse for new connections
# Allows reusing sockets in TIME_WAIT state when safe
net.ipv4.tcp_tw_reuse = 1

# Maximum number of TIME_WAIT sockets
# Limits memory consumption from TIME_WAIT sockets
net.ipv4.tcp_max_tw_buckets = 1048576

# Decrease FIN_WAIT timeout (default is 60 seconds)
# Reduces time spent in FIN_WAIT_2 state
net.ipv4.tcp_fin_timeout = 15

# Local port range for outgoing connections
# Expands available ephemeral ports (default: 32768-60999)
net.ipv4.ip_local_port_range = 1024 65535

# Enable TCP Fast Open for reduced latency on repeated connections
# Value 3 enables TFO for both client and server
net.ipv4.tcp_fastopen = 3
EOF
```

### Important Notes on TIME_WAIT

The `tcp_tw_recycle` option was removed in Linux kernel 4.12 due to issues with NAT. Do not attempt to enable it on modern kernels:

```bash
# DO NOT USE - removed from modern kernels
# net.ipv4.tcp_tw_recycle = 1  # DEPRECATED

# The tw_reuse option is the safe alternative
sysctl net.ipv4.tcp_tw_reuse
```

## Network Interface Tuning

Beyond kernel parameters, the network interface itself requires optimization for high performance.

### Ring Buffer Optimization

Network interface ring buffers hold packets between the hardware and the kernel:

```bash
# Check current ring buffer sizes
ethtool -g eth0

# Increase ring buffer sizes (if hardware supports it)
sudo ethtool -G eth0 rx 4096 tx 4096

# Make ring buffer changes persistent
# Add to /etc/network/interfaces or create udev rule

# Create udev rule for persistent ring buffer settings
sudo tee /etc/udev/rules.d/50-network-tuning.rules << 'EOF'
# Set ring buffers for network interfaces
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth*", RUN+="/sbin/ethtool -G $name rx 4096 tx 4096"
ACTION=="add", SUBSYSTEM=="net", KERNEL=="ens*", RUN+="/sbin/ethtool -G $name rx 4096 tx 4096"
EOF
```

### Interrupt Coalescing

Interrupt coalescing reduces CPU overhead by batching multiple packets into single interrupts:

```bash
# View current interrupt coalescing settings
ethtool -c eth0

# Configure adaptive interrupt coalescing
sudo ethtool -C eth0 adaptive-rx on adaptive-tx on

# For latency-sensitive workloads, set specific values
sudo ethtool -C eth0 rx-usecs 50 tx-usecs 50

# For throughput-focused workloads, use higher values
sudo ethtool -C eth0 rx-usecs 200 tx-usecs 200
```

### Offloading Features

Modern NICs can offload work from the CPU:

```bash
# View current offload settings
ethtool -k eth0

# Enable common offload features
sudo ethtool -K eth0 gso on      # Generic Segmentation Offload
sudo ethtool -K eth0 gro on      # Generic Receive Offload
sudo ethtool -K eth0 tso on      # TCP Segmentation Offload
sudo ethtool -K eth0 tx on       # TX checksumming
sudo ethtool -K eth0 rx on       # RX checksumming

# For some workloads, LRO can improve performance
sudo ethtool -K eth0 lro on      # Large Receive Offload
```

### Queue Length Optimization

The interface transmit queue length affects burst handling:

```bash
# View current queue length
ip link show eth0 | grep qlen

# Increase transmit queue length
sudo ip link set eth0 txqueuelen 10000

# Add to network configuration for persistence
# In /etc/network/interfaces:
# post-up ip link set eth0 txqueuelen 10000
```

## IRQ Affinity and RPS/RFS

Distributing network processing across multiple CPU cores is essential for scaling beyond single-core limits.

### Understanding IRQ Affinity

Each network interface generates interrupts that are processed by a specific CPU. By default, all interrupts may go to a single CPU, creating a bottleneck.

```bash
# View current IRQ assignments
cat /proc/interrupts | grep eth

# Check which CPU handles each IRQ
for irq in $(grep eth /proc/interrupts | awk '{print $1}' | tr -d ':'); do
    echo "IRQ $irq: $(cat /proc/irq/$irq/smp_affinity_list)"
done
```

### Manual IRQ Affinity Configuration

Distribute interrupts across CPUs manually:

```bash
# Find IRQs for your network interface
cat /proc/interrupts | grep eth0

# Set IRQ affinity to specific CPUs (bitmask format)
# CPU 0 = 1, CPU 1 = 2, CPU 2 = 4, CPU 3 = 8
echo 1 | sudo tee /proc/irq/24/smp_affinity   # IRQ 24 to CPU 0
echo 2 | sudo tee /proc/irq/25/smp_affinity   # IRQ 25 to CPU 1
echo 4 | sudo tee /proc/irq/26/smp_affinity   # IRQ 26 to CPU 2
echo 8 | sudo tee /proc/irq/27/smp_affinity   # IRQ 27 to CPU 3
```

### Using irqbalance

The irqbalance daemon automatically distributes interrupts:

```bash
# Install and enable irqbalance
sudo apt install irqbalance
sudo systemctl enable irqbalance
sudo systemctl start irqbalance

# Check irqbalance status
systemctl status irqbalance

# For high-performance workloads, you may want to disable irqbalance
# and manually configure IRQ affinity
sudo systemctl stop irqbalance
sudo systemctl disable irqbalance
```

### Receive Packet Steering (RPS)

RPS distributes packet processing across CPUs in software, useful when hardware does not support RSS:

```bash
# Enable RPS on an interface
# Use a bitmask of all available CPUs
# For 8 CPUs: ff (binary: 11111111)

# Get number of CPUs and create appropriate mask
CPUS=$(nproc)
MASK=$(printf '%x' $((2**CPUS - 1)))

# Apply RPS to all receive queues
for queue in /sys/class/net/eth0/queues/rx-*/rps_cpus; do
    echo $MASK | sudo tee $queue
done

# Verify RPS configuration
cat /sys/class/net/eth0/queues/rx-*/rps_cpus
```

### Receive Flow Steering (RFS)

RFS improves cache locality by steering packets to the CPU where the application is running:

```bash
# Set global RFS table size
echo 32768 | sudo tee /proc/sys/net/core/rps_sock_flow_entries

# Set per-queue RFS table size
for queue in /sys/class/net/eth0/queues/rx-*/rps_flow_cnt; do
    echo 4096 | sudo tee $queue
done

# Add to sysctl configuration for persistence
echo "net.core.rps_sock_flow_entries = 32768" | sudo tee -a /etc/sysctl.d/99-network-tuning.conf
```

### XPS (Transmit Packet Steering)

XPS maps transmit queues to CPUs for better cache utilization:

```bash
# Configure XPS for transmit queues
# Assign each TX queue to a different CPU

CPU=0
for queue in /sys/class/net/eth0/queues/tx-*/xps_cpus; do
    MASK=$(printf '%x' $((1 << CPU)))
    echo $MASK | sudo tee $queue
    CPU=$((CPU + 1))
done
```

### Persistent RPS/RFS/XPS Configuration

Create a script to apply settings on boot:

```bash
# Create network tuning script
sudo tee /usr/local/bin/network-tuning.sh << 'EOF'
#!/bin/bash
# Network performance tuning script

INTERFACE=${1:-eth0}
CPUS=$(nproc)
MASK=$(printf '%x' $((2**CPUS - 1)))

# Configure RPS for all RX queues
for queue in /sys/class/net/$INTERFACE/queues/rx-*/rps_cpus; do
    echo $MASK > $queue 2>/dev/null
done

# Configure RFS for all RX queues
for queue in /sys/class/net/$INTERFACE/queues/rx-*/rps_flow_cnt; do
    echo 4096 > $queue 2>/dev/null
done

# Configure XPS for TX queues
CPU=0
for queue in /sys/class/net/$INTERFACE/queues/tx-*/xps_cpus; do
    echo $(printf '%x' $((1 << (CPU % CPUS)))) > $queue 2>/dev/null
    CPU=$((CPU + 1))
done

echo "Network tuning applied to $INTERFACE"
EOF

sudo chmod +x /usr/local/bin/network-tuning.sh

# Create systemd service for persistence
sudo tee /etc/systemd/system/network-tuning.service << 'EOF'
[Unit]
Description=Network Performance Tuning
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/network-tuning.sh eth0
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable network-tuning
```

## Jumbo Frames Configuration

Jumbo frames increase the Maximum Transmission Unit (MTU) from the standard 1500 bytes to up to 9000 bytes, reducing per-packet overhead.

### When to Use Jumbo Frames

Jumbo frames are beneficial for:
- Internal network traffic (storage, databases, clusters)
- High-throughput bulk data transfers
- Environments where all devices support larger MTUs

Do not use jumbo frames for:
- Internet-facing interfaces
- Networks with devices that do not support large MTUs
- Paths crossing network equipment that may fragment packets

### Verifying Jumbo Frame Support

Check if your network infrastructure supports jumbo frames:

```bash
# Test MTU path between two hosts
# Replace with your target host
ping -M do -s 8972 target-host

# The -s 8972 + 28 bytes IP/ICMP header = 9000 bytes
# If this fails, try smaller sizes to find the maximum

# Check interface maximum MTU capability
ip -d link show eth0 | grep mtu
```

### Configuring Jumbo Frames

Enable jumbo frames on your interface:

```bash
# Temporarily set MTU to 9000
sudo ip link set eth0 mtu 9000

# Verify the change
ip link show eth0

# Make permanent using netplan (Ubuntu 20.04+)
sudo tee /etc/netplan/99-jumbo-frames.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      mtu: 9000
EOF

# Apply netplan configuration
sudo netplan apply

# Alternative: using /etc/network/interfaces
# Add to interface configuration:
# mtu 9000
```

### Jumbo Frames Kernel Optimization

Update buffer sizes to accommodate larger frames:

```bash
# Add to /etc/sysctl.d/99-network-tuning.conf
sudo tee -a /etc/sysctl.d/99-network-tuning.conf << 'EOF'

# ============================================
# Jumbo Frame Support
# ============================================

# Increase default and max socket buffer for jumbo frames
# These should be larger than the MTU
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576

# Increase netdev budget for processing larger packets
net.core.netdev_budget = 600
net.core.netdev_budget_usecs = 8000
EOF
```

## Additional Kernel Optimizations

Several other kernel parameters affect network performance:

### Memory and Buffer Optimizations

```bash
# Add to /etc/sysctl.d/99-network-tuning.conf
sudo tee -a /etc/sysctl.d/99-network-tuning.conf << 'EOF'

# ============================================
# Additional Network Optimizations
# ============================================

# Increase the maximum number of packets queued on the INPUT side
net.core.netdev_max_backlog = 65536

# Disable source routing (security and performance)
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Disable ICMP redirects (security and performance)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Enable reverse path filtering (security)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Increase ARP cache size for large networks
net.ipv4.neigh.default.gc_thresh1 = 4096
net.ipv4.neigh.default.gc_thresh2 = 8192
net.ipv4.neigh.default.gc_thresh3 = 16384

# Reduce TCP keepalive time for faster dead connection detection
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# Enable BBR congestion control (Linux 4.9+)
# BBR provides better throughput and lower latency
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF
```

### Enabling BBR Congestion Control

BBR (Bottleneck Bandwidth and Round-trip propagation time) is Google's congestion control algorithm that significantly improves throughput:

```bash
# Check if BBR is available
sysctl net.ipv4.tcp_available_congestion_control

# Enable BBR if available
sudo modprobe tcp_bbr
echo "tcp_bbr" | sudo tee -a /etc/modules-load.d/bbr.conf

# Verify BBR is active
sysctl net.ipv4.tcp_congestion_control
```

### Busy Polling for Low Latency

For latency-sensitive applications, enable busy polling:

```bash
# Add to /etc/sysctl.d/99-network-tuning.conf
sudo tee -a /etc/sysctl.d/99-network-tuning.conf << 'EOF'

# ============================================
# Low Latency Settings (Busy Polling)
# ============================================

# Enable busy polling for sockets
# Set to number of microseconds to busy-poll
net.core.busy_poll = 50
net.core.busy_read = 50

# Default busy polling for new sockets
net.core.busy_read = 50
EOF
```

## Complete Configuration File

Here is the complete sysctl configuration file with all optimizations:

```bash
# Create complete network tuning configuration
sudo tee /etc/sysctl.d/99-network-tuning.conf << 'EOF'
# ============================================================
# Ubuntu High-Performance Network Tuning
# ============================================================
# Apply with: sudo sysctl --system
# ============================================================

# ============================================
# TCP Buffer Size Optimization
# ============================================
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.tcp_rmem = 4096 131072 16777216
net.ipv4.tcp_wmem = 4096 131072 16777216
net.ipv4.tcp_mem = 786432 1048576 1572864
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1

# ============================================
# Connection Backlog Tuning
# ============================================
net.ipv4.tcp_max_syn_backlog = 65536
net.core.somaxconn = 65536
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_max_orphans = 262144

# ============================================
# TIME_WAIT Optimization
# ============================================
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_max_tw_buckets = 1048576
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fastopen = 3

# ============================================
# Additional Network Optimizations
# ============================================
net.core.netdev_max_backlog = 65536
net.core.netdev_budget = 600
net.core.netdev_budget_usecs = 8000
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.neigh.default.gc_thresh1 = 4096
net.ipv4.neigh.default.gc_thresh2 = 8192
net.ipv4.neigh.default.gc_thresh3 = 16384
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# ============================================
# BBR Congestion Control
# ============================================
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# ============================================
# RPS/RFS Settings
# ============================================
net.core.rps_sock_flow_entries = 32768
EOF

# Apply all settings
sudo sysctl --system
```

## Benchmarking Network Performance

After applying optimizations, benchmark your network to measure improvements.

### Installing Benchmarking Tools

```bash
# Install common network benchmarking tools
sudo apt update
sudo apt install -y iperf3 netperf nuttcp hping3
```

### Throughput Testing with iperf3

iperf3 is the standard tool for measuring network throughput:

```bash
# On the server (receiving end)
iperf3 -s -p 5201

# On the client (sending end) - basic TCP test
iperf3 -c server-ip -p 5201 -t 30

# Test with multiple parallel streams
iperf3 -c server-ip -p 5201 -t 30 -P 4

# Test bidirectional throughput
iperf3 -c server-ip -p 5201 -t 30 --bidir

# Test with specific buffer size
iperf3 -c server-ip -p 5201 -t 30 -l 128K

# UDP throughput test with target bandwidth
iperf3 -c server-ip -p 5201 -u -b 10G -t 30

# Save results to JSON file
iperf3 -c server-ip -p 5201 -t 30 -J > iperf3-results.json
```

### Latency Testing

Measure network latency with various tools:

```bash
# Basic ping test
ping -c 100 target-host

# Measure latency distribution
ping -c 1000 target-host | grep -oP 'time=\K[0-9.]+' | sort -n | awk '
    { sum += $1; a[NR] = $1 }
    END {
        print "Min:", a[1]
        print "Max:", a[NR]
        print "Avg:", sum/NR
        print "Median:", a[int(NR/2)]
        print "P95:", a[int(NR*0.95)]
        print "P99:", a[int(NR*0.99)]
    }'

# TCP latency test using hping3
sudo hping3 -S -p 80 -c 100 target-host

# Latency under load using netperf
netperf -H server-ip -t TCP_RR -l 30
```

### Connection Rate Testing

Test how many connections per second your server can handle:

```bash
# Using ab (Apache Benchmark) for HTTP
ab -n 100000 -c 1000 http://server-ip/

# Using wrk for HTTP
wrk -t12 -c400 -d30s http://server-ip/

# Custom connection rate test script
cat << 'EOF' > /tmp/conn-test.sh
#!/bin/bash
TARGET=$1
PORT=${2:-80}
COUNT=${3:-10000}

start=$(date +%s.%N)
for i in $(seq 1 $COUNT); do
    timeout 1 bash -c "echo > /dev/tcp/$TARGET/$PORT" 2>/dev/null &
    if [ $((i % 100)) -eq 0 ]; then
        wait
    fi
done
wait
end=$(date +%s.%N)

duration=$(echo "$end - $start" | bc)
rate=$(echo "scale=2; $COUNT / $duration" | bc)
echo "Completed $COUNT connections in $duration seconds ($rate conn/sec)"
EOF

chmod +x /tmp/conn-test.sh
/tmp/conn-test.sh server-ip 80 10000
```

### Monitoring During Tests

Monitor system metrics during benchmarks:

```bash
# Watch network interface statistics
watch -n 1 'ip -s link show eth0'

# Monitor TCP statistics
watch -n 1 'ss -s'

# Watch interrupt distribution
watch -n 1 'cat /proc/interrupts | grep eth'

# Monitor CPU utilization per core
mpstat -P ALL 1

# Comprehensive network monitoring with sar
sar -n DEV 1

# View socket buffer usage
ss -tm
```

### Creating a Benchmark Script

Automate benchmarking with a comprehensive script:

```bash
# Create benchmarking script
sudo tee /usr/local/bin/network-benchmark.sh << 'EOF'
#!/bin/bash
# Comprehensive network benchmark script

SERVER=${1:-localhost}
DURATION=${2:-30}
OUTPUT_DIR=${3:-/tmp/network-benchmark-$(date +%Y%m%d-%H%M%S)}

mkdir -p "$OUTPUT_DIR"

echo "Starting network benchmark against $SERVER"
echo "Duration: ${DURATION}s per test"
echo "Results will be saved to $OUTPUT_DIR"
echo ""

# System info
echo "=== System Information ===" > "$OUTPUT_DIR/system-info.txt"
uname -a >> "$OUTPUT_DIR/system-info.txt"
cat /proc/cpuinfo | grep "model name" | head -1 >> "$OUTPUT_DIR/system-info.txt"
free -h >> "$OUTPUT_DIR/system-info.txt"
ip link show >> "$OUTPUT_DIR/system-info.txt"

# Current sysctl settings
sysctl -a | grep "^net\." > "$OUTPUT_DIR/sysctl-settings.txt" 2>/dev/null

# iperf3 tests
echo "Running iperf3 single-stream test..."
iperf3 -c $SERVER -t $DURATION -J > "$OUTPUT_DIR/iperf3-single.json" 2>&1

echo "Running iperf3 multi-stream test..."
iperf3 -c $SERVER -t $DURATION -P 4 -J > "$OUTPUT_DIR/iperf3-parallel.json" 2>&1

echo "Running iperf3 reverse test..."
iperf3 -c $SERVER -t $DURATION -R -J > "$OUTPUT_DIR/iperf3-reverse.json" 2>&1

# Latency test
echo "Running latency test..."
ping -c 100 $SERVER > "$OUTPUT_DIR/ping-results.txt" 2>&1

# Parse and summarize results
echo ""
echo "=== Benchmark Results ==="
echo "Single stream: $(jq -r '.end.sum_sent.bits_per_second / 1000000000' "$OUTPUT_DIR/iperf3-single.json" 2>/dev/null) Gbps"
echo "Parallel streams: $(jq -r '.end.sum_sent.bits_per_second / 1000000000' "$OUTPUT_DIR/iperf3-parallel.json" 2>/dev/null) Gbps"
echo "Reverse: $(jq -r '.end.sum_received.bits_per_second / 1000000000' "$OUTPUT_DIR/iperf3-reverse.json" 2>/dev/null) Gbps"
echo ""
echo "Results saved to $OUTPUT_DIR"
EOF

sudo chmod +x /usr/local/bin/network-benchmark.sh
```

## Troubleshooting

### Common Issues and Solutions

When tuning does not produce expected results, check these common issues:

```bash
# Check for packet drops at interface level
ip -s link show eth0 | grep -E "dropped|errors|overruns"

# Check for TCP retransmissions
netstat -s | grep -i retrans

# Verify sysctl settings are applied
sysctl net.core.rmem_max
sysctl net.ipv4.tcp_congestion_control

# Check if hardware offloading is enabled
ethtool -k eth0 | grep -E "on|off"

# Verify IRQ affinity is set correctly
for irq in $(grep eth0 /proc/interrupts | awk '{print $1}' | tr -d ':'); do
    echo "IRQ $irq: CPU $(cat /proc/irq/$irq/smp_affinity_list)"
done

# Check for bottlenecks in softirq processing
cat /proc/softirqs | head -10
```

### Kernel Module Issues

```bash
# Verify BBR module is loaded
lsmod | grep bbr

# Load BBR module manually if needed
sudo modprobe tcp_bbr

# Check available congestion control algorithms
cat /proc/sys/net/ipv4/tcp_available_congestion_control
```

### Permission Issues

```bash
# Ensure sysctl configuration file has correct permissions
ls -la /etc/sysctl.d/99-network-tuning.conf

# Fix permissions if needed
sudo chmod 644 /etc/sysctl.d/99-network-tuning.conf
sudo chown root:root /etc/sysctl.d/99-network-tuning.conf
```

## Conclusion

Tuning Ubuntu for high-performance networking requires a holistic approach that addresses multiple layers of the networking stack:

1. **TCP Buffer Optimization**: Properly sized buffers prevent stalls and maximize throughput on high-bandwidth connections.

2. **Connection Backlog Tuning**: Adequate backlog sizes prevent connection drops under high load.

3. **TIME_WAIT Management**: Efficient handling of closed connections preserves port resources.

4. **Interface Configuration**: Ring buffers, offloading, and queue settings optimize hardware utilization.

5. **IRQ/RPS/RFS**: Distributing network processing across CPUs eliminates single-core bottlenecks.

6. **Jumbo Frames**: Larger MTUs reduce per-packet overhead for internal traffic.

7. **Congestion Control**: Modern algorithms like BBR provide better throughput and latency.

Always benchmark before and after changes to quantify improvements. Start with conservative settings and gradually increase values while monitoring for adverse effects. Remember that optimal settings depend on your specific workload, hardware, and network environment.

The configurations in this guide serve as a starting point. For production systems, continue testing and refining based on your actual traffic patterns and performance requirements.

## Additional Resources

For further reading and advanced tuning, consult:

- Linux kernel networking documentation: `/usr/share/doc/linux-doc/networking/`
- Red Hat Performance Tuning Guide (applicable to Ubuntu)
- Brendan Gregg's network performance analysis tools and methodologies
- iperf3 documentation for advanced benchmarking options
