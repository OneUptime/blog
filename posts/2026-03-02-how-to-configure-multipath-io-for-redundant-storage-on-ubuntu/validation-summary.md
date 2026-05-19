# Validation Summary: How to Configure Multipath I/O for Redundant Storage on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu Server
- Device Mapper Multipath / DM-Multipath
- `multipath-tools`
- `multipathd`
- Linux block devices, SCSI, iSCSI, Fibre Channel, and SAS storage paths
- `/etc/multipath.conf`

## Sources Consulted
- Ubuntu Server documentation: Introduction to device mapper multipathing - https://ubuntu.com/server/docs/explanation/intro-to/multipath/
- Ubuntu Server documentation: Multipath configuration options and overview - https://ubuntu.com/server/docs/explanation/multipath/configuring-multipath/
- Ubuntu Server documentation: Multipath configuration examples - https://ubuntu.com/server/docs/explanation/multipath/multipath-configuration-examples/
- Ubuntu Server documentation: Common multipath tasks and procedures - https://ubuntu.com/server/docs/explanation/multipath/common-multipath-tasks-and-procedures/
- Ubuntu 24.04 `multipath.conf(5)` man page - https://manpages.ubuntu.com/manpages/noble/man5/multipath.conf.5.html
- Ubuntu 24.04 `multipath(8)` man page - https://manpages.ubuntu.com/manpages/noble/man8/multipath.8.html
- Ubuntu 24.04 `multipathd(8)` man page - https://manpages.ubuntu.com/manpages/noble/man8/multipathd.8.html

## Issues Found
- The discovery example used `sudo multipath -v3`, which can create or update maps in the default operation mode. Changed it to `sudo multipath -d -v3` so it performs a dry-run discovery while showing detected paths and WWIDs.
- The baseline configuration command used shell redirection with `sudo`, which would still try to open `/etc/multipath.conf.generated` as the unprivileged shell user. Changed it to pipe through `sudo tee`.
- The sample configuration used `path_checker readsector0`. The current Ubuntu `multipath.conf(5)` man page marks `readsector0` as deprecated and recommends `tur` or `directio`; changed both sample occurrences to `path_checker tur`.
- The comment saying a path would fail after three missed checks was inaccurate for the shown settings. Replaced it with an accurate comment describing TEST UNIT READY path health checks.
- The `blacklist` example contained an active `device { vendor ".*"; product ".*" }` stanza, which would blacklist all vendor/product matches rather than merely demonstrate device-type filtering. Removed that stanza so the example does not accidentally exclude all storage arrays.
- The EMC device example used `getuid_callout`, which is deprecated and ignored in current Ubuntu multipath-tools. Removed it from the example.
- The new-LUN workflow used `sudo multipath -F`, which flushes all unused multipath maps and is not required for recognizing new devices. Changed the workflow to reconfigure `multipathd` and run `multipath` without flushing existing maps.
- The troubleshooting section claimed to check a specific device but showed `sudo multipath -v2` without a device. Changed it to `sudo multipath -c /dev/sdb`, which is the documented check mode for a block device.

## Review Notes
The post is technically relevant and broadly aligned with Ubuntu's multipath documentation. The configuration remains an illustrative example; production systems should still use storage-vendor-specific recommendations for path grouping, priority, checker, failback, and timeout settings.
