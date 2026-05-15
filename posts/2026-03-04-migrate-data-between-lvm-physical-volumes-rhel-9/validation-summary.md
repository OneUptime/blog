# Validation Summary: How to Migrate Data Between LVM Physical Volumes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- Physical volumes, volume groups, and logical volumes
- `pvcreate`, `vgextend`, `pvmove`, `pvs`, `lvs`, `vgreduce`, `pvremove`, `pvchange`
- SMART disk health checks with `smartctl`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- `pvmove(8)` manual page from LVM2: https://man7.org/linux/man-pages/man8/pvmove.8.html
- `pvchange(8)` manual page from LVM2: https://man7.org/linux/man-pages/man8/pvchange.8.html
- Red Hat Customer Portal search result on monitoring background `pvmove` progress: https://access.redhat.com/solutions/302933

## Issues Found
- `sudo pvmove --status` is not a documented current `pvmove` option. I replaced it with `sudo lvs -a -o lv_name,copy_percent,devices`, which uses documented LVM reporting fields to show pvmove copy progress and involved devices.
- The interrupted migration example showed `sudo pvmove /dev/sdb /dev/sdd` to resume a failed move. The `pvmove(8)` manual documents that interrupted operations should be restarted by running `pvmove` again without PV arguments, so I changed the example to `sudo pvmove`.

## Review Notes
The remaining LVM workflow is consistent with Red Hat's RHEL 9 documentation: initialize a new PV with `pvcreate`, add it with `vgextend`, migrate extents with `pvmove`, remove an empty PV with `vgreduce`, and clear LVM metadata with `pvremove`. The examples assume the destination PV has enough free extents and that the device names are correct for the host.
