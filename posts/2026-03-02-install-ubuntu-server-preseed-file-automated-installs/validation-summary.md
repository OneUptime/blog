# Validation Summary: How to Install Ubuntu Server Using a Preseed File for Automated Installs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Debian Installer (d-i) preseeding
- debconf / debconf-get-selections
- partman-auto and expert_recipe partitioning
- LVM partitioning
- openssl passwd (SHA-512 password hashing)
- GRUB boot loader
- tasksel and pkgsel
- genisoimage (ISO repacking)
- Python http.server (preseed hosting)
- VBoxManage (VirtualBox CLI for testing)
- Ubuntu Autoinstall (mentioned as the modern replacement)

## Sources Consulted
- Official Debian example preseed file: https://www.debian.org/releases/stable/example-preseed.txt
- Debian Installer Preseed wiki: https://wiki.debian.org/DebianInstaller/Preseed
- partman-auto source/recipes.sh on Debian Salsa: https://salsa.debian.org/installer-team/partman-auto
- Knowledge of debconf, openssl passwd flags, genisoimage options, and VBoxManage syntax

## Issues Found
1. **Incorrect `$defaultignore{ }` directive on the `/boot` partition in the custom expert_recipe.** The `$defaultignore{ }` directive causes partman to ignore that partition definition in the default recipe context, which would prevent `/boot` from being created. Removed it; the `/boot` definition now uses only `$primary{ }` and `$bootable{ }` per the official Debian preseed example.
2. **Inaccurate comment on the custom partitioning recipe.** The original comment claimed the recipe creates separate `/boot`, `/`, `/var`, and `/home` partitions, but the recipe actually defines an EFI System Partition, `/boot`, `/` on LVM, and swap. Updated the comment to accurately describe what the recipe produces: "EFI, separate /boot, root on LVM, and swap".

## Review Notes
- The preseed key/value pairs (locale, keyboard, netcfg, mirror, clock, partman, passwd, tasksel, pkgsel, grub-installer, finish-install) are all valid debconf templates used by the Debian/Ubuntu alternate (non-live) installer.
- The post correctly notes that Canonical's modern recommended automation method for the live server installer (Ubuntu 20.04+) is Autoinstall/cloud-init, and that preseed remains relevant for legacy/netboot/alternate installers.
- `openssl passwd -6` does generate a SHA-512 crypt hash; the placeholder showing `$6$rounds=4096$salt$hash` correctly illustrates the hash format (the `rounds=` segment is optional and is not emitted by default by `openssl passwd -6`).
- `genisoimage`'s single-dash long options (`-rational-rock`, `-joliet-long`, `-eltorito-boot`, etc.) are accepted by genisoimage's custom option parser, so the ISO-repack example works as written.
- `VBoxManage createhd` still functions but is deprecated in favor of `VBoxManage createmedium disk`; this is not a correctness issue for current VirtualBox versions but may warrant a future update.
- The recipe uses `$bootable{ }` on `/boot`; this flag is a no-op on GPT (where `$legacy_boot{ }` would be used instead), but it's harmless and works correctly on MBR-labeled disks, so it's left as-is.
