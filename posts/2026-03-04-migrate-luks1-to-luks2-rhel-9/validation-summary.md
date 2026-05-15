# Validation Summary: How to Migrate from LUKS1 to LUKS2 on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LUKS1 and LUKS2 disk encryption
- cryptsetup
- dm-crypt and dm-integrity
- dracut initramfs generation
- LVM on LUKS

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Upstream cryptsetup convert man page: https://kernel.googlesource.com/pub/scm/utils/cryptsetup/cryptsetup/+/refs/heads/master/man/cryptsetup-convert.8.adoc
- Upstream cryptsetup luksConvertKey man page: https://kernel.googlesource.com/pub/scm/utils/cryptsetup/cryptsetup/+/refs/heads/master/man/cryptsetup-luksConvertKey.8.adoc
- Upstream cryptsetup open/luksOpen man page: https://kernel.googlesource.com/pub/scm/utils/cryptsetup/cryptsetup/+/refs/heads/master/man/cryptsetup-open.8.adoc
- Upstream cryptsetup 2.0.0 release notes for LUKS2 features and conversion caveats: https://gitlab.com/cryptsetup/cryptsetup/-/raw/main/docs/v2.0.0-ReleaseNotes

## Issues Found
- The comparison table described LUKS2 key derivation as only Argon2id. Updated it to state that LUKS2 can use PBKDF2, Argon2i, or Argon2id, because converted LUKS1 keyslots remain PBKDF2 until changed and cryptsetup supports multiple PBKDFs for LUKS2.
- The comparison table described LUKS2 metadata redundancy generically. Updated it to "Redundant JSON metadata copies" to match Red Hat and upstream LUKS2 documentation more precisely.
- The comparison table described authenticated encryption as "with integrity." Updated it to "with dm-integrity" to identify the mechanism used by cryptsetup/LUKS2.
- The compatibility section listed "PBKDF parameters are incompatible" as a LUKS1-to-LUKS2 conversion failure. Replaced this with the documented failure cases: unsupported LUKS1 header size, Clevis/PBD luksmeta metadata, and an active dm-crypt mapping.
- The conversion explanation said the operation modifies only header metadata. Updated it to say it modifies the LUKS header and key slot metadata while not re-encrypting bulk data, because upstream cryptsetup notes that conversion can move keyslot data.
- The root-device workflow suggested rebuilding initramfs after rebooting. Updated it to rebuild from the rescue/chroot environment before rebooting when the existing initramfs lacks LUKS2 support.

## Review Notes
The commands and options reviewed are current for cryptsetup: `luksHeaderBackup`, `convert --type luks2`, `luksOpen --test-passphrase`, `luksConvertKey --pbkdf argon2id`, `--pbkdf-memory`, `--pbkdf-parallel`, `--iter-time`, and `luksHeaderRestore` are valid. The post remains a focused RHEL 9 migration guide, but production root-device migrations should still be tested against the system's actual boot chain and recovery procedure.
