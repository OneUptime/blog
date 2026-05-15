# Validation Summary: How to Set Up Cross-Site RHEL 9 Replication for Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU tar
- rsync over SSH
- cron
- ReaR
- LVM snapshots
- dd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Recovering and restoring a system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- GNU tar manual, "Excluding Some Files": https://www.gnu.org/software/tar/manual/tar.html
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- Local GNU tar help output (`tar --help`) for create, list, extract, gzip, file, directory, and exclude options.
- Local rsync help output (`rsync --help`) for `--archive`, `--acls`, `--xattrs`, `--delete`, remote-shell destinations, and `--exclude`.

## Issues Found
- The rsync example was labeled as incremental backup in a cross-site disaster recovery guide but copied to a local `/backups/latest/` path. I changed it to an SSH-based remote destination (`backupuser@dr.example.com:/backups/latest/`) so the command actually demonstrates cross-site replication.
- The rsync `--exclude` options were placed after the source and destination. I moved them before the operands to match standard rsync usage and avoid ambiguity.
- The rsync verification command listed a local backup directory. I changed it to run `ls` on the remote DR host over SSH.

## Review Notes
The tar examples are syntactically valid for full local archive backups, and the cron entry uses the system crontab format with a user field. For a production disaster recovery plan, a future revision could add database-aware backup steps, restore drills for full systems, and explicit guidance for securing SSH keys and backup retention.
