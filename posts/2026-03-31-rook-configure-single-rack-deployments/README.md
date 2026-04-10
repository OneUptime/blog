# How to Configure Ceph for Single-Rack Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Single Rack, CRUSH, Deployment, Configuration

Description: Configure Rook-Ceph for single-rack environments where all nodes share a top-of-rack switch, with appropriate CRUSH rules and network redundancy considerations.

---

## Single-Rack Limitations

In a single-rack deployment, all Ceph nodes share the same top-of-rack (ToR) switch. This means a switch failure takes down the entire cluster. Understanding and designing around this limitation is essential for production single-rack Ceph.

## CRUSH Failure Domain for Single Rack

With all hosts in one rack, the failure domain must be set to `host` (not `rack`) to maintain data protection:

```bash
# Verify CRUSH map uses host as failure domain
ceph osd crush rule ls
ceph osd crush rule dump replicated_rule

# Default replicated_rule uses host failure domain - this is correct
# If you see rack, and you only have one rack, change to host
ceph osd crush rule create-replicated single-rack-rule default host
```

## Configure Pool with Host Failure Domain

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host   # Must be "host" for single rack
  replicated:
    size: 3
    requireSafeReplicaSize: true
```

## Network Redundancy in a Single Rack

```bash
# Mitigate ToR switch failure with bonded NICs
# Use two ToR switches with MLAG/VPC bonding

# Check NIC bonding status
cat /proc/net/bonding/bond0

# Configure Ceph to use bonded interface via host networking
# In CephCluster spec:
# With host networking, Ceph daemons use the host network stack directly,
# including bonded interfaces. Use addressRanges to specify which subnets
# correspond to each bond.
spec:
  network:
    provider: "host"
    addressRanges:
      public:
        - "192.168.100.0/24"   # Subnet on bond0
      cluster:
        - "192.168.200.0/24"   # Subnet on bond1
```

## Node Placement Within the Rack

```yaml
# Spread monitors across different PDUs/power circuits
# Use topology labels to track power circuit assignment
apiVersion: v1
kind: Node
metadata:
  labels:
    topology.kubernetes.io/zone: rack1-pdu-a   # Power circuit label
```

## Monitor Anti-Affinity for Power Domains

```yaml
# Spread monitors across different power circuits
spec:
  placement:
    mon:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 50
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: rook-ceph-mon
              topologyKey: topology.kubernetes.io/zone
```

## Ceph Configuration for Single-Rack Latency

```bash
# Single rack = low latency within cluster
# Optimize for low-latency operations
ceph config set osd osd_op_queue mclock_scheduler
ceph config set osd osd_mclock_profile high_recovery_ops

# Single rack = no need for WAN-optimized settings
ceph config set global ms_dispatch_throttle_bytes 104857600  # 100 MB (default value; ensures WAN-reduced settings are not in effect)
```

## Capacity Planning for Single Rack

```bash
# Typical single-rack limits:
# 20-42 nodes per rack depending on chassis size
# 10-20 drives per node = 200-840 drives per rack
# At 4 TB per drive: 800 TB - 3.4 PB raw
# With 3x replication: 267 TB - 1.1 PB usable

# Check current rack utilization
ceph df
ceph osd df tree
```

## Summary

Single-rack Rook-Ceph deployments must use host-level failure domains to maintain data protection despite the shared switch risk. Redundant bonded NICs across two ToR switches mitigate the most common single-rack failure scenario. Spreading monitors across different power circuits adds an additional layer of availability.
