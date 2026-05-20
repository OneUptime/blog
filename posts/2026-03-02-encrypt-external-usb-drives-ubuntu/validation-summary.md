# Validation Summary: How to Encrypt External USB Drives on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- LUKS and LUKS2
- cryptsetup
- GNU Parted
- Linux block device tools
- ext4 and exFAT filesystems
- OpenSSL
- VeraCrypt, LibreCrypt, Disk Decipher, and LUKSbox cross-platform access tools

## Sources Consulted
- cryptsetup(8) Linux manual page: https://man7.org/linux/man-pages/man8/cryptsetup.8.html
- cryptsetup-luksAddKey(8) Linux manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksAddKey.8.html
- cryptsetup-luksDump(8) Linux manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksDump.8.html
- cryptsetup-luksHeaderBackup(8) Linux manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksHeaderBackup.8.html
- VeraCrypt official documentation: https://veracrypt.io/en/Documentation.html
- VeraCrypt supported operating systems: https://www.veracrypt.jp/en/Supported%20Operating%20Systems.html
- LibreCrypt project documentation: https://github.com/t-d-k/LibreCrypt
- Disk Decipher support documentation: https://disk-decipher.app/faq/
- LUKSbox macOS installation documentation: https://luksbox.penthertz.com/docs/getting-started/install-macos/
- Local command help output for `lsblk`, `parted`, `openssl enc`, and `mkfs.ext4`

## Issues Found
- The `dmesg | tail -20` command may fail on current Ubuntu systems where kernel log access is restricted. Changed it to `sudo dmesg | tail -20`.
- The opening command only showed `/dev/sdb`, even though the post also teaches partition-level encryption. Added a note to use `/dev/sdb1` when the partition method was used.
- The mount instructions used `chown` after mounting, which is appropriate for ext4 but not for exFAT ownership behavior. Clarified the ext4 case and added an exFAT mount option using `uid` and `gid`.
- The LUKS keyslot claim said "8 key slots by default (32 with LUKS2)". Updated it to reflect the documented LUKS1 and LUKS2 limits and the dependency on keyslot area and key size.
- The `luksDump | grep "Key Slot"` example matched old LUKS1-style output and would miss LUKS2 keyslot output. Updated the grep pattern for LUKS2 keyslot listings.
- The key-file example created `/etc/luks-keys/usb.key` before creating `/etc/luks-keys`. Reordered the commands so the directory exists first.
- The `luksDump | grep -E "Cipher|Key-Size"` example could miss LUKS2 fields because the output uses lowercase `cipher` and `Key:` fields. Updated the grep pattern.
- The Windows cross-platform section incorrectly said VeraCrypt can read LUKS2 volumes. Updated it to state that VeraCrypt uses its own format and that LibreCrypt LUKS support is limited and dated.
- The macOS cross-platform section overstated cryptsetup/macFUSE handling. Updated it to mention dedicated tools with variable compatibility.
- The performance benchmark comment said `cryptsetup benchmark` benchmarks encryption on the drive. Updated it to clarify that it benchmarks cryptographic algorithms on the system.

## Review Notes
The core LUKS workflow and cryptsetup commands are technically sound. Users should still substitute the actual LUKS device path consistently (`/dev/sdb` for whole-device encryption or `/dev/sdb1` for partition encryption), and cross-platform access remains the weakest part of a LUKS-based removable-drive workflow.
