# Validation Summary: How to Set Up Full Disk Encryption on an Existing Ubuntu System

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu installation and disk encryption
- LUKS and cryptsetup
- /etc/crypttab and /etc/fstab
- initramfs updates
- BorgBackup
- rsync
- ext4 filesystems
- LVM-based encrypted layouts

## Sources Consulted
- cryptsetup(8) Linux manual page: https://man7.org/linux/man-pages/man8/cryptsetup.8.html
- Ubuntu crypttab(5) manual page: https://manpages.ubuntu.com/manpages/noble/man5/crypttab.5.html
- Ubuntu installer storage configuration documentation: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/configure-storage.html
- Ubuntu installer security overview for encrypted installations: https://canonical-subiquity.readthedocs-hosted.com/en/latest/explanation/security-overview.html
- Borg init documentation: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- Borg create documentation: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- Borg extract documentation: https://borgbackup.readthedocs.io/en/stable/usage/extract.html

## Issues Found
- The introduction described encrypting a secondary data partition "in-place", but the documented `cryptsetup luksFormat` workflow is destructive and restores data from backup. Changed the wording to describe recreating the encrypted partition from backup.
- The Ubuntu installer instructions used older UI-specific wording for the encryption option. Updated the sentence to match current guided whole-disk LUKS/LVM encryption flows while still covering older installers.
- The `cryptsetup luksDump | grep "Key Slot"` example was unreliable for LUKS2 output. Changed it to show the full `luksDump` output.
- The `luksRemoveKey` explanation said it removed a key slot, but that command removes the supplied passphrase/key. Updated the wording to avoid implying slot-number removal.
- The keyfile example wrote to `/etc/luks-keys/home.key` without first creating `/etc/luks-keys`. Added `sudo mkdir -m 700 -p /etc/luks-keys`.
- The keyfile section did not warn that storing a keyfile on an unencrypted root partition weakens protection for the secondary encrypted volume. Added a caveat that this pattern is appropriate when the root partition is encrypted.

## Review Notes
Local `cryptsetup` and `borg` binaries were not installed in the review environment, so command verification was performed against official manual pages and project documentation. The examples are intentionally device-name based (`/dev/sda3`, `/dev/sdb1`) and should still be treated as placeholders that readers must adapt to their own partition layout.
