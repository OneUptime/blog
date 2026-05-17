# Validation Summary: How to Set Up Full Disk Encryption During Ubuntu Server Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server (Subiquity installer)
- LUKS (Linux Unified Key Setup) - LUKS1 and LUKS2
- cryptsetup
- LVM (Logical Volume Manager)
- dm-crypt
- initramfs / initramfs-tools
- dropbear-initramfs (remote unlock SSH)
- GRUB bootloader
- AES-NI / aes-xts-plain64 cipher
- /etc/crypttab configuration

## Sources Consulted
- [cryptsetup man pages (man7.org)](https://man7.org/linux/man-pages/man8/cryptsetup.8.html)
- [cryptsetup-luksFormat man page](https://man7.org/linux/man-pages/man8/cryptsetup-luksFormat.8.html)
- [cryptsetup-luksAddKey man page](https://man7.org/linux/man-pages/man8/cryptsetup-luksAddKey.8.html)
- [Arch Linux cryptsetup-config(8) man page](https://man.archlinux.org/man/cryptsetup-config.8.en)
- [Red Hat Enterprise Linux LUKS documentation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/encrypting-block-devices-using-luks_security-hardening)
- [Wikipedia: Linux Unified Key Setup](https://en.wikipedia.org/wiki/Linux_Unified_Key_Setup)
- [Debian Wiki: DropBear](https://wiki.debian.org/DropBear)
- [Ubuntu Launchpad: dropbear-initramfs bug discussion](https://bugs.launchpad.net/ubuntu/+source/dropbear/+bug/1645555)
- Kernel documentation for the `ip=` boot parameter (Documentation/admin-guide/nfs/nfsroot.rst)

## Issues Found
- **LUKS key slot count was outdated.** The post originally claimed "LUKS supports up to 8 key slots." This is only true for the legacy LUKS1 format. LUKS2 — the default format created by `cryptsetup luksFormat` since cryptsetup 2.1 (used by Ubuntu 20.04 and all later releases) — supports up to 32 key slots. Updated the text to reflect that LUKS2 supports 32 slots and that 8 was the LUKS1 limit, so readers managing keys (`cryptsetup luksAddKey`, slot indexing, etc.) get accurate numbers.

## Review Notes
- The dropbear-initramfs authorized_keys path `/etc/dropbear/initramfs/authorized_keys` is correct for current Ubuntu releases (22.04+). Older systems and earlier Debian/Ubuntu versions used `/etc/dropbear-initramfs/authorized_keys`. Readers on older systems may need to use `dpkg -L dropbear-initramfs` to verify which path their installation expects.
- The `IP=` initramfs configuration format `client-ip::gateway:netmask::interface:autoconf` is correct and follows the kernel's `ip=` boot parameter syntax.
- The default LUKS cipher `aes-xts-plain64` is correct and matches the cryptsetup default.
- The `cryptsetup luksOpen` form is still supported but the modern equivalent is `cryptsetup open --type luks`. Both work; the legacy form was kept since it is clearer for readers learning LUKS.
- Modern Ubuntu typically uses predictable network interface names (e.g. `enp0s3`) instead of `eth0`. The example IP line uses `eth0`, which still works but readers should substitute their actual interface name.
- The Subiquity custom storage flow description is accurate in spirit but the exact wording of menu items (e.g. "Add as Boot Device", "Encrypt" toggle) can vary slightly between Ubuntu Server release versions. The guidance to look for the encryption option when formatting is the practical takeaway.
- The note about `discard`/TRIM having minor security implications (leaking sector usage) is consistent with the cryptsetup documentation and is a fair caveat to call out.
