# How to Configure BlueStore Checksumming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Data Integrity, Checksum

Description: Learn how to configure BlueStore checksumming in Ceph to protect data integrity, choose the right algorithm, and verify that checksums are being applied correctly.

---

## Why BlueStore Checksumming Matters

BlueStore natively checksums all data and metadata written to disk. This protects against silent data corruption caused by faulty drives, firmware bugs, or bit rot. By default, checksumming is enabled with the crc32c algorithm.

## Supported Checksum Algorithms

BlueStore supports the following algorithms:
- `none` - no checksumming (not recommended)
- `crc32c` - fast, hardware-accelerated on modern CPUs (default)
- `crc32c_16` - crc32c with 16-bit granularity, reduces metadata overhead
- `crc32c_8` - crc32c with 8-bit granularity
- `xxhash32` - fast non-cryptographic hash
- `xxhash64` - stronger non-cryptographic hash

## Viewing Current Checksum Configuration

```bash
ceph config get osd bluestore_csum_type
```

## Setting the Checksum Algorithm

Set the algorithm globally for all OSDs:

```bash
ceph config set osd bluestore_csum_type crc32c
```

To test with a different algorithm without affecting all OSDs:

```bash
ceph tell osd.2 config set bluestore_csum_type xxhash64
```

## Disabling Checksums (Not Recommended)

If you are using a storage layer that already provides checksumming (such as ZFS or hardware RAID with scrubbing), you might disable BlueStore checksums:

```bash
ceph config set osd bluestore_csum_type none
```

This marginally improves write throughput but removes the data integrity guarantee.

## Configuring via Rook CephCluster

You can set BlueStore config options in the Rook CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      bluestore_csum_type: "crc32c"
```

Apply the change:

```bash
kubectl apply -f cluster.yaml
```

## Verifying Checksums are Active

Check OSD perf counters for checksum latency:

```bash
ceph daemon osd.0 perf dump | jq '.bluestore.csum_lat'
```

If `avgcount` is greater than zero after some read activity, checksumming is active and verifying data on reads.

## Handling Checksum Errors

If Ceph detects a checksum mismatch, it logs an error and marks the object as damaged:

```bash
ceph health detail | grep "checksum"
ceph pg dump_stuck | grep "inconsistent"
```

Run a scrub to find and report any errors:

```bash
ceph pg scrub <pgid>
ceph pg deep-scrub <pgid>
```

## Summary

BlueStore checksumming is a critical data integrity feature that is enabled by default using crc32c. You can change the algorithm using `ceph config set osd bluestore_csum_type`, or configure it via the Rook CephCluster spec. Always run deep-scrubs regularly to surface any checksum errors before they cause data loss.
