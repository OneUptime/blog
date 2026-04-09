# How to Handle Omap Limitations in Erasure Coded Pools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, OMAP, Storage

Description: Learn why erasure coded pools in Ceph do not support omap data, how this limitation affects RGW and CephFS, and how to design around it with companion replicated pools.

---

Erasure coded (EC) pools in Ceph have a fundamental limitation: they do not support **omap** (object map) operations. Omap is a per-object key-value store embedded in each RADOS object, used extensively by RGW for bucket indices and by CephFS for directory entries. Understanding this limitation is essential for correctly architecting Ceph deployments that use EC pools.

## What Is Omap?

Omap is a secondary data structure attached to RADOS objects. It stores key-value pairs alongside the object's primary data. Ceph services use omap for:

- **RGW**: bucket index entries (each bucket object's omap stores file listings)
- **CephFS**: directory entries stored as omap on directory fragment objects in the metadata pool
- **RBD**: object map for fast diff and resize operations

EC pools cannot store omap data because the EC write path requires full-stripe operations, and omap updates are small, frequent, and non-stripe-aligned.

## The Symptom

If you attempt to use an EC pool for a workload that uses omap (e.g., as the RGW bucket index pool), you will see errors like:

```text
[WRN] 2024-01-01T00:00:00.000+0000 7f... osd/OSD.cc: omap is not supported in ec pool
```

Or RGW may fail to create buckets with:

```bash
aws s3 mb s3://test-bucket
# make_bucket failed: s3://test-bucket An error occurred (InternalError)
```

## Correct Architecture: Separate Omap and Data Pools

The solution is to keep any pool that stores omap data as a **replicated pool**, and only use EC for pure bulk data storage.

For RGW:

```text
.rgw.buckets.index    --> Replicated (stores omap bucket listings)
.rgw.buckets.data     --> EC pool (stores actual object data, no omap)
```

For RBD:

```text
rbd-metadata          --> Replicated (stores RBD header omap)
rbd-ec-data           --> EC pool (stores block data)
```

## Verifying Pool Types

```bash
ceph osd pool ls detail | grep -E "erasure|replicated"
```

Output:

```text
pool 1 '.rgw.buckets.index' replicated size 3 ...
pool 2 '.rgw.buckets.data' erasure profile rgw-ec ...
```

## Attempting Omap on EC Pool (Will Fail)

```bash
rados -p ec-pool setomapval testobj mykey myvalue
```

Expected error:

```text
error writing testobj: (95) Operation not supported
```

## Rook Object Store Correct Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3          # Metadata/index pool is always replicated
  dataPool:
    erasureCoded:
      dataChunks: 4    # Data pool can be EC (no omap used here)
      codingChunks: 2
```

Rook automatically creates the `.rgw.buckets.index` pool as replicated and `.rgw.buckets.data` as EC when you specify this configuration.

## CephFS Omap Constraint

CephFS metadata pools must always be replicated. Only the CephFS data pool can optionally be EC (with `allow_ec_overwrites` enabled):

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3          # MUST be replicated, uses omap for directories
  dataPools:
    - name: data0
      erasureCoded:
        dataChunks: 4  # Data pool can be EC
        codingChunks: 2
```

## Summary

Erasure coded pools cannot store omap data due to the stripe-based write model. Always use replicated pools for bucket indices (RGW), MDS metadata (CephFS), and RBD image headers. Only use EC pools for bulk object data or block device data pools where omap is not required. Rook's CRDs enforce this correctly when you configure separate metadataPool and dataPool sections.
