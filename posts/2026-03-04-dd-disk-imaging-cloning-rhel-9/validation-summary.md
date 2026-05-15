# Validation Summary: How to Use dd for Disk Imaging and Cloning on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU coreutils dd
- gzip
- util-linux lsblk and blockdev
- cron
- Backup verification and restoration

## Sources Consulted
- GNU Coreutils dd manual: https://www.gnu.org/software/coreutils/dd
- GNU gzip manual: https://www.gnu.org/software/gzip/manual/gzip.html
- util-linux lsblk manual: https://man7.org/linux/man-pages/man8/lsblk.8.html
- util-linux blockdev manual: https://man7.org/linux/man-pages/man8/blockdev.8.html
- Red Hat cron documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- Local command help and man pages for dd, gzip, blockdev, rsync, tar, and crontab

## Issues Found
- The post title, description, overview, and summary promised dd-based disk imaging and cloning, but the original implementation examples used tar and rsync instead. I replaced the mismatched tar and rsync examples with dd commands for identifying disks, creating a compressed disk image, cloning a disk, verifying the compressed image, comparing cloned disk sizes, and restoring an image.
- The corrected image creation and restore examples use `sudo sh -c` so the full pipeline, including the output redirection to `/backups` and the image read during restoration, runs with the expected privileges.
- The disk clone example now uses `conv=fsync` so dd flushes output data before finishing, matching GNU dd's documented conversion options.

## Review Notes
- The commands use placeholder devices such as `/dev/sdX` and `/dev/sdY`; readers must replace these with the correct devices from `lsblk`.
- For failing disks, specialized recovery tools such as GNU ddrescue can be safer than dd, but dd is still technically valid for byte-level imaging and cloning on healthy disks.
