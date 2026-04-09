# Validation Summary: How to Enable Erasure Coding Optimizations in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph orchestrator for Kubernetes)
- Erasure Coding (EC pools, profiles, plugins)
- BlueStore (Ceph OSD backend)
- RADOS (Reliable Autonomic Distributed Object Store)
- RGW (RADOS Gateway / Ceph Object Gateway)
- ISA-L (Intel Intelligent Storage Acceleration Library)

## Sources Consulted
- Ceph official documentation — Erasure code profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Ceph official documentation — Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation — ISA erasure code plugin: https://docs.ceph.com/en/latest/rados/operations/erasure-code-isa/
- Ceph official documentation — Erasure coding enhancements: https://docs.ceph.com/en/latest/dev/osd_internals/erasure_coding/enhancements/
- Ceph Tentacle (v20.2.0) release notes: https://docs.ceph.com/en/latest/releases/tentacle/
- Ceph.io blog — Fast Erasure Coding for Tentacle Performance Updates: https://ceph.io/en/news/blog/2025/tentacle-fastec-performance-updates/
- Ceph.io blog — v20.2.0 Tentacle released: https://ceph.io/en/news/blog/2025/v20-2-0-tentacle-released/
- Ceph man pages — rados(8): https://docs.ceph.com/en/latest/man/8/rados/
- Ceph man pages — radosgw-admin(8): https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

### 1. Wrong Ceph version for `allow_ec_optimizations` (Critical)
**What was wrong:** The post stated `allow_ec_optimizations` requires "Ceph Quincy (17.x) or later." In reality, this flag was introduced in Ceph Tentacle (20.x) as part of the FastEC feature.
**What was changed:** Updated the prerequisite from "Ceph Quincy (17.x) or later" to "Ceph Tentacle (20.x) or later." Also added the requirement that the pool must use the Jerasure or ISA-L plugin with the `reed_sol_van` technique.
**Why:** The `allow_ec_optimizations` flag did not exist before Tentacle. Claiming Quincy support would mislead users into trying to set a nonexistent flag on older clusters.

### 2. Fabricated `osd_ec_partial_writes` config option (Critical)
**What was wrong:** The post claimed that EC partial writes are controlled by a separate config option `osd_ec_partial_writes` (`ceph config set osd osd_ec_partial_writes true`). This config option does not exist in any Ceph release.
**What was changed:** Replaced the entire EC Partial Write Optimizations section to explain that partial writes are part of the FastEC feature in Tentacle and are enabled automatically via the `allow_ec_optimizations` pool flag. Removed the fabricated commands.
**Why:** Running `ceph config set osd osd_ec_partial_writes true` would fail with an unrecognized option error, confusing readers.

### 3. Wrong Ceph version for EC partial writes (Critical)
**What was wrong:** The post attributed EC partial writes to "Ceph Reef and later." EC partial writes are part of the FastEC feature introduced in Ceph Tentacle (20.x).
**What was changed:** Updated "Ceph Reef and later" to "Ceph Tentacle and later."
**Why:** Reef does not have the EC partial writes feature.

### 4. Incorrect `rados bench` cleanup syntax (Medium)
**What was wrong:** The post used `rados bench -p ec-optimized 30 cleanup`. The `cleanup` operation is a separate `rados` subcommand, not a mode of `rados bench`. It does not take a seconds argument.
**What was changed:** Corrected to `rados -p ec-optimized cleanup`.
**Why:** The original command would fail with a syntax error.

### 5. Missing irreversibility caveat (Low)
**What was wrong:** The caveats section did not mention that `allow_ec_optimizations` cannot be disabled once enabled on a pool.
**What was changed:** Added a caveat noting this irreversibility.
**Why:** This is an important operational consideration — administrators should know this before enabling the flag on production pools.

## Review Notes
- The pool creation syntax `ceph osd pool create ec-optimized 128 128 erasure optimized-ec` is correct but uses the legacy explicit PG count format. Since Ceph Pacific (16.x), the PG autoscaler is enabled by default and explicit PG counts are typically unnecessary. This is not incorrect, but readers on modern Ceph versions may want to omit the PG counts.
- The Caveats section's note that "Enabling after pool creation causes no data migration, only new writes use the optimized paths" is accurate and an important point for users to understand.
- The post's overall structure and advice around benchmarking before production use and monitoring with `ceph osd perf` and `ceph daemon` are sound operational practices.
