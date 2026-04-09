# How to Set Up Multi-Instance Object Storage in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Storage, RGW, Kubernetes

Description: Learn how to deploy multiple independent CephObjectStore instances in a single Rook cluster to support isolated tenants, environments, or performance tiers.

---

## Why Run Multiple Object Store Instances

A single Rook cluster can host multiple independent CephObjectStore instances. Each instance has its own set of RADOS pools, its own set of RGW pods, and its own Kubernetes service. This enables:

- **Tenant isolation**: separate object stores for different teams or customers
- **Environment separation**: production and staging stores on the same cluster
- **Performance tiers**: one store backed by SSDs, another by HDDs
- **Protocol separation**: one store for S3 API, another configured for Swift

## Deploying a Second Object Store

Create a second `CephObjectStore` with a unique name:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: store-production
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
---
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: store-staging
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 2
  dataPool:
    failureDomain: host
    replicated:
      size: 2
  gateway:
    port: 80
    instances: 1
```

Apply both:

```bash
kubectl apply -f object-stores.yaml
```

## Separate Services per Instance

Each store gets its own Kubernetes service:

```bash
kubectl -n rook-ceph get service | grep rgw
```

Output:

```text
rook-ceph-rgw-store-production   ClusterIP   10.96.1.100   <none>   80/TCP
rook-ceph-rgw-store-staging      ClusterIP   10.96.1.101   <none>   80/TCP
```

Applications reference different endpoints to reach different stores.

## Creating Separate StorageClasses

Each object store needs its own StorageClass for ObjectBucketClaims:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-bucket-production
provisioner: rook-ceph.ceph.rook.io/bucket
parameters:
  objectStoreName: store-production
  objectStoreNamespace: rook-ceph
reclaimPolicy: Retain
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-bucket-staging
provisioner: rook-ceph.ceph.rook.io/bucket
parameters:
  objectStoreName: store-staging
  objectStoreNamespace: rook-ceph
reclaimPolicy: Delete
```

## Pool Isolation

Each store creates its own set of RADOS pools, so data is isolated by default. Confirm pool separation:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls | grep rgw
```

Output:

```text
store-production.rgw.buckets.data
store-production.rgw.meta
store-staging.rgw.buckets.data
store-staging.rgw.meta
```

## Capacity Monitoring per Store

Track capacity per object store:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin bucket stats
```

Or check pool usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df | grep store-production
```

## Summary

Multiple CephObjectStore instances in Rook provide pool-level isolation, separate RGW pod pools, and independent service endpoints. Deploy multiple CRDs with different names, configure separate StorageClasses for ObjectBucketClaims, and use different endpoints per application. This is ideal for multi-tenant setups, environment separation, and workloads with different replication or performance requirements on the same physical cluster.
