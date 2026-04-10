# How to Configure Replicated Block Storage Pools in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Block Storage, Replication, CephBlockPool, Kubernetes

Description: Configure replicated block storage pools in Rook-Ceph with tunable replica counts, failure domains, and placement policies for production reliability.

---

## Replicated Pool Fundamentals

A replicated Ceph pool stores N complete copies of every object across different OSDs. The `size` setting controls the total copy count (primary plus replicas), while `min_size` defines the minimum copies required to allow I/O. The standard production configuration is `size: 3` with `min_size: 2`, meaning data survives one full OSD or host failure with no I/O interruption.

## Basic Replicated Pool Configuration

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
    requireSafeReplicaSize: true
```

The `requireSafeReplicaSize: true` flag prevents accidentally setting `size: 1`, which would result in a pool with no redundancy.

## Tuning Replica Count

For development or cost-sensitive environments you may use two replicas:

```yaml
spec:
  failureDomain: host
  replicated:
    size: 2
    requireSafeReplicaSize: false
```

For highly critical data with cross-zone redundancy, increase to five replicas and set the failure domain to zone:

```yaml
spec:
  failureDomain: zone
  replicated:
    size: 5
```

Verify the effective `size` and `min_size` after applying:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool size
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool min_size
```

## Configuring Replicas Per Failure Domain

Rook supports advanced sub-failure-domain placement via `replicasPerFailureDomain` and `subFailureDomain`. This places exactly one copy in each failure domain bucket:

```yaml
spec:
  failureDomain: host
  replicated:
    size: 3
    replicasPerFailureDomain: 1
    subFailureDomain: osd
```

Use this when you have multiple OSDs per host and want each OSD to hold at most one copy.

## Hybrid Mode: Replicated with Device Class

Combine replication with device class targeting so replicas land exclusively on SSD OSDs:

```yaml
spec:
  failureDomain: host
  deviceClass: ssd
  replicated:
    size: 3
```

If you have a mix of HDD and SSD OSDs, this ensures the pool avoids spinning disks entirely.

## Pool Parameters

Additional Ceph pool parameters can be set via the `parameters` field:

```yaml
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    # Compression mode: none, passive, aggressive, force
    compression_mode: passive
    # Target pg count (let Ceph autoscale by default)
    pg_autoscale_mode: "on"
```

## Setting Pool Quotas

Prevent a single pool from consuming all cluster capacity:

```yaml
spec:
  failureDomain: host
  replicated:
    size: 3
  quotas:
    maxSize: "500Gi"
    maxObjects: 5000000
```

Check quota enforcement:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get-quota replicapool
```

## Verifying Placement Group Health

After pool creation, confirm PGs are in `active+clean` state:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

If PGs remain in `undersized` or `degraded`, check OSD count and failure domain configuration. With `size: 3` and `failureDomain: host`, you need at least three hosts with OSDs.

## Summary

Replicated block storage pools in Rook provide straightforward redundancy tuning through the `size`, `min_size`, `failureDomain`, and `deviceClass` fields. Start with `size: 3` and `failureDomain: host` for standard production workloads, adjust to zone-level failure domains for multi-zone clusters, and use `replicasPerFailureDomain` for fine-grained placement. Always verify PG health after changes to confirm correct data distribution.
