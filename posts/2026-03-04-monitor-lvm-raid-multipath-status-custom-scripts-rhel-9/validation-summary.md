# Validation Summary: How to Monitor LVM, RAID, and Multipath Status with Custom Scripts on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM
- mdadm software RAID
- Device Mapper Multipath
- Bash scripting
- systemd services and timers
- syslog and journald

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring device mapper multipath: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux Logical Volume Manager Administration, LVM reporting fields: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/logical_volume_manager_administration/index
- Linux man-pages project, lvmreport(7): https://man7.org/linux/man-pages/man7/lvmreport.7.html
- Linux man-pages project, vgs(8): https://man7.org/linux/man-pages/man8/vgs.8.html
- Linux man-pages project, mdadm(8): https://man7.org/linux/man-pages/man8/mdadm.8.html
- systemd.timer documentation: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd.special documentation for timers.target: https://www.freedesktop.org/software/systemd/man/systemd.special.html

## Issues Found
- The volume group usage script requested `vg_free/vg_size` as an LVM report field. LVM reporting supports named fields such as `vg_size` and `vg_free`, not arbitrary arithmetic expressions in the `-o` field list. I changed the script to request `vg_name,vg_size,vg_free` and compute the used percentage with `awk`.
- The multipath path status script used `multipathd show paths format "%d %s %t %T"` and treated `%s` as an online state. Red Hat documents `%s` in this context as vendor/product/revision, while path topology reports separate dm, path, and online statuses. I changed the script to use raw output with `%d %t %o` and check dm status and online status.
- The degraded multipath device script discovered maps with `grep -E "^[a-z]"` against `multipath -ll`, which misses WWID-style map names that can begin with a digit and are the default naming mode on RHEL. I changed discovery to `multipathd show maps raw format "%n"`, which Red Hat documents as script-friendly output.
- The multipath examples counted only `active ready` paths and missed healthy `active ghost` paths, which Red Hat documents as paths that are up and ready for I/O. I updated the count to treat both `ready` and `ghost` as active healthy paths.
- The comprehensive script used `multipathd show paths format "%s"` to count faulty paths, but `%s` is vendor/product/revision. I changed it to count failed dm path states from raw `%t` output.

## Review Notes
- The mdadm and systemd timer examples use valid commands and unit syntax. The RAID examples are intentionally lightweight and suitable for custom monitoring, although production environments may prefer `mdadm --monitor` or monitoring-agent integrations for richer alert handling.
- The LVM physical volume example relies on the default word output for the binary `pv_missing` report field, where missing devices can display as `missing`. Numeric output would require checking for `1` instead.
