# Validation Summary: How to Add and Manage LUKS Key Slots on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LUKS and LUKS2 disk encryption
- cryptsetup CLI
- Linux block devices
- Bash scripting
- OpenSSL random key generation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Encrypting block devices using LUKS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/encrypting-block-devices-using-luks_managing-storage-devices
- cryptsetup(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup.8.html
- cryptsetup-luksAddKey(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksAddKey.8.html
- cryptsetup-luksChangeKey(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksChangeKey.8.html
- cryptsetup-luksKillSlot(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksKillSlot.8.html
- cryptsetup-luksRemoveKey(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksRemoveKey.8.html
- cryptsetup-luksDump(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksDump.8.html
- cryptsetup-open(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-open.8.html

## Issues Found
- The quick key-slot summary command used `grep -A2 "Keyslots:"`, which would show only the first couple of lines after the LUKS2 `Keyslots:` header instead of all active slots. Changed it to match LUKS2 slot lines and LUKS1 `Key Slot` lines using a POSIX character class for whitespace.
- The first `luksChangeKey` example was described as changing a specific key slot, but the command did not specify a slot. Updated the comment to describe it as changing a passphrase, and kept the following `--key-slot 0` example for the slot-specific case.
- The emergency recovery key command used `--key-file=-`, which supplies the existing authorizing passphrase from stdin for `luksAddKey`, not the new key material. Changed it to `--new-keyfile=-` so the generated recovery key is added as the new key while cryptsetup can still prompt for an existing passphrase.
- The audit script only matched and extracted LUKS2-style keyslot lines. Updated it to also match and extract LUKS1-style `Key Slot N:` output.

## Review Notes
- The core explanation is correct for RHEL 9: Red Hat documents LUKS as supporting multiple user keys to decrypt a master key, RHEL defaults to LUKS2, and LUKS1 supports eight key slots while LUKS2 supports up to 32.
- `cryptsetup luksOpen` remains accepted as old syntax, while current cryptsetup documentation also shows `cryptsetup open`. The post can keep `luksOpen`, but a future style update could prefer `open`.
