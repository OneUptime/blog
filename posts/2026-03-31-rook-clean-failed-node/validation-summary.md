# Validation Summary: How to Clean Up a Failed Rook-Ceph Node

## Status
validated

## Post Type
Tutorial / Step-by-step operational guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system) - OSD management, CRUSH maps, PG status
- Kubernetes - kubectl, pod management, node lifecycle, PV/PVC
- LVM (Logical Volume Manager)
- sgdisk, dd, dmsetup (disk management utilities)

## Sources Consulted
- Ceph official documentation: OSD removal procedures (`ceph osd out`, `ceph osd crush remove`, `ceph auth del`, `ceph osd rm`)
- Rook documentation: OSD pod labels and toolbox usage (`deploy/rook-ceph-tools`)
- Kubernetes documentation: `kubectl drain`, `kubectl cordon`, `--field-selector` usage, `--delete-emptydir-data` flag
- LVM2 documentation: `pvremove`, `lvremove`, `vgremove` command syntax and ordering requirements
- `dmsetup` man page: `remove_all` behavior and targeted removal

## Issues Found

1. **Step 5 - Incorrect label selector for OSD pod deletion**: The command used `-l app=rook-ceph-osd,node=<node-name>` but `node` is not a standard Rook-Ceph OSD pod label. Changed to use `--field-selector spec.nodeName=<node-name>`, which is the correct Kubernetes field selector for filtering by node (consistent with the approach used in Step 1).

2. **Step 9 - LVM removal order was reversed**: `pvremove` was called before `lvremove` and `vgremove`. Physical volumes should be removed last since volume groups and logical volumes depend on them. Fixed to correct order: LV -> VG -> PV. Also added `-f` flag to `lvremove` and `vgremove` to force removal without interactive prompts.

3. **Step 9 - `dmsetup remove_all` could crash the system**: The original command `dmsetup remove_all` removes ALL device-mapper devices on the system, not just Ceph-related ones. On systems using LVM for the root filesystem (which is common), this would remove the root device-mapper entry and crash the system. Replaced with a targeted command that only removes device-mapper entries matching "ceph".

4. **Step 9 - Inconsistent variable usage**: `pvremove` hardcoded `/dev/sdb` instead of using the `$DISK` variable defined earlier in the same code block. Changed to `pvremove $DISK` for consistency.

## Review Notes
- The post uses the traditional four-step OSD removal (`ceph osd down`, `ceph osd crush remove`, `ceph auth del`, `ceph osd rm`). Modern Ceph versions support `ceph osd purge <id> --yes-i-really-mean-it` which combines these into a single command. Both approaches are valid; the manual approach shown is more educational.
- The `dd` command uses `bs=4096 count=100` (400KB). Rook's official documentation suggests `bs=1M count=100` (100MB) for a more thorough wipe that covers all potential Ceph metadata locations. The current command is sufficient for partition tables and primary metadata but may miss metadata written deeper into the disk.
- Step 6 cordons a permanently failed node before draining. Cordoning a NotReady node is redundant since the scheduler already avoids it, but it is not harmful and follows defensive best practices.
- The `ceph osd down` command in Step 4 is noted as "Stop each OSD" but it only marks the OSD as down in the OSD map - it does not actually stop the daemon. For a permanently failed node this is moot since the daemons are already stopped, but the comment could be more precise.
