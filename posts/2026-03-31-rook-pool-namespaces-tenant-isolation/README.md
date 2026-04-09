# How to Set Up Pool Namespaces for Tenant Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Namespace, Multi-Tenant, Kubernetes, Security

Description: Learn how to use Ceph pool namespaces and RBD namespaces to isolate tenants within a shared pool, reducing overhead while maintaining data separation.

---

## Pool Namespaces for Multi-Tenancy

Running a separate Ceph pool per tenant is operationally expensive - each pool consumes PGs, and too many pools degrade cluster performance. Ceph RBD namespaces provide logical isolation within a single pool, allowing multiple tenants to share pool resources while keeping their data and access controls separate.

## Understanding RBD Namespaces

An RBD namespace is a logical partition within a pool. Images in different namespaces are completely isolated from each other - a client with access to namespace `tenant-a` cannot see or access images in namespace `tenant-b`, even though they share the same underlying pool.

## Creating RBD Namespaces

First, create the shared pool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: shared-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
```

Then create namespaces for each tenant:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd namespace create shared-pool/tenant-a

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd namespace create shared-pool/tenant-b

# List namespaces
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd namespace ls shared-pool
```

## Creating StorageClasses Per Tenant Namespace

Each tenant gets a StorageClass that targets their namespace:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-tenant-a
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: shared-pool
  imageFeatures: layering
  # Name prefix only - does not provide RBD namespace isolation
  volumeNamePrefix: "tenant-a-"
reclaimPolicy: Delete
```

For actual namespace-level isolation, create a `CephBlockPoolRadosNamespace` per tenant and use its namespace-specific `clusterID` in the StorageClass:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPoolRadosNamespace
metadata:
  name: tenant-a-ns
  namespace: rook-ceph
spec:
  blockPoolName: shared-pool
```

Retrieve the namespace-specific `clusterID` from the resource status and use it in the StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-tenant-a
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  # Use the clusterID from: kubectl -n rook-ceph get cephblockpoolradosnamespace tenant-a-ns -o jsonpath='{.status.info.clusterID}'
  clusterID: <namespace-specific-clusterID>
  pool: shared-pool
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Setting Up Separate Ceph Users Per Tenant

Create dedicated Ceph users scoped to each namespace:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.tenant-a \
  mon 'profile rbd' \
  osd 'profile rbd pool=shared-pool namespace=tenant-a'

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.tenant-b \
  mon 'profile rbd' \
  osd 'profile rbd pool=shared-pool namespace=tenant-b'
```

Create Kubernetes secrets with these credentials:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-key client.tenant-a | \
  kubectl -n tenant-a create secret generic rbd-secret \
  --from-file=key=/dev/stdin
```

## Verifying Namespace Isolation

```bash
# List images in tenant-a namespace only
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd ls shared-pool/tenant-a

# Confirm tenant-b cannot see tenant-a images
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd --id tenant-b ls shared-pool/tenant-a
```

## Summary

RBD namespaces allow you to serve multiple tenants from a single Ceph pool while maintaining strong data isolation. By combining RBD namespaces with per-tenant Ceph users that have scoped capabilities, you achieve both data separation and access control without the overhead of maintaining many independent pools. This pattern scales well for SaaS platforms and shared infrastructure environments.
