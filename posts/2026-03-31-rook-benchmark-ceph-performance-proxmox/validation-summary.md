# Validation Summary: How to Benchmark Ceph Performance in Proxmox

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (rados bench, rbd bench, ceph CLI)
- Proxmox VE
- fio (Flexible I/O Tester)
- RBD (RADOS Block Device)

## Sources Consulted
- Official Ceph documentation: rados man page — https://docs.ceph.com/en/latest/man/8/rados/
- Official Ceph documentation: rbd man page — https://docs.ceph.com/en/reef/man/8/rbd/
- Debian man pages for rbd(8) — https://manpages.debian.org/testing/ceph-common/rbd.8.en.html
- Official fio documentation (HOWTO.rst) — https://github.com/axboe/fio/blob/master/HOWTO.rst
- Ceph Wiki: Benchmark Ceph Cluster Performance — https://tracker.ceph.com/projects/ceph/wiki/Benchmark_Ceph_Cluster_Performance

## Issues Found

### 1. `rbd bench` random read command missing `--io-pattern rand`
- **What was wrong:** The command labeled "Run random read benchmark" did not include the `--io-pattern rand` flag. The default `--io-pattern` for `rbd bench` is `seq` (sequential), so the command as written would have performed a sequential read, not a random read as described.
- **What was changed:** Added `--io-pattern rand` to the rbd bench read command.
- **Why:** Without this flag, the benchmark does not match what the comment describes, and users would get sequential read results instead of random read results.

### 2. `fio` command missing `--ioengine=libaio` and `--direct=1`
- **What was wrong:** The fio command specified `--iodepth=32` but did not set an async I/O engine. The default fio ioengine is `psync`, which is synchronous and does not support iodepth > 1. This means `--iodepth=32` would be silently ignored, and each job would only have 1 I/O in flight at a time. Additionally, `libaio` on Linux requires `--direct=1` (O_DIRECT) to actually achieve async behavior; without it, buffered I/O falls back to synchronous.
- **What was changed:** Added `--ioengine=libaio` and `--direct=1` to the fio command.
- **Why:** Without these flags, the benchmark would not achieve the intended 32-deep I/O queue per job, producing misleadingly low IOPS and throughput results that don't reflect actual Ceph performance under concurrent load.

## Review Notes
- The pool creation commands are shown after the `rados bench` commands, though the text says "Create the benchmark pool first." The ordering is slightly confusing but the text itself is correct.
- The `-t 16` flag on `rados bench` is redundant since 16 is the default thread count, but it's harmless and makes the intent explicit.
- The `rbd bench` write and read commands explicitly specify `--io-size 4096`, `--io-threads 16`, and `--io-total 1G`, which are all the default values. This is redundant but acceptable for clarity.
- The "Watch OSD commit latency live" comment describes a one-shot command (`ceph osd perf | sort | tail`), not continuous monitoring. Users wanting live monitoring should wrap it with `watch`.
- Performance estimates (200-500 MiB/s sequential, 10K-50K 4K IOPS for 3-node SSD on 10GbE) are reasonable ballpark figures.
