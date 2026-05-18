# Validation Summary: How to Set Up USB Automounting on Ubuntu Server

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- udev (systemd-udevd) rules
- systemd templated service units (`@.service`)
- udisks2 / `udisksctl`
- polkit authorization rules
- `usbmount` package
- Bash mount script
- Filesystem support: vfat, ntfs-3g, exfat (kernel-native via `exfatprogs`), ext2/3/4
- `blkid`, `lsusb`, `udevadm` utilities

## Sources Consulted
- udev(7) man page — https://man7.org/linux/man-pages/man7/udev.7.html
- systemd-udevd(8) — https://www.freedesktop.org/software/systemd/man/systemd-udevd.service.html (private mount namespace / `PrivateMounts=yes`)
- UDisks2 polkit actions reference — https://storaged.org/doc/udisks2-api/latest/udisks-polkit-actions.html
- ArchWiki — udisks — https://wiki.archlinux.org/title/Udisks
- exfatprogs upstream — https://github.com/exfatprogs/exfatprogs
- Ubuntu package archive (jammy) — exfatprogs, usbmount in universe
- Launchpad Bug #1768010 — usbmount + systemd `MountFlags=slave` incompatibility — https://bugs.launchpad.net/bugs/1768010
- mount(8), umount(8) man pages

## Issues Found

1. **Mounts from `RUN+=` do not propagate (broken since systemd 212).**
   The original Approach 1 had the udev rule call `usb-mount.sh` directly via `RUN+=`. Since systemd 212 (March 2014), `systemd-udevd` runs with `PrivateMounts=yes`, so any mount created by a `RUN+=` script lives inside udev's private mount namespace and is not visible to the rest of the system — meaning the tutorial as written would silently fail on every modern Ubuntu release. I rewrote the udev rule to use `ENV{SYSTEMD_WANTS}+="usb-mount@%k.service"` and added templated `usb-mount@.service` and `usb-unmount@.service` unit files that invoke the existing mount script from outside the udev namespace. I also added `sudo systemctl daemon-reload` to the reload step and a brief explanatory paragraph at the top of Approach 1 noting the namespace constraint. The mount script itself is unchanged.

2. **Incorrect (and dangerous) `disk` group recommendation for udisksctl.**
   The original Approach 2 told readers to `usermod -aG disk serviceuser` to allow non-root use of `udisksctl`. This is wrong on two counts: (a) udisks2 authorization is enforced via polkit, not group membership, so adding the user to `disk` doesn't actually authorize udisksctl operations; (b) the `disk` group grants raw read/write access to every block device (including the root disk and `/dev/sda`), which is a serious security regression on a server. Replaced the snippet with a correct polkit rule (`/etc/polkit-1/rules.d/50-udisks-serviceuser.rules`) that grants the `org.freedesktop.udisks2.filesystem-mount*` actions to the named service user, and added an explicit warning not to use the `disk` group as a shortcut.

## Review Notes

- The intro mentions a second approach using "systemd automount units" as a declarative option, but the body of the post never covers it (it covers udev+script, udisksctl, and usbmount instead). Not a technical error, but a structural mismatch worth tightening if the author revisits the post.
- The mount-script `case` statement includes a `fat32` branch, but `blkid -s TYPE` always returns `vfat` for FAT12/16/32 — the `fat32` branch is dead code. Harmless, left as-is.
- `grep -q "$DEVNAME" /proc/mounts` would substring-match (e.g., `/dev/sdb1` matches a hypothetical `/dev/sdb10`). The current udev `KERNEL` glob `sd[b-z][0-9]` only matches single-digit partitions, so this can't actually happen in practice — left as-is.
- The udev rule's `ACTION=="remove"` with `SUBSYSTEMS=="usb"` can occasionally fail to match on remove events if the parent device chain has already been torn down. The systemd-service approach now in place tolerates this better than the original `RUN+=` form.
- `usbmount` is still in Ubuntu universe but is effectively unmaintained and known to break with `systemd-udevd`'s private mount namespace (Launchpad #1768010) — the post already warns readers about this, which is accurate.
- For the modern kernel NTFS3 driver (kernel ≥ 5.15), `mount -t ntfs` uses the kernel driver instead of FUSE; the script forces `ntfs-3g` (FUSE) for both `ntfs` and `ntfs-3g`, which is a defensible choice for compatibility but worth noting for performance-sensitive use.
