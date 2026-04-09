# How to Set Up MDS Pinning for Subdirectory Affinity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Pinning, Kubernetes, Performance

Description: Learn how to use CephFS MDS directory pinning to assign specific subdirectories to specific MDS ranks, ensuring consistent metadata performance for multi-tenant workloads.

---

## What is MDS Pinning?

In a multi-active MDS setup, the balancer normally migrates directory subtrees between MDS daemons based on load. MDS pinning overrides this behavior by permanently assigning a directory subtree to a specific MDS rank. This provides:

- Predictable metadata locality for tenants
- Isolation of noisy tenants to specific MDS instances
- Deterministic performance benchmarking
- Prevention of balancer-induced latency spikes during migrations

## Prerequisites

MDS pinning requires multiple active MDS daemons:

```yaml
metadataServer:
  activeCount: 3
  activeStandby: true
```

Verify all active MDS are running:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

## Pinning a Directory to a Specific MDS Rank

Mount the CephFS filesystem first (or use the toolbox pod):

```bash
# Pin /tenant-a directory to MDS rank 0
setfattr -n ceph.dir.pin -v 0 /mnt/cephfs/tenant-a

# Pin /tenant-b to MDS rank 1
setfattr -n ceph.dir.pin -v 1 /mnt/cephfs/tenant-b

# Pin /tenant-c to MDS rank 2
setfattr -n ceph.dir.pin -v 2 /mnt/cephfs/tenant-c
```

## Verifying Pin Assignments

Check that pins are set correctly:

```bash
getfattr -n ceph.dir.pin /mnt/cephfs/tenant-a
# Output: ceph.dir.pin="0"

# Check which MDS rank owns a directory
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph daemon mds.myfs.a dirfrag ls /tenant-a
```

## Understanding Pin Inheritance

Pins apply to the directory and all of its subdirectories unless overridden. You can create a hierarchy of pins:

```bash
# All of /tenant-a goes to rank 0
setfattr -n ceph.dir.pin -v 0 /mnt/cephfs/tenant-a

# But /tenant-a/archive goes to rank 2 (lower-load rank)
setfattr -n ceph.dir.pin -v 2 /mnt/cephfs/tenant-a/archive
```

## Removing a Pin

To revert a directory to balancer-managed placement:

```bash
# Set pin to -1 to remove it
setfattr -n ceph.dir.pin -v -1 /mnt/cephfs/tenant-a
```

## Using Ephemeral Pinning for Automatic Distribution

CephFS also supports distributed pinning using a hash function:

```bash
# Distribute subdirectories of /workloads evenly across all MDS ranks
setfattr -n ceph.dir.pin.distributed -v 1 /mnt/cephfs/workloads
```

This is useful when you have many parallel subdirectories and want automatic distribution without the overhead of the balancer.

## Monitoring Pin Effectiveness

Check whether the pinned directories are actually being served by the expected MDS:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph daemon mds.myfs.a get subtrees | \
  python3 -c "import json,sys; t=json.load(sys.stdin); \
  [print(s['dir']['path'], 'auth:', s['auth_first']) for s in t]"
```

## Summary

MDS directory pinning provides deterministic metadata affinity in multi-active CephFS setups, making it ideal for multi-tenant environments where predictable performance is more important than perfect load balancing. Use `ceph.dir.pin` extended attributes to assign directories to specific MDS ranks, use inheritance for subdirectory subtrees, and combine with ephemeral pinning for directories with many parallel children that benefit from distributed handling.
