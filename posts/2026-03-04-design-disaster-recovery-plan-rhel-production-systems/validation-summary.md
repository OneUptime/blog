# Validation Summary: How to Design a Disaster Recovery Plan for RHEL Production Systems

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Relax-and-Recover (ReaR)
- NFS backup targets
- PostgreSQL physical backups
- rsync
- LVM snapshots
- cron
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Recovering and restoring a system with ReaR: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, LVM snapshots: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- PostgreSQL current documentation: pg_basebackup: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL documentation: File system level backup: https://www.postgresql.org/docs/14/backup-file.html
- Local rsync 3.2.7 help output (`rsync --help`)
- Local GNU tar help output (`tar --help`)

## Issues Found
- The RPO/RTO explanation was marked as a `bash` code block even though it was explanatory text, not shell syntax. Changed the fence to `text`.
- The ReaR exclude configuration used a full array reassignment. Updated it to the documented append form, `BACKUP_PROG_EXCLUDE+=( ... )`, and aligned `NETFS_KEEP_OLD_BACKUP_COPY` with the value shown in Red Hat documentation.
- The PostgreSQL backup example used plain `rsync` against `/var/lib/pgsql/`, which is not a safe backup of a running PostgreSQL cluster. Replaced it with `pg_basebackup` using plain output format and WAL streaming.
- The PostgreSQL restore example restored with rsync while the service state was not explicit. Updated it to stop PostgreSQL first, restore from the latest plain-format base backup, reset ownership, and then start PostgreSQL.
- The LVM section described snapshots as consistent without qualifying application consistency. Updated the wording to explain that LVM snapshots are point-in-time copies and that applications must be quiesced or backed up with application-native tooling for application-consistent backups.
- The LVM backup commands mounted `/mnt/snap` and wrote to `/backup` without ensuring those directories existed. Added `mkdir -p /mnt/snap /backup`.

## Review Notes
The ReaR `BACKUP=NETFS`, `OUTPUT=ISO`, `BACKUP_URL`, `OUTPUT_URL`, `rear mkbackup`, and `rear recover` usage matches Red Hat's documented workflow. Future improvements could add retention handling for timestamped PostgreSQL backups and verification with `pg_verifybackup`, but the corrected examples are technically valid.
