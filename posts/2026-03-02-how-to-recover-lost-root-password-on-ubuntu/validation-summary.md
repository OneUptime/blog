# Validation Summary: How to Recover Lost Root Password on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (system administration)
- GRUB bootloader (menu navigation, kernel parameter editing, password protection)
- Linux recovery mode (friendly-recovery menu)
- `passwd`, `useradd`, `usermod` (user management commands)
- LVM (`vgscan`, `vgchange`, `lvdisplay`, mounting LVs)
- LUKS / `cryptsetup` (full-disk encryption)
- `chroot` and bind-mounting `/dev`, `/proc`, `/sys`, `/run`
- `init=/bin/bash` kernel parameter technique
- SSH key-based authentication (emergency access)
- `grub-mkpasswd-pbkdf2` and `/etc/grub.d/40_custom` (GRUB password protection)

## Sources Consulted
- friendly-recovery package source (defines Ubuntu's recovery menu options): https://sources.debian.org/src/friendly-recovery/0.2.42/lib/recovery-mode/options/
- Ubuntu RecoveryMode wiki: https://wiki.ubuntu.com/RecoveryMode
- Ubuntu FriendlyRecoverySpec: https://wiki.ubuntu.com/FriendlyRecoverySpec
- `cryptsetup` man page (luksOpen / open subcommands)
- LVM tooling reference (`vgchange`, `vgscan`, `lvdisplay`)
- GRUB 2 manual: superusers / `password_pbkdf2` configuration in `/etc/grub.d/40_custom`
- `passwd(1)` / `useradd(8)` / `usermod(8)` man pages

## Issues Found
- **Recovery menu listed a non-existent "users" option.** The post listed `users - Manage user accounts and passwords` as one of the entries in Ubuntu's recovery menu. The `friendly-recovery` package source (the package that actually provides the menu) does not ship a `users` script; the default options are `resume`, `clean`, `dpkg`, `failsafeX`, `fsck`, `grub`, `network`, `root`, and `system-summary` (plus `apt-snapshots` on newer releases). User/password management is done from the `root` shell option. Removed the `users` line from the recovery menu code block to match the actual menu shipped by Ubuntu.

## Review Notes
- The `init=/bin/bash` kernel parameter technique in Scenario 3 is the classical method and still works on modern systemd-based Ubuntu releases. A modern alternative is `systemd.unit=rescue.target` or `systemd.unit=emergency.target`, but `init=/bin/bash` remains valid and is what most existing guides reference. The post's recommendation to `exec /sbin/init` or `reboot -f` afterwards is appropriate (`reboot -f` is the safer of the two when bash is PID 1).
- `cryptsetup luksOpen` is the legacy command form; `cryptsetup open --type luks` is the newer preferred syntax, but `luksOpen` is still fully supported as an alias and remains widely used.
- The example kernel version `6.5.0-21-generic` corresponds to Ubuntu 23.10. On Ubuntu 24.04 LTS users will see 6.8.x, on 22.04 LTS they'll see 5.15.x. This is presented only as an illustrative example so it's not an inaccuracy, just a version-specific snapshot.
- The LVM device paths used in the post — `/dev/mapper/ubuntu--vg-ubuntu--lv` (double-dash escaped) and `/dev/ubuntu-vg/ubuntu-lv` (symlink form) — are both correct representations of the same volume.
- On modern Ubuntu the default SSH server config sets `PermitRootLogin prohibit-password`, so the emergency root SSH key approach in "Preventing Lockout" works as described (key-based root login is permitted by default; password-based root login is not).
