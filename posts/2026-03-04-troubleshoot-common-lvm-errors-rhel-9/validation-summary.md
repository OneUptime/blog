# Validation Summary: How to Troubleshoot Common LVM Errors on RHEL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- Device Mapper
- DM Multipath
- systemd journal
- SMART disk health checks

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - Limiting LVM device visibility and usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/limiting-lvm-device-visibility-and-usage_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - Troubleshooting LVM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/troubleshooting-lvm_configuring-and-managing-logical-volumes
- lvmdevices(8) manual page: https://man7.org/linux/man-pages/man8/lvmdevices.8.html
- vgcfgrestore(8) manual page: https://man7.org/linux/man-pages/man8/vgcfgrestore.8.html
- vgreduce(8) manual page: https://man7.org/linux/man-pages/man8/vgreduce.8.html
- pvscan(8) manual page: https://man7.org/linux/man-pages/man8/pvscan.8.html
- lvm.conf(5) manual page: https://man7.org/linux/man-pages/man5/lvm.conf.5.html

## Issues Found
- The device-filter section implied that `/etc/lvm/lvm.conf` filters are the normal device visibility mechanism on RHEL 9. Updated it to explain that RHEL 9 enables `/etc/lvm/devices/system.devices` by default, added `lvmdevices` diagnosis, and kept the filter guidance only for systems where the devices file has been disabled.
- The logical-volume activation section recommended removing files from `/run/lock/lvm/`. Replaced this with checks for `lvmlockd` status and logs for shared-storage or clustered volume groups, avoiding unsafe manual lock deletion.
- The metadata repair section showed `pvck --repair /dev/sdb`, which is incomplete for the documented RHEL 9 repair workflow. Updated it to use `pvck --repair -f /etc/lvm/backup/vg_data /dev/sdb` and clarified that a metadata file is required.
- The inconsistent-metadata section suggested taking a fresh backup and immediately restoring it if the first restore failed. Replaced this with selecting a known backup or archive through `vgcfgrestore --list` and restoring from that file.
- The duplicate-PV section only described traditional LVM filters. Added RHEL 9 devices-file guidance for tracking the multipath device and removing individual SCSI path entries, while retaining filter guidance for systems using the legacy filter behavior.

## Review Notes
The remaining commands and examples are broadly consistent with LVM2 and RHEL 9 documentation, but several destructive operations such as `vgreduce --removemissing`, `lvremove`, `vgcfgrestore`, and `pvck --repair` still require administrators to verify device names and backups carefully before running them on production systems.
