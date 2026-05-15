# Validation Summary: How to Set Up GFS2 on a Pacemaker Cluster for Shared Storage on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GFS2
- Pacemaker / pcs
- DLM
- lvmlockd
- Shared LVM
- STONITH fencing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring GFS2 file systems, Chapter 8 "GFS2 file systems in a cluster" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_gfs2_file_systems/configuring_gfs2_file_systems
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters, "GFS2 file systems in a cluster" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-gfs2-in-a-cluster-configuring-and-managing-high-availability-clusters
- Linux man-pages: lvmlockd(8) - https://man7.org/linux/man-pages/man8/lvmlockd.8.html
- Linux man-pages: vgchange(8) - https://man7.org/linux/man-pages/man8/vgchange.8.html
- gfs2-utils man pages: mkfs.gfs2, fsck.gfs2, gfs2_jadd, gfs2_grow - https://www.mankier.com/package/gfs2-utils

## Issues Found
- The post did not mention enabling the RHEL Resilient Storage repository, which Red Hat requires for the GFS2, DLM, and lvmlockd packages. Added the repository prerequisite and `subscription-manager` command.
- The overview mentioned `clvmd`, which is not the RHEL 9 shared-LVM approach for this procedure. Changed it to `lvmlockd`.
- The Pacemaker setup omitted `no-quorum-policy=freeze`, which Red Hat documents as required for GFS2 behavior during quorum loss. Added the property command.
- The DLM and lvmlockd resources were modeled as separate clones. Red Hat documents them as members of a cloneable `locking` group with `on-fail=fence`; updated the commands accordingly.
- The LVM setup used `lvmconfig --type diff` as if it enabled locking. It only displays configuration differences. Moved it to a verification step after setting `use_lvmlockd = 1`.
- The command `vgchange --lock-start` used the wrong option spelling for current LVM documentation. Changed it to `vgchange --lockstart`.
- The shared logical volume was created without shared activation. Added `lvcreate --activate sy`.
- The Pacemaker filesystem resource was missing the `LVM-activate` resource needed to activate the shared LV on all nodes. Added `ocf:heartbeat:LVM-activate`, grouped it with the filesystem resource, cloned the group, and updated ordering/colocation constraints.
- The GFS2 lock table example did not say that the cluster name must match the Pacemaker cluster name. Added that clarification.
- The fsck commands referenced the old `SharedGFS2-clone` resource name after the Pacemaker resource layout was corrected. Updated them to disable and enable the actual filesystem resource with `--wait=100`.
- The post used `gfs2_tool df`, which is not part of the current documented RHEL 9 GFS2 workflow and is not listed in current gfs2-utils man pages. Replaced it with `df -h /mnt/shared`.

## Review Notes
The guide remains a compact two-node example. In a production version, it would be useful to add stronger warnings about choosing the correct shared block device, backing up data before `mkfs.gfs2`, and refreshing LVs on all nodes after online LV expansion.
