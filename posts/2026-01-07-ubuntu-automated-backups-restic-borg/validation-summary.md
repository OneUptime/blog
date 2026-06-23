# Validation Summary: How to Set Up Automated Backups on Ubuntu with restic/borg

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Ubuntu
- Linux shell scripting
- restic
- BorgBackup
- systemd services and timers
- SSH remote backup access and SFTP repositories for restic
- S3-compatible storage and Backblaze B2
- rclone mounts
- Prometheus textfile metrics
- healthchecks.io-style monitoring callbacks

## Sources Consulted
- restic documentation: Preparing a new repository, password options, repository versions, and SFTP syntax: https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- restic documentation: Backup excludes and pattern syntax: https://restic.readthedocs.io/en/stable/040_backup.html
- restic documentation: Restore semantics for `--path` and `--include`: https://restic.readthedocs.io/en/stable/050_restore.html
- restic documentation: Forget, retention, pruning, and dry-run behavior: https://restic.readthedocs.io/en/stable/060_forget.html
- restic reference documentation: repository encryption and authentication: https://restic.readthedocs.io/en/latest/100_references.html
- BorgBackup documentation: `borg init` encryption modes: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- BorgBackup documentation: include/exclude and pattern-file syntax: https://borgbackup.readthedocs.io/en/stable/usage/help.html
- BorgBackup documentation: `borg create` options: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- BorgBackup documentation: `borg prune`, `--glob-archives`, and compaction requirement: https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- BorgBackup documentation: `borg check` repository and archive verification: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- BorgBackup documentation: `borg compact --threshold`: https://borgbackup.readthedocs.io/en/stable/usage/compact.html
- BorgBackup documentation: `borg extract` restore location behavior: https://borgbackup.readthedocs.io/en/stable/usage/extract.html
- systemd.exec documentation for `ProtectSystem`, `ReadWritePaths`, `PrivateTmp`, `NoNewPrivileges`, and `IOSchedulingClass`: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.timer documentation for calendar timers, randomized delays, and persistent timers: https://www.freedesktop.org/software/systemd/man/systemd.timer.html

## Issues Found
- Corrected the Borg backend comparison from "SSH/SFTP (native)" to native SSH and local filesystem support, with rclone mounts as an external option. Borg's native remote transport is over SSH, not SFTP.
- Fixed the Borg patterns file. The original mixed up `P`, `R`, and regex syntax, and used pattern lines without include/exclude actions under `--patterns-from`. The file now uses Borg pattern-file exclude actions and `re:` for regex patterns.
- Updated the Borg remote section heading from "SSH/SFTP" to "SSH" to avoid implying native SFTP repository access.
- Added `RESTIC_CACHE_DIR=/var/cache/restic`, created that directory, and allowed it in the systemd unit. With `ProtectSystem=strict`, restic's default cache path may otherwise be read-only.
- Changed the restic unit's `/backup` write allowance to `-/backup` so the service does not fail on S3-only setups where `/backup` does not exist.
- Fixed the Borg backup script's `set -e` behavior. The script intended to collect exit codes from `borg create`, `borg prune`, `borg compact`, and `borg check`, but `set -e` would exit before those variables were assigned. It now keeps `set -uo pipefail` and captures command status explicitly.
- Added `--glob-archives "$(hostname)-*"` to the automated Borg prune command so multi-host repositories are not pruned globally.
- Replaced deprecated `borg prune --prefix` usage with `--glob-archives`.
- Fixed a restic retention example where inline comments after backslash continuations would break the shell command.
- Clarified `borg compact --threshold 10`; 10 is the default threshold, not a special "more than 10%" mode users must set manually.
- Corrected a restic restore comment. `--path` selects the snapshot for `latest`; it does not rewrite restored paths.
- Quoted the log file path in the email notification script's `tail` command.
- Fixed the Prometheus metrics script to set `RESTIC_REPOSITORY` and `RESTIC_PASSWORD_FILE`, create the textfile directory, and truncate the temp file before appending metrics.
- Corrected the restic upload limit example to use `5120` KiB/s for a 5 MiB/s limit.
- Changed the conclusion's encryption wording to say both tools provide strong encryption when configured as shown, rather than "by default."

## Review Notes
- Borg 2.x has substantial CLI and repository changes compared with Borg 1.4.x. The examples align with current stable Borg 1.4 documentation; future updates should revisit Borg 2.x once it is the normal packaged version on Ubuntu.
- Using Borg on rclone-mounted object storage can work, but it depends heavily on the mount's filesystem semantics, locking, and reliability. For production cloud object storage, restic's native backends are usually the simpler fit.
