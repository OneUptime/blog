# Validation Summary: Why chmod and chown Changes Under sysfs Disappear

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux sysfs
- udev rules and device events
- systemd-tmpfiles
- Linux file ownership and permission modes
- systemd service groups and mount namespaces

## Sources Consulted
- [Linux kernel sysfs documentation](https://docs.kernel.org/filesystems/sysfs.html)
- [systemd udev rule documentation](https://github.com/systemd/systemd/blob/main/man/udev.xml)
- [systemd tmpfiles.d documentation](https://github.com/systemd/systemd/blob/main/man/tmpfiles.d.xml)
- [systemd-tmpfiles documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd-tmpfiles.html)
- [GNU Coreutils: chown invocation](https://www.gnu.org/software/coreutils/manual/html_node/chown-invocation.html)
- [GNU Coreutils: chmod invocation](https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html)
- [GNU Coreutils: readlink invocation](https://www.gnu.org/software/coreutils/manual/html_node/readlink-invocation.html)
- [util-linux namei manual](https://man7.org/linux/man-pages/man1/namei.1.html)

## Issues Found
No technical issues found.

## Review Notes
The udev rule intentionally depends on the matched LED attribute existing when the device's `add` event is processed, and the post states that prerequisite. The tmpfiles alternative is also correctly limited to paths that already exist when `systemd-tmpfiles` applies the rule; it is not a hotplug watcher. Command paths and device identities remain distribution- and host-specific, as the post notes.
