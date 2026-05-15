# Validation Summary: How to Fix 'Device or Resource Busy' Errors When Unmounting Filesystems on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux filesystems and mount points
- `umount`
- `lsof`
- `fuser`
- `findmnt`
- `swapon` and `swapoff`
- `lsblk`

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_file_systems/red_hat_enterprise_linux-9-managing_file_systems-en-us.pdf
- Red Hat Enterprise Linux 5 Deployment Guide, "Unmounting a File System": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/5/html/deployment_guide/sect-using_the_mount_command-unmounting
- Linux `fuser(1)` manual page: https://man7.org/linux/man-pages/man1/fuser.1.html
- Linux `lsof(8)` manual page: https://man7.org/linux/man-pages/man8/lsof.8.html
- Linux `umount(8)` manual page: https://man7.org/linux/man-pages/man8/umount.8.html
- Linux `swapon(8)` / `swapoff(8)` manual page: https://man7.org/linux/man-pages/man8/swapoff.8.html
- Local system manual pages for `findmnt(8)` and `lsblk(8)`

## Issues Found
- The post said `sudo fuser -k /mnt/data` sends `SIGTERM` to all processes using the mount. The `fuser(1)` documentation states that `-k` sends `SIGKILL` unless a signal is explicitly provided, and `-m` should be used to match the mounted filesystem rather than only the named path. Changed the command to `sudo fuser -k -TERM -m /mnt/data`.
- The force-kill example used `sudo fuser -ki /mnt/data`, which did not include `-m` for filesystem-wide matching. Changed it to `sudo fuser -k -i -m /mnt/data` so it interactively kills processes using the mounted filesystem.

## Review Notes
The remaining commands and explanations are technically consistent with Red Hat and Linux manual documentation. Lazy unmount is correctly described as detaching the filesystem immediately while cleanup waits for outstanding references to be released.
