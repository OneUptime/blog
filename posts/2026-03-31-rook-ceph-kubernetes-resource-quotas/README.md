# How to Use Ceph with Kubernetes Resource Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Resource Quota, Storage, Multi-Tenancy

Description: Apply Kubernetes ResourceQuotas to control storage consumption per namespace when using Rook-Ceph as the storage backend.

---

## Introduction

Without resource quotas, any namespace can consume unlimited Ceph storage, potentially starving other workloads. Kubernetes ResourceQuotas apply per-namespace limits on PVC counts and storage capacity. This guide shows how to enforce them with Rook-Ceph StorageClasses.

## Applying a Basic Storage Quota

Limit total storage and PVC count in a namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-a
spec:
  hard:
    requests.storage: "200Gi"
    persistentvolumeclaims: "10"
```

Apply and inspect:

```bash
kubectl apply -f storage-quota.yaml
kubectl describe resourcequota storage-quota -n team-a
```

## Scoping Quotas to a StorageClass

You can scope quotas to a specific Rook-Ceph StorageClass, allowing teams to use other storage classes without consuming the Ceph quota:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ceph-block-quota
  namespace: team-b
spec:
  hard:
    rook-ceph-block.storageclass.storage.k8s.io/requests.storage: "100Gi"
    rook-ceph-block.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
```

This restricts only `rook-ceph-block` PVC usage in `team-b`.

## Creating Namespace-Scoped LimitRanges

Combine ResourceQuota with LimitRange to enforce min/max bounds on PVC sizes:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pvc-limits
  namespace: team-b
spec:
  limits:
  - type: PersistentVolumeClaim
    max:
      storage: "50Gi"
    min:
      storage: "1Gi"
```

This prevents excessively small or large PVC requests.

## Monitoring Quota Usage

Check current usage against quota:

```bash
kubectl describe resourcequota -n team-a
```

Output example:

```yaml
Name:            storage-quota
Namespace:       team-a
Resource         Used    Hard
--------         ----    ----
requests.storage 85Gi    200Gi
persistentvolumeclaims 4  10
```

## Quota Enforcement in Practice

Test that quota enforcement works by trying to exceed it:

```bash
# Create PVCs until quota is exhausted
for i in $(seq 1 11); do
  kubectl -n team-a apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc-$i
spec:
  storageClassName: rook-ceph-block
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
EOF
done
```

The 11th PVC should fail with:

```yaml
Error from server (Forbidden): persistentvolumeclaims "test-pvc-11" is forbidden:
exceeded quota: storage-quota, requested: persistentvolumeclaims=1,
used: persistentvolumeclaims=10, limited: persistentvolumeclaims=10
```

## Summary

Kubernetes ResourceQuotas combined with Rook-Ceph StorageClasses provide fine-grained control over storage consumption per namespace. Scoping quotas to specific StorageClasses allows teams to share a Ceph cluster while enforcing hard limits, preventing any single namespace from consuming all available storage.
