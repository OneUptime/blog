# Validation Summary: How to Administer and Troubleshoot GFS2 File Systems on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- GFS2
- Pacemaker/pcs
- DLM
- LVM
- Linux debugfs and sysfs

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring GFS2 file systems, administering GFS2 file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_gfs2_file_systems/assembly_creating-mounting-gfs2-configuring-gfs2-file-systems
- Red Hat Enterprise Linux 8: Configuring GFS2 file systems, GFS2 file system repair: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_gfs2_file_systems/assembly_gfs2-filesystem-repair-configuring-gfs2-file-systems
- Red Hat Enterprise Linux 8: Configuring GFS2 file systems, improving GFS2 performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_gfs2_file_systems/assembly_gfs2-performance-configuring-gfs2-file-systems
- Red Hat Enterprise Linux 8: GFS2 tracepoints and glock debugfs interface: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_gfs2_file_systems/con_gfs2-tracepoints-configuring-gfs2-file-systems
- Red Hat Enterprise Linux 7: Replacement functions for gfs2_tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/global_file_system_2/global_file_system_2
- Linux kernel GFS2 documentation: https://docs.kernel.org/filesystems/gfs2/index.html
- dlm_tool manual page: https://manpages.ubuntu.com/manpages/stonking/man8/dlm_tool.8.html

## Issues Found
- Replaced `gfs2_tool df /mnt/gfs2` with `tunegfs2 -l /dev/vg_shared/lv_gfs2` because Red Hat documents that `gfs2_tool` is not supported in RHEL 7 and later, with functionality replaced by standard tools, `tunegfs2`, `gfs2_edit`, and sysfs/debugfs interfaces.
- Replaced journal verification with `gfs2_edit -p journals /dev/vg_shared/lv_gfs2`, which matches Red Hat's documented replacement for inspecting GFS2 journal information.
- Added `--wait=120` to `pcs resource disable` before running `fsck.gfs2`, matching Red Hat guidance that `fsck.gfs2` must run only after the file system is unmounted from all nodes.
- Corrected the glock wait-state grep. The debugfs `glocks` file shows waiting holders with the `W` flag in holder lines, not the literal text `Waiting`.
- Corrected the GFS2 withdraw explanation. Red Hat documents withdraw as the file system becoming unavailable after GFS2 detects an inconsistency, not simply entering read-only mode.
- Updated the withdraw recovery comment to stop applications and unmount/remount to replay journals, aligning with Red Hat's documented recovery flow.

## Review Notes
The examples remain illustrative and assume the device path, cluster name, file system name, and Pacemaker resource ID match the user's environment. On RHEL 8.0 specifically, Red Hat documents additional shared-LV refresh handling around `lvextend`; RHEL 8.1 and later automate that refresh.
