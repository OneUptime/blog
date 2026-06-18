# Validation Summary: How to Implement Borg for Incremental Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BorgBackup
- Linux shell scripting
- SSH authorized_keys restrictions
- cron
- systemd services and timers
- Backup compression, encryption, pruning, restore, and integrity-check workflows

## Sources Consulted
- BorgBackup stable documentation: borg init: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- BorgBackup stable documentation: borg create: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- BorgBackup stable documentation: borg extract: https://borgbackup.readthedocs.io/en/stable/usage/extract.html
- BorgBackup stable documentation: borg list: https://borgbackup.readthedocs.io/en/stable/usage/list.html
- BorgBackup stable documentation: borg prune: https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- BorgBackup stable documentation: borg delete: https://borgbackup.readthedocs.io/en/stable/usage/delete.html
- BorgBackup stable documentation: borg compact: https://borgbackup.readthedocs.io/en/stable/usage/compact.html
- BorgBackup stable documentation: borg check: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- BorgBackup stable documentation: borg mount: https://borgbackup.readthedocs.io/en/stable/usage/mount.html
- BorgBackup stable documentation: borg serve: https://borgbackup.readthedocs.io/en/stable/usage/serve.html
- BorgBackup stable documentation: compression help: https://borgbackup.readthedocs.io/en/stable/usage/help.html#borg-help-compression
- BorgBackup stable documentation: append-only mode notes: https://borgbackup.readthedocs.io/en/stable/usage/notes.html#append-only-mode-forbid-compaction
- GNU coreutils date command, used locally to verify sample weekdays for January 2026.

## Issues Found
- The sample output listed January 25, 2026 as Saturday, but that date is Sunday. Updated the sample start and end timestamps.
- The archive-listing sample weekdays for January 20-22, 2026 were incorrect. Updated them to Tuesday, Wednesday, and Thursday.
- The compression section described LZ4 as "moderate compression" and zstd as "recommended default." Borg documents LZ4 as the default with very high speed and low compression, while zstd is an optional modern compression choice. Updated the wording to avoid implying that zstd is Borg's default.
- The append-only section said clients cannot delete or prune existing archives. Borg's documentation says delete and prune commands are still allowed in append-only mode, but committed repository segment data is not physically removed while append-only protections apply. Updated the explanation and administrative guidance.
- The conclusion claimed a later backup "takes almost as long as your first." Borg's file cache can avoid reprocessing unchanged files, while deduplication primarily reduces data added to the repository. Updated the sentence to focus on reduced added data.

## Review Notes
Borg was not installed in the local environment, so command behavior was verified against official BorgBackup documentation rather than local `borg --help` output. The examples use Borg 1.x syntax; Borg 2.x is still a separate compatibility line and was not treated as the target for this post.
