# Validation Summary: How to Manage LVM Volume Groups Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- LVM2 physical volumes, volume groups, and logical volumes
- XFS and ext4 filesystems
- LVM snapshots
- LVM thin provisioning

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, including web console workflows for creating, formatting, resizing, and managing LVM volumes. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9 documentation: Basic logical volume management CLI workflows for extending, shrinking, and removing LVs. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/basic-logical-volume-management_configuring-and-managing-logical-volumes
- Cockpit project documentation: storaged integration and LVM command-line interoperability. https://cockpit-project.org/guide/latest/feature-storaged.html
- Linux man-pages project: lvmthin(7) thin pool and thin LV creation syntax. https://man7.org/linux/man-pages/man7/lvmthin.7.html
- Linux man-pages project: lvconvert(8) snapshot merge behavior and options. https://man7.org/linux/man-pages/man8/lvconvert.8.html
- Linux man-pages project: pvmove(8) source and destination PV syntax. https://man7.org/linux/man-pages/man8/pvmove.8.html

## Issues Found
- The introduction said Cockpit gives "full control" over PVs, VGs, and LVs. RHEL's web console covers common LVM workflows, but advanced operations such as snapshot creation and data migration can require the CLI, so the wording was narrowed.
- The post broadly implied all LVM resize operations happen without downtime and that LVs can always be resized on the fly. Updated the wording to focus on online growth, because shrinking depends on filesystem support and often requires unmounting.
- The default volume group naming note implied `cs` is typical on RHEL. Updated it to distinguish `rhel` on RHEL from `cs` on CentOS Stream.
- The logical volume creation workflow combined LV creation, formatting, mounting, and fstab setup into one Cockpit action. RHEL 9 documentation shows LV creation first, followed by a separate format/mount workflow, so the section was corrected.
- The resize instructions used a generic "Resize" action. RHEL 9 documentation describes "Grow" and "Shrink" menu actions, so the wording was updated.
- The snapshot section implied Cockpit snapshot creation may be available. For RHEL 9 LVM snapshots, the post now directs readers to the CLI.
- The snapshot listing command used `snap_percent`. Updated it to `data_percent`, matching current Red Hat documentation for monitoring snapshot usage.
- The thin provisioning examples used compact `-T` syntax. Replaced them with explicit `--type thin-pool` and `--type thin --thinpool` syntax from LVM documentation.
- The deletion section implied Cockpit always unmounts and removes fstab entries. Updated it to require unmounting first if needed and to clarify manual fstab cleanup for mounts created outside Cockpit.
- The `pvmove -v /dev/sdb` progress example would start another move rather than monitor the prior command. Replaced it with an `lvs` command that shows copy progress.

## Review Notes
The CLI examples assume unused test disks such as `/dev/sdb`, `/dev/sdc`, and `/dev/sdd`; readers should confirm device names before running destructive storage commands. The ext4 shrink example is technically valid, but Red Hat's current documentation also recommends `lvreduce --resizefs` to reduce the filesystem and LV together.
