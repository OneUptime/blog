# Validation Summary: How to Encrypt Your Home Directory on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- eCryptfs
- LUKS / dm-crypt
- cryptsetup
- PAM
- Linux swap encryption

## Sources Consulted
- Ubuntu Security Documentation: File Encryption - https://documentation.ubuntu.com/security/docs/security-features/storage/encryption-file/
- Ubuntu Security Documentation: Full Disk Encryption - https://documentation.ubuntu.com/security/security-features/storage/encryption-full-disk/
- Ubuntu Manpage: ecryptfs-migrate-home - https://manpages.ubuntu.com/manpages/focal/man8/ecryptfs-migrate-home.8.html
- Ubuntu Manpage: ecryptfs-setup-private - https://manpages.ubuntu.com/manpages/noble/man1/ecryptfs-setup-private.1.html
- Ubuntu Manpage: ecryptfs-recover-private - https://manpages.ubuntu.com/manpages/focal/man1/ecryptfs-recover-private.1.html
- Ubuntu Manpage: ecryptfs-setup-swap - https://manpages.ubuntu.com/manpages/stonking/man1/ecryptfs-setup-swap.1.html
- Ubuntu Manpage: pam_ecryptfs - https://manpages.ubuntu.com/manpages/stonking/man8/pam_ecryptfs.8.html
- Ubuntu Manpage: cryptsetup - https://manpages.ubuntu.com/manpages/jammy/man8/cryptsetup.8.html
- Ubuntu Community Help Wiki: EncryptedHome - https://help.ubuntu.com/community/EncryptedHome

## Issues Found
- The post implied eCryptfs encrypted home directories are currently supported on Ubuntu. Ubuntu documentation says encrypted home and encrypted private directory support was dropped in Ubuntu 18.04 LTS, although manual/legacy eCryptfs tools still exist. Updated the text to describe eCryptfs home encryption as a legacy/unsupported option on modern Ubuntu and recommend LUKS for new systems.
- The new-user command used `useradd --encrypt-home`, which is not a valid Ubuntu `useradd` option. Replaced it with `adduser --encrypt-home`, matching Ubuntu's legacy encrypted home guidance and local `adduser --help` output.
- The LUKS description claimed full disk encryption encrypts the entire disk. Clarified that Ubuntu FDE encrypts operating system data partitions while boot/firmware partitions normally remain unencrypted unless a custom layout is used.
- The PAM example used `auth optional pam_ecryptfs.so unwrap`; the `pam_ecryptfs` manpage example uses `auth required pam_ecryptfs.so unwrap`. Updated the snippet.
- The manual eCryptfs mount example used a low-level `mount -t ecryptfs` command with incomplete options. Replaced it with the supported `ecryptfs-mount-private` and `ecryptfs-recover-private` helpers.
- The LUKS verification example used `cryptsetup status ubuntu-vg-ubuntu--lv`, which is usually an LVM logical volume name rather than the cryptsetup mapping name. Updated the example to identify LUKS devices with `lsblk` and use the actual crypt mapping name.
- The LUKS examples hard-coded `/dev/sda3`. Replaced this with `/dev/sdXN` and a note to use the real encrypted partition.
- The recovery key example wrote key material to `/tmp` and used a world-risky default file location. Updated it to create a root-owned `0600` key file under `/root` and recommend `shred -u` after securely storing it.
- The key-slot inspection command grepped for `Key Slot`, which does not match common LUKS2 `cryptsetup luksDump` output. Updated it to match `Keyslots` and numbered keyslot lines.
- The swap section described creating an encrypted swap file but operated on a partition with hand-written `/etc/crypttab` and `/etc/fstab` edits. Replaced this with `ecryptfs-setup-swap`, the documented helper for eCryptfs systems.
- The encrypted-backup recovery command used an incomplete low-level eCryptfs mount. Replaced it with `ecryptfs-recover-private`.
- The backup explanation said encrypted backups can be restored without knowing the passphrase. Corrected it to say the backup does not expose plaintext; decryption still requires the login or mount passphrase.
- The benchmark examples used `oflag=direct`, which may not work through stacked filesystems such as eCryptfs. Replaced it with `conv=fdatasync`.
- The performance note claimed all modern CPUs have AES-NI. Narrowed this to x86 CPUs with AES-NI.

## Review Notes
The post is technically relevant and salvageable, but eCryptfs home encryption is now legacy on Ubuntu. Future revisions should consider replacing the eCryptfs migration walkthrough with a LUKS migration or fresh-install guide for current Ubuntu releases.
