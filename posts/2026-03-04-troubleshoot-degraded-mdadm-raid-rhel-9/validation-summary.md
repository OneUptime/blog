# Validation Summary: How to Troubleshoot Degraded mdadm RAID Arrays on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux md RAID / mdadm
- SMART monitoring with smartctl
- systemd journal / kernel logs
- dracut initramfs regeneration
- Linux block device utilities

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 18: Managing RAID: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- smartmontools smartctl usage source: https://www.smartmontools.org/static/doxygen/smartctl_8cpp_source.html
- dracut(8) manual page: https://man7.org/linux/man-pages/man8/dracut.8.html
- wipefs local help output for `-a, --all`

## Issues Found
- The `--re-add` explanation implied that mdadm always performs a fast bitmap-based resync. Updated it to match mdadm behavior: re-addition depends on matching metadata/event counts, and recovery may use only bitmap-tracked regions.
- The `--force` explanation implied mdadm can assemble with any incomplete device set. Updated it to clarify that enough members must still be available for the RAID level.
- The rebuild sequence removed a failed disk without first marking it faulty. Added `mdadm --manage /dev/md5 --fail /dev/sdc` before `--remove`, matching Red Hat's documented replacement sequence.
- The checklist used `tee /etc/mdadm.conf`, which can overwrite existing mdadm configuration. Changed it to append with `tee -a /etc/mdadm.conf`, consistent with Red Hat's documented `mdadm --detail --scan >> /etc/mdadm.conf` approach.

## Review Notes
- The examples consistently use whole disks such as `/dev/sdc`; many production RHEL systems use partitions such as `/dev/sdc1`. The commands are valid for the example as written, but operators should substitute the actual md member device shown by `mdadm --detail`.
- `tee -a /etc/mdadm.conf` avoids overwriting existing configuration, but repeated runs can duplicate ARRAY lines. A future edit could recommend reviewing or merging the generated line with a text editor.
