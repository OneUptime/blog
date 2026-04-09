# Validation Summary: How to Load Test Ceph with rados bench

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS layer, rados bench tool)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl exec into toolbox pod)

## Sources Consulted
- Ceph official documentation for `rados bench` command syntax and flags (`rados bench --help`, man page)
- Ceph documentation for `ceph osd pool create` and `ceph osd pool delete` commands
- Ceph source code for `rados bench` default parameters (object size 4MB, concurrency 16)

## Issues Found
- **IOPS values in "Interpreting Results" table were inconsistent with bandwidth ranges.** The table listed Write IOPS of 100-500 for HDD and 50,000-500,000 for NVMe. Since `rados bench` defaults to 4MB objects, IOPS = Bandwidth / Object_size. With HDD bandwidth of 100-300 MB/s, correct IOPS is 25-75. With NVMe bandwidth of 1-3 GB/s, correct IOPS is 250-750. The original IOPS numbers corresponded to 4KB random I/O workloads (e.g., from `fio`), not 4MB sequential writes from `rados bench`. Fixed by updating the IOPS row to show correct values for 4MB objects and labeling the row accordingly.

## Review Notes
- The blog's own example output confirms the IOPS/bandwidth relationship: 415.87 MB/s bandwidth with 103 IOPS at 4MB object size (103 * 4 = 412 ≈ 415.87).
- The "Run Multiple Clients" section backgrounds two `kubectl exec` commands targeting the same deployment. Both will exec into the same pod (assuming a single replica), running two concurrent `rados bench` processes. This works for generating load but the "Pod 1" / "Pod 2" labels are slightly misleading — they are processes, not separate pods. This is a minor clarity issue, not a technical error.
- The cleanup command `rados bench -p benchmark 10 write --cleanup-only` is valid. The `10` (seconds) and `write` (mode) are required syntactically but ignored when `--cleanup-only` is specified.
- The pool creation command uses explicit `pg_num` and `pgp_num` (64 64). In Ceph Pacific+ `pgp_num` auto-adjusts, but specifying both is still valid.
