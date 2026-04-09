# How to Handle Full CephFS Filesystems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Capacity, Troubleshooting

Description: Learn how to detect, respond to, and prevent CephFS filesystem full conditions in Rook-Ceph Kubernetes deployments.

---

## Understanding CephFS Full Conditions

When a CephFS filesystem approaches or reaches its capacity limit, Ceph enforces a tiered set of restrictions to protect data integrity. There are three threshold levels:

- **nearfull** - Warning threshold, typically 85% used
- **backfillfull** - Backfill operations stop, typically 90% used
- **full** - All writes are blocked, typically 95% used

In Rook-Ceph Kubernetes environments, a full filesystem means pods with CephFS PVCs will receive `ENOSPC` errors, causing application failures.

## Step 1 - Detect the Full Condition

Check the cluster status for full warnings:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph status
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph df
```

Identify which pools are consuming the most space:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph osd df tree
```

## Step 2 - Create Emergency Space

If writes are blocked, temporarily increase the full ratio to allow cleanup operations:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph osd set-full-ratio 0.97

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph osd set-nearfull-ratio 0.90
```

This gives a small window to delete files and free space. Revert these ratios after resolving the capacity issue.

## Step 3 - Identify Large Files and Directories

Use CephFS directory statistics to find the largest consumers:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs subvolume ls myfs --group_name <groupname>

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs subvolume info myfs <subvolname> --group_name <groupname>
```

## Step 4 - Expand Pool Capacity

If additional OSDs are available, increase the data pool size by adding OSDs to the cluster. Update the `CephCluster` spec to include new storage devices:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    nodes:
    - name: "worker-4"
      devices:
      - name: "sdb"
      - name: "sdc"
```

## Step 5 - Set Filesystem Quotas to Prevent Recurrence

Apply subvolume quotas to prevent individual workloads from consuming all capacity:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs subvolume resize myfs <subvolname> 107374182400 --group_name <groupname> --no_shrink
```

For directory-level quotas using CephFS extended attributes:

```bash
setfattr -n ceph.quota.max_bytes -v 10737418240 /mnt/cephfs/mydir
setfattr -n ceph.quota.max_files -v 1000000 /mnt/cephfs/mydir
```

## Step 6 - Configure Prometheus Alerts for Capacity

Set up alerting before reaching fullness:

```yaml
groups:
- name: ceph-capacity
  rules:
  - alert: CephStorageNearFull
    expr: ceph_cluster_total_used_bytes / ceph_cluster_total_bytes > 0.80
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster storage is above 80% capacity"
  - alert: CephStorageFull
    expr: ceph_cluster_total_used_bytes / ceph_cluster_total_bytes > 0.92
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster storage is critically full"
```

## Summary

A full CephFS filesystem in Rook-Ceph blocks all writes and causes application failures. Immediate remediation involves temporarily raising the full ratio to allow cleanup, identifying large consumers, and expanding pool capacity by adding OSDs. Long-term prevention requires setting subvolume quotas and configuring Prometheus alerts to notify well before the nearfull threshold is reached.
