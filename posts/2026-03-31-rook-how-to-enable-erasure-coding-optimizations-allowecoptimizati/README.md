# How to Enable Erasure Coding Optimizations in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Erasure Coding, Performance, Optimization

Description: Enable and configure Ceph erasure coding optimizations including allow_ec_optimizations to improve write performance and reduce read-modify-write overhead.

---

## Erasure Coding Write Challenges

Erasure coded pools in Ceph face a fundamental challenge with writes: to update part of an object, the OSD must read the existing data, modify it, re-encode the full stripe, and write all K+M chunks. This read-modify-write (RMW) cycle is expensive.

The `allow_ec_optimizations` flag enables a set of optimizations that reduce this overhead.

## What allow_ec_optimizations Enables

When enabled, this flag allows OSDs to:
- Perform partial stripe updates without full RMW cycles for certain write patterns
- Use faster code paths for appends and overwrites
- Enable hardware-accelerated encoding paths
- Reduce the number of network round-trips during writes

```bash
# Check current setting
ceph osd pool get myecpool allow_ec_optimizations

# Enable optimizations on an existing EC pool
ceph osd pool set myecpool allow_ec_optimizations true
```

## Prerequisites

`allow_ec_optimizations` requires:
- Ceph Tentacle (20.x) or later
- BlueStore backend (not Filestore)
- EC overwrites enabled on the pool
- Jerasure or ISA-L plugin with the `reed_sol_van` technique

```bash
# Enable EC overwrites (required for RBD/CephFS on EC pools)
ceph osd pool set myecpool allow_ec_overwrites true
```

## Enabling Optimizations at Profile Level

You can bake optimizations into the EC profile:

```bash
ceph osd erasure-code-profile set optimized-ec \
  k=4 m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  stripe_unit=65536

ceph osd pool create ec-optimized 128 128 erasure optimized-ec
ceph osd pool set ec-optimized allow_ec_overwrites true
ceph osd pool set ec-optimized allow_ec_optimizations true
```

## EC Partial Write Optimizations

Ceph Tentacle and later introduced EC partial writes as part of the FastEC feature, which allow small in-stripe updates without a full RMW cycle. This is a significant improvement for RBD workloads on EC pools. EC partial writes are enabled automatically when `allow_ec_optimizations` is set on a pool - no separate config option is needed:

```bash
# Enable EC optimizations including partial writes (Ceph Tentacle+)
ceph osd pool set myecpool allow_ec_optimizations true

# Verify the flag is set
ceph osd pool get myecpool allow_ec_optimizations
```

## Monitoring the Effect

Compare I/O metrics before and after enabling optimizations:

```bash
# Check OSD performance counters
ceph osd perf

# Monitor recovery and write operations
ceph daemon osd.0 perf dump | grep -E "write|rmw|stripe"

# Use rados bench to compare throughput
rados bench -p ec-optimized 30 write -t 8 -b 1M --no-cleanup
rados bench -p ec-optimized 30 seq -t 8
rados -p ec-optimized cleanup
```

## Hardware Acceleration

Pairing optimizations with hardware-accelerated encoding provides maximum benefit:

```bash
# Use ISA plugin for Intel hardware
ceph osd erasure-code-profile set hw-ec \
  k=4 m=2 \
  plugin=isa \
  technique=reed_sol_van \
  stripe_unit=65536

ceph osd pool create hw-ec-pool 128 128 erasure hw-ec
ceph osd pool set hw-ec-pool allow_ec_optimizations true
```

## Ceph RGW and EC Optimization

For Ceph RGW (object gateway), EC pools benefit from optimization when storing large objects (multipart uploads):

```bash
# Verify RGW is using the EC pool
radosgw-admin zone get | grep data_pool

# Monitor RGW write performance
radosgw-admin bucket stats --bucket=<bucket-name>
```

## Caveats and Compatibility

- `allow_ec_optimizations` requires Ceph Tentacle (20.x) or later
- Once enabled, `allow_ec_optimizations` cannot be disabled on a pool
- Enabling after pool creation causes no data migration, only new writes use the optimized paths
- Test with a benchmark pool before enabling on production
- Some features (like object omap) are still not available on EC pools regardless of this flag

```bash
# Check Ceph version
ceph version
```

## Summary

The `allow_ec_optimizations` flag enables improved write code paths for Ceph erasure coded pools, reducing the overhead of read-modify-write cycles. Combined with `allow_ec_overwrites`, hardware-accelerated encoding via the ISA plugin, and Ceph Tentacle's EC partial writes feature, this significantly improves EC pool write performance. These optimizations are particularly beneficial for RBD block storage and RGW object storage workloads with large objects.
