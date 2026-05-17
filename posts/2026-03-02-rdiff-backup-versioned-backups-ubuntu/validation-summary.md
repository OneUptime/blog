# Validation Summary: How to Configure rdiff-backup for Versioned Backups on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- rdiff-backup (1.x legacy CLI and 2.x compatibility CLI)
- Ubuntu (20.04, 22.04+)
- SSH (for remote backups)
- Bash scripting
- cron (for scheduling)
- rsync (referenced for comparison/restore)

## Sources Consulted
- [rdiff-backup official man page (current)](https://rdiff-backup.net/rdiff-backup.1.html)
- [rdiff-backup migration guide (legacy → new CLI)](https://rdiff-backup.net/migration.html)
- [rdiff-backup examples](https://rdiff-backup.net/examples.html)
- [Ubuntu Noble manpage for rdiff-backup](https://manpages.ubuntu.com/manpages/noble/man1/rdiff-backup.1.html)
- [Debian buster manpage for rdiff-backup 1.x](https://manpages.debian.org/buster/rdiff-backup/rdiff-backup.1.en.html)
- [rdiff-backup nongnu mirror documentation](https://rdiff-backup.nongnu.org/rdiff-backup.1.html)
- [rdiff-backup GitHub repository](https://github.com/rdiff-backup/rdiff-backup)

## Issues Found

1. **`--test` flag mis-described as a dry-run for `--remove-older-than`** (was at line ~184).
   The post showed `rdiff-backup --remove-older-than 30D --test /mnt/backup/rdiff-home` as a "preview / dry run". This is incorrect — `--test` does not exist as a standalone option, and the closest match `--test-server` is for verifying connectivity to a remote rdiff-backup server, not for previewing increment removal. rdiff-backup's legacy CLI has no dry-run mode for `--remove-older-than`; the recommended approach is to inspect increments first with `--list-increment-sizes`. Replaced the incorrect command with `--list-increment-sizes` and added a note about the `--force` flag, which is the real safeguard (rdiff-backup removes only a single matching session by default unless `--force` is passed).

2. **`--list-session-statistics` is not a valid rdiff-backup option** (was at line ~269).
   Neither the 1.x nor the 2.x man pages document any `--list-session-statistics` flag. rdiff-backup stores per-session statistics as files named `session_statistics.<timestamp>.data` inside the `rdiff-backup-data` subdirectory of the backup repository. Replaced the invalid command with a shell snippet that locates and prints the most recent statistics file, and clarified that `--print-statistics` (already used in the automated script) is the corresponding flag for live output during a backup run.

## Review Notes

- The post uses the legacy/compatibility CLI throughout (`--restore-as-of`, `--remove-older-than`, `--verify`, `--compare`, `--compare-at-time`, `--list-increments`, `--list-increment-sizes`, `--list-changed-since`, `--check-destination-dir`, `--exclude-globbing-filelist`, `--remote-schema`, `--print-statistics`, `-v5`). All of these are still accepted by rdiff-backup 2.x as of writing, but they are formally deprecated starting in 2.1+. The new CLI is action-based (`rdiff-backup backup`, `rdiff-backup restore --at`, `rdiff-backup remove increments --older-than`, `rdiff-backup verify`, `rdiff-backup compare`, `rdiff-backup regress`, `rdiff-backup list increments [--size]`, `rdiff-backup list files --changed-since`). A future revision of this post could migrate the examples to the new CLI, especially as it will be required in rdiff-backup 3.0.
- The `sudo pip3 install rdiff-backup` instruction is correct for Ubuntu 20.04, but on Ubuntu 23.04+ (and on 22.04 with newer pip) PEP 668 makes this fail with an "externally-managed-environment" error. A `pipx install rdiff-backup` or a virtualenv-based install would be a more durable recommendation for newer Ubuntu releases, though that's beyond a strict technical-correctness fix.
- The time-interval format described (`s`, `m`, `h`, `D`, `W`, `M`, `Y`) is accurate; both `--restore-as-of` and `--remove-older-than` accept these.
- The `--remote-schema 'ssh -p 2222 -i /root/.ssh/backup_key %s rdiff-backup --server'` example is correct: `%s` is substituted with the remote host, and `--server` is the correct mode for the remote rdiff-backup process.
- The note that both ends must run the same major version of rdiff-backup is correct and is a well-known gotcha (especially across the 1.x → 2.x boundary).
- The "Force unlock the repository" troubleshooting tip using `--check-destination-dir` is correct — this is the legacy name for what's now the `regress` action in the new CLI, and it does undo a failed in-progress backup session.
