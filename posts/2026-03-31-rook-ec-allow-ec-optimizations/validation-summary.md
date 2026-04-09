# Validation Summary: How to Enable Erasure Coding Optimizations (allow_ec_optimizations) in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (erasure coding, Fast EC)
- Rook (CephBlockPool CRD)
- Kubernetes
- BlueStore

## Sources Consulted
- [Erasure code — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- [Tentacle Release Notes — Ceph Documentation](https://docs.ceph.com/en/latest/releases/tentacle/)
- [Fast Erasure Coding for Tentacle Performance Updates — Ceph Blog](https://ceph.io/en/news/blog/2025/tentacle-fastec-performance-updates/)
- [v20.2.0 Tentacle released — Ceph Blog](https://ceph.io/en/news/blog/2025/v20-2-0-tentacle-released/)
- [Erasure coding enhancements — Ceph Documentation](https://docs.ceph.com/en/latest/dev/osd_internals/erasure_coding/enhancements/)
- [ceph/doc/rados/operations/erasure-code.rst — GitHub](https://github.com/ceph/ceph/blob/main/doc/rados/operations/erasure-code.rst)
- [CephBlockPool CRD — Rook Documentation](https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/)
- [Pools — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found

### 1. Wrong Ceph version (CRITICAL)
- **What was wrong:** The post stated `allow_ec_optimizations` was introduced in Ceph Quincy (17.x). It was actually introduced in Ceph Tentacle (20.x) as part of the Fast EC feature.
- **What was changed:** Updated all version references from Quincy (17.x) / 17.2+ to Tentacle (20.x) / 20.2+.
- **Why:** `allow_ec_optimizations` requires all Monitors and OSDs to be upgraded to Tentacle or later. Setting the flag on Quincy would fail.

### 2. Incorrect description of what the flag does
- **What was wrong:** The post described the optimization as simply detecting full-stripe writes and skipping the read phase. The actual Fast EC feature is much broader, including partial reads, small object padding elimination, partial writes, and parity delta writes (PDW).
- **What was changed:** Rewrote the "What allow_ec_optimizations Does" section to accurately describe the four Fast EC improvements. Updated the Performance Impact table to reflect the actual optimization patterns.
- **Why:** The original description was a significant oversimplification that mischaracterized the feature's purpose and benefits.

### 3. False prerequisite: `allow_ec_overwrites` not required
- **What was wrong:** The post stated `allow_ec_overwrites` must already be enabled on the pool as a requirement. These are independent flags; `allow_ec_optimizations` does not require `allow_ec_overwrites`.
- **What was changed:** Removed `allow_ec_overwrites` from the Requirements section. Restructured the Enabling section to show `allow_ec_optimizations` as the primary command, with `allow_ec_overwrites` as a separate recommendation for RBD/CephFS use cases. Removed `allow_ec_overwrites` from the Rook YAML example.
- **Why:** Per official Ceph documentation, the two flags are independent.

### 4. Missing plugin/technique restriction
- **What was wrong:** The post did not mention that optimizations are only supported with Jerasure and ISA-L plugins using the `reed_sol_van` technique.
- **What was changed:** Added this requirement to both the Requirements and Limitations sections.
- **Why:** Attempting to set the flag with an unsupported plugin/technique combination is blocked by Ceph with an error.

### 5. Missing irreversibility warning
- **What was wrong:** The post did not mention that once enabled, the flag cannot be disabled.
- **What was changed:** Added a note after the enable command and in the Limitations section.
- **Why:** This is a critical operational detail — enabling this flag permanently changes how data is stored in the pool.

### 6. "CephFS data pool writes from MDS" was inaccurate
- **What was wrong:** The post said "CephFS data pool writes from MDS that issue full-stripe writes." CephFS clients write data directly to the data pool; the MDS handles metadata only.
- **What was changed:** Changed "from MDS that issue full-stripe writes" to "from clients."
- **Why:** The MDS does not write to the data pool.

### 7. Unverifiable `ec_read_in_progress` perf counter
- **What was wrong:** The monitoring section referenced an `ec_read_in_progress` counter that could not be verified in Ceph documentation or perf counter references.
- **What was changed:** Replaced with general guidance to look for EC-related counters and compare latency metrics before/after.
- **Why:** Recommending a specific counter that may not exist would lead to user confusion.

### 8. Non-4K-aligned chunk size restriction missing
- **What was wrong:** The post did not mention that EC optimizations for non-4K-aligned chunk sizes are not supported.
- **What was changed:** Added to the Limitations section.
- **Why:** Attempts to use non-4K-aligned chunk sizes with Fast EC are rejected by Ceph.

## Review Notes
- The post's recommended stripe unit of 16 KiB aligns with official Ceph guidance for optimized workloads. The default stripe unit is 4K, but Ceph recommends increasing to at least 16K for most I/O workloads when using optimizations.
- The Rook CephBlockPool YAML uses the correct `parameters` field for setting pool flags, which is consistent with Rook documentation.
- The `osd_pool_default_flag_ec_optimizations` central config option exists to default new pools to have optimizations enabled, which could be mentioned in a future update.
