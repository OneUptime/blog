# Validation Summary: How to Recover Deleted Files on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux `/proc/<PID>/fd` file descriptors
- `lsof`
- ext3/ext4 recovery with `extundelete`
- TestDisk and PhotoRec
- XFS
- `trash-cli`
- `rsync`
- LVM snapshots
- `chattr` and `lsattr`

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Customer Portal, deleted files held open by processes and `lsof`: https://access.redhat.com/solutions/2316
- extundelete official documentation: https://extundelete.sourceforge.net/
- CGSecurity TestDisk documentation, recovering deleted files: https://www.cgsecurity.org/testdisk_doc/undelete.html
- CGSecurity PhotoRec documentation, recovering deleted files: https://www.cgsecurity.org/testdisk_doc/photorec.html
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Fedora EPEL package listing for `testdisk`: https://packages.fedoraproject.org/pkgs/testdisk/testdisk/epel-9.html
- Local `pgrep --help` output for `-d, --delimiter`

## Issues Found
- The example `sudo lsof -p $(pgrep -f myapp)` could fail when `pgrep` returns more than one PID, because `lsof -p` expects a comma-separated PID list. Changed it to use `pgrep -d, -f myapp`.
- The `/proc/PID/fd` method was described as working "100% of the time." Changed this to a more accurate statement that it is usually reliable for regular files while the descriptor remains open.
- The TestDisk section overstated deleted-file recovery support for ext filesystems. Updated it to match CGSecurity documentation: FAT, exFAT, NTFS, and ext2 undelete support.
- The TestDisk menu step only mentioned "List." Updated it to mention "Undelete" when available, with "List" as the option for browsing and copying files from damaged or lost partitions.
- The XFS explanation said XFS immediately reuses freed blocks and implied `xfs_metadump`/`xfs_mdrestore` can help with filesystem-level deleted-file recovery. Reworded this to say deleted space is marked free for future allocation, XFS journals metadata rather than file contents for undelete, and metadata dumps are useful for metadata analysis rather than restoring individual deleted files.

## Review Notes
The commands are examples and use placeholder devices such as `/dev/sda2` and `/dev/sdXN`; users must substitute the correct block device and avoid writing recovered data back to the affected filesystem. EPEL packages are outside the base Red Hat repositories, so enabling EPEL may be inappropriate in locked-down production environments.
