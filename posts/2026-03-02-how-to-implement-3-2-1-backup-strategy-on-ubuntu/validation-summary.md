# Validation Summary: How to Implement 3-2-1 Backup Strategy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- BorgBackup
- rclone
- SSH
- systemd timers
- cron
- 3-2-1 backup strategy

## Sources Consulted
- BorgBackup documentation: https://borgbackup.readthedocs.io/en/stable/
- BorgBackup init documentation: https://borgbackup.readthedocs.io/en/1.1.18/usage/init.html
- BorgBackup create documentation: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- BorgBackup extract documentation: https://borgbackup.readthedocs.io/en/2.0.0b7/usage/extract.html
- BorgBackup quickstart and automation notes: https://borgbackup.readthedocs.io/en/stable/quickstart.html
- rclone sync documentation: https://rclone.org/commands/rclone_sync/
- rclone global flags documentation: https://rclone.org/docs/
- systemd.timer documentation: https://www.freedesktop.org/software/systemd/man/252/systemd.timer.html

## Issues Found
- The post metadata said the guide used rsync, but the examples use rclone and BorgBackup instead. Updated the tags, description, and introductory wording to reference rclone instead of rsync.
- The local Borg setup used an encrypted repository without providing a consistent passphrase for unattended execution. Added `BORG_PASSPHRASE` to the initialization and backup examples to match BorgBackup's documented automation mechanism.
- The offsite SSH setup created a key in the current user's home directory, while the systemd-run script used `/root/.ssh/backup_key`. Updated the setup commands so the key path matches the root-run service.
- The offsite backup script was not made executable. Added the missing `chmod +x` command.
- The offsite timer had no matching `offsite-backup.service`; by default systemd timers activate the service with the same base name. Added the missing service unit.
- The verification script did not set the SSH transport or Borg passphrase needed to check the encrypted remote repository from cron. Added `BORG_RSH` and `BORG_PASSPHRASE`.
- The restore example used `borg extract --destination`, but Borg's documented `extract` command writes into the current working directory and does not provide that option. Replaced it with `cd /tmp/restore-test` before running `borg extract`.

## Review Notes
- `rclone sync` is technically correct for mirroring the Borg repository, but it deletes destination files that are no longer present locally. Future revisions could mention object locking, bucket versioning, or `rclone copy` depending on the intended retention model.
- The examples use placeholder passphrases inline for clarity. A production setup should load secrets from a root-readable file or secret manager rather than hard-coding them in scripts.
