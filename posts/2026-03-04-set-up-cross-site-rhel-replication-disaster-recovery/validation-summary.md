# Validation Summary: How to Set Up Cross-Site RHEL Replication for Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- rsync over SSH
- cron / cronie scheduling
- DRBD 9 block replication
- ELRepo DRBD packages

## Sources Consulted
- LINBIT DRBD 9.0 User's Guide: https://linbit.com/drbd-user-guide/drbd-guide-9_0-en/
- DRBD 9 configuration man page: https://manpages.debian.org/trixie/drbd-utils/drbd.conf-9.0.5.en.html
- rsync manual page and local `rsync --help`: https://download.samba.org/pub/rsync/rsync.1
- Red Hat Enterprise Linux 7 System Administrator's Guide, Automating System Tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- ClusterLabs Pacemaker "Clusters from Scratch" DRBD package example for EL9: https://clusterlabs.org/projects/pacemaker/doc/2.1/Clusters_from_Scratch/html/shared-storage.html
- ELRepo issue tracker examples for EL9 DRBD package naming: https://elrepo.org/bugs/view.php?id=1386

## Issues Found
- The rsync example used `-az`, which does not preserve ACLs or extended attributes. On RHEL systems, extended attributes include SELinux labels, so the command was changed to `-aAXz --numeric-ids --delete`.
- The rsync example included `/var/lib/pgsql`, which can produce an inconsistent copy of a live PostgreSQL data directory. The directory was removed from the generic rsync list and a note was added to use database-native backups or storage snapshots for live databases.
- The cron example redirected directly to `/etc/cron.d/cross-site-repl` without privilege escalation even though the surrounding examples use `sudo` for system changes. It was changed to pipe through `sudo tee`.
- The DRBD install command used `drbd90-utils kmod-drbd90`, which is not the current EL9 package naming used by ELRepo examples. It was updated to `drbd9x-utils kmod-drbd9x` and the text now notes that package names vary by RHEL release.
- The DRBD resource example declared `protocol C` while the post recommends protocol A for cross-site WAN replication. The example now configures `protocol A` in the `net` section and clarifies when protocol C is appropriate.
- The Protocol C description said "No data loss" too absolutely. It was narrowed to the DRBD-documented guarantee for a single-node failure after remote disk acknowledgement.

## Review Notes
The DRBD resource uses older two-node-compatible syntax, which DRBD 9 still supports. A production DRBD deployment should also account for fencing, quorum or cluster manager integration, firewall rules, initial filesystem creation and mounting on `/dev/drbd0`, and tested failover procedures.
