# Validation Summary: How to Prioritize Recovery of Specific Pools in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- CRUSH maps and rules
- Ceph OSD recovery configuration
- Bash scripting

## Sources Consulted
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph OSD Config Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph MonCommands.h source: https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph MgrCommands.h source: https://github.com/ceph/ceph/blob/main/src/mgr/MgrCommands.h
- Ceph man page (ceph(8)): https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found

### 1. Invalid `norecover` pool-level flag (was line 34)
- **What was wrong:** The command `ceph osd pool set archive-pool norecover 1` is invalid. `norecover` is NOT a pool-level property in Ceph. It can only be set cluster-wide (`ceph osd set norecover`) or per-OSD. The valid pool-level "no-" flags are: `noscrub`, `nodeep-scrub`, `nodelete`, `nopgchange`, and `nosizechange`. Running this command would produce an error like `Error EINVAL: unrecognized variable 'norecover'`.
- **What was changed:** Removed the invalid command entirely. The section now correctly focuses on two working approaches: setting `nodeep-scrub` on non-critical pools to free I/O resources, and using PG-level `cancel-force-recovery` to remove priority from non-critical pool PGs.
- **Why:** The invalid command would fail in any Ceph version. The replacement approach achieves the same goal using supported mechanisms.

### 2. Misleading section title "Pool-Level norecovery Controls"
- **What was wrong:** The title implied that Ceph supports pool-level `norecover` controls, which it does not.
- **What was changed:** Renamed to "Controlling Recovery for Specific Pools" which accurately describes the section's content.
- **Why:** Technical accuracy — there are no pool-level norecover controls in Ceph.

### 3. Deprecated `ceph osd lspools` command
- **What was wrong:** `ceph osd lspools` is deprecated (marked `FLAG(DEPRECATED)` in Ceph source).
- **What was changed:** Replaced with `ceph osd pool ls`, which is the current supported command.
- **Why:** Using deprecated commands in a guide can confuse readers when the command is eventually removed.

### 4. Misleading comment about pausing recovery
- **What was wrong:** The comment "Pause recovery for all PGs in a low-priority pool" applied to both `nodeep-scrub` and the invalid `norecover` command. `nodeep-scrub` does not pause recovery — it only pauses deep scrubbing.
- **What was changed:** Updated comments to accurately describe what each command does: `nodeep-scrub` frees I/O resources, and `cancel-force-recovery` removes priority elevation from PGs.
- **Why:** Accurate comments prevent operators from misunderstanding what protections are in place.

## Review Notes

- **`force-recovery` does not override `norecover`:** If a cluster-wide `norecover` flag is set, `ceph pg force-recovery` will NOT force PGs to recover. The `norecover` flag must be unset first. The recovery priority script in the post should be used without a cluster-wide `norecover` flag active.
- **NVMe device class:** The post uses `nvme` as a CRUSH device class. NVMe devices are often auto-detected as `ssd` by Ceph (since they are non-rotational). Operators may need to manually assign the `nvme` device class if they want to distinguish NVMe from SATA SSDs. The command syntax is correct, but the device class must exist in the cluster.
- **Monitoring script field positions:** The `awk` script using `$21` for degraded objects from `ceph pg dump` output is fragile — field positions may vary across Ceph versions. Consider using `ceph pg dump --format=json` for more reliable parsing in production scripts.
- **Introduction mentions `ceph tell`:** Point 4 in the introduction references `ceph tell` for per-OSD recovery parameters, but the post demonstrates `ceph config set` instead. Both are valid — `ceph tell` applies changes at runtime (non-persistent), while `ceph config set` persists through the monitor config database. The post's use of `ceph config set` is the better modern approach.
- **`osd_recovery_max_active_ssd` default:** The post sets this to 20 for critical OSDs. The default in recent Ceph versions is 10 (was 3 in older versions). A value of 20 is aggressive and may impact client I/O; operators should test in their environment.
