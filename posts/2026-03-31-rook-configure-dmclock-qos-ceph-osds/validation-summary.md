# Validation Summary: How to Configure DmClock QoS for Ceph OSDs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- DmClock / mClock QoS scheduler
- Ceph OSD (Object Storage Daemon)
- Rook (Ceph operator for Kubernetes)
- rados bench (benchmarking tool)

## Sources Consulted
- Ceph mClock Config Reference (official docs): https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Ceph OSD Config Reference (official docs): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Quincy Release Notes: https://docs.ceph.com/en/latest/releases/quincy/
- Ceph OSD source code (admin socket commands): https://github.com/ceph/ceph/blob/main/src/osd/OSD.cc

## Issues Found

1. **Misleading comment "List available profiles"**: The command `ceph config get osd osd_mclock_profile` only returns the current setting, not a list of available profiles. Fixed comment to "Check current profile".

2. **Missing `custom` profile requirement (significant)**: The "Configuring Custom mClock Parameters" section set individual mClock parameters without first switching to the `custom` profile. Per official docs, built-in profiles (balanced, high_client_ops, high_recovery_ops) lock mClock parameters and silently revert manual changes. Added the required `ceph config set osd osd_mclock_profile custom` command and an explanatory note.

3. **Invalid admin socket command `dump_mclock_queue`**: There is no `dump_mclock_queue` admin socket command in Ceph. The correct command to dump the OSD op queue state (including mClock scheduler state) is `dump_op_pq_state`. Fixed accordingly.

4. **Incorrect "default FIFO queue" in summary**: The previous default OSD op queue was `wpq` (WeightedPriorityQueue), not FIFO. The valid values for `osd_op_queue` are `wpq` and `mclock_scheduler`. Fixed to reference `wpq` correctly.

5. **Misleading benchmarking comments**: The comment said "Background load simulating recovery" but `rados bench` generates client I/O, not recovery I/O. Both commands create competing client workloads. Fixed comments to accurately describe what the benchmark measures.

## Review Notes
- Starting from Ceph Quincy (v17), `mclock_scheduler` is the default `osd_op_queue` for BlueStore OSDs, so the explicit enable step may not be necessary on newer clusters. For Filestore OSDs, `wpq` remains the default and is enforced.
- The post's DmClock three-parameter model explanation (reservation, weight, limit) is accurate and well-described.
- All nine mClock config option names (`osd_mclock_scheduler_client_res/wgt/lim`, `..._background_recovery_res/wgt/lim`, `..._background_best_effort_res/wgt/lim`) are correct per official docs.
- The `ceph daemon` commands require execution on the host where the target OSD process is running (they use the admin socket). This could be noted for clarity but is generally understood by the target audience.
