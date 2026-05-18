# Validation Summary: How to Set Up USB Device Access Control on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- USBGuard (USB device authorization daemon)
- udev / udevadm (device manager rules)
- Linux kernel module blacklisting (modprobe / `usb-storage`)
- `lsusb` (usbutils)
- `update-initramfs`
- systemd (service management)
- USB device class codes (USB-IF)

## Sources Consulted
- USBGuard project documentation: https://usbguard.github.io/documentation/
- USBGuard rule language: https://usbguard.github.io/documentation/rule-language
- `usbguard-daemon.conf(5)` man page: https://github.com/USBGuard/usbguard/blob/main/doc/man/usbguard-daemon.conf.5.adoc
- `usbguard(1)` Ubuntu man page: https://manpages.ubuntu.com/manpages/focal/man1/usbguard.1.html
- USB-IF Defined Class Codes: https://www.usb.org/defined-class-codes
- `udev(7)` man page: https://man7.org/linux/man-pages/man7/udev.7.html
- Ubuntu package archive (https://packages.ubuntu.com) for `usbguard-applet-qt` availability
- Linux kernel documentation on USB device authorization (`/sys/bus/usb/devices/.../authorized`)

## Issues Found

1. **`usbguard-applet-qt` package no longer in Ubuntu repos** — The install command included `usbguard-applet-qt`, which was removed from Ubuntu 22.04 (jammy) and is not available in 24.04 (noble). Last available in 18.04. Removed from the `apt install` line since the post focuses on servers anyway, where a Qt GUI applet isn't useful.

2. **Misleading comment about 'wheel' group** — The `usbguard-daemon.conf` snippet had a comment saying "Allow users in the 'wheel' group" but the actual setting was `IPCAllowedGroups=sudo`. Updated the comment to say 'sudo' for consistency (Ubuntu uses `sudo` group, not `wheel`).

3. **Broken udev rule for blocking USB storage by block subsystem** — The rule `SUBSYSTEM=="block", SUBSYSTEMS=="usb", ACTION=="add", RUN+="/bin/sh -c 'echo 0 > /sys/bus/usb/devices/%k/authorized'"` was non-functional: when matching `SUBSYSTEM=="block"`, the `%k` substitution resolves to the block device kernel name (e.g., `sdb`), not the USB device path. The path `/sys/bus/usb/devices/sdb/authorized` does not exist. Replaced with the standard `ENV{UDISKS_IGNORE}="1"` approach, which is the canonical way to prevent UDisks from automounting USB block devices and actually achieves the stated goal.

## Review Notes

- The allowlist udev rule `SUBSYSTEM=="usb", ACTION=="add", ATTR{bInterfaceClass}=="08", ENV{AUTHORIZED}!="1", RUN+="/bin/sh -c 'echo 0 > /sys/bus/usb/devices/%k/authorized'"` works because per-interface authorization has existed since Linux 3.0+ (the `authorized` attribute exists on `usb_interface` devices, not just `usb_device`). For mass storage devices the storage function is typically the only interface, so deauthorizing the interface effectively blocks the device. Left as-is.
- For comprehensive `usb-storage` blocking, users may also want to add `install usb-storage /bin/true` to the modprobe config, since plain `blacklist` only prevents auto-loading but allows explicit `modprobe`. The post doesn't mention this but it's a hardening detail rather than a correctness issue.
- All USBGuard daemon config keys, CLI commands and flags (`-b`, `-p`), and rule-language syntax (`allow id`, `with-interface equals { class:subclass:protocol }`) were verified against upstream documentation and are correct.
- USB interface class codes (08 Mass Storage, 09 Hub, 03 HID, 02 Communications) verified against the USB-IF defined class codes table — all correct, including the specific `08:06:50` triplet (Mass Storage / SCSI transparent / Bulk-Only Transport).
- The `lsmod | grep usb_storage` vs `blacklist usb-storage` distinction (underscore in module name in `lsmod` output, hyphen in modprobe/blacklist) is handled correctly throughout the post.
- The `%s{...}` substitution syntax for udev RUN commands is canonical and correct.
