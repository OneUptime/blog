# How to Send Remote Commands to MDS with ceph tell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Administration

Description: Learn how to use the ceph tell command to send remote administrative commands directly to MDS daemons in your Rook-Ceph cluster.

---

## Overview

The `ceph tell` command allows administrators to send commands directly to specific Ceph daemons without using the normal monitor dispatch path. For MDS daemons in CephFS, this is particularly useful for operations like flushing journals, dumping state, adjusting parameters at runtime, and debugging metadata issues.

## Basic Syntax

The general form of `ceph tell` for MDS targets is:

```bash
ceph tell mds.<target> <command> [arguments]
```

Where `<target>` can be:
- A specific rank like `cephfs:0`
- A daemon name like `cephfs.node1`
- A wildcard `*` to target all MDS daemons

## Common Use Cases

### Flush the MDS Journal

Flushing writes all pending metadata from the journal to RADOS pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 flush journal
```

### Dump Historic Operations

List recently completed operations for debugging slow or stuck requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 dump_historic_ops
```

### Get MDS Statistics

Retrieve runtime performance counters and statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump
```

### Evict a Specific Client

Evict a connected client by session ID to force it to reconnect:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 client evict id=12345
```

### List Connected Clients

View all clients currently connected to a specific MDS rank:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 session ls
```

### Broadcast to All MDS Daemons

Use the wildcard to apply a command to all active MDS daemons at once:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.* flush journal
```

## Adjust Runtime Configuration

You can set configuration values on a running MDS without restarting:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 config set mds_cache_memory_limit 4294967296
```

## Getting Help on Available Commands

List all commands available for MDS targets:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 help
```

## Parsing Output with jq

Many `ceph tell` commands output JSON, which can be parsed with `jq`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq '.mds.inodes'
```

## Summary

The `ceph tell` command is a powerful tool for directly administering MDS daemons in a Rook-Ceph cluster. It enables real-time operations like journal flushing, client eviction, state inspection, and runtime configuration changes without requiring daemon restarts. Mastering `ceph tell` is essential for advanced CephFS administration and troubleshooting.
