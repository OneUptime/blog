# Validation Summary: How to Upgrade Ubuntu Server Using do-release-upgrade

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server (release upgrades)
- `do-release-upgrade` / ubuntu-release-upgrader
- `update-manager-core` package
- apt / dpkg package management
- ufw firewall
- tmux / screen terminal multiplexers
- SSH (backup sshd on port 1022)
- `/etc/update-manager/release-upgrades` configuration

## Sources Consulted
- do-release-upgrade manpage (Noble): https://manpages.ubuntu.com/manpages/noble/man8/do-release-upgrade.8.html
- do-release-upgrade manpage (Jammy): https://manpages.ubuntu.com/manpages/jammy/man8/do-release-upgrade.8.html
- Ubuntu Community Upgrades wiki: https://help.ubuntu.com/community/Upgrades
- DebuggingUpdateManager — Ubuntu Wiki: https://wiki.ubuntu.com/DebuggingUpdateManager
- Launchpad bug 1399914 (sshd port 1022 / _sshMagic): https://bugs.launchpad.net/ubuntu/+source/ubuntu-release-upgrader/+bug/1399914
- Launchpad bug 1944475 (DistUpgradeViewNonInteractive)
- Launchpad bug 1888916 (sources.list.distUpgrade restore)

## Issues Found
1. **Backup SSH port 1022 framing was incorrect.** The original heading "Running with a Non-Standard SSH Port" and prose implied the backup sshd on port 1022 is only opened when SSH runs on a non-default port. In reality, `do-release-upgrade` opens the backup sshd whenever it detects it is being run over an SSH session (via the `_sshMagic()` logic in `DistUpgradeController.py`), regardless of the primary SSH port. Updated the heading to "Running Over SSH" and corrected the explanation.

2. **Incorrect live log path.** The "Monitoring Download Progress" section referenced `/tmp/dist-upgrade/apt.log` as the live log location during the upgrade. The upgrader writes live logs to `/var/log/dist-upgrade/` throughout the upgrade (not `/tmp/dist-upgrade/`). Updated the command to `tail -f /var/log/dist-upgrade/apt.log` and corrected the surrounding comment.

## Review Notes
- All command-line flags verified against the current manpage: `-d`, `-m server|desktop`, `--allow-third-party`, `--frontend=DistUpgradeViewNonInteractive`, `--check-dist-upgrade-only`, `--quiet`.
- The `/etc/update-manager/release-upgrades` `Prompt=` values (`never`, `normal`, `lts`) are correct.
- Sources backup extension `.distUpgrade` is correct.
- The package name `update-manager-core` is correct for Ubuntu Server.
- The configuration-file prompt text shown (`Y/I/N/O/D/Z` options) matches dpkg's actual prompt format.
- The dependency repair commands (`dpkg --configure -a`, `apt --fix-broken install`, `apt -f install`, `apt dist-upgrade`) are all valid and appropriate for the failure scenarios described.
- Codename example `jammy -> noble` (22.04 LTS to 24.04 LTS) is accurate.
