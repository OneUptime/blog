# How to Retrieve MDS Metadata in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Monitoring

Description: Learn how to retrieve and interpret MDS metadata in CephFS using ceph commands to monitor performance, client sessions, and internal daemon state.

---

## Overview

CephFS Metadata Servers (MDS) maintain a rich set of internal metadata about the filesystem, connected clients, cached inodes, and journal state. Retrieving this information is critical for monitoring, capacity planning, and troubleshooting metadata performance issues in Rook-Ceph clusters.

## Get Filesystem Overview

Start with the high-level filesystem status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status cephfs
```

This shows active and standby MDS daemons, client counts, and pool information.

## Retrieve MDS Daemon Metadata

Get detailed information about each MDS daemon registered with the monitor:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mds metadata
```

For a specific daemon:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds metadata cephfs.a
```

This returns JSON with the daemon's host, Ceph version, kernel version, and architecture.

## List All Client Sessions

Retrieve all client sessions currently connected to the MDS:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 session ls
```

Each session entry includes the client ID, IP address, mount root, and capability counts.

## Inspect the Inode Cache

Check how many inodes are currently cached in the MDS:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq '.mds | {inodes, caps}'
```

A high `inodes` count indicates memory pressure on the MDS. The cache limit is controlled by the `mds_cache_memory_limit` configuration option.

## Dump the MDS Map

Retrieve the full MDS map showing all filesystems and their rank assignments:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs dump
```

This includes epoch number, flags, and daemon assignments per rank.

## Check MDS Cache Memory Usage

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 cache status
```

The output shows memory usage broken down by inode type (directory, file, symlink) and the total cache usage versus the configured limit.

## View Historical Operations

Inspect recently completed operations to identify slow metadata requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 dump_historic_ops
```

## Get MDS Statistics as JSON

For integration with monitoring systems, dump all MDS performance counters:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq .
```

You can pipe this into Prometheus pushgateway or parse it with custom scripts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq '.mds.request'
```

## Summary

Retrieving MDS metadata in CephFS gives you deep visibility into the health and performance of your metadata service. Key commands include `ceph mds metadata`, `ceph fs dump`, `session ls`, `cache status`, and `perf dump`. These tools help you monitor inode cache pressure, client connectivity, and overall MDS health in your Rook-Ceph cluster, making them indispensable for proactive operations.
