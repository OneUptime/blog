# Validation Summary: Choose sysfs_notify or a uevent for Driver State Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux kernel driver APIs
- sysfs and kernfs attribute notification and polling
- kobject uevents
- udev and `udevadm`
- C

## Sources Consulted
- [Linux kernel sysfs notification implementation](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)
- [Linux kernel kernfs notification and polling implementation](https://github.com/torvalds/linux/blob/master/fs/kernfs/file.c)
- [Linux kernel kobject uevent implementation](https://github.com/torvalds/linux/blob/master/lib/kobject_uevent.c)
- [systemd `udevadm` reference](https://github.com/systemd/systemd/blob/main/man/udevadm.xml)
- [systemd udev rules and event-processing documentation](https://github.com/systemd/systemd/blob/main/man/udev.xml)

## Issues Found
No technical issues found.

## Review Notes
The code samples are intentionally fragments and correctly state their synchronization and lifetime assumptions. The sysfs polling discussion accurately describes `EPOLLPRI`/`EPOLLERR` readiness, rereading from offset zero, and notification coalescing. The uevent discussion correctly avoids delivery guarantees, and the `udevadm monitor --kernel --udev --property` command is current. No specific kernel or systemd version is claimed; the review checked the current upstream implementations as of the validation date.
