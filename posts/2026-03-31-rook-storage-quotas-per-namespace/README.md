# How to Implement Storage Quotas Per Namespace with Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Quota, Namespace, Kubernetes, Multi-Tenant

Description: Enforce storage quotas per Kubernetes namespace using Ceph pool quotas, CephFS subvolume quotas, and Kubernetes ResourceQuota objects with Rook-Ceph.

---

## Why Namespace Storage Quotas Matter

Without quotas, a single namespace can exhaust the entire Ceph cluster's capacity, impacting all other tenants. Kubernetes ResourceQuota objects combined with Ceph pool-level quotas create a two-layer enforcement model.

## Layer 1: Kubernetes ResourceQuota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-a
spec:
  hard:
    # Total PVC storage requests
    requests.storage: "1Ti"
    # Per-StorageClass limits
    ceph-rbd-fast.storageclass.storage.k8s.io/requests.storage: "500Gi"
    ceph-rbd-bulk.storageclass.storage.k8s.io/requests.storage: "1Ti"
    # Number of PVCs
    persistentvolumeclaims: "20"
```

## Layer 2: Ceph Pool Quotas

Set quotas directly on the Ceph pool:

```bash
# Set pool quota for team-a's dedicated pool
ceph osd pool set-quota team-a-pool max_bytes 1099511627776   # 1 TB
ceph osd pool set-quota team-a-pool max_objects 10000000

# Verify quota settings
ceph osd pool get-quota team-a-pool
```

## Configure Pool Quotas via Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: team-a-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  quotas:
    maxSize: "1Ti"
    maxObjects: 10000000
```

## CephFS Quotas for Shared Filesystems

For shared CephFS deployments, use subvolume groups with quotas:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystemSubVolumeGroup
metadata:
  name: team-a-subvolumegroup
  namespace: rook-ceph
spec:
  filesystemName: cephfs
  quota: "500Gi"
```

## Monitor Quota Usage

```bash
# Check Kubernetes ResourceQuota usage
kubectl describe resourcequota storage-quota -n team-a

# Check Ceph pool quota usage
ceph df detail | grep team-a-pool

# Alert when approaching quota (Prometheus rule)
# ceph_pool_stored_raw / ceph_pool_quota_bytes > 0.85
```

## Automate Quota Enforcement with Admission Controller

Use a ValidatingAdmissionWebhook or OPA/Gatekeeper policy to prevent PVCs from exceeding pool quotas:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sStorageQuotaLimit
metadata:
  name: storage-class-quota
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["PersistentVolumeClaim"]
  parameters:
    maxStoragePerNamespace:
      "ceph-rbd-fast": "500Gi"
      "ceph-rbd-bulk": "2Ti"
```

## Handle Quota Exceeded Events

```bash
# Watch for PVC creation failures due to quota
kubectl get events -n team-a | grep "exceeded quota"

# Temporarily raise quota in emergency
kubectl patch resourcequota storage-quota -n team-a \
  --type=merge \
  -p '{"spec":{"hard":{"requests.storage":"1.5Ti"}}}'
```

## Summary

Namespace storage quotas in Rook-Ceph use a two-layer approach: Kubernetes ResourceQuota objects enforce limits at the API server level, while Ceph pool quotas provide a hard backstop at the storage layer. CephFS subvolume groups add filesystem-level quotas for shared filesystem workloads. Together, these prevent any single tenant from exhausting cluster capacity.
