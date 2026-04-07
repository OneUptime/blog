# How to Size a Ceph Cluster for 1PB Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity Planning, Petabyte, Storage, Infrastructure

Description: A guide to planning and sizing a Rook-Ceph cluster for petabyte-scale storage, covering erasure coding, node counts, and network architecture for 1PB deployments.

---

## Overview

At petabyte scale, Ceph remains one of the most widely deployed storage platforms in the industry. Reaching 1PB of usable capacity requires thoughtful hardware selection, erasure coding to control overhead, and a network architecture that can sustain high throughput. This guide covers the key design decisions for a 1PB Rook-Ceph deployment.

## Capacity Calculations

With 3x replication (not recommended at this scale):

```text
Raw needed = 1PB * 3 / 0.8 = 3.75PB raw
```

With erasure coding EC 8+3:

```text
EC 8+3 overhead = 1.375x
Raw needed = 1PB * 1.375 / 0.8 = 1.72PB raw
```

EC 8+3 is standard at petabyte scale, saving over 2PB of raw hardware compared to replication.

## Hardware Architecture

### Node Sizing

```text
Minimum per storage node:
  CPU: 32 cores (modern AMD EPYC or Intel Xeon)
  RAM: 128-256GB
  Drives: 20-24 HDDs (20TB each) per node
  Network: Dual 100GbE
  Management: 1GbE IPMI/BMC
```

### Cluster Topology

```yaml
Target: 1PB usable with EC 8+3

Per node capacity: 24 * 20TB = 480TB raw
Raw needed: 1.72PB = 1720TB
Capacity-only minimum: 1720 / 480 = 3.6 -> 4 nodes

EC 8+3 minimum: 11 nodes (8 data + 3 coding chunks need 11 failure domains)
Recommended for fault tolerance: 12+ nodes (1 per rack)
```

With 12 nodes at 480TB each = 5.76PB raw, yielding:

```text
5760TB / 1.375 / 1.2 = ~3.5PB usable
```

This provides 3.5x your 1PB target for comfortable growth.

## Rack-Level Fault Domain Configuration

```yaml
# Set failure domain to rack for maximum resilience
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool-petabyte
  namespace: rook-ceph
spec:
  failureDomain: rack
  erasureCoded:
    dataChunks: 8
    codingChunks: 3
```

Set Kubernetes node labels for rack topology:

```bash
kubectl label node node01 topology.kubernetes.io/zone=rack1
kubectl label node node02 topology.kubernetes.io/zone=rack1
kubectl label node node03 topology.kubernetes.io/zone=rack2
# ...continue for all nodes
```

## Network Design at Petabyte Scale

```text
Spine-leaf topology required:
  Spine switches: 100GbE uplinks
  Leaf switches: 25-100GbE to nodes
  Public network: 25GbE per node (client traffic)
  Cluster network: 100GbE per node (replication)
  Separate VLANs for public and cluster traffic
```

## Monitor and OSD Configuration

```yaml
spec:
  mon:
    count: 5     # 5 monitors for petabyte clusters
    allowMultiplePerNode: false
  mgr:
    count: 2
  storage:
    useAllNodes: false
    nodes:
    - name: "storage-node-01"
      devices:
      - name: "/dev/sd[b-y]"   # 20 drives per node
```

## CRUSH Map Customization

At 1PB scale, you will need a custom CRUSH map to reflect your rack topology:

```bash
# Export the CRUSH map
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd getcrushmap -o /tmp/crush.bin

ceph-deosd -i /tmp/crush.bin -o /tmp/crush.txt

# Edit crush.txt to define rack buckets
# ...then compile and apply
ceph-osd -i /tmp/crush.txt -o /tmp/crush-new.bin
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd setcrushmap -i /tmp/crush-new.bin
```

## PG Autoscaler and Balancer

```bash
# Enable the balancer
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mgr module enable balancer
ceph balancer mode upmap
ceph balancer on

# Enable PG autoscaler
ceph mgr module enable pg_autoscaler
ceph config set global osd_pool_default_pg_autoscale_mode on
```

## Summary

Sizing a Ceph cluster for 1PB of usable storage requires EC 8+3 erasure coding to avoid provisioning over 3PB of raw hardware, a rack-level failure domain topology for true resilience, and 100GbE networking on the cluster network to sustain replication and recovery at scale. With 12 or more storage nodes, a 1PB deployment comfortably handles growth while maintaining fault tolerance across rack failures.
