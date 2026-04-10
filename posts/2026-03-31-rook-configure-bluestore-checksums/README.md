# How to Configure BlueStore Checksums for Data Integrity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Checksum, Data Integrity

Description: Learn how to configure BlueStore checksum algorithms in Ceph to protect data at rest and tune the performance-vs-integrity trade-off for your workload.

---

BlueStore calculates and stores checksums for every block of data written to disk. When data is read, BlueStore verifies the checksum before returning the data. This detects silent corruption caused by hardware faults, cosmic rays, or firmware bugs.

## Supported Checksum Algorithms

Ceph BlueStore supports the following checksum types:

- `none` - disabled, maximum performance, no protection
- `crc32c` - default, hardware-accelerated on modern CPUs
- `crc32c_16` - 16-bit truncated CRC32c, smaller metadata overhead
- `crc32c_8` - 8-bit truncated, minimal overhead
- `xxhash32` - fast non-cryptographic hash
- `xxhash64` - 64-bit variant for better collision resistance

## Viewing Current Configuration

```bash
ceph config get osd bluestore_csum_type
ceph config get osd bluestore_csum_block_size
```

## Setting the Checksum Algorithm Globally

```bash
ceph config set osd bluestore_csum_type crc32c
```

To apply without restarting all OSDs, set it at runtime and let rolling restarts propagate it:

```bash
ceph tell osd.* config set bluestore_csum_type crc32c
```

## Configuring Per-Pool Checksum Hints

For pools with specific performance requirements, you can set hints:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: fast-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    compression_mode: none
    csum_type: crc32c_16
```

Alternatively, set pool-level hints directly:

```bash
ceph osd pool set mypool csum_type crc32c
```

## Checksum Block Size

BlueStore checksums operate at a configurable block granularity. Smaller blocks detect more precise corruption but use more metadata space:

```bash
ceph config set osd bluestore_csum_block_size 4096
```

Default is 4096 bytes (4 KB). For large sequential workloads, increasing to 65536 reduces metadata overhead.

## Verifying Checksum Errors

When a checksum mismatch is detected, it appears in OSD logs and Ceph health:

```bash
ceph health detail | grep checksum
journalctl -u ceph-osd@0 | grep -i "checksum mismatch"
```

Reading object data forces a checksum verification:

```bash
rados -p mypool get myobject /tmp/myobject
```

## Performance Considerations

CRC32c is hardware-accelerated via the SSE4.2 instruction set on x86_64 processors. Benchmark your workload:

```bash
rados bench -p mypool 30 write --no-cleanup
rados bench -p mypool 30 seq
rados bench -p mypool 30 rand
```

Compare results with `bluestore_csum_type=none` to quantify overhead. In most environments the overhead is under 2%.

## Summary

Configuring BlueStore checksums is a straightforward way to ensure data integrity at the storage layer. The default crc32c algorithm provides strong protection with minimal overhead thanks to hardware acceleration. Tuning the checksum block size and choosing per-pool checksum types allows you to balance integrity guarantees against performance for different workload profiles.
