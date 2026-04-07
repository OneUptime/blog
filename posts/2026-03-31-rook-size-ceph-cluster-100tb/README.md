# How to Size a Ceph Cluster for 100TB Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity Planning, Storage, Kubernetes, Infrastructure

Description: Learn how to size a Rook-Ceph cluster for 100TB of usable storage, including node counts, OSD planning, network requirements, and pool configuration.

---

## Overview

Scaling Ceph to 100TB requires careful planning across compute, storage, and networking. At this scale, decisions about OSD drive size, replication versus erasure coding, and network topology have significant cost and performance implications. This guide walks through the key calculations and configuration recommendations for a 100TB Rook-Ceph deployment.

## Capacity Calculation

With 3x replication and a 20% safety buffer:

```text
Raw needed = 100TB * 3 / 0.8 = 375TB raw minimum
```

Consider erasure coding (EC) at this scale to reduce overhead:

```text
EC 4+2 overhead = 1.5x  (vs 3x for replication)
Raw needed with EC 4+2: 100TB * 1.5 / 0.8 = 188TB raw
```

EC 4+2 cuts raw storage requirements nearly in half, making it the preferred choice at 100TB scale.

## Node and OSD Planning

### Option A: 12 nodes with 8TB drives (replication)

```text
12 nodes * 8 drives * 8TB = 768TB raw
Usable (3x): 768 / 3 / 1.2 = 213TB
```

### Option B: 8 nodes with 8TB drives (EC 4+2)

```text
8 nodes * 10 drives * 8TB = 640TB raw
Usable (EC 4+2): 640 / 1.5 / 1.2 = 356TB
```

Option B offers far better storage efficiency at comparable hardware cost.

## Recommended Node Specs at 100TB Scale

```yaml
# Per-node hardware recommendation
CPU: 16-24 cores
RAM: 64-128GB
Network: Dual 25GbE (storage + replication on separate VLANs)
OSDs: 8-12 NVMe or 10-16 HDD drives per node
Journals/WAL: Dedicated NVMe for HDD OSD journals
```

## Network Architecture

At 100TB scale, a flat 10GbE network becomes a bottleneck. Use dedicated storage networks:

```yaml
Public network:   25GbE (client I/O)
Cluster network:  25GbE (OSD replication, recovery)
Management:       1GbE (admin access)
```

Configure Rook to use separate networks:

```yaml
spec:
  network:
    provider: host
    selectors:
      public: "storage-public"
      cluster: "storage-cluster"
```

## Erasure Coding Pool Configuration

```bash
# Create an EC profile
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd erasure-code-profile set ec-profile-4-2 \
    k=4 m=2 crush-failure-domain=host

# Create an EC pool
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool create ec-pool 128 128 erasure ec-profile-4-2
```

Or via Rook CephBlockPool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool-100tb
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  failureDomain: host
```

## Monitor and Manager Counts

```yaml
# For 100TB cluster (8-12 nodes)
spec:
  mon:
    count: 5        # Use 5 mons for higher quorum resilience
  mgr:
    count: 2        # Always maintain active + standby
```

## PG Count Guidance

At 100TB scale with many pools, follow the PG autoscaler recommendation:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

Target 100-200 PGs per OSD for optimal performance. Enable PG autoscaler:

```bash
ceph mgr module enable pg_autoscaler
ceph osd pool set ec-pool-100tb pg_autoscale_mode on
```

## Summary

Sizing a Ceph cluster for 100TB usable storage is most cost-efficient with erasure coding (4+2), which cuts raw capacity requirements from 375TB to under 200TB compared to 3x replication. Plan for 8-12 beefy nodes with 25GbE dual-homed networking, enable PG autoscaling, and separate public and cluster networks to sustain the higher replication and recovery traffic at this scale.
