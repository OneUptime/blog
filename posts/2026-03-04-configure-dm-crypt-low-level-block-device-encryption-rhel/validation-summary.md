# Validation Summary: How to Configure dm-crypt for Low-Level Block Device Encryption on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- dm-crypt
- LUKS and LUKS2
- cryptsetup
- XFS
- systemd crypttab
- fstab
- Clevis and Tang

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Encrypting block devices using LUKS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/encrypting-block-devices-using-luks_security-hardening
- Red Hat Enterprise Linux 8 Managing storage devices, "Encrypting block devices using LUKS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_storage_devices/encrypting-block-devices-using-luks_managing-storage-devices
- systemd crypttab manual: https://www.freedesktop.org/software/systemd/man/latest/crypttab.html
- cryptsetup-open manual: https://man7.org/linux/man-pages/man8/cryptsetup-luksopen.8.html
- cryptsetup-close manual: https://man7.org/linux/man-pages/man8/cryptsetup-close.8.html

## Issues Found
- The post stated that LUKS supports up to eight key slots total. That is only true for LUKS1; current RHEL defaults to LUKS2, which supports up to 32 key slots. Updated the text to distinguish LUKS1 and LUKS2 limits.
- The examples used `cryptsetup luksOpen` and `cryptsetup luksClose`. These aliases still work for compatibility, but current Red Hat documentation and cryptsetup manuals present `cryptsetup open` and `cryptsetup close` as the current command forms. Updated the examples accordingly.

## Review Notes
The remaining commands and configuration examples are technically valid for a blank spare block device on RHEL. The `/etc/crypttab` entry with `none` as the key field will prompt for a passphrase during boot rather than unlock non-interactively; automated unlocking would require a key file, Clevis, Tang, TPM2, or a similar mechanism.
