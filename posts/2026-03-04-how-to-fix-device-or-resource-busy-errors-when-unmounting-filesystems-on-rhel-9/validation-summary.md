# Validation Summary: How to Fix 'Device or Resource Busy' When Unmounting on RHEL 9

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux filesystems and mount points
- `fuser`
- `lsof`
- `umount`
- `losetup`
- Linux swap management
- Bind mounts

## Sources Consulted
- `fuser` local help output from psmisc: `fuser --help`
- `umount` local help output from util-linux: `umount --help`
- `lsof` local help output: `lsof -h`
- `losetup` local help output from util-linux: `losetup --help`
- `swapon` local help output from util-linux: `swapon --help`
- `swapoff` local help output from util-linux: `swapoff --help`
- `mount` local help output from util-linux: `mount --help`
- Linux man-pages project, `fuser(1)`: https://man7.org/linux/man-pages/man1/fuser.1.html
- Linux man-pages project, `lsof(8)`: https://man7.org/linux/man-pages/man8/lsof.8.html
- Linux man-pages project, `umount(8)`: https://man7.org/linux/man-pages/man8/umount.8.html
- Linux man-pages project, `losetup(8)`: https://man7.org/linux/man-pages/man8/losetup.8.html
- Linux man-pages project, `swapon(8)` and `swapoff(8)`: https://man7.org/linux/man-pages/man8/swapon.8.html
- Linux man-pages project, `mount(8)`: https://man7.org/linux/man-pages/man8/mount.8.html

## Issues Found
- The post described `sudo fuser -k /mnt/data` as graceful termination. `fuser -k` sends `SIGKILL` by default unless another signal is specified, so this is not graceful. Changed the graceful example to `sudo fuser -k -TERM /mnt/data` while leaving the forceful `sudo fuser -k -9 /mnt/data` example intact.

## Review Notes
The remaining commands and explanations are technically valid for the stated troubleshooting context. `lsof +D` can be slow on large directory trees, and `grep bash` only catches Bash sessions rather than all possible shells, but these are operational caveats rather than correctness errors.
