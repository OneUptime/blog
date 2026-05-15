# Validation Summary: How to Set Up Automated Backups with Cron and rsync on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- cron/crond
- rsync
- GNU tar
- Shell scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Red Hat Enterprise Linux 9 Security Hardening documentation, cron example for scheduled AIDE checks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/security_hardening/configuring-applications-to-use-cryptographic-hardware-through-pkcs-11_security-hardening
- Red Hat Enterprise Linux System Administrator's Guide, Automating System Tasks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- Local `rsync --help`, `tar --help`, and `man 5 crontab` output

## Issues Found
- The cron entry ran `/usr/local/bin/backup.sh`, but the post did not create that script. Added a minimal script that creates `/backups/latest`, runs the documented `rsync` backup command, and is made executable before installing the cron entry.
- The backup commands assumed `/backups` already existed. Added `sudo mkdir -p /backups/latest` before creating backups so both the tar destination directory and rsync destination are present.
- The tar verification and restore examples used `/backups/full-backup-*.tar.gz` directly. That can fail or behave incorrectly once multiple matching archives exist because extra expanded filenames are treated as archive members. Updated the examples to select the newest matching archive with `ls -t ... | head -n 1` before running `tar`.
- The restore example assumed `/tmp/restore-test` already existed. Added `mkdir -p /tmp/restore-test` before extraction.

## Review Notes
The corrected commands are syntactically valid for GNU tar, rsync, and system cron syntax. The `rsync -aAX` options preserve archive-mode metadata, ACLs, and extended attributes when supported by the source and destination filesystems. Future improvements could mention remote backup syntax and hard-link preservation with `-H` if exact whole-system metadata preservation is required.
