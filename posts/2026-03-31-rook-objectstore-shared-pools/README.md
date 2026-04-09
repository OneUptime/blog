# How to Configure Object Store with Shared Pools in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Storage, RGW, Kubernetes

Description: Learn how to configure a Rook CephObjectStore to share existing Ceph pools, reducing pool count while enabling S3-compatible object storage on your cluster.

---

## What Shared Pools Mean for Object Storage

By default, each `CephObjectStore` creates its own set of RADOS pools for metadata and data. In a cluster running multiple workloads - block storage, CephFS, and object storage together - this can result in many pools, each consuming RADOS placement group (PG) resources.

Shared pools allow multiple object store zones to reuse a common data pool. This is useful when:
- You want to reduce total pool count to stay within RADOS PG limits
- Multiple object store zones should store data in the same pool with namespace separation
- You are migrating from an external Ceph cluster that already has pools defined

## Using an Existing Pool for Object Storage

Reference a pre-existing pool in the `CephObjectStore` spec. First, create the pool manually or reference an existing `CephBlockPool`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: shared-object-data
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

Then create the object store that references this shared pool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  sharedPools:
    metadataPoolName: shared-object-meta
    dataPoolName: shared-object-data
    preserveRadosNamespaceDataOnDelete: true
  gateway:
    port: 80
    instances: 2
```

The `sharedPools` section tells Rook to use existing pools instead of creating new ones.

## RADOS Namespaces for Isolation

When multiple object stores share a pool, Rook uses RADOS namespaces to isolate data. Each store gets its own namespace within the shared pool, preventing data from different stores from mixing:

```bash
# List all objects and their RADOS namespaces in the shared pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados -p shared-object-data --all ls
```

The output shows objects prefixed by their RADOS namespace, confirming isolation between stores:

```text
my-store.buckets.data	some-object-key
another-store.buckets.data	another-object-key
```

## Preserving Data on Delete

The `preserveRadosNamespaceDataOnDelete: true` setting prevents data in the shared pool from being deleted when the `CephObjectStore` is removed. This is important for shared pools because deleting one store's namespace should not affect others.

Set it to `false` only if you want the namespace and its data cleaned up automatically:

```yaml
sharedPools:
  metadataPoolName: shared-object-meta
  dataPoolName: shared-object-data
  preserveRadosNamespaceDataOnDelete: false
```

## Checking Pool Usage

Monitor how much of the shared pool each store's namespace is consuming:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados df -p shared-object-data
```

Sample output:

```text
POOL_NAME              USED OBJECTS CLONES COPIES MISSING_ON_PRIMARY
shared-object-data    4.5G   12034      0  36102                   0
```

## When to Use Dedicated vs Shared Pools

| Scenario | Use Dedicated Pools | Use Shared Pools |
|---|---|---|
| Performance isolation | Yes | No |
| Minimize pool count | No | Yes |
| Different EC per store | Yes | No |
| Small cluster | No | Yes |

## Summary

Shared pools in Rook CephObjectStore reduce RADOS pool count by reusing existing pools across multiple object store zones. Configure this via the `sharedPools` field, referencing pre-existing pool names. Rook uses RADOS namespaces to isolate store data within shared pools. Set `preserveRadosNamespaceDataOnDelete: true` for production stores to prevent accidental data loss when the CRD is deleted.
