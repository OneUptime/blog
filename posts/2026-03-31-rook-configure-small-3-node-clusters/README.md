# How to Configure Ceph for Small (3-Node) Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Small Cluster, 3-Node, Configuration, Minimum

Description: Configure a production-grade Rook-Ceph cluster on just 3 nodes with proper replication, monitor placement, and resource limits for small-scale deployments.

---

## Constraints of 3-Node Ceph

A 3-node Ceph cluster is the minimum for fault tolerance with standard 3x replication. Each node hosts one OSD replica, so losing one node is survivable but losing two means data loss. Proper configuration is critical to avoid accidental cluster failure.

## Minimum Viable CephCluster

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false  # Never allow 2 mons on same node
  mgr:
    count: 1   # Only 1 MGR on 3-node cluster to save resources
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: "sdb"
  resources:
    osd:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
    mon:
      requests:
        cpu: "250m"
        memory: "512Mi"
```

## Pool Configuration for 3-Node Safety

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true  # Block writes if < 2 replicas available (min_size=2 for size 3)
```

## Prevent Single Points of Failure

```bash
# Verify monitors are spread across all 3 nodes
kubectl get pods -n rook-ceph -l app=rook-ceph-mon -o wide

# If two monitors are on the same node, adjust affinity
kubectl describe pod rook-ceph-mon-a-xxxxx | grep Node:
```

## Monitor Anti-Affinity

```yaml
spec:
  placement:
    mon:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: rook-ceph-mon
            topologyKey: kubernetes.io/hostname
```

## Set nearfull Ratios Appropriately

On small clusters, the nearfull threshold matters more:

```bash
# With 3 nodes, losing 1 means 33% capacity loss
# Set conservative thresholds
ceph osd set-nearfull-ratio 0.70
ceph osd set-backfillfull-ratio 0.80
ceph osd set-full-ratio 0.90
```

## Reduce Resource Overhead

```bash
# On small clusters, reduce Ceph telemetry and background tasks
ceph config set global mon_max_pg_per_osd 200
ceph mgr module disable telemetry  # Optional

# Limit PG count per pool to avoid over-fragmenting small clusters
# Total PGs should be ~100 per OSD
# 3 OSDs = target ~300 total PGs across all pools
```

## Simulate Node Failure

```bash
# Test fault tolerance before going to production
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data

# Check cluster health with one node down
watch ceph status
# Should show HEALTH_WARN but remain operational

# Restore
kubectl uncordon worker-01
```

## Summary

A 3-node Rook-Ceph cluster is the minimum fault-tolerant configuration. Critical settings include 3 monitors with strict anti-affinity, `requireSafeReplicaSize: true` for all pools, conservative nearfull thresholds, and reduced resource limits to leave capacity for application workloads on small servers.
