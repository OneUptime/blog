# How to Deploy Ceph on Edge Computing Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Edge Computing, Kubernetes, Deployment

Description: Learn how to deploy a minimal Rook-Ceph cluster on resource-constrained edge computing nodes while maintaining data durability and availability.

---

Edge computing locations present unique challenges for Ceph: limited hardware resources, restricted network bandwidth, and the need to operate semi-autonomously. A properly configured edge Ceph deployment provides local persistent storage with eventual synchronization to the core.

## Hardware Considerations for Edge

A minimal edge Ceph cluster needs:
- 3 nodes for quorum (minimum for HA) or 1 node for non-HA
- 2 GB RAM per OSD daemon (minimum recommended by Ceph)
- At least 1 data disk per node
- Gigabit networking between nodes

## Deploying a Minimal Rook-Ceph Cluster

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph-edge
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 1
  dashboard:
    enabled: false
  monitoring:
    enabled: false
  network:
    provider: host
  resources:
    mon:
      requests:
        cpu: "200m"
        memory: "512Mi"
      limits:
        cpu: "500m"
        memory: "1Gi"
    osd:
      requests:
        cpu: "200m"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
    mgr:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
    - name: sdb
```

## Reducing Memory Footprint

Tune Ceph for low memory environments:

```bash
ceph config set osd osd_memory_target 2147483648
```

Reduce the number of PGs for small clusters:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: edge-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 2
  parameters:
    pg_num: "32"
    pgp_num: "32"
```

## Configuring for Low Bandwidth

Limit replication traffic:

```bash
ceph config set osd osd_mclock_override_recovery_settings true
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active 1
ceph config set osd osd_recovery_op_priority 3
```

## Network Isolation

Use host networking to avoid overlay network overhead on edge hardware:

```yaml
network:
  provider: host
  addressRanges:
    public:
      - "192.168.1.0/24"
    cluster:
      - "10.0.0.0/24"
```

## Verifying the Edge Deployment

```bash
kubectl -n rook-ceph get pods
ceph -s
ceph osd tree
```

Expected output:

```yaml
cluster:
  id: ...
  health: HEALTH_OK
services:
  mon: 3 daemons, quorum a,b,c
  mgr: a(active)
  osd: 3 osds: 3 up, 3 in
```

## Summary

Deploying Ceph on edge nodes requires careful resource tuning to fit within tight memory and CPU budgets while maintaining the reliability guarantees needed for local storage. Using host networking, reducing PG counts, and limiting recovery traffic allows Rook-Ceph to run effectively on modest hardware at the edge.
