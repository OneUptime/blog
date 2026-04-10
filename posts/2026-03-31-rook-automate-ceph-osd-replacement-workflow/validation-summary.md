# Validation Summary: How to Automate Ceph OSD Replacement Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (OSD management, CRUSH map, PG recovery)
- Rook (Kubernetes Ceph operator, toolbox, OSD lifecycle)
- Kubernetes (kubectl exec, pods, deployments, PVCs)
- Bash scripting

## Sources Consulted
- Ceph official documentation: Adding/Removing OSDs — https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Rook official documentation: Ceph OSD Management — https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook official documentation: Ceph Toolbox — https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Ceph source code: PGMap.cc and PGMap.h for `ceph pg stat` JSON output structure — https://github.com/ceph/ceph/blob/main/src/mon/PGMap.cc
- Rook source code: OSD label constants in osd.go — https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/osd.go

## Issues Found

### 1. `kubectl exec -it` in script context (Bug)
- **What was wrong:** The `ceph_cmd()` function used `kubectl exec -it` with the `-t` (TTY) flag. When the function's output is piped to `python3` for JSON parsing (which happens in both the OSD status check and recovery wait), the TTY flag can inject carriage return characters and escape sequences into the output, corrupting JSON parsing. It also produces "Unable to use a TTY" warnings in non-interactive environments (CI/CD, cron).
- **What was changed:** Removed `-it` flags from the `kubectl exec` call in `ceph_cmd()`.
- **Why:** Script-context kubectl exec calls should not use `-t`. The flag is only appropriate for interactive terminal sessions.

### 2. Recovery wait using nonexistent `num_pg_degraded` field (Bug — data safety)
- **What was wrong:** The recovery wait loop used `ceph pg stat --format json` and checked for a `num_pg_degraded` field. This field does not exist in the `ceph pg stat` JSON output in modern Ceph versions (Pacific 16.x, Quincy 17.x, Reef 18.x, Squid 19.x). The Python code fell through to the default value of `0`, causing the recovery wait to exit immediately — even while PGs were still degraded. This could lead to data loss if the OSD is removed before recovery completes.
- **What was changed:** Replaced `ceph pg stat --format json` with `ceph status --format json`, which reliably includes `degraded_objects` and `misplaced_objects` in its `pgmap` section across all modern Ceph versions. Updated the Python parsing to check both fields. Updated the log message to say "Degraded/misplaced objects" instead of "Degraded PGs".
- **Why:** `ceph status --format json` provides a stable, well-documented `pgmap` structure with object-level degradation counts. Checking both `degraded_objects` and `misplaced_objects` ensures the script waits for full recovery before proceeding.

### 3. PVC label lookup unreliable, missing deployment cleanup (Bug)
- **What was wrong:** The `prepare_for_new_osd()` function looked up the OSD PVC using `kubectl get pvc -l "ceph-osd-id=$OSD_ID"`. The `ceph-osd-id` label is reliably applied to pods and deployments by Rook, but may not be present on PVCs in all Rook versions. Additionally, the function only deleted the PVC but not the OSD deployment, which would cause Kubernetes to recreate the OSD pod after deletion.
- **What was changed:** Changed to find the OSD deployment by the `ceph-osd-id` label (which is reliable), then extract the PVC name from the deployment's volume spec. Added deletion of the OSD deployment before the PVC.
- **Why:** Finding the PVC from the deployment spec is reliable regardless of PVC labeling. Deleting the deployment prevents the pod from being recreated by the ReplicaSet controller.

## Review Notes
- The post uses the traditional manual Ceph OSD removal sequence (`crush remove`, `auth del`, `osd rm`). In Ceph Luminous and later, these three steps can be replaced with a single `ceph osd purge $ID --yes-i-really-mean-it` command. Additionally, Rook provides a `rook-ceph-purge-osd` job that automates the entire removal and cleanup process. The manual approach is still valid but readers should be aware of these simpler alternatives.
- The `read -rp` interactive prompt in `verify_osd_failed()` will block in non-interactive environments. Consider adding a `--force` flag for fully automated use.
- The recovery wait checks degraded and misplaced object counts but not recovering PGs or backfilling state. For stricter safety, also checking `ceph health --format json` for `HEALTH_OK` status would be more comprehensive.
