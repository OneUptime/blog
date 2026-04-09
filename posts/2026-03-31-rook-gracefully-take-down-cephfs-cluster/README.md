# How to Gracefully Take Down a CephFS Cluster (down Flag, Journal Flushing)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Maintenance

Description: Learn how to gracefully take down a CephFS cluster using the down flag and journal flushing to ensure data integrity during planned maintenance.

---

## Overview

Taking a CephFS filesystem offline for maintenance requires careful sequencing to avoid data loss or journal corruption. Ceph provides the `down` flag mechanism combined with journal flushing to ensure all in-flight metadata writes are committed before MDS daemons are stopped.

## When to Use Graceful Shutdown

Use the graceful procedure when performing:
- MDS software upgrades
- Metadata pool migrations
- Cluster-wide maintenance windows
- Pre-shutdown for hardware decommissioning

## Step 1 - Verify Cluster Health

Before starting, confirm all MDS daemons are healthy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

All MDS daemons should be in `active` or `standby` state. Resolve any `laggy` or `damaged` MDS issues before proceeding.

## Step 2 - Evict Active Clients

Evict all connected clients to prevent new writes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.* client evict id=*
```

## Step 3 - Flush the MDS Journal

Flushing the journal ensures all buffered metadata is written to the backing RADOS pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 flush journal
```

Wait for the command to return successfully before proceeding. This may take a few minutes depending on journal size.

## Step 4 - Set the Filesystem to Down

Once the journal is flushed, mark the filesystem as `down`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs down true
```

This stops the MDS daemons from accepting new sessions and transitions them to a stopped state.

## Step 5 - Verify MDS Daemons are Stopped

Confirm no active MDS daemons remain:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

The filesystem should show zero active MDS ranks.

## Perform Maintenance

At this point the filesystem is safely offline. Perform your maintenance tasks - pool migration, disk replacement, software upgrades, etc.

## Step 6 - Bring the Filesystem Back Up

When maintenance is complete, remove the `down` flag to allow MDS daemons to restart:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs set cephfs down false
```

Rook will automatically reschedule MDS pods based on the CephFilesystem CRD configuration.

## Verify Recovery

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
kubectl -n rook-ceph get pods -l app=rook-ceph-mds
```

## Summary

Gracefully taking down a CephFS cluster involves three key steps: evicting clients, flushing the MDS journal, and setting the `down` flag. This sequence ensures all metadata is safely persisted to RADOS before daemons stop, protecting data integrity during planned maintenance windows in your Rook-Ceph deployment.
