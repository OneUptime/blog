# Validation Summary: How to Set Up udisks2 for Disk Management on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- udisks2 / udisksctl (D-Bus storage service)
- Ubuntu (apt, systemd)
- polkit (authorization rules)
- udev (device events)
- D-Bus (Python `dbus` bindings, `gdbus`)
- smartmontools (`smartctl`)
- mkfs.ext4 / mkfs.vfat / mkfs.ntfs (filesystem creation)
- rsync, lsblk, blkid

## Sources Consulted
- Live `udisksctl COMMAND --help` output from `udisks2` package version 2.10.1-6ubuntu1.3 (Ubuntu)
- `man udisksctl-smart-simulate(1)` / upstream udisks documentation: https://storaged.org/doc/udisks2-api/latest/
- udisks2 D-Bus API reference (`org.freedesktop.UDisks2.Block.Format`, `org.freedesktop.UDisks2.Drive` properties): https://storaged.org/doc/udisks2-api/latest/gdbus-org.freedesktop.UDisks2.Block.html
- polkit reference for `polkit.addRule` and action IDs: https://www.freedesktop.org/software/polkit/docs/latest/
- mkfs.ext4(8), mkfs.vfat(8), mkfs.ntfs(8) man pages

## Issues Found
1. **`udisksctl --version` does not exist.** The tool errors with ``Unknown command `--version'`` (verified live). Replaced with `dpkg -s udisks2 | grep -i version` and `udisksctl help`.
2. **`udisksctl smart-simulate` was used as a "check SMART data" command in two places.** The subcommand actually *sets* (loads) a fake libatasmart blob from a file for testing — it is not a way to read live SMART data, and requires `-f FILE`. Replaced both instances with `udisksctl info -b /dev/sda | grep -i smart` (for the cached SMART summary udisks2 surfaces) and `sudo smartctl -a /dev/sda` (for full attribute output). Added a brief explanatory comment about what `smart-simulate` actually does.
3. **`udisksctl format` subcommand does not exist.** Verified against udisks2 2.10.1: the command list does not include `format`, and upstream udisks does not ship a `format` CLI subcommand. The original `udisksctl format /dev/sdb1 -t ext4 --no-user-interaction -- -L "DataDisk"` would fail with `Unknown command \`format'`. Rewrote the section to use the standard `mkfs.ext4`, `mkfs.vfat -F 32`, and `mkfs.ntfs` tools (preceded by `udisksctl unmount`), and added an optional `gdbus call` example invoking the real `org.freedesktop.UDisks2.Block.Format` D-Bus method for readers who want polkit-governed formatting through udisks2.
4. **Misleading mount comment about NFS.** The example was `udisksctl mount -b /dev/sdc1 -t ext4` but labeled "Mount an NFS or other special filesystem type". NFS is not a block device and is not mountable via `udisksctl`. Rewrote the comment to "Force a specific filesystem type instead of auto-detect", which matches what the command actually does.
5. **Tweaked the SMART-status claim under `udisksctl info`** to "(where ATA SMART is supported)", since the SMART block only appears for drives that expose `org.freedesktop.UDisks2.Drive.Ata`.

## Review Notes
- `udisksctl unmount --force` (`-f`) is valid and was verified live.
- `udisksctl mount -o ro` and `-t TYPE` are valid (verified via `--help`).
- The polkit rule's `action.id.indexOf("org.freedesktop.udisks2") == 0` uses the correct lowercase action-ID prefix (`org.freedesktop.udisks2.filesystem-mount`, etc.). Note: the JS engine inside polkit only supports a limited subset of EcmaScript, but `indexOf` is supported.
- The Python D-Bus example uses property names that match the published `org.freedesktop.UDisks2.Drive` interface (`Model`, `Serial`, `Size`, `Removable`, `RotationRate`).
- The udev rule's `RUN+="…/backup-to-usb.sh"` will run the script synchronously within the udev event handler; udev kills long-running processes (default ~180s timeout). Fine for the example shown, but for production backups it is better to dispatch a systemd unit (e.g. `RUN+="/bin/systemctl --no-block start backup-to-usb.service"`). Left as-is since it matches the post's stated scope.
- `${DEVICE%[0-9]}` for deriving the parent drive only works for `sdX1` style names; it breaks on NVMe (`/dev/nvme0n1p1` → `/dev/nvme0n1p`). Left unchanged since the example explicitly targets `sda`/`sdb` USB devices.
- `udisksctl loop-setup -f FILE` returns the loop device path on stdout, as the post states (verified via `--help`).
