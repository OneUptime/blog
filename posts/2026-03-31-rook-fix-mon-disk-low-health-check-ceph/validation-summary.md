# Validation Summary: How to Fix MON_DISK_LOW Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (monitors, RocksDB store, Paxos, OSD maps)
- Rook (Kubernetes Ceph operator, PVC management)
- Kubernetes (PVC expansion, kubectl)
- LVM (lvextend, resize2fs)
- XFS (xfs_growfs)

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph monitor configuration source (`src/common/options/mon.yaml.in`): https://github.com/ceph/ceph/blob/main/src/common/options/mon.yaml.in
- Ceph global configuration source (`src/common/options/global.yaml.in`): https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Ceph OSD map pruning documentation: https://github.com/ceph/ceph/blob/main/doc/dev/mon-osdmap-prune.rst
- Ceph MonCommands.h source: https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph Paxos.h source: https://github.com/ceph/ceph/blob/main/src/mon/Paxos.h
- ceph(8) man page: https://www.mankier.com/8/ceph

## Issues Found

### 1. Incorrect use of `ceph tell mon.* sync_force` (Critical)
**What was wrong:** The post included `ceph tell mon.* sync_force` in the "Trimming Monitor History" section, implying it triggers map epoch trimming. In reality, `sync_force` is a destructive recovery command that erases the monitor store and forces a full re-sync from a peer monitor. The correct syntax also requires `--yes-i-really-mean-it --i-know-what-i-am-doing` safety flags. Using this command as casually described could destroy a monitor's store and disrupt cluster quorum.
**What was changed:** Removed the `sync_force` command entirely. Added a note that trimming occurs automatically after config changes, and suggested running `ceph tell mon.* compact` again to reclaim freed space.

### 2. `mon_min_osdmap_epochs` set to its default value (Minor)
**What was wrong:** The post set `mon_min_osdmap_epochs` to 500, which is already the default value. This would have no effect unless it had been previously changed.
**What was changed:** Changed the recommended value to 200, which actually reduces OSD map retention below the default.

### 3. `paxos_min_wait` presented as a trimming option (Incorrect)
**What was wrong:** The post included `ceph config set mon paxos_min_wait 0.05` under "Reduce the number of retained PGMap epochs." This option controls the minimum wait time for batching Paxos proposals together and has nothing to do with trimming or epoch retention.
**What was changed:** Removed `paxos_min_wait` from the trimming section entirely.

### 4. `paxos_trim_min` description and value (Misleading)
**What was wrong:** The post described `paxos_trim_min` as reducing "retained PGMap epochs." It actually controls the number of extra Paxos proposals tolerated before trimming kicks in, and it applies to all Paxos-managed state (OSDMaps, PGMaps, auth data, etc.), not PGMap specifically. The suggested value of 10 (down from default 250) was dangerously aggressive and could cause performance issues.
**What was changed:** Changed the value to 100 (a moderate reduction from the default 250) and corrected the description to accurately explain it controls Paxos state trimming across all monitor services.

## Review Notes
- The example `ceph health detail` output uses a slightly different format than actual Ceph output (actual output says something like "mon.b has 22% avail"), but it's close enough for an illustrative example and clearly communicates the concept.
- The Rook PVC expansion section correctly notes the `allowVolumeExpansion: true` requirement on the StorageClass.
- The bare metal LVM/XFS expansion commands are correct.
- The `mon_data_avail_warn` threshold adjustment section is correct — both the set and rm commands are valid.
- Users should be aware that `ceph tell mon.* compact` can briefly make monitors unavailable during compaction of large stores. The post does not mention this, but it is a minor operational consideration rather than a technical error.
