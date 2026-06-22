# Validation Summary: How to Use Timeshift for System Snapshots on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Timeshift
- rsync snapshots
- Btrfs snapshots and subvolumes
- GRUB and grub-btrfs
- Bash scripting
- cron-based scheduling

## Sources Consulted
- Ubuntu Timeshift 24.01.1 manpage: https://manpages.ubuntu.com/manpages/noble/man1/timeshift.1.html
- Linux Mint Timeshift upstream repository: https://github.com/linuxmint/timeshift
- Timeshift restoring snapshots documentation: https://github.com/teejee2008/timeshift/wiki/Restoring-Snapshots
- grub-btrfs upstream documentation: https://github.com/Antynea/grub-btrfs
- Local Ubuntu package metadata for `timeshift` on Ubuntu 24.04/Noble via `apt-cache policy timeshift` and `apt-cache show timeshift`

## Issues Found
- The installation section showed `Timeshift v22.11.1` as the expected version. Ubuntu 24.04/Noble currently packages Timeshift 24.01.1, so the example output was updated.
- The post recommended the older `ppa:teejee2008/timeshift` PPA for the latest release. Timeshift is now maintained under the Linux Mint repository, so the section was changed to recommend Ubuntu packages for most users and point advanced users to the upstream source repository.
- Live USB restore examples used `--target /mnt`. The Timeshift CLI expects a target device or UUID for `--target` / `--target-device`, not a mount path, so examples were changed to use `/dev/sda2` after identifying partitions with `lsblk -f`.
- Several examples assumed Timeshift always mounts snapshots at `/run/timeshift/backup`. Newer Timeshift versions may use a per-process path such as `/run/timeshift/<pid>/backup`, so path examples and monitoring scripts were made more robust.
- The grub-btrfs installation command used `sudo apt install grub-btrfs`, but Ubuntu does not provide that package in the standard repositories. The section now notes this and points to the upstream manual installation flow.
- The RSYNC GRUB recovery example implied a custom GRUB entry could point directly at an rsync snapshot. That is not a supported recovery path, so it now directs readers to restore via Timeshift or a Live USB.
- The advanced command example included an unsupported `--clone` option. It was removed and the example now uses the documented `--target-device` restore option.
- The pre-upgrade Bash script used `set -e` with a later `$?` check, which would prevent the failure branch from running. The script now tests the `timeshift --create` command directly in an `if` statement.
- Troubleshooting and diagnostic snippets used `journalctl -u timeshift`, but scheduled Timeshift runs are cron-driven rather than a persistent `timeshift.service`. The snippets now search the journal for Timeshift entries instead of querying a non-existent unit.
- The troubleshooting section suggested manually mounting the snapshot device at `/run/timeshift/backup`. This can conflict with Timeshift's own mount handling, so it was replaced with `sudo timeshift --list-devices` and GUI reconfiguration.

## Review Notes
The post is technically relevant and now aligns with the documented Timeshift CLI options for Ubuntu's packaged version. Some configuration JSON examples remain illustrative rather than a complete generated `timeshift.json`; future updates could mention that users should prefer the GUI or Timeshift commands for routine configuration changes.
