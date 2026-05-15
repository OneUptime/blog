# Validation Summary: How to Administer and Troubleshoot GFS2 File Systems on RHEL 9

## Status
validated

## Post Type
Tutorial / administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GFS2
- Pacemaker / pcs
- DLM
- LVM
- Linux quota tools
- Performance Co-Pilot / debugfs-based GFS2 monitoring

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring GFS2 file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_gfs2_file_systems/index
- Red Hat Enterprise Linux 9: Chapter 3, Administering GFS2 file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_gfs2_file_systems/assembly_creating-mounting-gfs2-configuring-gfs2-file-systems
- Red Hat Enterprise Linux 9: Chapter 4, GFS2 quota management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_gfs2_file_systems/assembly_gfs2-disk-quota-administration-configuring-gfs2-file-systems
- Red Hat Enterprise Linux 9: Chapter 5, GFS2 file system repair: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_gfs2_file_systems/assembly_gfs2-filesystem-repair-configuring-gfs2-file-systems
- gfs2-utils man pages for glocktop, tunegfs2, gfs2_grow, and gfs2_jadd: https://www.mankier.com/package/gfs2-utils

## Issues Found
- Replaced `gfs2_tool df /shared` with `df -h /shared`, because current RHEL 9 GFS2 documentation does not use `gfs2_tool` for file system space reporting.
- Corrected the GFS2 debugfs path example by removing the unnecessary escaped colon in the lock statistics path.
- Replaced direct reading of `/sys/kernel/debug/dlm/mygfs2` with the documented `dlm_tool lockdebug -sv mygfs2` workflow for DLM lock dumps.
- Replaced journal-count verification via `tunegfs2 | grep Journals` with `gfs2_edit -p jindex ... | grep journal`, matching the RHEL 9 documentation for listing GFS2 journals.
- Removed the claim that a read-only check can be performed on a mounted GFS2 file system after freezing it. RHEL documents that `fsck.gfs2` must be run only when the file system is unmounted from all nodes, so this was changed to a consistent snapshot example.
- Replaced `gfs2_tool freeze` and `gfs2_tool unfreeze` with the RHEL 9 documented `dmsetup suspend` and `dmsetup resume` commands.
- Replaced `journalctl -u dlm -f` with kernel-log monitoring for GFS2/DLM messages, since RHEL 9 cluster DLM is typically managed through Pacemaker resources rather than a simple `dlm` systemd unit in the documented cluster setup.
- Replaced obsolete GFS2 quota commands with the RHEL 9 standard Linux quota workflow: mount with `quota=on`, run `quotacheck`, set limits with `setquota`, and report with `repquota`.

## Review Notes
The examples remain illustrative and assume local resource names such as `gfs2-mount`, `gfs2-mount-clone`, `shared_vg`, and `gfs2_lv`. In a real cluster, those names must match the Pacemaker and LVM resources actually deployed.
