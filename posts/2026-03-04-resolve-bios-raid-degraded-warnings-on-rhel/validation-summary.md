# Validation Summary: How to Resolve 'BIOS RAID Degraded' Warnings on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux mdraid and mdadm
- Firmware RAID metadata
- Dell PERC hardware RAID and perccli
- Disk partitioning with sfdisk and sgdisk
- RAID monitoring with mdmonitor
- SMART health checks with smartctl

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Managing RAID": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_storage_devices/managing-raid
- Red Hat Enterprise Linux 8 documentation, "Managing storage devices", RAID monitoring and failed disk replacement: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/managing_storage_devices/Red_Hat_Enterprise_Linux-8-Managing_storage_devices-en-US.pdf
- Red Hat Enterprise Linux 7 documentation, "Linux RAID Subsystems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/raid-subsys
- mdadm(8) Linux man page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- mdadm.conf(5) Linux man page: https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- Dell PowerEdge RAID Controller CLI Reference Guide, drive show and rebuild commands: https://www.dell.com/support/manuals/en-uk/perc-h345/perc_cli_rg/drive-show-commands
- sgdisk(8) man page: https://www.mankier.com/8/sgdisk
- Local sfdisk --help output for dump/restore syntax

## Issues Found
- The post recommended dmraid for firmware RAID. Red Hat documents dmraid as deprecated since RHEL 7.5 and documents mdraid/mdadm with external metadata for Intel IMSM and SNIA DDF firmware RAID sets on current RHEL. Updated the detection and firmware RAID section to use mdadm and note the deprecation.
- The replacement-disk partition copy command could duplicate GPT disk and partition GUIDs. Added sgdisk -G for GPT disks after copying the partition table.
- The Dell PERC rebuild progress example used the all-enclosures/all-slots path. Dell documents show rebuild against a specific physical drive path. Updated the example to use a specific enclosure and slot after identifying the failed drive.
- The Dell tooling install comment implied srvadmin-all was the direct tool for the perccli example. Reworded it to distinguish Dell OpenManage tools from Dell PERC CLI tools.
- The rebuild verification used dmesg without elevated privileges. Updated it to use sudo journalctl -k for kernel logs on RHEL.
- The SMART check wording said all drives, which is not generally true for hardware RAID because physical drives may not be exposed as /dev/sdX devices. Changed the wording to direct-attached drives.

## Review Notes
The mdadm examples assume /dev/md0 and /dev/sdX-style device names. In production RHEL systems, persistent /dev/disk/by-id paths and controller-specific documentation are safer for drive identification before removing or replacing disks.
