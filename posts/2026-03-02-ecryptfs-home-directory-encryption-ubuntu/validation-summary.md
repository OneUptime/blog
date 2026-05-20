# Validation Summary: How to Set Up eCryptfs for Home Directory Encryption on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- eCryptfs
- ecryptfs-utils
- PAM
- Linux kernel keyrings
- LUKS / dm-crypt
- crypttab encrypted swap

## Sources Consulted
- Ubuntu Security Documentation: File encryption - https://documentation.ubuntu.com/security/security-features/storage/encryption-file/
- eCryptfs documentation index - https://www.ecryptfs.org/documentation
- Ubuntu manpage: ecryptfs(7) - https://manpages.ubuntu.com/manpages/focal/man7/ecryptfs.7.html
- Ubuntu manpage: ecryptfs-setup-private(1) - https://manpages.ubuntu.com/manpages/focal/man1/ecryptfs-setup-private.1.html
- Ubuntu manpage: ecryptfs-migrate-home(8) - https://manpages.ubuntu.com/manpages/focal/man8/ecryptfs-migrate-home.8.html
- Ubuntu manpage: pam_ecryptfs(8) - https://manpages.ubuntu.com/manpages/focal/man8/pam_ecryptfs.8.html
- Ubuntu manpage: mount.ecryptfs(8) - https://manpages.ubuntu.com/manpages/focal/man8/mount.ecryptfs.8.html
- Ubuntu manpage: ecryptfs-add-passphrase(1) - https://manpages.ubuntu.com/manpages/focal/man1/ecryptfs-add-passphrase.1.html
- Ubuntu manpage: ecryptfs-unwrap-passphrase(1) - https://manpages.ubuntu.com/manpages/focal/man1/ecryptfs-unwrap-passphrase.1.html
- Ubuntu manpage: ecryptfs-rewrap-passphrase(1) - https://manpages.ubuntu.com/manpages/focal/man1/ecryptfs-rewrap-passphrase.1.html
- Ubuntu manpage: ecryptfs-recover-private(1) - https://manpages.ubuntu.com/manpages/focal/man1/ecryptfs-recover-private.1.html
- Ubuntu manpage: ecryptfs-setup-swap(1) - https://manpages.ubuntu.com/manpages/focal/man1/ecryptfs-setup-swap.1.html
- Ubuntu manpage: crypttab(5) - https://manpages.ubuntu.com/manpages/noble/man5/crypttab.5.html

## Issues Found
- Corrected Ubuntu version/support claims: encrypted home directories were introduced in Ubuntu 9.04, and Ubuntu 18.04 LTS and later no longer support eCryptfs encrypted home/private directories as installer features. The installer option is now described as legacy, with LUKS recommended for current installations.
- Clarified eCryptfs key handling: per-file encryption keys are protected by the mount passphrase, while the login password wraps the mount passphrase in Ubuntu's home-directory setup.
- Added `sudo` to `modprobe ecryptfs`, since loading a kernel module requires elevated privileges.
- Added the `ecryptfs-migrate-home` requirement to log in as the migrated user immediately after migration and before rebooting.
- Fixed `ecryptfs-add-passphrase` stdin usage to include `-`, and changed manual setup/recovery examples to use separate data and filename-encryption key signatures.
- Added `ecryptfs_enable_filename_crypto=y` where filename encryption key signatures are used.
- Corrected PAM examples to match the documented `pam_ecryptfs` auth/session configuration and removed the unsupported `common-password` example from the setup snippet.
- Corrected encrypted storage paths in status and unmount examples for encrypted home directories.
- Replaced `umount.ecryptfs_private` with the preferred `ecryptfs-umount-private` wrapper.
- Updated the encrypted swap `crypttab` example to include explicit plain-mode key size and swap options.

## Review Notes
eCryptfs remains deprecated in Ubuntu's current security documentation. The article is technically valid after corrections, but future revisions should consider reframing the guide more explicitly as legacy/manual eCryptfs guidance and directing new Ubuntu deployments to LUKS full-disk encryption.
