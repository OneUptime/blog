# How to Enable Erasure Coding Optimizations (allow_ec_optimizations) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, BlueStore, Performance

Description: Learn how to enable allow_ec_optimizations on Ceph erasure coded pools to reduce read-modify-write overhead and improve overwrite performance with BlueStore.

---

Starting with Ceph Tentacle (20.x), Ceph introduced the `allow_ec_optimizations` flag for erasure coded pools. This flag enables a new Fast Erasure Coding (Fast EC) I/O path that improves performance for smaller I/Os, eliminates unnecessary padding for small objects, and reduces read-modify-write (RMW) overhead through techniques like partial reads, partial writes, and parity delta writes.

## What allow_ec_optimizations Does

The `allow_ec_optimizations` flag switches the pool to a new Fast EC I/O code path that includes several improvements:

- **Partial reads**: Instead of reading entire stripes for small read requests, only the minimal necessary data chunks are read.
- **Small object padding elimination**: Objects smaller than a full stripe are no longer padded to stripe boundaries, saving storage capacity.
- **Partial writes**: Subsegment writes read only the affected data strips rather than entire stripes before recalculating parity.
- **Parity delta writes**: A dynamic technique that computes XOR differences between old and new data and applies delta operations to parity chunks, reducing overall I/O amplification.

This optimization is particularly valuable for:
- RBD workloads, especially with smaller I/O sizes
- RGW workloads with many small objects
- CephFS data pool writes from clients

## Requirements

- Ceph Tentacle (20.2+) or later - all Monitors and OSDs must be upgraded
- All OSDs must use BlueStore
- Erasure code profile must use the Jerasure or ISA-L plugin with the `reed_sol_van` technique (the default)

## Enabling the Optimization

First, confirm your Ceph version supports the flag:

```bash
ceph version
```

Expected: `ceph version 20.x.x` or higher.

Enable the optimization:

```bash
ceph osd pool set ec-pool allow_ec_optimizations true
```

Note: Once enabled, this flag cannot be disabled because it changes how new data is stored.

If the pool is used with RBD or CephFS, you should also enable overwrites (if not already set):

```bash
ceph osd pool set ec-pool allow_ec_overwrites true
```

Verify the flags:

```bash
ceph osd pool get ec-pool allow_ec_optimizations
ceph osd pool get ec-pool allow_ec_overwrites
```

## Rook CephBlockPool Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-optimized-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  parameters:
    allow_ec_optimizations: "true"
```

## Performance Impact

Fast EC provides improvements across multiple I/O patterns:

```text
Operation                Without Optimization        With Optimization
Small read               Read full stripe            Read only needed chunks
Full stripe write        Read + Encode + Write       Encode + Write (skip read)
Partial stripe write     Read full stripe + RMW      Read affected strips only + PDW
Small object store       Padded to stripe boundary   Stored without padding
```

The savings are most significant for workloads with smaller I/O sizes or many small objects. For the majority of I/O workloads, it is recommended to increase the stripe unit to at least 16 KiB when using optimizations.

## Monitoring RMW Operations

You can monitor OSD performance stats to observe the impact of the optimization:

```bash
ceph daemon osd.0 perf dump
```

Look for erasure coding related counters in the output. You can also compare overall read and write latency metrics before and after enabling the optimization to measure improvement.

## Limitations

- Once enabled, the flag cannot be disabled because it changes how new data is stored
- Only supported with the Jerasure and ISA-L plugins using the `reed_sol_van` technique
- EC optimizations for non-4K-aligned chunk sizes are not supported
- Requires all Monitors and OSDs to be running Tentacle or later

## Summary

`allow_ec_optimizations` enables the Fast EC I/O path for erasure coded pools, providing substantial performance improvements through partial reads, padding elimination, partial writes, and parity delta writes. It requires Ceph Tentacle (20.2+) or newer and BlueStore OSDs. Enable it on any EC pool used with RBD, CephFS, or RGW to improve I/O performance, especially for workloads with smaller I/O sizes or many small objects. Note that once enabled, the flag cannot be reversed.
