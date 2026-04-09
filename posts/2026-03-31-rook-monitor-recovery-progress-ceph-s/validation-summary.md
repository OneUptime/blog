# Validation Summary: How to Monitor Recovery Progress with ceph -s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (kubectl)
- Prometheus (monitoring metrics)
- Bash scripting

## Sources Consulted
- Ceph official documentation for `ceph -s` / `ceph status` command output format
- Ceph official documentation for `ceph pg dump_stuck` valid stuck types (inactive, unclean, stale, undersized, degraded)
- Ceph official documentation for `ceph tell osd.*` subcommands (`bench` vs `perf dump`)
- Ceph official documentation for `ceph osd perf` command
- Ceph MGR Prometheus module documentation for exported metric names
- Rook-Ceph documentation for toolbox pod usage

## Issues Found

### Issue 1: Invalid `ceph pg dump_stuck recovering` command
- **What was wrong:** `recovering` is not a valid stuck type for the `ceph pg dump_stuck` command. Valid types are: `inactive`, `unclean`, `stale`, `undersized`, `degraded`.
- **What was changed:** Replaced `ceph pg dump_stuck recovering` with `ceph pg dump_stuck degraded`, which is a valid stuck type relevant to recovery monitoring. The existing `ceph pg dump_stuck unclean` line was kept as it already covers recovering PGs (recovering is a subset of unclean).
- **Why:** Running the original command would produce an error or unexpected behavior depending on the Ceph version.

### Issue 2: `ceph tell osd.* bench` is a benchmarking command, not a monitoring command
- **What was wrong:** The post recommended `ceph tell osd.* bench` under "Get recovery stats per OSD." This command actually runs a write benchmark (by default 1 GB of 4 MB writes) on every OSD, generating significant I/O load. This is not a monitoring command and is potentially harmful during recovery as it competes for I/O bandwidth.
- **What was changed:** Replaced `ceph tell osd.* bench` with `ceph osd perf`, which shows per-OSD commit and apply latency statistics — actual monitoring data relevant to recovery performance.
- **Why:** The original command would actively degrade recovery performance instead of monitoring it.

## Review Notes
- The example `ceph -s` output includes a "recovery: 2 active+recovering" line in the health section, which is not a standard Ceph health warning format. The actual PG state info is correctly shown in the `pgs:` subsection of the data section. Since the output is clearly labeled as an example, this was left as-is but could be refined for accuracy.
- The Prometheus metric names (`ceph_pg_recovering_bytes_per_sec`, `ceph_pg_degraded`) may not match exact metric names exported by the Ceph MGR Prometheus module, which vary across Ceph versions. Readers should consult the Prometheus endpoint on their cluster for exact metric names.
- The ETA estimation script has a potential edge case: if `recovering_objects_per_sec` is 0, the default of 1 prevents division by zero but produces an inaccurate estimate. This is acceptable for an illustrative script.
