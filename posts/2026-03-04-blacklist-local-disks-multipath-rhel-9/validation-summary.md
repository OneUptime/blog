# Validation Summary: How to Blacklist Local Disks from Multipath on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DM-Multipath
- multipath-tools
- multipathd
- `/etc/multipath.conf` blacklist and blacklist_exceptions configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring device mapper multipath - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 7 documentation: The multipathd Commands - https://docs.redhat.com/it/documentation/red_hat_enterprise_linux/7/html/dm_multipath/multipathd_commands
- multipath-tools `multipath.conf(5)` man page - https://manpages.debian.org/unstable/multipath-tools/multipath.conf.5.en.html
- multipath-tools `multipathd(8)` man page - https://manpages.debian.org/unstable/multipath-tools/multipathd.8.en.html

## Issues Found
- The post used `find_multipaths yes` and described `yes`/`no` as the primary RHEL 9 values. RHEL 9 documentation describes `on` and `off`, with `strict` and `smart` as additional values. I changed the example and conclusion to use `find_multipaths on`, updated the mode list, and removed the emphasis on `greedy`, which is not listed in the RHEL 9 guide.
- The description of `find_multipaths` said multipath devices are created only when multiple paths exist. RHEL 9 also creates maps for manually forced devices and WWIDs already recorded in `/etc/multipath/wwids`. I updated the explanation to include those conditions.
- The WWID lookup example used `/lib/udev/scsi_id`. Red Hat's RHEL 9 multipath documentation uses `multipathd show paths raw format "%d %w"` for finding path WWIDs, so I changed the example to the documented command.
- The apply-and-verify sequence did not validate `/etc/multipath.conf` syntax before reconfiguring. Red Hat recommends `multipath -t > /dev/null` to check configuration errors, so I added that command before `multipathd reconfigure`.

## Review Notes
The blacklist, `blacklist_exceptions`, `devnode`, `wwid`, `device`, `vendor`, and `product` snippets are consistent with DM-Multipath configuration syntax. Broad `devnode` blacklists such as `^sd[a-z]` can hide SAN LUNs unless matching exceptions are added, and RHEL warns that device names can change across boots unless they are statically mapped by udev.
