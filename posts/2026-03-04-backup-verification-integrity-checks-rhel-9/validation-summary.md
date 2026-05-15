# Validation Summary: How to Configure Backup Verification and Integrity Checks on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Bash scripting
- GNU tar
- GNU gzip
- GNU coreutils sha256sum, stat, du, wc
- rsync
- cron
- mail/mailx-style alerting

## Sources Consulted
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- GNU gzip manual: https://www.gnu.org/s/gzip/manual/gzip.html
- GNU coreutils sha256sum documentation: https://www.gnu.org/software/coreutils/sha256sum
- GNU coreutils stat documentation: https://www.gnu.org/software/coreutils/stat
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- Linux crontab(5) manual: https://man7.org/linux/man-pages/man5/crontab.5.html
- Local command help/man pages for tar, gzip, sha256sum, stat, rsync, and crontab in the review environment.

## Issues Found
- The checksum generation example used `sha256sum *.tar.gz` without handling an empty directory. In Bash, an unmatched glob remains literal by default, so this could log an error and still leave an empty checksum file. I changed the function to enable `nullglob`, check whether any `.tar.gz` archives exist, and pass the matched filenames as an array.
- The restore test extracted the archive but did not check whether `tar -xzf` succeeded before continuing with file checks. I wrapped the extraction in an `if ! tar ...` block that logs the restore failure, cleans up the temporary restore directory, and exits non-zero.
- The rsync verification example claimed to count differences, but `grep -c "^"` counted every output line, including non-difference status lines from verbose rsync output. I changed the command from verbose dry-run output to itemized dry-run checksum output (`rsync -ainc`) and count only itemized change lines.

## Review Notes
- The command options used for `gzip -t`, `tar -tzf`, `tar -xzf`, `sha256sum --check`, `stat -c %s`, `rsync --checksum`, `rsync --dry-run`, `rsync --itemize-changes`, and the cron schedules are valid.
- The alerting examples assume a working local mail command and mail transport configuration, which is operationally environment-specific but not technically incorrect.
