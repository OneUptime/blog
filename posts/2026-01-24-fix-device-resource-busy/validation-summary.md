# Validation Summary: How to Fix 'Device or Resource Busy' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Linux filesystems and mount points
- util-linux commands: `umount`, `mount`, `findmnt`, `losetup`, `mountpoint`, `eject`
- Process inspection commands: `lsof`, `fuser`
- Kernel module tools: `rmmod`, `lsmod`, `modinfo`
- Device mapper and LVM inspection commands
- Bash scripting

## Sources Consulted
- `umount(8)` manual page: https://man7.org/linux/man-pages/man8/umount.8.html
- `mount(8)` manual page: https://man7.org/linux/man-pages/man8/mount.8.html
- `findmnt(8)` manual page: https://man7.org/linux/man-pages/man8/findmnt.8.html
- `losetup(8)` manual page: https://man7.org/linux/man-pages/man8/losetup.8.html
- `mountpoint(1)` manual page: https://man7.org/linux/man-pages/man1/mountpoint.1.html
- `fuser(1)` manual page: https://man7.org/linux/man-pages/man1/fuser.1.html
- `lsof(8)` manual page: https://man7.org/linux/man-pages/man8/lsof.8.html
- `eject(1)` manual page: https://man7.org/linux/man-pages/man1/eject.1.html
- Local system man pages for `hdparm(8)`, `dmsetup(8)`, and `rmmod(8)`

## Issues Found
- The loop-device example detached the loop device before unmounting it, then described a busy detach as though it should fail. Updated the example to unmount first, then detach, and noted that modern Linux marks busy loop devices for lazy destruction.
- The deleted-file cleanup example used `echo "" | sudo tee /proc/1234/fd/12`, which truncates but also writes a newline. Replaced it with `sudo truncate -s 0 /proc/1234/fd/12` so the descriptor is emptied exactly.
- The USB ejection script passed the user-supplied device directly to `hdparm -Y`, which is often a partition path. Updated it to resolve the parent disk with `lsblk` before attempting ATA standby, while leaving `eject` to handle partition-to-disk resolution.

## Review Notes
The remaining commands and explanations are technically consistent with the consulted documentation. `lsof +D` can be expensive on large directory trees, and service names such as `nfs-common` are distribution-specific, but those are operational caveats rather than correctness errors in this post.
