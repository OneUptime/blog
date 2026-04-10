# How to Configure Ceph for Kubernetes Namespace Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Namespace, Isolation, Network Policy, Multi-Tenancy

Description: Configure Rook-Ceph with Kubernetes namespace isolation using NetworkPolicies and RBAC to provide multi-tenant storage access control.

---

## Introduction

In multi-tenant Kubernetes clusters, namespace isolation ensures one team cannot access another's storage. Rook-Ceph supports per-namespace access via dedicated Ceph users and RBAC, while NetworkPolicies restrict communication between namespaces at the network layer.

## Architecture Overview

The typical setup separates concerns:

- `rook-ceph` namespace - operator, OSDs, monitors, MGR
- `team-a` namespace - applications consuming Ceph storage
- `team-b` namespace - applications consuming Ceph storage

Each team gets dedicated Ceph credentials and StorageClasses pointing to separate pools.

## Creating Per-Team Ceph Users

```bash
# User for team-a
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.team-a \
    mon 'allow r' \
    osd 'allow rwx pool=team-a-pool'

# User for team-b
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.team-b \
    mon 'allow r' \
    osd 'allow rwx pool=team-b-pool'
```

## Creating Per-Team Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-team-a
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: team-a-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner-team-a
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node-team-a
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Applying ResourceQuotas to Restrict StorageClass Access

Prevent team-b from using team-a's StorageClass using ResourceQuotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-class-quota
  namespace: team-b
spec:
  hard:
    requests.storage: "500Gi"
    ceph-team-a.storageclass.storage.k8s.io/requests.storage: "0"
```

## Applying NetworkPolicies

Block direct pod-to-pod communication across namespaces while still allowing RGW access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}
```

Allow access to the Ceph RGW endpoint specifically:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-rgw-egress
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: rook-ceph
    ports:
    - protocol: TCP
      port: 80
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Verifying Isolation

Test that team-a pods cannot reach team-b pods:

```bash
kubectl -n team-a exec -it test-pod -- \
  curl -I http://app.team-b.svc.cluster.local
```

This should fail. Verify Ceph storage still works:

```bash
kubectl -n team-a exec -it test-pod -- \
  ls /mnt/ceph-data/
```

## Summary

Namespace isolation for Rook-Ceph involves creating per-team Ceph users, dedicated storage pools and StorageClasses, ResourceQuotas to enforce access boundaries, and NetworkPolicies to prevent cross-namespace traffic. This multi-layered approach provides strong isolation guarantees for multi-tenant Kubernetes clusters.
