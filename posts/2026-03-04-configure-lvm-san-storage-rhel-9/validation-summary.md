# Validation Summary: How to Configure LVM on SAN Storage in RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM and LVM device filtering
- Device Mapper Multipath
- Fibre Channel and iSCSI SAN storage
- XFS filesystems and `/etc/fstab`
- systemd mount handling

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring device mapper multipath: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 9: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9: Managing file systems, `/etc/fstab`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- systemd.mount manual, `_netdev` option: https://www.freedesktop.org/software/systemd/man/256/systemd.mount.html
- Red Hat Customer Portal note on `rescan-scsi-bus.sh -a` for adding devices: https://access.redhat.com/solutions/1314183

## Issues Found
- `rescan-scsi-bus.sh` was shown without the `-a` option for discovering new LUNs. Updated it to `rescan-scsi-bus.sh -a`, matching Red Hat guidance for adding newly visible SCSI devices.
- The multipath setup command used `mpathconf --enable --with_multipathd y`, which is not the documented RHEL 9 setup flow. Replaced it with `mpathconf --enable` and kept the separate `systemctl enable --now multipathd` step.
- The LVM section relied only on `lvm.conf` filters, but RHEL 9 enables `/etc/lvm/devices/system.devices` by default. Added `lvmdevices --adddev` commands and clarified that filters apply when the devices file feature is disabled.
- The filter example accepted `/dev/sda`, which is an unstable kernel device name. Replaced it with a persistent `/dev/disk/by-id/<boot-disk-id>` placeholder and explained why kernel names should be avoided in filters.
- The `_netdev` explanation overstated that it ensures SAN connectivity before mounting. Reworded it to the accurate systemd behavior: it treats the mount as network-dependent, useful for network block devices such as iSCSI.
- Added a caveat that multipath aliases must be kept identical across hosts or replaced with WWID-based names when LUNs are visible to multiple hosts.
- Added a vendor-support caveat to queue depth tuning and clarified that the setting applies per path device.

## Review Notes
The guide is technically relevant and broadly correct after the fixes. For future hardening, the post could mention rebuilding initramfs after persistent LVM filter changes and using UUIDs in `/etc/fstab`, but those are improvements rather than correctness blockers for the presented workflow.
