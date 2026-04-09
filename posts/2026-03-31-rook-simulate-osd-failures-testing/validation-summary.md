# Validation Summary: How to Simulate OSD Failures for Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD management, PG recovery, scrubbing)
- Kubernetes (kubectl pod management)
- Python (subprocess-based recovery metrics script)
- Device Mapper (dm-error for I/O fault injection)

## Sources Consulted
- Ceph source code: `src/mon/PGMap.cc` — `process_pg_map_command()`, `print_oneline_summary()`, `recovery_summary()` for `ceph pg stat --format json` output structure (https://github.com/ceph/ceph/blob/main/src/mon/PGMap.cc)
- Ceph documentation: Troubleshooting OSDs — behavior of `ceph osd down` and heartbeat re-up (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/)
- Ceph documentation: Adding/Removing OSDs — `ceph osd out` behavior (https://docs.ceph.com/en/reef/rados/operations/add-or-rm-osds/)
- Ceph documentation: Monitoring OSDs and PGs — OSD states (up/down/in/out) (https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/)
- Kubernetes documentation: `kubectl delete` reference — `--grace-period` and `--force` flags (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)
- Kubernetes documentation: Force Delete StatefulSet Pods (https://kubernetes.io/docs/tasks/run-application/force-delete-stateful-set-pod/)

## Issues Found

### 1. Incorrect JSON field name in Python recovery metrics script
- **What was wrong:** The script used `stats.get("num_pg_degraded", 0)` to check for degraded PGs. The field `num_pg_degraded` does not exist in `ceph pg stat --format json` output (confirmed via Ceph source code — the string `num_pg_degraded` appears nowhere in the codebase).
- **What was changed:** Updated to `stats.get("degraded_objects", 0)`, which is the correct conditionally-present field under the `pg_summary` key. Also updated `get_pg_stats()` to return `json["pg_summary"]` since the output is nested, and updated the print message from "Degraded PGs" to "Degraded objects" to match the metric.
- **Why:** Without this fix, `degraded_objects` would never be read (wrong key and wrong nesting level), causing the recovery loop to exit immediately on the first iteration with a false "recovery complete" result.

### 2. Misleading description of Method 2 (Mark OSD Down and Out)
- **What was wrong:** The description stated "For a more realistic failure that prevents the OSD from restarting." This is incorrect — `ceph osd down` only sets the OSD's state in the cluster map; the running daemon continues sending heartbeats and re-marks itself as "up" within seconds. Neither `osd down` nor `osd out` prevents the daemon from running.
- **What was changed:** Updated the description to accurately state the method triggers rebalancing, and added a note that the `noup` flag should be set first to prevent the OSD from re-marking itself up. Added a `ceph osd set-group noup` step to the script before marking the OSD down.
- **Why:** Without the `noup` flag, the `ceph osd down` command is effectively a no-op when the daemon is running, making the test unreliable.

### 3. Missing `--force` flag on `kubectl delete pod`
- **What was wrong:** `kubectl delete pod --grace-period=0` was used without `--force`. In Kubernetes 1.5+, `--grace-period=0` without `--force` does not perform an immediate force deletion — the API server still waits for kubelet confirmation.
- **What was changed:** Added `--force` flag: `kubectl delete pod --grace-period=0 --force`.
- **Why:** For OSD failure simulation, immediate pod termination is the goal. Without `--force`, the deletion may not be immediate, reducing the fidelity of the failure simulation.

## Review Notes
- The dm-error (Method 3) section is intentionally brief and conceptual — it shows how to create the error device but does not show how to redirect the OSD to use it. This is acceptable since dm-error injection is node-level and highly environment-specific, but readers should be aware the section is incomplete.
- The `sleep 60` in the data integrity verification section is a rough approximation for scrub completion. In large clusters, scrubbing can take much longer. A more robust approach would be to poll `ceph pg dump` for scrub status, but the current approach is acceptable for a testing guide.
- The `ceph osd pool scrub` command is valid and correctly used.
- The summary mentions tuning `osd_recovery_priority` and `osd_backfill_scan_min` — both are valid Ceph configuration parameters.
