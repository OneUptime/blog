# Validation Summary: How to Back Up and Restore LVM Metadata on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- Volume group metadata backups and archives
- `vgcfgbackup`
- `vgcfgrestore`
- `pvcreate`
- `pvck`
- `/etc/lvm/lvm.conf`
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 7 documentation, sample `lvm.conf` backup settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/lvmconf_file
- `vgcfgbackup(8)` Linux man page: https://man7.org/linux/man-pages/man8/vgcfgbackup.8.html
- `vgcfgrestore(8)` Linux man page: https://man7.org/linux/man-pages/man8/vgcfgrestore.8.html
- `pvcreate(8)` Linux man page: https://man7.org/linux/man-pages/man8/pvcreate.8.html
- `lvm.conf(5)` Linux man page: https://man7.org/linux/man-pages/man5/lvm.conf.5.html

## Issues Found
- The post stated that LVM stores metadata at the beginning of each physical volume. This was narrowed to "typically" near the beginning because LVM metadata locations can vary, and a second metadata area can optionally be enabled at the end of a PV.
- The `lvm.conf` example incorrectly showed a separate `archive {}` section and used two greps, including one for `archive {}`. LVM backup and archive settings are under the `backup {}` section, so the command and configuration snippet were corrected.
- The description of `retain_days` implied archives are kept for exactly 30 days. It was corrected to "at least 30 days", matching the setting's minimum-retention behavior.
- The custom `vgcfgbackup -f /root/lvm-backups/...` example could fail if the directory did not exist. A `sudo mkdir -p /root/lvm-backups` command was added immediately before it.
- The recovery section incorrectly suggested `vgcfgrestore --force vg_data` can reconstruct metadata from on-disk copies. `vgcfgrestore` restores from backup/archive files; on-disk metadata extraction should use `pvck --dump metadata_search` and then restore from the saved metadata file. The example was corrected.
- The cron cleanup command could remove the top-level `/root/lvm-backups` directory if it matched the age condition. The `find` command was constrained with `-mindepth 1 -maxdepth 1`.

## Review Notes
The recovery commands are inherently risky on real storage devices. The post now uses documented commands, but future improvements could add stronger warnings about verifying the target disk, checking PV UUIDs, and consulting Red Hat support before running destructive repair operations.
