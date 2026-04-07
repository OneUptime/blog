# How to Size a Ceph Cluster for Kubernetes PVCs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, PVC, Capacity Planning, Storage

Description: Learn how to size a Rook-Ceph cluster based on Kubernetes PVC demand, covering thin provisioning, overcommit ratios, and workload-driven capacity planning.

---

## Overview

Kubernetes PersistentVolumeClaims (PVCs) backed by Rook-Ceph can be RBD block volumes or CephFS files. The key challenge is that Kubernetes allows PVCs to be provisioned well beyond actual usage (thin provisioning), so you must plan capacity based on both requested size and expected actual utilization. This guide covers PVC-centric sizing strategies for Rook-Ceph.

## Understanding Thin Provisioning

When a pod claims a 100GB PVC, Ceph does not immediately allocate 100GB. Data is written as the application uses the volume:

```bash
# PVC requests 100GB
kubectl get pvc my-db-pvc -o jsonpath='{.spec.resources.requests.storage}'
# 100Gi

# Actual data in the RBD image
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rbd du csi-rbd-pool/csi-vol-abc123
# PROVISIONED  USED
# 100 GiB      12 GiB
```

## Calculating PVC-Driven Capacity

Gather PVC usage data across your cluster:

```bash
# Total requested PVC storage
kubectl get pvc -A -o json | \
  python3 -c "
import sys, json
pvcs = json.load(sys.stdin)['items']
total = sum(
  int(p['spec']['resources']['requests'].get('storage','0').replace('Gi',''))
  for p in pvcs if p.get('status',{}).get('phase') == 'Bound'
)
print(f'Total PVC requested: {total} GiB')
"
```

## Overcommit Ratio Approach

Most platforms use an overcommit ratio between 1.5x and 3x:

```yaml
Overcommit ratio = Total PVC requested / Actual cluster capacity

Conservative: 1.5x (actual usage expected to be 60-70% of requested)
Moderate: 2x (typical for mixed workloads)
Aggressive: 3x (dev/test environments with many unused PVCs)
```

Example sizing:

```text
200 PVCs averaging 50GB each = 10TB requested
With 2x overcommit: cluster needs 5TB usable
With 3x replication: 5TB * 3 / 0.8 = 18.75TB raw
```

## PVC Demand Forecasting

Track PVC growth over time with a simple script:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
TOTAL=$(kubectl get pvc -A --no-headers | awk '{print $5}' | \
  sed 's/Gi//' | awk '{sum+=$1} END {print sum}')
echo "$DATE,$TOTAL" >> /var/log/pvc-capacity.csv
echo "Total PVC capacity requested: ${TOTAL}Gi"
```

## StorageClass Quotas via ResourceQuota

Limit per-namespace PVC consumption to prevent runaway requests:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-a
spec:
  hard:
    requests.storage: "5Ti"
    rook-ceph-block.storageclass.storage.k8s.io/requests.storage: "3Ti"
    rook-cephfs.storageclass.storage.k8s.io/requests.storage: "2Ti"
```

## VolumeExpansion for Growing PVCs

Rook-Ceph StorageClasses support online volume expansion without pod restart:

```bash
# Expand a PVC from 50GB to 100GB
kubectl patch pvc my-db-pvc -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Verify expansion
kubectl get pvc my-db-pvc
```

## Monitoring PVC Utilization

Use Prometheus queries to track actual vs. requested:

```text
# Actual bytes used per PVC
kubelet_volume_stats_used_bytes{namespace="production"}

# PVC capacity
kubelet_volume_stats_capacity_bytes{namespace="production"}

# Utilization ratio
kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes
```

## Summary

Sizing Rook-Ceph for Kubernetes PVCs requires understanding the gap between requested PVC sizes and actual data written, choosing an appropriate overcommit ratio, and applying namespace-level ResourceQuotas to keep PVC requests predictable. Monitor actual `kubelet_volume_stats_used_bytes` via Prometheus to track real utilization trends and plan capacity expansion before overcommit limits are breached.
