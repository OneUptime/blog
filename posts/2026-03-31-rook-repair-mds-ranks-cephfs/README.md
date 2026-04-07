# How to Repair MDS Ranks in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Recovery

Description: Learn how to diagnose and repair damaged or failed MDS ranks in CephFS using Ceph's built-in recovery tools and journal repair commands.

---

## Overview

CephFS MDS ranks can become damaged or fail to recover due to journal corruption, hardware failure, or bugs in the MDS software. When an MDS rank is stuck in `damaged`, `failed`, or cannot replay its journal, you need to use Ceph's metadata repair tools to restore the filesystem to a healthy state.

## Identify the Problem

Start by checking the current filesystem and MDS state:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Look for MDS daemons in `damaged`, `reconnecting` (stuck), or journal replay errors in the MDS logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mds,rook_file_system=cephfs --tail=300 | grep -i "error\|WARN\|journal"
```

## Force Fail a Stuck MDS Rank

If an MDS is stuck and not recovering automatically, force it to fail so a standby can take over:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds fail cephfs:0
```

## Bring the Filesystem Down for Repair

For journal corruption, you need to take the filesystem offline first:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs fail cephfs
```

## Inspect the Journal

Use `cephfs-journal-tool` to inspect the journal of the damaged rank:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=cephfs:0 journal inspect
```

## Recover Dentries from the Journal

Attempt to recover as many metadata entries as possible from the journal:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=cephfs:0 event recover_dentries
```

## Reset the Journal

If journal inspection reveals unrecoverable corruption, reset the journal as a last resort. Note that this may result in some metadata loss:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-journal-tool --rank=cephfs:0 journal reset
```

## Scan and Repair the Metadata Pool

After journal operations, scan the metadata pool for orphaned or inconsistent objects:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-data-scan scan_extents cephfs-data0

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-data-scan scan_inodes cephfs-data0
```

## Bring the Filesystem Back Online

After repairs, mark the filesystem joinable again:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs joinable true
```

Monitor MDS recovery:

```bash
watch kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

## Summary

Repairing MDS ranks in CephFS involves a systematic approach: failing stuck daemons, taking the filesystem offline, using `cephfs-journal-tool` to inspect and recover or reset the journal, and running metadata pool scans to repair orphaned objects. These tools are your last line of defense when MDS corruption occurs in a Rook-Ceph cluster, and should be used carefully with backups in place where possible.
