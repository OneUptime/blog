# Validation Summary: How to Back Up and Restore LUKS Headers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LUKS and LUKS2 disk encryption
- cryptsetup
- GnuPG symmetric encryption
- util-linux tools: blkid and lsblk
- GNU coreutils shred
- cron weekly jobs

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_storage_devices/index
- cryptsetup luksHeaderBackup manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksHeaderBackup.8.html
- cryptsetup luksHeaderRestore manual page: https://www.man7.org/linux/man-pages/man8/cryptsetup-luksheaderrestore.8.html
- cryptsetup luksDump manual page: https://www.man7.org/linux/man-pages/man8/cryptsetup-luksDump.8.html
- cryptsetup 2.1.0 release notes for LUKS2 default header size: https://gitlab.com/cryptsetup/cryptsetup/-/blob/master/docs/v2.1.0-ReleaseNotes
- cryptsetup FAQ for LUKS header/keyslot layout and backup size notes: https://gitlab.com/cryptsetup/cryptsetup/-/blob/main/FAQ.md
- Local GnuPG 2.4.4 manual/help output for `--symmetric`, `--cipher-algo`, `--passphrase-file`, and `--pinentry-mode loopback`
- Local util-linux help output for `blkid` and `lsblk`
- Local GNU coreutils `shred` help output

## Issues Found
- The post described LUKS header corruption as always causing permanent data loss. This was too absolute for LUKS2 because Red Hat documents redundant LUKS2 metadata with corruption detection and automatic repair from a metadata copy. I changed the wording to refer to badly corrupted or overwritten header/keyslot areas and to say data can or may become inaccessible.
- The description said header backups ensure encrypted data can always be recovered. That was too strong because header backups do not protect against data-area corruption or lost passphrases. I changed it to say they improve recoverability.
- The restore warning said the header UUID must match. The cryptsetup restore requirement is more specific: when an existing LUKS header is present, the volume key size and data offset must match; restoring also replaces all keyslots. I changed the warning to say the backup must belong to the same LUKS volume and noted the volume key size/data offset requirement.
- The LUKS2 header-size command suggested checking `Data segments` separately from `offset`. `luksDump` reports the useful payload/data offset under the data segment, so I simplified the example to check `offset` and clarified that the backup covers the header and keyslot area.
- The cron cleanup command used `luks-header-*.img.gpg`, but the script creates files named like `luks-header_dev_sdb-YYYYMMDD.img.gpg`. I changed the cleanup glob to `luks-header*.img.gpg` so retention applies to the generated backups.
- The unattended GPG cron example used `--passphrase-file` without `--pinentry-mode loopback`. GnuPG 2.1 and later require loopback pinentry for passphrase-file use in batch mode. I added `--pinentry-mode loopback`.

## Review Notes
The main cryptsetup commands and options in the post are current and valid according to upstream cryptsetup documentation. The local environment did not have `cryptsetup` installed, so cryptsetup command behavior was verified against upstream and Red Hat documentation rather than local execution.
