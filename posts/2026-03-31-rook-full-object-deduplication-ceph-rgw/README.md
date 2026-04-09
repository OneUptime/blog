# How to Set Up Full Object Deduplication in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Deduplication, Storage, Efficiency, Object Storage

Description: Configure full object deduplication in Ceph RGW to reduce storage consumption by identifying and sharing identical object data across buckets.

---

Ceph RGW supports full object deduplication (dedup), which detects when two or more stored objects share identical tail data and removes the duplicates so that the data is stored only once. This reduces storage usage without any application changes.

## How Deduplication Works in Ceph RGW

RGW dedup is an offline batch process run by an administrator. It scans bucket indices to build a dedup table, identifies duplicate tail objects (the data portions of S3 objects) across buckets, computes strong hashes to confirm matches, and then removes the redundant copies. Only metadata and index entries remain distinct per object.

## Configuring Deduplication

The minimum object size for dedup consideration can be configured (default is 64 KB):

```bash
# Set the minimum RGW object size eligible for dedup
ceph config set client.rgw rgw_dedup_min_obj_size_for_dedup 65536
```

## Estimating Dedup Savings

Before running dedup, estimate how much space can be saved:

```bash
radosgw-admin dedup estimate
```

The output shows estimated unique data vs total data, giving a dedup ratio.

## Running Dedup

To execute dedup and remove duplicate tail objects:

```bash
radosgw-admin dedup exec --yes-i-really-mean-it
```

Check statistics from the last dedup run:

```bash
radosgw-admin dedup stats
```

You can also pause, resume, or abort a running dedup operation:

```bash
radosgw-admin dedup pause
radosgw-admin dedup resume
radosgw-admin dedup abort
```

## Verifying Deduplication with RADOS

Check that two objects share the same RADOS data object:

```bash
# Get the internal RADOS object name for bucket objects
MARKER=$(radosgw-admin bucket stats --bucket bucket-a | jq -r '.marker')
rados -p default.rgw.buckets.data stat "${MARKER}_file.txt"

MARKER2=$(radosgw-admin bucket stats --bucket bucket-b | jq -r '.marker')
rados -p default.rgw.buckets.data stat "${MARKER2}_file.txt"

# If dedup worked, both should reference the same chunk pool object
```

## Important Considerations

- Dedup works best for workloads with repeated content (backups, OS images, software packages)
- Objects must be above the minimum size threshold to be considered for dedup
- Versioned objects may complicate dedup since each version has different metadata
- Encryption (SSE) prevents dedup because encrypted content is always unique

## Monitoring Dedup Efficiency

```bash
# Check pool usage with dedup
ceph df detail | grep dedup

# Check RADOS object count vs logical object count
radosgw-admin bucket stats --bucket mybucket
```

## Summary

Ceph RGW full object deduplication reduces storage consumption by detecting identical object content and sharing the underlying RADOS data. Enable it at the zone placement level and run periodic dedup scans to process existing objects. Dedup is most effective for content that is frequently re-uploaded unchanged, such as software packages, container images, or backup datasets.
