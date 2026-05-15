# Validation Summary: How to Use rsync for Incremental Backups on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- rsync
- GNU tar
- cron
- ReaR
- LVM snapshots
- dd

## Sources Consulted
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- Linux crontab(5) manual: https://man7.org/linux/man-pages/man5/crontab.5.html
- Red Hat documentation on ReaR and backup tooling: https://docs.redhat.com/
- Local command help output for `rsync --help` and `tar --help`

## Issues Found
- The rsync example was described as an "incremental backup", but the command creates an incrementally updated mirror at `/backups/latest/` and does not retain historical versions by itself. Changed the wording to "incrementally updated backup mirror" to accurately describe the behavior.
- The tar verification command used `/backups/full-backup-*.tar.gz` directly as the archive argument. If more than one backup archive exists, GNU tar treats the first match as the archive and the remaining matches as member names, which can fail or produce misleading results. Changed the example to select one latest archive first.
- The tar restore command had the same multi-match archive glob issue and also assumed `/tmp/restore-test` already existed. Changed the example to select the latest archive and create the restore directory before extraction.

## Review Notes
The rsync flags `-aAXv` and `--delete`, the tar create/list/extract options, and the `/etc/cron.d` entry format are technically valid. Future improvements could show a snapshot-style rsync backup using `--link-dest` if the article intends to retain multiple historical backup points.
