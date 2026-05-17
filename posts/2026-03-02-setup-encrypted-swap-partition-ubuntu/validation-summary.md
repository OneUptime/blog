# Validation Summary: How to Set Up Encrypted Swap Partition on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (Linux)
- LUKS / LUKS2 (Linux Unified Key Setup)
- dm-crypt (device-mapper crypto target)
- cryptsetup CLI
- /etc/crypttab and /etc/fstab configuration
- mkswap, swapon, swapoff utilities
- dmsetup utility
- initramfs (update-initramfs)
- GRUB boot configuration (resume= kernel parameter)
- Hibernation / suspend-to-disk

## Sources Consulted
- crypttab(5) man page (systemd implementation): https://www.freedesktop.org/software/systemd/man/crypttab.html
- cryptsetup official documentation (gitlab.com/cryptsetup/cryptsetup)
- Debian/Ubuntu cryptsetup package documentation: /usr/share/doc/cryptsetup/README.Debian.gz
- Ubuntu wiki on full disk encryption and encrypted swap
- dmsetup(8) man page
- mkswap(8) man page
- Linux kernel documentation on hibernation/resume parameters: https://www.kernel.org/doc/html/latest/power/swsusp.html

## Issues Found
No technical issues found. All commands, options, and configuration syntax are correct:

- The crypttab format `<name> <device> <key> <options>` matches the documented spec.
- The `swap` crypttab option correctly causes `mkswap` to be run on the opened device after a safety check.
- `cipher=aes-xts-plain64,size=256` is a valid combination (note: XTS uses two AES keys, so size=256 yields AES-128-XTS effective strength — this is consistent with common Ubuntu defaults).
- Using `/dev/urandom` as the keyfile entry for volatile-key swap is standard and documented.
- `cryptsetup luksFormat --type luks2`, `luksOpen`, `luksAddKey`, and `luksUUID` are all current, non-deprecated commands.
- The fstab entry `/dev/mapper/cryptswap1 none swap sw 0 0` is correct.
- `update-initramfs -u -k all` is the correct invocation to rebuild initramfs for all installed kernels.
- `dmsetup status`, `dmsetup ls --target crypt`, and `dmsetup info` commands and flags are correct.
- `dd if=/dev/urandom of=... bs=1 count=4096` produces a valid 4096-byte keyfile (inefficient but functionally correct).
- The `resume=/dev/mapper/cryptswap1` kernel parameter is the correct mechanism for telling the kernel where to find the hibernation image.

## Review Notes
- The post does not explicitly mention creating `/etc/luks/` before writing the key file there. A reader following the steps verbatim would get a "no such file or directory" error from `dd`. Most sysadmins would handle this automatically (`mkdir -p /etc/luks`), so this is a minor omission rather than a technical error.
- The keyfile-on-encrypted-root pattern (Method 2 subsection) works fine for normal boot but does NOT enable hibernation resume by itself, because at resume time the root filesystem is not yet mounted and the keyfile is therefore not accessible. Achieving hibernation with this pattern on Ubuntu typically requires the `decrypt_keyctl` mechanism (cryptsetup-initramfs) to share the root passphrase with the swap unlock. The post's structure puts the keyfile subsection under "For Hibernation Support" which could mislead some readers, though the post does not explicitly claim hibernation works with the keyfile approach.
- For AES-256-XTS encryption strength rather than AES-128-XTS, users would need `size=512` in the crypttab options. The post's `size=256` matches many published Ubuntu examples and is not wrong, just worth noting for security-sensitive deployments.
- Modern systemd-based systems may prefer `cryptsetup open --type luks` over the legacy `luksOpen` subcommand, but both are still supported and produce identical results.
