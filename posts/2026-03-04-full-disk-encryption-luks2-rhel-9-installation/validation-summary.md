# Validation Summary: How to Enable Full Disk Encryption with LUKS2 During RHEL Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Anaconda installer storage encryption
- LUKS2 and dm-crypt
- Kickstart partitioning commands
- `cryptsetup`
- `dmsetup`
- LVM, XFS, swap, `/boot`, and EFI system partitions

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, LUKS disk encryption and LUKS versions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Automatically installing RHEL, Kickstart `autopart`, `part`, and `logvol` encryption options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- `cryptsetup-luksHeaderBackup(8)` manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksHeaderBackup.8.html
- `cryptsetup-luksAddKey(8)` manual page: https://www.man7.org/linux/man-pages/man8/cryptsetup-luksAddKey.8%40%40cryptsetup.html
- `cryptsetup-luksChangeKey(8)` manual page: https://man7.org/linux/man-pages/man8/cryptsetup-lukschangekey.8.html
- Local `dmsetup ls --help` output, confirming `dmsetup ls --target crypt`

## Issues Found
1. **Encryption scope was overstated.** The post said LUKS2 ensures all data on the RHEL system is encrypted and the diagram said all partitions are encrypted from the start. Red Hat documentation states that boot partitions remain available for booting and that the installation encryption option encrypts LUKS-backed partitions; the post itself also lists `/boot` and `/boot/efi` as unencrypted. Updated the introduction and diagram text to clarify that system data partitions are encrypted while `/boot` and `/boot/efi` remain unencrypted.
2. **Kickstart security guidance mentioned using a key file.** The shown Kickstart flow uses `--passphrase`, and Red Hat's documented Kickstart recovery options for encrypted partitions are prompting when no default passphrase is supplied, `--escrowcert`, and `--backuppassphrase`. Replaced the key-file wording with guidance to omit `--passphrase` for an installer prompt or use escrow and backup passphrase options.
3. **LUKS key-slot count used the LUKS1 limit.** The post said LUKS supports up to 8 key slots in the `luksAddKey` comment. Red Hat documents 8 key slots for LUKS1 and up to 32 for LUKS2. Updated the comment to say LUKS2 supports up to 32 key slots.

## Review Notes
- The Kickstart options `--encrypted`, `--luks-version=luks2`, and `--passphrase` are valid for RHEL 9 partitioning commands.
- RHEL 9 defaults to LUKS2 for LUKS encryption, and Anaconda's default cipher is `aes-xts-plain64`.
- The verification and management commands (`cryptsetup luksDump`, `dmsetup ls --target crypt`, `cryptsetup benchmark`, `cryptsetup luksAddKey`, `cryptsetup luksChangeKey`, and `cryptsetup luksHeaderBackup --header-backup-file`) are syntactically correct.
- The post uses `/dev/sda3` as an example device. In production documentation, persistent names under `/dev/disk/by-*` are often safer because `/dev/sdX` names can change across boots.
