# How to Configure Stripe Unit Settings for Erasure Coding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Erasure Coding, Stripe, Storage Performance

Description: Configure erasure coding stripe unit size in Ceph to optimize I/O alignment, sequential throughput, and encode/decode efficiency for your workload.

---

## What Is Stripe Unit

In Ceph erasure coding, a stripe is a set of K data chunks written in parallel to K OSDs. The `stripe_unit` parameter controls the size of each chunk (in bytes). The total stripe width is `stripe_unit * k`.

Choosing the right stripe unit affects:
- I/O alignment efficiency
- Sequential throughput
- CPU overhead per stripe

## Default Stripe Unit

The default `stripe_unit` in Ceph is 4096 bytes (4 KiB). This is a safe default but may not be optimal for large object workloads.

```bash
# View profile with default stripe_unit
ceph osd erasure-code-profile get default
```

## Setting Stripe Unit in an EC Profile

```bash
# Create profile with 64 KiB stripe_unit (good for large sequential I/O)
ceph osd erasure-code-profile set my-ec-profile \
  k=4 m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  stripe_unit=65536

# Create profile with 1 MiB stripe_unit (good for bulk object storage)
ceph osd erasure-code-profile set bulk-ec-profile \
  k=6 m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  stripe_unit=1048576
```

## How Stripe Unit Relates to Object Size

For an object stored in an EC pool:

```text
stripe_width = stripe_unit * k
object chunk per OSD = ceil(object_size / stripe_width) * stripe_unit
```

Example with k=4, stripe_unit=64 KiB:

```text
stripe_width = 64 KiB * 4 = 256 KiB
For a 1 MiB object:
  Number of stripes = 1 MiB / 256 KiB = 4 stripes
  Each OSD gets 4 * 64 KiB = 256 KiB
```

## Pool-Level Stripe Configuration

For erasure-coded pools, `stripe_width` is automatically derived from the EC profile (`stripe_unit * k`) and is read-only. You can view it but cannot set it manually:

```bash
# View pool stripe width
ceph osd pool get mypool stripe_width
# For stripe_unit=64K, k=4: stripe_width = 262144 (256 KiB)
```

If you need a different `stripe_width`, create a new EC profile with the desired `stripe_unit` and `k` values, then create a new pool using that profile.

## Alignment Considerations for RGW

For Ceph Object Gateway (RGW) storing large objects, use a stripe unit that aligns with your expected object sizes:

```bash
# For typical S3 multipart upload (5 MiB parts)
ceph osd erasure-code-profile set rgw-ec \
  k=4 m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  stripe_unit=524288  # 512 KiB

# Pool creation
ceph osd pool create rgw-data 256 256 erasure rgw-ec
```

## Impact on Small Objects

Small objects (smaller than one stripe width) still use a full stripe, which wastes space and increases CPU overhead proportionally. For small object workloads, prefer smaller stripe units or use replication instead:

```bash
# Small object EC profile (small stripe unit)
ceph osd erasure-code-profile set small-obj-ec \
  k=4 m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  stripe_unit=4096  # 4 KiB
```

## Stripe Unit and Chunk Size on Disk

Each OSD stores chunks of size `stripe_unit`. For metadata and WAL efficiency in BlueStore, the chunk size should align with BlueStore's min alloc size:

```bash
# Check BlueStore min_alloc_size
ceph config get osd bluestore_min_alloc_size_hdd
# Default: 65536 (64 KiB) for HDD

ceph config get osd bluestore_min_alloc_size_ssd
# Default: 4096 (4 KiB) for SSD
```

For best space efficiency, set `stripe_unit` to a multiple of `bluestore_min_alloc_size`.

## Benchmarking Stripe Unit Impact

```bash
# Test with different stripe units using rados bench
rados bench -p mypool 60 write --no-cleanup -t 16 -b 4M
rados bench -p mypool 60 seq -t 16
rados bench -p mypool 60 cleanup
```

## Summary

The `stripe_unit` parameter in Ceph erasure coding profiles controls the size of each data chunk written to an OSD during a stripe operation. The total stripe width equals `stripe_unit * k`. For large sequential workloads like object storage, larger stripe units (64 KiB to 1 MiB) improve throughput and reduce encoding overhead. Stripe units should align with BlueStore's min alloc size for optimal space efficiency. Ceph automatically derives the pool stripe width from the EC profile, simplifying configuration.
