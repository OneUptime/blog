# Validation Summary: How to Back Up and Restore MariaDB Databases on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- MariaDB
- mariadb-dump
- mariabackup
- gzip
- systemd

## Sources Consulted
- MariaDB Server Documentation: mariadb-dump, https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump
- MariaDB Server Documentation: mariadb command-line client, https://mariadb.com/docs/server/clients-and-utilities/mariadb-client/mariadb-command-line-client
- MariaDB Server Documentation: mysqldump legacy client, https://mariadb.com/docs/server/clients-and-utilities/legacy-clients-and-utilities/mysqldump
- MariaDB Server Documentation: mariadb-backup overview, https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/mariadb-backup-overview
- MariaDB Server Documentation: Incremental Backup and Restore with mariadb-backup, https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/incremental-backup-and-restore-with-mariadb-backup
- Red Hat Enterprise Linux 9 Documentation: Configuring and using database servers, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/

## Issues Found
- The post used `mysqldump` as the primary logical backup command. Current MariaDB documentation names the client `mariadb-dump`; `mysqldump` is the older compatibility name and is deprecated/removed in newer MariaDB contexts. I updated the logical backup commands, heading, tags, and description to use `mariadb-dump`, while adding a compatibility note.
- The restore and verification examples used the legacy `mysql` command-line client name. I updated them to `mariadb`, which is the current MariaDB client name documented by MariaDB and used in Red Hat's MariaDB guidance.
- The post described mariabackup as creating backups "without locking the database" and said it "does not require locking tables." MariaDB documentation describes mariadb-backup as nearly non-blocking and says hot online backups are possible for InnoDB, but the original wording was too broad for all engines and phases. I narrowed the wording to InnoDB hot backups and removed the blanket locking claim.

## Review Notes
The remaining commands and options reviewed are consistent with MariaDB and Red Hat documentation. In a production guide, it would be worth adding prerequisites for backup user privileges and noting that prepared mariabackup restores should use a compatible MariaDB Backup version, but the existing examples are technically valid.
