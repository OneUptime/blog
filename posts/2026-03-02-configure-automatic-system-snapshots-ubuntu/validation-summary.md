# Validation Summary: How to Configure Automatic System Snapshots on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Timeshift
- rsync snapshots
- Btrfs snapshots
- cron
- APT/dpkg hooks
- JSON configuration
- Bash scripting

## Sources Consulted
- Timeshift upstream README: https://github.com/linuxmint/timeshift
- Timeshift 24.01.1 CLI man page from the Ubuntu Noble package (`timeshift_24.01.1-1build2_amd64.deb`)
- Timeshift upstream source for configuration and cron behavior: https://github.com/linuxmint/timeshift/blob/master/src/Core/Main.vala
- Timeshift upstream source for CLI options: https://github.com/linuxmint/timeshift/blob/master/src/AppConsole.vala
- Ubuntu package metadata for Timeshift 24.01.1-1build2: https://packages.ubuntu.com/noble/timeshift
- Debian/Ubuntu `apt.conf(5)` documentation for `DPkg::Pre-Invoke`: https://manpages.debian.org/bookworm/apt/apt.conf.5.en.html

## Issues Found
- The post used `sudo timeshift --setup`, but Timeshift 24.01.1 does not provide a `--setup` CLI option. Replaced it with `sudo timeshift-gtk` for the graphical setup wizard and clarified that servers can edit `/etc/timeshift/timeshift.json` directly.
- The example configuration included `btrfs_use_qgroup`, which is not a saved Timeshift configuration key in the current source. Removed it and added the current `include_btrfs_home_for_restore` key.
- The scheduling explanation referred to a daemon. Timeshift manages scheduled snapshots through cron files, so the wording was corrected.
- The manual cron section suggested `timeshift --delete-all --scripted` to keep only the last five daily snapshots. That command deletes all snapshots. Replaced it with a note that retention is controlled by Timeshift's `count_*` settings.
- The monitoring script used `grep -c "^[0-9]"`, but Timeshift list output is normally indented, so it could count zero snapshots. Updated the regex to match optional leading whitespace.

## Review Notes
The APT hook is technically valid, but tagging every dpkg invocation as `O` creates one-off snapshots that are not automatically removed by Timeshift retention. That can consume storage quickly on systems with frequent package changes.
