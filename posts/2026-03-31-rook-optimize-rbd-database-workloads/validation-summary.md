# Validation Summary: How to Optimize RBD for Database Workloads

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- CephBlockPool CRD (Rook)
- Kubernetes StorageClass (CSI RBD provisioner)
- fio (Flexible I/O Tester)
- MySQL InnoDB / PostgreSQL (database page size references)

## Sources Consulted
- Ceph RBD documentation: `rbd create` command reference and `--object-size` flag behavior (default 4 MiB, power-of-2 requirement)
- Ceph RBD QoS documentation: `rbd_qos_iops_limit`, `rbd_qos_iops_burst` — confirmed these are maximum caps/throttles, not minimum reservations
- Rook CephBlockPool CRD specification: `spec.compressionMode` field placement (top-level spec, not under `spec.parameters`)
- Rook CSI RBD StorageClass documentation: provisioner name, secret names, imageFeatures, and `exclusive-lock` implicit enablement via `object-map` dependency
- fio documentation: `--direct=1` flag for bypassing OS page cache on block device benchmarks

## Issues Found

1. **CephBlockPool compression_mode placement (line 30-31)**: `compression_mode: none` was nested under `spec.parameters`. In the Rook CephBlockPool CRD, compression is configured via the dedicated top-level field `spec.compressionMode`, not through `spec.parameters`. Fixed to `compressionMode: none` at the correct spec level.

2. **RBD Object Size section title and description (line 63-65)**: Text said "Set RBD object size to match the database page size" but the values used (64 KB for PostgreSQL, 128 KB for MySQL) do not match the page sizes (8 KB and 16 KB respectively). The actual purpose of reducing RBD object size is to limit write amplification for small random I/O patterns. Rewrote the section heading to "RBD Object Size Tuning" and the description to accurately explain the trade-off (less write amplification vs. more RADOS objects).

3. **QoS section title and description (line 99-101)**: Section was titled "QoS IOPS Reservation" and described the options as guaranteeing "minimum IOPS." This is incorrect — `rbd_qos_iops_limit` and `rbd_qos_iops_burst` are maximum IOPS caps (throttling), not minimum reservations. Ceph RBD QoS provides only rate limiting, not guaranteed minimums. Fixed the title to "QoS IOPS Limiting" and the description to accurately describe capping maximum IOPS.

4. **fio benchmark missing --direct=1 (line 116)**: The fio command was missing `--direct=1`, which is essential for accurate block device benchmarking. Without it, I/O goes through the OS page cache, and results reflect cache performance rather than actual device latency and throughput. Added `--direct=1` to the command.

5. **Summary section wording (line 126)**: Updated "object size alignment to the database page size" to "reduced object size to limit write amplification" to match the corrected object size section.

## Review Notes
- The StorageClass `imageFeatures` list omits `exclusive-lock`, but this is technically fine because `object-map` and `fast-diff` implicitly enable `exclusive-lock` as a dependency. The later section on manually enabling exclusive-lock is redundant but harmless.
- The chosen RBD object sizes (64 KB and 128 KB) are unusually small compared to the default 4 MiB and typical tuning range of 512 KB–4 MiB. While valid, they will create a very large number of RADOS objects for sizable images (e.g., a 100 GiB image at 64 KB = ~1.6 million objects). Users should be aware of the metadata overhead trade-off.
- The fio command uses `--ioengine=libaio`, which is correct and widely supported. `io_uring` is the newer alternative with lower syscall overhead on Linux 5.1+, but `libaio` remains a safe default for compatibility.
