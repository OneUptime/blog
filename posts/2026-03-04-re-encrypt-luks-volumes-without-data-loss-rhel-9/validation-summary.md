# Validation Summary: How to Re-Encrypt LUKS Volumes on RHEL Without Data Loss

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LUKS1 and LUKS2 disk encryption
- cryptsetup reencryption
- dm-crypt mapped devices
- Linux block devices and filesystems

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, Chapter 10: Encrypting block devices using LUKS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/encrypting-block-devices-using-luks_security-hardening
- cryptsetup-reencrypt(8) Linux manual page: https://man7.org/linux/man-pages/man8/cryptsetup-reencrypt.8.html
- cryptsetup project manual pages, as referenced by Red Hat documentation: cryptsetup(8), cryptsetup-reencrypt(8), and cryptsetup-repair(8)

## Issues Found
- Clarified that online reencryption requires LUKS2. RHEL 9.2 supports `cryptsetup reencrypt` for both LUKS versions, but LUKS1 reencryption must be offline.
- Updated `luksDump` filtering examples to include LUKS2 fields such as `Key`, `Hash`, and `PBKDF`, instead of looking only for `keysize`, which is not the field shown by `luksDump`.
- Clarified that `--progress-frequency` prints progress when starting or resuming a reencryption command; it is not a separate monitor that attaches to an already-running process.
- Removed `--hash sha256` from the LUKS2 Argon2id example because `cryptsetup-reencrypt(8)` documents that `--hash` is ignored for LUKS2 unless the new keyslot PBKDF is PBKDF2.
- Added the required free-space warning before using `--reduce-device-size 32M`. The option consumes space at the end of the device, so that area must be unused to preserve data.
- Corrected the LUKS2 decryption example to export the original header with `--header` and warned not to place that exported header on the device being decrypted.
- Adjusted interrupted reencryption handling to mention `cryptsetup repair` before `--resume-only` when recovery is required after an abrupt interruption.
- Clarified that the final mount command is only needed if the filesystem is not already mounted, since online reencryption keeps the mapped volume accessible.

## Review Notes
The commands are version-sensitive: RHEL documentation states that `cryptsetup reencrypt` support for both LUKS versions applies since RHEL 9.2. Reencrypting or decrypting existing data remains risky despite LUKS2 resilience, so the post's backup warnings are appropriate.
