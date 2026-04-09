# How to Understand MDS Journaling in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Journal

Description: Learn how MDS journaling works in CephFS, how the journal protects metadata durability, and how to manage journal size and performance in Rook-Ceph.

---

## Overview

The CephFS MDS journal is a write-ahead log (WAL) that records all metadata mutations before they are applied to the backing RADOS pools. The journal serves two critical purposes: it enables fast metadata writes (by buffering changes in memory and logging them sequentially) and it enables recovery after MDS crashes by replaying logged operations.

## How the Journal Works

When an MDS processes a metadata operation (creating a file, updating attributes, etc.), it:

1. Writes the operation to the journal in the metadata pool
2. Applies the change to the in-memory metadata cache
3. Periodically flushes dirty in-memory metadata to permanent RADOS objects in the metadata pool (checkpointing)
4. Trims old journal segments that have been fully checkpointed

```text
Client Request -> MDS -> Journal Write (metadata pool)
                          |
                          v
                    In-Memory Cache -> Checkpoint/Flush -> Metadata Objects (metadata pool)
                                                                    |
                                                              Journal Trim
```

## Locate the Journal in RADOS

The journal is stored as RADOS objects in the metadata pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados -p cephfs-metadata ls | grep "^200\."
```

Journal objects are named using the journal inode number in hex (e.g., `200.00000000` for rank 0, where `0x200` is the journal inode for MDS rank 0).

## Check Journal Size

Monitor the current journal size and lag:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq '.mds_log | {ev, seg, wrpos, expos}'
```

## Configure Journal Size Limits

The maximum journal size is controlled by `mds_log_max_segments`:

```bash
# Default is 30 segments; increase to allow a larger journal before trimming
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_log_max_segments 128

# Maximum journal events before forcing a checkpoint (default: -1, disabled)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_log_max_events 100000
```

## Inspect the Journal

Use `cephfs-journal-tool` for journal inspection and repair:

```bash
# Inspect journal integrity
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=cephfs:0 journal inspect

# Export journal to a local file for offline analysis
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=cephfs:0 journal export /tmp/journal_backup
```

## Manually Flush the Journal

Force all pending journal entries to be checkpointed to the metadata pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 flush journal
```

This is required before maintenance operations or graceful shutdowns.

## Journal Trimming and Performance

When the MDS journal fills up, journal trimming (checkpoint + delete old segments) kicks in. Heavy journal pressure can cause latency spikes. Monitor journal segments and trimming activity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq '.mds_log | {seg, segtrm, expos, wrpos}'
```

## Summary

The CephFS MDS journal is a fundamental component that enables fast metadata writes and crash recovery. It functions as a write-ahead log stored in the RADOS metadata pool, with periodic checkpointing to trim old entries. Key management tasks include monitoring journal size, adjusting `mds_log_max_segments` to balance journal size against recovery time, and using `cephfs-journal-tool` for inspection and repair in Rook-Ceph deployments.
