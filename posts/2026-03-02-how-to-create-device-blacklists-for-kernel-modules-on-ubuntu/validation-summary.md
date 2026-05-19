# Validation Summary: How to Create Device Blacklists for Kernel Modules on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- Linux kernel modules
- kmod `modprobe` and `modprobe.d`
- udev rules and `udevadm`
- initramfs-tools, `update-initramfs`, and `lsinitramfs`
- CIS-style Linux hardening controls

## Sources Consulted
- Ubuntu `modprobe.d(5)` man page: https://manpages.ubuntu.com/manpages/plucky/man5/modprobe.d.5.html
- Ubuntu `modprobe(8)` man page: https://manpages.ubuntu.com/manpages/plucky/man8/modprobe.8.html
- Ubuntu `udev(7)` man page: https://manpages.ubuntu.com/manpages/plucky/man7/udev.7.html
- Ubuntu `udevadm(8)` man page: https://manpages.ubuntu.com/manpages/plucky/man8/udevadm.8.html
- Ubuntu `update-initramfs(8)` man page: https://manpages.ubuntu.com/manpages/resolute/man8/update-initramfs.8.html
- Ubuntu `lsinitramfs(8)` man page: https://manpages.ubuntu.com/manpages/noble/man8/lsinitramfs.8.html
- Local system man pages for `modprobe.d(5)`, `modprobe(8)`, `udev(7)`, `udevadm(8)`, `update-initramfs(8)`, and `lsinitramfs(8)`

## Issues Found
- The post described `install modulename /bin/false` as completely preventing module loading, including explicit `modprobe`. Updated the wording to say it blocks normal `modprobe` loading and noted that root can bypass it with `modprobe --ignore-install` or `insmod`.
- The example error for `install usb_storage /bin/false` used a specific error message that is not guaranteed across kmod versions. Replaced it with version-neutral wording.
- Removed the obsolete `lbm-nouveau` blacklist example and changed the Realtek comment from "old" to "in-kernel" for current Ubuntu kernels.
- The udev device-ID example claimed it unbound and prevented driver attachment. Updated the comment to accurately describe that writing to the PCI `remove` attribute removes the device from sysfs so no driver remains attached.
- The package-provided blacklist override example incorrectly implied that an `install` line cancels a prior `blacklist` directive. Updated the precedence explanation and clarified that `blacklist` directives must be removed or replaced, while later `install` rules can override earlier install rules.
- Updated the FireWire hardening module from obsolete `ohci1394` naming to the modern `firewire-ohci` module name, using modprobe's dash/underscore equivalence.
- The troubleshooting section used `modinfo ... | grep "^alias"` and `modules.alias` while describing dependency checks. Changed these to `modinfo ... | grep "^depends"`, `modprobe --show-depends`, and `modules.dep`.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. The udev per-device removal approach is disruptive because it removes the device from the running sysfs tree until a rescan or reboot; a future revision could mention that operational caveat more explicitly.
