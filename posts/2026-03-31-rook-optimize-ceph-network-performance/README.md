# How to Optimize Ceph Network Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, Performance, Optimization, Storage

Description: Optimize Ceph cluster network performance through TCP tuning, separate public and cluster networks, jumbo frames, NIC offloads, and interrupt affinity configuration.

---

## Network Architecture for Ceph

Ceph uses two logical networks:
- **Public network**: Client-to-OSD and MON-to-client traffic
- **Cluster network**: OSD-to-OSD replication, recovery, and heartbeat traffic

Separating these prevents recovery traffic from starving client I/O bandwidth.

## Checking Current Network Configuration

```bash
# View Ceph network config
ceph config get mon public_network
ceph config get osd cluster_network

# Check network throughput between nodes
iperf3 -s   # on server
iperf3 -c <server-ip> -P 4 -t 30   # on client

# Measure round-trip latency
ping -c 100 <osd-node-ip> | tail -2
```

## TCP Kernel Parameter Tuning

Apply these settings to all Ceph nodes:

```bash
cat > /etc/sysctl.d/99-ceph-network.conf << 'EOF'
# Increase TCP socket buffers for high-throughput storage traffic
net.core.rmem_default = 16777216
net.core.wmem_default = 16777216
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 87380 134217728

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1

# Increase backlog queue
net.core.somaxconn = 32768
net.core.netdev_max_backlog = 32768

# Use BBR congestion control for high-bandwidth connections
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Reduce TIME_WAIT connections
net.ipv4.tcp_max_tw_buckets = 65536
net.ipv4.tcp_tw_reuse = 1
EOF

sysctl -p /etc/sysctl.d/99-ceph-network.conf
```

## NIC Driver and Offload Tuning

Enable hardware offloads to reduce CPU overhead:

```bash
# Check current offload settings
ethtool -k eth0 | grep -E "tcp-segmentation|scatter-gather|generic"

# Enable TSO and GRO for throughput
ethtool -K eth0 tso on gro on lro on

# Increase ring buffer sizes
ethtool -g eth0   # view current ring sizes
ethtool -G eth0 rx 4096 tx 4096

# Set interrupt coalescing for better throughput
ethtool -C eth0 rx-usecs 50 tx-usecs 50
```

## Configuring Separate Networks in Rook

Separate public and cluster networks in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host
    addressRanges:
      public:
        - "10.0.1.0/24"
      cluster:
        - "192.168.10.0/24"
```

With Multus for Kubernetes network isolation:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/ceph-public
      cluster: rook-ceph/ceph-cluster
```

## IRQ Affinity for High-Throughput NICs

Bind NIC interrupts to specific CPU cores to reduce cross-NUMA traffic:

```bash
# Install irqbalance (or use manual affinity)
dnf install -y irqbalance

# For manual affinity on 10GbE NICs:
# Find NIC IRQ numbers
cat /proc/interrupts | grep eth0

# Bind to specific CPUs (CPU 4-7 for the NIC)
for irq in $(grep eth0 /proc/interrupts | awk '{print $1}' | tr -d ':'); do
  echo "f0" > /proc/irq/$irq/smp_affinity  # CPUs 4-7 in hex bitmask
done
```

## Monitoring Network Performance

Track network metrics on Ceph nodes:

```bash
# Real-time bandwidth per interface
sar -n DEV 1 10 | grep eth0

# Check for packet drops and errors
netstat -s | grep -E "drop|error|retransmit"

# OSD messenger stats
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "msgr|bytes"

# Prometheus metrics for network
ceph mgr module enable prometheus
# Scrape http://mgr-node:9283/metrics | grep ceph_osd_recovery_bytes
```

## Ceph Messenger Configuration

Tune the Ceph messenger for high-throughput environments:

```bash
# Increase messenger thread count
ceph config set osd ms_async_op_threads 8
ceph config set osd ms_dispatch_throttle_bytes 1073741824  # 1 GB

# Enable compression for inter-OSD traffic (saves bandwidth at CPU cost)
ceph config set osd ms_osd_compress_mode force
ceph config set osd ms_compress_secure false
```

## Summary

Ceph network performance depends on TCP buffer sizes, NIC offload settings, interrupt affinity, and separate network planes for public and cluster traffic. Applying BBR congestion control and increasing socket buffers to 128 MB dramatically improves high-throughput replication performance. Separate public and cluster networks prevent recovery traffic from competing with client I/O, which is especially important during OSD failure recovery events.
