# Validation Summary: How to Update initramfs After Kernel Changes on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Ubuntu Linux
- initramfs-tools (`update-initramfs`, `mkinitramfs`, `unmkinitramfs`, `lsinitramfs`)
- Linux kernel and kernel modules
- DKMS (Dynamic Kernel Module Support)
- GRUB bootloader (`update-grub`, `/boot/grub/grub.cfg`)
- LUKS / cryptsetup and `/etc/crypttab`
- mdadm software RAID
- LVM
- Hibernation/resume (`/etc/initramfs-tools/conf.d/resume`)
- APT package manager hooks (`DPkg::Post-Invoke`)

## Sources Consulted
- `man update-initramfs(8)` on a current Ubuntu system — confirmed `-c`, `-u`, `-d`, `-k <version>|all`, `-v`, `-b` flags
- `man unmkinitramfs(8)` — confirmed behavior for multi-segment initramfs (early microcode + main archive extracted to `early/`, `main/` subdirectories)
- `man mkinitramfs(8)` / `man lsinitramfs(8)` — confirmed direct invocation syntax `mkinitramfs -o <output> <kernel-version>`
- `man find(1)` — confirmed `-!` is accepted by GNU find as a negation operator (works equivalently to `!`)
- Debian/Ubuntu initramfs-tools documentation and the `/etc/initramfs-tools/` layout (`modules`, `initramfs.conf`, `conf.d/`, `hooks/`, `scripts/`)
- APT documentation for `DPkg::Post-Invoke` hook syntax in `/etc/apt/apt.conf.d/`
- Kernel module naming conventions (`nvme`, `nvme_core`, `md_mod`, `raid1`, `raid5` — `raid5` is an alias resolved by modprobe to `raid456`)
- `/etc/crypttab` field format: `name source-device keyfile options`

## Issues Found
- The "Verifying the Updated initramfs" section showed `cat /tmp/initrd-check/init | head -30`, but on modern Ubuntu installs the initramfs typically begins with an uncompressed CPU-microcode segment. `unmkinitramfs` then extracts the main filesystem into a `main/` subdirectory, so `init` is not at the top level. Updated the example to try `/tmp/initrd-check/main/init` first and fall back to `/tmp/initrd-check/init` for the (rarer) single-segment case, with a short inline note explaining why.

## Review Notes
- The `-!` operator used in the troubleshooting `find` command is non-standard but is accepted by GNU find (confirmed by direct test). Strictly portable scripts would use `!` or `-not`, but `-!` works on Ubuntu and the post is Ubuntu-specific, so it was left as-is.
- Kernel version strings used in examples (e.g. `6.8.0-51-generic`, `6.5.0-44-generic`) are illustrative; readers will substitute their own. They match plausible Ubuntu 24.04-era HWE kernel naming.
- `raid5` in `/etc/initramfs-tools/modules` is correct — modprobe resolves the alias to the `raid456` module that handles RAID 4/5/6.
- The blanket `DPkg::Post-Invoke` hook running `update-initramfs -u -k all` after every APT operation is correctly flagged by the author as heavy-handed; the warning is appropriate.
- The backup approach (`cp /boot/initrd.img-$(uname -r) /boot/initrd.img-$(uname -r).backup`) works, but readers should know GRUB does not automatically present `.backup` files as boot entries — recovery still requires editing GRUB at boot or using a live environment, which the post does mention.
