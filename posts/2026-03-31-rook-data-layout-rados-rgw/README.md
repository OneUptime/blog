# How to Understand Data Layout in RADOS for RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RADOS, Architecture, Object Storage, Internal

Description: Understand how Ceph RGW stores objects, metadata, and indices in RADOS pools, and learn the naming conventions used for internal RADOS objects.

---

Ceph RGW sits on top of RADOS, the distributed object store at Ceph's core. Understanding how RGW maps S3/Swift concepts to RADOS objects helps with debugging, capacity planning, and performance tuning.

## Key RADOS Pools Used by RGW

When you create a CephObjectStore, RGW creates several pools:

| Pool | Purpose |
|------|---------|
| `.rgw.root` | Zone and zone group configuration |
| `default.rgw.control` | Distributed lock control objects |
| `default.rgw.meta` | User metadata and bucket ownership |
| `default.rgw.log` | Operation logs and bucket index logs |
| `default.rgw.buckets.index` | Bucket object indices |
| `default.rgw.buckets.data` | Actual object data |
| `default.rgw.buckets.non-ec` | Non-erasure-coded data (multipart, etc.) |

## How User Metadata is Stored

User accounts are stored as RADOS objects in the `default.rgw.meta` pool under the `users.uid` namespace:

```bash
# List user metadata objects
rados -p default.rgw.meta ls --all | grep "users.uid"

# Read a user metadata object
rados -p default.rgw.meta -N users.uid get myuser /tmp/userdata.json
cat /tmp/userdata.json
```

## How Bucket Indices Work

Each bucket has an index object (or multiple shards) in the `default.rgw.buckets.index` pool. The naming convention is:

```text
.dir.<bucket-marker>.<shard-number>
```

List index objects for a bucket:

```bash
rados -p default.rgw.buckets.index ls | grep "$(radosgw-admin bucket stats --bucket mybucket | jq -r '.marker')"
```

## How Object Data is Stored

Object data is split into a head object and optional tail objects. The head object stores the first 4MB (by default) and all object metadata:

```bash
# Get the bucket marker
MARKER=$(radosgw-admin bucket stats --bucket mybucket | jq -r '.marker')

# List data objects for a bucket
rados -p default.rgw.buckets.data ls | grep "$MARKER"
```

Object naming format in the data pool:
```text
<bucket-marker>_<object-key>
```

## Inspecting Object Attributes

RADOS extended attributes (xattrs) store object metadata like content-type, ACLs, and encryption info:

```bash
rados -p default.rgw.buckets.data \
  listxattr "${MARKER}_myfile.txt"

rados -p default.rgw.buckets.data \
  getxattr "${MARKER}_myfile.txt" user.rgw.content_type
```

## Locating Multipart Upload Data

Multipart upload metadata (tracking objects for in-progress uploads) is stored in `default.rgw.buckets.non-ec`:

```bash
rados -p default.rgw.buckets.non-ec ls | head -20
```

## Summary

Ceph RGW maps S3 users, buckets, and objects to RADOS objects spread across several dedicated pools. User metadata lives in `.rgw.meta`, bucket indices in `.rgw.buckets.index`, and object data in `.rgw.buckets.data`. Understanding this layout is essential for low-level debugging and for sizing pools correctly in production deployments.
