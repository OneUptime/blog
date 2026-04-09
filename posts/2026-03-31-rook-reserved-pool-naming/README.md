# How to Understand Reserved Pool Naming Conventions in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Naming, Convention

Description: Learn about Ceph reserved pool naming conventions for RGW, CephFS, and RBD pools and how Rook maps CRD names to internal pool names.

---

Ceph uses specific pool naming conventions for its built-in services. Understanding these conventions prevents naming conflicts and helps you identify what purpose each pool serves in your cluster.

## Reserved Pool Name Prefixes

Ceph reserves certain pool name prefixes for internal use:

| Prefix | Service | Purpose |
|---|---|---|
| `.rgw.` | RADOS Gateway (RGW) | Object storage internal pools |
| `.mgr` | Manager | Manager module state storage |
| `cephfs.` | CephFS | Filesystem metadata and data pools |
| `device_health_metrics` | OSD health | Per-device health metrics |
| `rbd` | Block device | Default RBD pool |

Pools starting with a period (`.`) are hidden from `ceph osd pool ls` by default and are considered internal pools.

## List All Pools Including Internal

```bash
# Standard listing (excludes hidden pools)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool ls

# Include all internal pools
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool ls detail
```

## RGW Pool Names

When you create a `CephObjectStore`, Rook and RGW automatically create pools with the `.rgw.` prefix:

```text
.rgw.root
<zone>.rgw.control
<zone>.rgw.meta
<zone>.rgw.log
<zone>.rgw.buckets.index
<zone>.rgw.buckets.data
<zone>.rgw.buckets.non-ec
```

The zone name comes from the `CephObjectZone` resource name, or defaults to the store name.

## CephFS Pool Names

Rook creates CephFS pools named after the `CephFilesystem` resource:

```text
<fs-name>-metadata
<fs-name>-data0
```

For a filesystem named `myfs`, pools are `myfs-metadata` and `myfs-data0`.

## How Rook Names Pools for CephBlockPool

The `CephBlockPool` resource name becomes the Ceph pool name directly:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool   # This becomes the Ceph pool name
  namespace: rook-ceph
```

The resulting pool is named `replicapool` in Ceph.

## Avoid Conflicting Names

Do not create CephBlockPool resources with names that conflict with reserved prefixes:

```bash
# These names should be avoided for CephBlockPool resources
# .rgw.* - reserved for object storage
# cephfs.* - reserved for CephFS
# .mgr    - reserved for manager
```

## View Pool Names After Deployment

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool ls detail --format json | \
  python3 -c "
import json, sys
pools = json.load(sys.stdin)
for p in pools:
    print(f\"{p['pool_id']:3d}  {p['pool_name']}\")
"
```

## Map Pool Names to Rook Resources

```bash
# List all CephBlockPools and their corresponding pool names
kubectl get cephblockpool -n rook-ceph -o custom-columns=\
'NAME:.metadata.name,NAMESPACE:.metadata.namespace'

# List all CephFilesystem resources
kubectl get cephfilesystem -n rook-ceph

# List all CephObjectStore resources
kubectl get cephobjectstore -n rook-ceph
```

## Summary

Ceph uses reserved naming conventions for internal service pools (`.rgw.`, `cephfs.`, `.mgr`). Rook maps CRD resource names directly to Ceph pool names for `CephBlockPool`, and uses `<name>-metadata` / `<name>-data0` patterns for `CephFilesystem`. Avoid creating custom pools with reserved prefixes to prevent conflicts with Ceph services.
