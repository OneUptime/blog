# How to Choose Network Cards and Bandwidth for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network, Hardware, Bandwidth, NIC, Infrastructure

Description: Choose the right network cards and bandwidth for Ceph clusters by understanding public vs cluster network requirements, bonding strategies, and how I/O patterns affect network sizing.

---

## Overview

Network is often the performance bottleneck in Ceph clusters. Ceph uses two logical networks: the public network for client access and the cluster network for OSD replication. Proper NIC selection and bandwidth provisioning ensures neither network becomes a bottleneck.

## Ceph's Two-Network Architecture

```text
Public Network: Clients -> MON, MDS, RGW, OSD
Cluster Network: OSD -> OSD (replication, recovery, backfill)
```

Separating these networks prevents recovery traffic from saturating client-facing bandwidth.

## Step 1 - Calculate Required Public Network Bandwidth

```bash
# Estimate based on client I/O expectations
# Example: 100 clients each doing 1 Gb/s = 100 Gb/s total
# With 10 OSD nodes: 10 Gb/s per node

# Rule: public network >= peak client throughput per node
# For 10 Gb/s per node: minimum 10 GbE, recommended 25 GbE
```

## Step 2 - Calculate Required Cluster Network Bandwidth

```bash
# Cluster network carries replicated writes
# For 3x replication: each write generates 2 extra copies
# If clients write 5 Gb/s: cluster network needs 10 Gb/s (2 copies x 5 Gb/s)

# During recovery: entire OSD data set rebalances
# 12 x 4 TB HDDs = 48 TB per node recovers at ~200 MB/s per HDD
# 12 HDDs x 200 MB/s = 2.4 GB/s recovery per node
# Cluster network: 10 GbE sufficient for HDD, 25 GbE for SSD
```

## Step 3 - NIC Recommendations by Cluster Size

Small cluster (3-10 nodes, HDD):

```yaml
network:
  public: "2 x 10 GbE bonded (LACP)"
  cluster: "2 x 10 GbE bonded (LACP)"
  total_ports_per_node: 4
```

Medium cluster (10-30 nodes, SSD):

```yaml
network:
  public: "25 GbE single or 2 x 10 GbE bonded"
  cluster: "25 GbE single"
  total_ports_per_node: 2
```

Large cluster (30+ nodes, NVMe):

```yaml
network:
  public: "100 GbE"
  cluster: "100 GbE"
  total_ports_per_node: 2
```

## Step 4 - Configure Rook with Separate Networks

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
        - "10.0.2.0/24"
```

Or using Multus with NetworkAttachmentDefinitions:

```yaml
spec:
  network:
    provider: multus
    selectors:
      public: rook-ceph/ceph-public
      cluster: rook-ceph/ceph-cluster
```

## Step 5 - Bond NICs for Redundancy

```bash
# Configure active-backup bond for resilience
cat > /etc/netplan/bond0.yaml << 'EOF'
network:
  bonds:
    bond0:
      interfaces: [eth0, eth2]
      parameters:
        mode: active-backup
        primary: eth0
        mii-monitor-interval: 100
      addresses: ["10.0.1.10/24"]
  version: 2
EOF

netplan apply
```

For higher throughput with LACP (requires switch support):

```bash
# LACP bond
parameters:
  mode: 802.3ad
  lacp-rate: fast
  transmit-hash-policy: layer3+4
```

## Step 6 - Tune Network Settings for Ceph

```bash
# Increase socket buffers for high-throughput Ceph
cat >> /etc/sysctl.conf << 'EOF'
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 300000
net.ipv4.tcp_congestion_control = bbr
EOF

sysctl -p
```

## Step 7 - Monitor Network Utilization

```bash
# Check per-OSD latency (high latency may indicate network issues)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd perf

# Monitor interface utilization
sar -n DEV 1 5 | grep -E "eth|bond"
```

## Summary

Ceph network sizing starts with calculating peak client throughput and recovery bandwidth requirements separately for public and cluster networks. For production clusters, 25 GbE with NIC bonding for redundancy is the current sweet spot for SSD-based clusters. Configuring dedicated networks in Rook ensures replication and recovery traffic never impacts client I/O, which is critical for maintaining consistent latency.
