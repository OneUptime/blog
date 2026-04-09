# How to Optimize Recovery for Large Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Performance, Large Cluster, Storage

Description: Learn how to optimize Ceph OSD recovery for large clusters by tuning concurrency, threading, network, and PG settings to minimize recovery time at scale.

---

## Large Cluster Recovery Challenges

In clusters with hundreds of OSDs and petabytes of data, even a single OSD failure can require terabytes of data movement. Default recovery settings designed for small clusters are often too conservative for large-scale deployments.

Key challenges:
- High data volume per OSD prolongs degraded state
- Many concurrent recovery operations can overwhelm network
- PG count distribution affects parallelism
- Monitoring recovery across many OSDs is complex

## Increasing Recovery Parallelism

### Raise recovery concurrency per OSD

```bash
ceph config set osd osd_recovery_max_active 5
ceph config set osd osd_max_backfills 2
```

For NVMe-based large clusters:

```bash
ceph config set osd osd_recovery_max_active 10
ceph config set osd osd_max_backfills 4
```

### Remove recovery sleep for fast storage

```bash
ceph config set osd osd_recovery_sleep_ssd 0
ceph config set osd osd_recovery_sleep 0
```

## Optimizing Network for Recovery

Large clusters have more total recovery traffic. Ensure your cluster network is dedicated and properly configured:

```bash
ceph config get global cluster_network
```

Increase recovery message chunk sizes:

```bash
ceph config set osd osd_recovery_max_chunk 16777216
```

This sets recovery chunk size to 16 MB for better network efficiency on fast networks.

## PG Count and Recovery Efficiency

More PGs mean better parallelism during recovery but also more overhead. For large clusters, ensure PG counts are sized correctly:

```bash
ceph osd pool get <pool-name> pg_num
ceph osd pool get <pool-name> pgp_num
```

Use the PG autoscaler to keep PG counts optimal:

```bash
ceph osd pool set <pool-name> pg_autoscale_mode on
```

## Monitoring Recovery at Scale

Track recovery progress across all OSDs:

```bash
ceph osd df tree | sort -k7 -n -r | head -20
ceph pg dump pools | awk '{print $1, $15}' | sort -k2 -n -r
```

Create a recovery dashboard with Prometheus:

```text
sum(ceph_pg_recovering_bytes_per_sec) by (pool_id)
sum(ceph_pg_degraded) by (pool_id)
```

## Prioritizing Critical Pools

For large clusters with multiple pools, prioritize recovery for the most critical pools:

```bash
ceph osd pool set critical-pool recovery_priority 10
ceph osd pool set archival-pool recovery_priority -5
```

## Rook Large Cluster Tuning

Apply optimized settings via CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      osd_recovery_max_active: "5"
      osd_max_backfills: "2"
      osd_recovery_sleep_ssd: "0"
      osd_recovery_max_chunk: "16777216"
      osd_recovery_op_priority: "10"
```

## Summary

Optimizing recovery for large Ceph clusters involves raising recovery concurrency, eliminating unnecessary sleep delays on fast storage, increasing chunk sizes for network efficiency, and prioritizing critical pools. Monitoring recovery rate per pool through Prometheus dashboards provides visibility at scale. Rook's CephCluster CRD provides a centralized way to manage these settings across the entire cluster.
