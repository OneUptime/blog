# Validation Summary: How to Set Up LUKS Key Files for Automated Decryption on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- LUKS (Linux Unified Key Setup) — both LUKS1 and LUKS2
- cryptsetup CLI
- `/etc/crypttab` (Debian/Ubuntu cryptsetup and systemd-cryptsetup)
- `passdev` keyscript (`cryptsetup-initramfs`)
- initramfs / `update-initramfs`
- Ubuntu (20.04+)
- `dd`, `gpg`, `blkid`, `lsblk`, `mkfs.ext4`, `journalctl`

## Sources Consulted
- Debian crypttab(5): https://manpages.debian.org/bookworm/cryptsetup/crypttab.5.en.html
- Debian cryptsetup README.initramfs: https://cryptsetup-team.pages.debian.net/cryptsetup/README.initramfs.html
- Debian cryptsetup README.Debian: https://cryptsetup-team.pages.debian.net/cryptsetup/README.Debian.html
- systemd crypttab(5): https://www.freedesktop.org/software/systemd/man/crypttab.html
- cryptsetup man pages (luksDump, luksAddKey, luksOpen, luksKillSlot, --test-passphrase)
- Launchpad bug 2031179 (systemd-cryptsetup-generator does not parse `:` syntax)
- Launchpad bug 1332518 / Debian bug 502598 (passdev timeout behavior)

## Issues Found

1. **USB key file crypttab entry was incorrect.** The original entry used:
   ```
   cryptroot   UUID=root-luks-uuid   /dev/disk/by-uuid/usb-uuid-here:/luks-keyfile   luks,keyfile-timeout=10
   ```
   Two problems:
   - The `device:/path` syntax in the third field is **not** natively supported by either Debian/Ubuntu cryptsetup or systemd-cryptsetup — it is only parsed by the `passdev` keyscript from the `cryptsetup-initramfs` package. Without `keyscript=passdev`, cryptsetup tries to read a literal file at that path and fails.
   - `keyfile-timeout=` is a systemd-cryptsetup option that only applies when the third field is a literal file path; it does not control the passdev timeout. The passdev timeout must be appended to the third field as `:SECONDS`.

   Fixed the entry to:
   ```
   cryptroot   UUID=root-luks-uuid   /dev/disk/by-uuid/usb-uuid-here:/luks-keyfile:10   luks,keyscript=passdev,tries=1,initramfs
   ```
   and updated the explanation to describe what `passdev` actually does, why `initramfs` is needed for the root volume, and why `tries=1` is recommended (per the Debian cryptsetup README).

## Review Notes
- The `cryptsetup luksDump | grep -E "Key Slot|ENABLED|DISABLED"` filter matches the LUKS1 dump format (`Key Slot 0: ENABLED`). LUKS2 prints a `Keyslots:` section header with differently formatted entries, so this filter shows less detail on LUKS2. Not incorrect, just less useful than on LUKS1.
- The `cryptsetup --key-file ... luksOpen /dev/sda3 test --test-passphrase` invocation passes a name (`test`) that is ignored when `--test-passphrase` is set — cryptsetup accepts this without error, but the name is redundant.
- Slot counts are correct: LUKS1 has 8 slots, LUKS2 has 32.
- The `dd if=/dev/urandom bs=512 count=8` command correctly produces a 4096-byte keyfile.
- Permission guidance (`chmod 400`, root:root ownership), the recovery-passphrase warning, and the `luksKillSlot` revocation procedure are all accurate.
- The `passdev`-based approach only works for devices opened from initramfs. For data volumes opened later by systemd-cryptsetup, a different approach (mounting the USB first via fstab, then referencing a literal path) would be needed — out of scope for the post but worth keeping in mind.
