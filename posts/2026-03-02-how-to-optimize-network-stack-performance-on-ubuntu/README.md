# How to Optimize Network Stack Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Performance Tuning, Kernel, TCP

Description: Tune Ubuntu's network stack with kernel parameters, TCP congestion control, and NIC settings to maximize throughput, minimize latency, and handle high-concurrency network workloads.

---

Ubuntu's default network stack settings are tuned for compatibility and modest resource usage, not peak performance. On servers handling significant network traffic - whether running web services, real-time data pipelines, or high-frequency inter-service communication - the default settings leave measurable performance on the table. Network stack optimization involves tuning kernel parameters, configuring TCP behavior, and adjusting NIC settings.

## Identifying Your Network Performance Baseline

Before tuning, establish a baseline:

```bash
# Check interface statistics and errors
ip -s link show eth0

# Current socket statistics
ss -s

# Active connections per state
ss -s | grep "TCP:"

# Network throughput test (requires iperf3 on both endpoints)
iperf3 -c remote-server -t 30 -P 4

# Check if the NIC supports features that should be enabled
sudo ethtool -k eth0 | grep -E "scatter-gather|tcp-segmentation-offload|generic-segmentation-offload|receive-offload"
```

## Core Network Kernel Parameters

```bash
sudo nano /etc/sysctl.d/99-network-performance.conf
```

```ini
# /etc/sysctl.d/99-network-performance.conf

# ======== Socket Buffers ========
# Maximum socket receive buffer (bytes)
# Default is often 212992 (208KB) - increase for high-throughput
net.core.rmem_max = 268435456       # 256MB

# Maximum socket send buffer (bytes)
net.core.wmem_max = 268435456       # 256MB

# Default socket receive buffer
net.core.rmem_default = 131072      # 128KB

# Default socket send buffer
net.core.wmem_default = 131072      # 128KB

# TCP-specific buffer auto-tuning [min, default, max]
net.ipv4.tcp_rmem = 4096 131072 268435456
net.ipv4.tcp_wmem = 4096 131072 268435456

# Enable TCP memory auto-tuning
net.ipv4.tcp_moderate_rcvbuf = 1

# ======== Connection Queuing ========
# Maximum connections in the accept queue (LISTEN backlog)
net.core.somaxconn = 65535

# Maximum SYN backlog (half-open connections)
net.ipv4.tcp_max_syn_backlog = 65535

# Incoming packet queue length per CPU
net.core.netdev_max_backlog = 65535

# ======== TIME_WAIT Management ========
# Maximum TIME_WAIT sockets (prevents memory exhaustion under DDoS)
net.ipv4.tcp_max_tw_buckets = 2000000

# Allow TIME_WAIT socket reuse for new connections
# Safe when tcp_timestamps is on (prevents sequence number collisions)
net.ipv4.tcp_tw_reuse = 1

# TCP timestamps (required for tw_reuse, also enables RTTM and PAWS)
net.ipv4.tcp_timestamps = 1

# ======== TCP Connection Behavior ========
# Number of SYN retransmits before giving up
net.ipv4.tcp_syn_retries = 3

# Enable SYN cookies (SYN flood protection)
net.ipv4.tcp_syncookies = 1

# FIN_WAIT_2 timeout (seconds) - reduce to reclaim sockets faster
net.ipv4.tcp_fin_timeout = 10

# Keepalive settings
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6

# ======== Ephemeral Port Range ========
# Increase range for outbound connections
net.ipv4.ip_local_port_range = 10000 65535

# ======== Memory Limits ========
# TCP global memory limits (pages: min pressure max)
# 4096 * 1048576 / 4096 = 1048576 pages = 4GB
net.ipv4.tcp_mem = 786432 1048576 1572864

# ======== Receive Steering ========
# Enable Receive Flow Steering
# (set via ethtool rfs, not sysctl)
```

Apply the settings:

```bash
sudo sysctl --system

# Verify critical settings
sysctl net.core.rmem_max
sysctl net.ipv4.tcp_max_tw_buckets
```

## TCP Congestion Control

The congestion control algorithm significantly affects throughput, especially on high-bandwidth or high-latency paths:

```bash
# Check available congestion control algorithms
cat /proc/sys/net/ipv4/tcp_available_congestion_control

# Current default
cat /proc/sys/net/ipv4/tcp_congestion_control

# Enable BBR (Google's Bottleneck Bandwidth and RTT algorithm)
# Significantly better throughput on modern networks vs CUBIC
sudo modprobe tcp_bbr
echo "tcp_bbr" | sudo tee -a /etc/modules-load.d/modules.conf

# Configure BBR with fq qdisc (required for BBR to work well)
echo "net.core.default_qdisc = fq" | sudo tee -a /etc/sysctl.d/99-network-performance.conf
echo "net.ipv4.tcp_congestion_control = bbr" | sudo tee -a /etc/sysctl.d/99-network-performance.conf

sudo sysctl --system

# Verify BBR is active
sysctl net.ipv4.tcp_congestion_control
# Should show: net.ipv4.tcp_congestion_control = bbr
```

BBR measures actual bandwidth and RTT rather than detecting packet loss as a congestion signal. This makes it much better for high-bandwidth paths and on lossy networks where CUBIC would unnecessarily reduce its window.

## NIC Hardware Tuning

The NIC itself has settings that affect performance:

```bash
# View current NIC settings
sudo ethtool eth0

# Check NIC capabilities
sudo ethtool -k eth0  # Offload features
sudo ethtool -g eth0  # Ring buffer sizes
sudo ethtool -c eth0  # Interrupt coalescing
sudo ethtool -l eth0  # Channel (queue) configuration

# ---- Ring Buffer Size ----
# Larger ring buffers reduce packet drops under burst traffic
sudo ethtool -G eth0 rx 4096 tx 4096
# Check max values first: sudo ethtool -g eth0 | grep "Pre-set maximums"

# ---- Interrupt Coalescing ----
# Higher values = better throughput, higher latency
# Lower values = lower latency, higher CPU usage

# For latency-sensitive applications (trading, real-time):
sudo ethtool -C eth0 rx-usecs 10 tx-usecs 10

# For high-throughput applications (bulk transfers):
sudo ethtool -C eth0 rx-usecs 100 tx-usecs 100

# ---- Hardware Offloading ----
# Enable hardware checksum offloading (usually on by default)
sudo ethtool -K eth0 rx-checksum on
sudo ethtool -K eth0 tx-checksum-ipv4 on

# TCP segmentation offload (reduces CPU load for large TCP sends)
sudo ethtool -K eth0 tso on
sudo ethtool -K eth0 gso on

# Generic receive offload (coalesces packets on receive)
sudo ethtool -K eth0 gro on
sudo ethtool -K eth0 lro on  # Large receive offload (careful: can increase latency)
```

## Making ethtool Settings Persistent

ethtool changes don't survive reboots. Use systemd-networkd or a startup script:

```bash
# Option 1: systemd-networkd link files
cat << 'EOF' | sudo tee /etc/systemd/network/10-eth0.link
[Match]
Name=eth0

[Link]
RxBufferSize=4096
TxBufferSize=4096
RxMiniBufferSize=max
RxJumboBufferSize=max
EOF

# Option 2: A startup script (simpler but less elegant)
cat << 'EOF' | sudo tee /etc/networkd-dispatcher/routable.d/50-ethtool
#!/bin/bash
# Apply ethtool settings when interface comes up

IFACE=$1

if [ "$IFACE" = "eth0" ]; then
    ethtool -G "$IFACE" rx 4096 tx 4096
    ethtool -C "$IFACE" rx-usecs 50 tx-usecs 50
fi
EOF

sudo chmod +x /etc/networkd-dispatcher/routable.d/50-ethtool
```

## Receive Side Scaling (RSS) and Flow Steering (RFS)

For multi-core systems, distribute network processing across cores:

```bash
# Check RSS queue count
sudo ethtool -l eth0 | grep "Combined:"

# Set number of receive queues (if NIC supports it)
sudo ethtool -L eth0 combined 8  # Match CPU core count

# Enable Receive Flow Steering (routes packets to the CPU that owns the socket)
# Set the RFS flow table size
echo 65535 | sudo tee /proc/sys/net/core/rps_sock_flow_entries

# Enable per-queue RFS
for i in $(ls /sys/class/net/eth0/queues/rx-*/rps_flow_cnt); do
    echo 32768 | sudo tee "$i"
done

# Enable Receive Packet Steering on queue 0
echo ff | sudo tee /sys/class/net/eth0/queues/rx-0/rps_cpus

# For a 16-core system, spread across all CPUs:
NRCPUS=$(nproc)
# Calculate CPU bitmask: 0xFFFF for 16 CPUs
echo "ffff" | sudo tee /sys/class/net/eth0/queues/rx-0/rps_cpus
```

## Jumbo Frames (MTU 9000)

If all devices on the network support it, jumbo frames reduce CPU overhead for large transfers:

```bash
# Check current MTU
ip link show eth0 | grep mtu

# Set MTU to 9000 (jumbo frames)
# Requires all devices on the path (switches, routers, NICs) to support it
sudo ip link set eth0 mtu 9000

# Persistent via netplan (/etc/netplan/01-network.yaml)
# network:
#   ethernets:
#     eth0:
#       mtu: 9000

# Test connectivity with jumbo frames
ping -M do -s 8972 192.168.1.1  # 8972 + 28 headers = 9000 bytes
```

## Monitoring Network Performance

```bash
# Real-time throughput per interface
watch -n 1 'cat /proc/net/dev'

# Nicstat (per-interface utilization)
sudo apt install nicstat -y
nicstat 1

# Packet drops and errors
ip -s link show eth0 | grep -A 2 "RX\|TX"

# Network error counters from NIC
sudo ethtool -S eth0 | grep -v ": 0"  # Show only non-zero stats

# Socket queue lengths
ss -tipn | grep -v "0 0"  # Show sockets with data in queue

# Retransmit rate (high retransmit = congestion or loss)
ss -s | grep "retrans"
cat /proc/net/netstat | grep RetransSegs

# TCP connection rate (new connections per second)
ss -ntp | awk '{print $5}' | sort | uniq -c | sort -rn | head -10
```

## Quick Verification After Tuning

```bash
# Test throughput improvement
iperf3 -c remote-server -t 60 -P 8

# Check that all settings are applied
sysctl net.core.rmem_max net.ipv4.tcp_congestion_control net.core.somaxconn
sudo ethtool -g eth0 | grep "Current hardware settings" -A 5
sudo ethtool -c eth0 | grep "Coalesce" -A 5
```

Network stack tuning is cumulative - each individual change may show modest improvement, but the combined effect of BBR, increased buffer sizes, proper ring buffers, and interrupt coalescing can double or triple throughput on high-bandwidth servers compared to defaults.
