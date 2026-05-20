# Validation Summary: How to Use BorgBackup for Deduplicated Backups on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- BorgBackup
- Borg repository encryption
- Borg archive creation, listing, extraction, pruning, compaction, and checks
- Bash scripting
- systemd services and timers

## Sources Consulted
- BorgBackup 1.4.4 Installation documentation: https://borgbackup.readthedocs.io/en/stable/installation.html
- BorgBackup 1.4.4 `borg init` documentation: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- BorgBackup 1.4.4 `borg create` documentation: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- BorgBackup 1.4.4 `borg prune` documentation: https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- BorgBackup 1.4.4 `borg key export` documentation: https://borgbackup.readthedocs.io/en/stable/usage/key.html#borg-key-export
- BorgBackup 1.4.4 `borg check` documentation: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- systemd timer documentation: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The installation intro said the shown commands installed from the official PPA, but the commands used Ubuntu repositories. Changed the wording to say the repository install is the simplest option.
- The pip installation example omitted Borg's documented build dependencies for Debian/Ubuntu source installs and did not include FUSE support even though the post later uses `borg mount`. Added the documented development packages, FUSE 3 packages, pip tooling update, and the `borgbackup[pyfuse3]` extra.
- The pip installation example created `/opt/borg-env` and `/usr/local/bin/borg` without `sudo`, which would usually fail for a non-root shell. Added `sudo` to the commands that write under `/opt` and `/usr/local/bin`.
- The restore example changed into `/tmp/restore` without creating it first. Added `mkdir -p /tmp/restore`.
- The first prune example described a dry run but did not pass `--dry-run`. Added the missing `--dry-run` flag.
- The prune examples used `--prefix`, which is deprecated in current Borg 1.4.4 documentation. Replaced it with `--glob-archives '{hostname}-*'` and `--glob-archives "$(hostname)-*"`.

## Review Notes
- Borg 1.4.4 is the current stable documentation line consulted. Borg 2.0 documentation is still marked as beta/development and uses some different command patterns, so this tutorial remains aligned with stable Borg 1.x usage.
- The script stores the passphrase in a root-readable file later in the post, which is an improvement over putting it directly in the script, but unattended backups still require local secret material. For higher-security deployments, future revisions could discuss `BORG_PASSCOMMAND`, hardware-backed secrets, or Borg append-only remote repositories.
