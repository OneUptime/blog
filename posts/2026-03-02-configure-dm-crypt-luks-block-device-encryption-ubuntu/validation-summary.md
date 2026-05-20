# Validation Summary: How to Configure dm-crypt and LUKS for Block Device Encryption on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- dm-crypt
- LUKS1 and LUKS2
- cryptsetup
- `/etc/crypttab`
- `/etc/fstab`
- Linux block devices and filesystems

## Sources Consulted
- cryptsetup upstream `cryptsetup(8)` manual: https://man.archlinux.org/man/cryptsetup.8.en
- cryptsetup upstream `cryptsetup-luksFormat(8)` manual: https://man.archlinux.org/man/core/cryptsetup/cryptsetup-luksFormat.8.en
- Ubuntu 24.04 `cryptsetup-reencrypt(8)` manual: https://manpages.ubuntu.com/manpages/noble/man8/cryptsetup-reencrypt.8.html
- cryptsetup upstream `cryptsetup-erase(8)` / `cryptsetup-luksErase(8)` manual: https://man.archlinux.org/man/core/cryptsetup/cryptsetup-erase.8.en
- cryptsetup upstream `cryptsetup-luksHeaderBackup(8)` manual: https://man7.org/linux/man-pages/man8/cryptsetup-luksheaderbackup.8.html
- systemd `crypttab(5)` manual: https://www.freedesktop.org/software/systemd/man/latest/crypttab.html

## Issues Found
- The post stated that LUKS stores up to 8 key slots. That is only true for LUKS1; LUKS2 supports up to 32 key slots depending on keyslot area size and key size. Updated the explanation and key-slot management section.
- The `cryptsetup close` comment said closing re-encrypts the container. Closing removes the decrypted device-mapper mapping; the data is already encrypted at rest. Updated the comment.
- The in-place encryption example used the older `cryptsetup-reencrypt` command form and described `--reduce-device-size 32M` as simply making room for the header. Updated it to the current `cryptsetup reencrypt --encrypt --type luks2 --reduce-device-size 32M` form and clarified that the last 32 MiB must be unused and will be lost.
- The header overwrite example used a roughly 1 MiB overwrite, which is not enough for the default LUKS2 header/keyslot area. Updated it to overwrite 16 MiB, matching the default LUKS2 header area guidance.
- The SSD free-space command described `fstrim` as securely wiping free space. TRIM/discard behavior is not equivalent to a secure wipe and may reveal allocation patterns. Updated the wording to say it trims unused blocks and requires discard support.

## Review Notes
Most commands are valid examples for Ubuntu systems with the relevant packages installed. Device names such as `/dev/sdb`, mapper names, UUIDs, filesystem types, and mount points are examples and must be adjusted for the target system. The key-file boot-unlock example is technically valid, but future revisions could mention storing key files on the same unencrypted system reduces the security benefit unless protected by another trust mechanism.
