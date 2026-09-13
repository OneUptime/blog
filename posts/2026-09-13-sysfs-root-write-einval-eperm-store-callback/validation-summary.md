# Validation Summary: Root Cannot Write a sysfs Attribute: Trace EINVAL, EPERM, and store()

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Linux sysfs
- Linux kernel device attributes and attribute groups
- Linux error codes and system calls
- Linux security modules, capabilities, and user namespaces
- C kernel callbacks
- `strace`, `findmnt`, `readlink`, `tee`, and `ripgrep`

## Sources Consulted
- [Linux kernel: rules for sysfs access](https://docs.kernel.org/admin-guide/sysfs-rules.html)
- [Linux kernel: sysfs filesystem documentation](https://docs.kernel.org/filesystems/sysfs.html)
- [Linux kernel source: sysfs file operations](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)
- [Linux kernel source: device interfaces](https://github.com/torvalds/linux/blob/master/include/linux/device.h)
- [strace(1) Linux manual page](https://man7.org/linux/man-pages/man1/strace.1.html)
- [write(2) Linux manual page](https://man7.org/linux/man-pages/man2/write.2.html)
- [capabilities(7) Linux manual page](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [user_namespaces(7) Linux manual page](https://man7.org/linux/man-pages/man7/user_namespaces.7.html)
- [tee(1) Linux manual page](https://man7.org/linux/man-pages/man1/tee.1.html)
- [GNU Coreutils: readlink invocation](https://www.gnu.org/software/coreutils/manual/html_node/readlink-invocation.html)
- [util-linux findmnt manual page](https://man7.org/linux/man-pages/man8/findmnt.8.html)

## Issues Found
- The simplified callback pseudocode returned `EBUSY` after acquiring the device-state lock without showing the corresponding unlock. Changed that branch to unlock the device state before returning, preventing the example from modeling a lock leak.

## Review Notes
- The sample sysfs path and value are explicitly placeholders and cannot be executed as a hardware test without a corresponding device and documented attribute.
- Error codes for individual sysfs attributes remain implementation-specific; the post correctly presents its errno table as an investigation guide rather than a stable ABI.
- The kernel source links track upstream `master`; the post correctly warns readers to inspect the source and patches for the kernel build actually running.
