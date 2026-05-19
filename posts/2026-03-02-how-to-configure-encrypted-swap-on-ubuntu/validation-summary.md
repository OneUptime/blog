# Validation Summary: How to Configure Encrypted Swap on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux swap
- dm-crypt
- LUKS
- cryptsetup
- `/etc/crypttab`
- `/etc/fstab`
- systemd cryptsetup units

## Sources Consulted
- Ubuntu 24.04 `crypttab(5)` manpage: https://manpages.ubuntu.com/manpages/noble/man5/crypttab.5.html
- Ubuntu `cryptsetup(8)` manpage: https://manpages.ubuntu.com/manpages/jammy/man8/cryptsetup.8.html
- systemd `crypttab(5)` documentation: https://www.freedesktop.org/software/systemd/man/latest/crypttab.html
- Linux `swapon(8)` manpage: https://man7.org/linux/man-pages/man8/swapon.8.html
- Local Ubuntu 24.04 `fstab(5)` and `swapon(8)` manpages / command help

## Issues Found
- The random-key `crypttab` examples did not explicitly specify `plain`. I added `plain` to the examples because Ubuntu's `crypttab(5)` documentation treats plain dm-crypt options as the relevant mode for random-key encrypted swap, and systemd's `swap` option also implies plain mode.
- The explanation said `hash=sha256` was "not really used" with a random key. I corrected this to state that it is used for plain-mode passphrase processing; Ubuntu's `crypttab(5)` recommends explicitly configuring cipher, hash, and key size for plain dm-crypt devices.
- The swap-file section incorrectly said `crypttab` works with block devices, not files directly, and used a non-persistent `/dev/loop0` setup. I changed the example to use `/swapfile` directly in `crypttab`, which is supported by Ubuntu/systemd crypttab formats, and added the required `/etc/fstab` mapped-device entry.

## Review Notes
The partition-based random-key swap flow and the persistent LUKS swap flow are technically valid. Hibernation with encrypted swap still requires additional resume configuration, as the post already notes. Swap files can have filesystem-specific limitations, especially on copy-on-write filesystems, so the post's recommendation that a dedicated swap partition is simpler remains accurate.
