# Validation Summary: How to Install and Configure DM-Multipath on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Device Mapper Multipath (DM-Multipath)
- SAN storage with Fibre Channel or iSCSI paths
- `multipath`, `multipathd`, and `mpathconf`
- `/etc/multipath.conf`
- Linux block devices and `/etc/fstab`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring device mapper multipath: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 9 documentation: Chapter 3, Configuring DM Multipath: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/configuring-dm-multipath_configuring-device-mapper-multipath
- Red Hat Enterprise Linux 9 documentation: Chapter 7, Managing multipathed volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/managing-multipathed-volumes_configuring-device-mapper-multipath
- `mpathconf(8)` manual page reference: https://www.mankier.com/8/mpathconf
- `multipathd(8)` manual page reference: https://www.mankier.com/8/multipathd

## Issues Found
- The post showed `find_multipaths yes`. RHEL 9 documentation describes the default `multipath.conf` value created by `mpathconf` as `find_multipaths on`, so the snippet and explanation were updated to use `on`.
- The post described `multipath -v2` as showing all paths. Red Hat examples use `multipath -v2 -l` to display existing multipath devices, so the verification command was updated to `multipath -v2 -l` and the label was corrected.
- The post described `multipath -F` as "flush and rediscover". The command flushes unused multipath maps, so the label was clarified to "Flush unused maps and rediscover".
- The fstab comment said to use the "dm device or WWID". Red Hat documentation says `/dev/dm-X` devices are internal and should not be used directly by administrators, so the comment was changed to recommend the multipath mapper name or filesystem UUID.

## Review Notes
The installation command, `mpathconf` usage, `multipathd` service commands, example `multipath -ll` topology, and basic `multipathd` control commands are consistent with Red Hat documentation and the relevant manual pages. For clustered systems, Red Hat recommends disabling `user_friendly_names` to keep device names consistent across nodes; the post's single-host examples remain valid.
