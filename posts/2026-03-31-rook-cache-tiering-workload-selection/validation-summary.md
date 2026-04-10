# Validation Summary: How to Identify Good and Bad Workloads for Cache Tiering in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (cache tiering, CRUSH device classes, RADOS)
- Rook (Kubernetes Ceph operator)
- Kubernetes (persistent volumes)

## Sources Consulted
- Ceph official documentation on cache tiering (https://docs.ceph.com/en/reef/rados/operations/cache-tiering/)
- Ceph official documentation on CRUSH map and device classes (https://docs.ceph.com/en/reef/rados/operations/crush-map/)
- Ceph official documentation on pool operations (https://docs.ceph.com/en/reef/rados/operations/pools/)
- Ceph `rados bench` CLI documentation and man pages
- Ceph `ceph osd pool stats` CLI documentation

## Issues Found

### 1. Misleading comment on `ceph osd pool stats` command
- **What was wrong:** The comment said "Run a trace of object access frequency on the backing pool," but `ceph osd pool stats` only shows aggregate I/O statistics (read/write ops per second, bandwidth) — it does not show per-object access frequency.
- **What was changed:** Updated the comment to "Check aggregate I/O statistics (read/write ops and bandwidth) for the pool."

### 2. Incorrect `rados bench` usage and comment
- **What was wrong:** The command `rados -p backing-pool bench 300 rand -t 16 --no-cleanup` had two issues: (a) `rados bench rand` reads only objects created by a prior `rados bench write`, but no write step was shown, meaning the command would fail; (b) `--no-cleanup` is meaningless for read benchmarks (it only prevents cleanup after write benchmarks). The comment "Use rados bench to simulate read patterns" was also misleading in the context of "analyze your access patterns."
- **What was changed:** Added the prerequisite `rados bench write --no-cleanup` step before the `rand` read step, removed the unnecessary `--no-cleanup` from the rand command, and updated the comment to accurately describe it as a synthetic random read benchmark.

### 3. Updated follow-up text
- **What was wrong:** The text "If the access pattern shows that top-N objects account for most reads" implied the commands would reveal per-object access distribution, which they do not.
- **What was changed:** Updated to "If the read/write ratio is heavily skewed toward reads and the working set fits in a cache tier, cache tiering may help."

## Review Notes
- The CRUSH device class commands (`ceph osd crush rule create-replicated`, `ceph osd pool create`, `ceph osd pool set crush_rule`) are all syntactically correct and match official documentation.
- The `ceph osd pool create hot-data-pool 32 32 replicated` command explicitly specifies pgp_num, which is redundant on Ceph Nautilus+ (pgp_num auto-adjusts to pg_num). This is not incorrect but is unnecessary on modern Ceph.
- The claim that cache tiering is deprecated in Ceph Reef is confirmed by official documentation.
- The hit set bloom filter mechanism is accurately described.
- The "RMW cycle" concern for write workloads is a reasonable characterization. Ceph docs specifically document promotion overhead for writes to erasure-coded backing pools; the blog uses "RMW" as shorthand for the broader promotion/writeback overhead, which is a reasonable simplification.
- The illustrative latency numbers (0.3ms direct vs 1.2ms cache tier) are presented as examples, not benchmarks, and the general claim that cache tiering adds latency overhead is well-supported.
