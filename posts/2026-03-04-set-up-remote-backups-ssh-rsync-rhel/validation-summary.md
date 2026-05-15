# Validation Summary: How to Set Up Remote Backups Over SSH with rsync on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- rsync
- rrsync
- OpenSSH
- SSH public key authentication
- cron
- Bash scripting

## Sources Consulted
- rsync manual page: https://man7.org/linux/man-pages/man1/rsync.1.html
- rrsync manual page: https://download.samba.org/pub/rsync/rrsync.1
- OpenSSH ssh-keygen manual page: https://man.openbsd.org/ssh-keygen.1
- OpenSSH sshd authorized_keys manual page: https://man.openbsd.org/sshd.8#AUTHORIZED_KEYS_FILE_FORMAT
- Red Hat Enterprise Linux 7 system task automation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- Red Hat Enterprise Linux 9 package notes listing rsync-rrsync: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf

## Issues Found
- The backup script used `StrictHostKeyChecking=no`, which bypasses SSH host key verification. Changed it to `BatchMode=yes` so scheduled jobs fail non-interactively while preserving normal host key checking.
- The `authorized_keys` forced command used `rrsync` without a full path. Changed it to `/usr/bin/rrsync` so OpenSSH runs the intended restricted command predictably.
- The rrsync install instructions said rrsync is included with rsync and copied it from `/usr/share/doc/rsync/support/rrsync`. Current RHEL package notes list `rsync-rrsync` separately, so the instructions now install `rsync-rrsync` with `dnf`.
- The cron example appended directly to `/var/spool/cron/root`. Changed it to install the entry through `crontab`, which matches documented cron management behavior and avoids direct spool-file editing.

## Review Notes
The rsync command syntax, `-e` remote shell usage, `--delete`, archive/compression options, SSH key generation command, `ssh-copy-id` usage, and `--bwlimit=10000` explanation are technically valid. The examples assume the remote backup directory exists and that the backup user has appropriate write permissions.
