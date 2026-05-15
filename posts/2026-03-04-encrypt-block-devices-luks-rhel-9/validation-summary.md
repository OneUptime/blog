# Validation Summary: How to Encrypt Individual Block Devices with LUKS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LUKS2
- cryptsetup / dm-crypt
- Linux block devices
- /etc/crypttab
- /etc/fstab
- XFS and ext4 filesystems
- LVM

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Encrypting block devices using LUKS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/encrypting-block-devices-using-luks_security-hardening
- cryptsetup-luksFormat(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksFormat.8.html
- cryptsetup-open(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-open.8.html
- crypttab(5) manual page: https://man7.org/linux/man-pages/man5/crypttab.5.html
- fstab(5) manual page from util-linux, checked locally with `man fstab`

## Issues Found
- The `--hash sha256` parameter explanation said it was the hash algorithm for passphrase derivation. The cryptsetup manual describes this option as the hash used in the LUKS key setup scheme and volume key digest, so the post now uses that wording.
- The `--iter-time 5000` explanation was tightened from "passphrase derivation function" to "passphrase processing" to avoid implying that `--hash` alone defines LUKS2 passphrase derivation behavior.

## Review Notes
The main workflow, including `cryptsetup luksFormat --type luks2`, opening the LUKS device, creating a filesystem on `/dev/mapper/...`, mounting it, and adding `/etc/crypttab` and `/etc/fstab` entries, matches the documented RHEL 9 LUKS process. `cryptsetup luksOpen` remains supported as a compatibility alias for `cryptsetup open --type luks`.
