# Validation Summary: How to Set Up Remote Backups Over SSH with rsync on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- rsync
- SSH/OpenSSH
- GNU tar
- cron/cronie
- ReaR
- LVM snapshots

## Sources Consulted
- Red Hat Enterprise Linux 9 OpenSSH documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/assembly_using-secure-communications-between-two-systems-with-openssh_securing-networks
- Red Hat Enterprise Linux 9 ReaR backup and restore documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- rsync upstream man page: https://download.samba.org/pub/rsync/rsync.1
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- cronie cron man page: https://www.mankier.com/8/cron
- Local RHEL-compatible man/help output for rsync, tar, and crontab behavior.

## Issues Found
- The rsync example used a local destination even though the post describes remote backups over SSH. Changed the example to create the remote destination directory over SSH and sync to `backupuser@backup.example.com:/backups/$(hostname)/latest/` with `-e ssh` and remote `sudo rsync` so ownership, group, ACL, and extended attribute preservation can work for a full-system backup.
- The rsync verification command listed a local directory. Changed it to verify the remote backup directory over SSH with `sudo ls`.
- The tar verification and restore examples used `/backups/full-backup-*.tar.gz`, which can expand to multiple archives and cause GNU tar to treat later paths as member names. Changed the examples to reference the dated archive name created by the backup command.

## Review Notes
The cron example is syntactically valid for an `/etc/cron.d` system crontab entry, but the post assumes that `/usr/local/bin/backup.sh` has already been created and made executable. A future improvement could show the script contents and permissions explicitly.
