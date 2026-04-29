# Validation Summary: How to Create a .link File for Interface Renaming in systemd-networkd

## Status
validated

## Post Type
Guide

## Technologies Covered
- systemd `.link` files
- systemd-udevd / udev
- Predictable network interface naming on Linux
- iproute2 (`ip`)
- ethtool
- GNU GRUB kernel parameters

## Sources Consulted
- systemd.link(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.link.html
- udevadm(8): https://www.freedesktop.org/software/systemd/man/latest/udevadm.html
- systemd-udevd.service(8): https://www.freedesktop.org/software/systemd/man/latest/systemd-udevd.service.html
- systemd.net-naming-scheme(7): https://www.freedesktop.org/software/systemd/man/latest/systemd.net-naming-scheme.html
- systemd.syntax(7): https://www.freedesktop.org/software/systemd/man/257/systemd.syntax.html
- GNU GRUB Manual: https://www.gnu.org/software/grub/manual/grub/grub.html
- Local CLI help for `update-grub` / `grub-mkconfig` on the review machine

## Issues Found
1. The title and description framed `.link` files as `systemd-networkd` functionality, but the official `systemd.link(5)` documentation states they are processed by `systemd-udevd`. I changed the wording to refer to `systemd` rather than `systemd-networkd`.
2. The post used `eth0` as the custom target name in multiple examples. `systemd.link(5)` explicitly warns that names like `eth0` are dangerous because they can race with kernel-assigned names. I changed the examples to use `lan0` instead.
3. Several `.link` examples used inline comments after directives. `systemd.syntax(7)` documents comment lines that begin with `#` or `;`; inline trailing comments are not valid in these configuration files. I moved those comments onto separate lines.
4. The link-parameter example used `Speed=1000`, which is not a valid `.link` directive. The correct key is `BitsPerSecond=`. I changed it to `BitsPerSecond=1G` and also changed `AutoNegotiation=yes` to `AutoNegotiation=no`, because the official docs state speed and duplex are read-only when autonegotiation is enabled.
5. The apply and verification commands were too loose. I updated the reapply example to use the documented `udevadm trigger --verbose --settle --action add ...` flow, changed the property lookup to `udevadm info --query=property`, and replaced the generic monitor pipeline with `udevadm monitor --udev --property --subsystem-match=net`.
6. The “Disabling Predictable Interface Names” section used a `NamePolicy=kernel` example and an unlabeled `update-grub` command. I revised the `.link` example to clear `NamePolicy=` in an earlier matching file, labeled the GRUB snippet as a Debian/Ubuntu example, removed the unrelated `biosdevname=0` parameter, and noted that a reboot is required for the kernel parameter to take effect.

## Review Notes
- `MACAddress=` matches the current MAC address. On systems where the MAC may be changed by firmware, virtualization, or policy, `PermanentMACAddress=` can be a more stable match key.
- Some distributions copy `.link` files into early-boot images. If a system applies naming in initramfs, readers may also need to regenerate initramfs after changing `.link` files.
