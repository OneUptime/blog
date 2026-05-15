# Validation Summary: How to Back Up and Restore MariaDB Databases on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MariaDB Server
- mariadb-dump
- mariabackup
- systemd
- SELinux restorecon

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers, MariaDB installation and backup/restore sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- MariaDB documentation: mariadb-dump client: https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump
- MariaDB documentation: Full Backup and Restore with mariadb-backup: https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/full-backup-and-restore-with-mariadb-backup
- MariaDB documentation: mariadb-backup options: https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/mariadb-backup-options
- MariaDB documentation: mariadb-secure-installation: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation

## Issues Found
- The original post title and description promised MariaDB backup and restore, but the body covered generic PostgreSQL, MariaDB, and MySQL setup. I replaced the unrelated setup steps with MariaDB backup and restore steps.
- The original text used `mysqldump` as the primary MariaDB dump tool. I changed this to `mariadb-dump`, noting that `mysqldump` may exist as a compatibility name, because MariaDB documents `mariadb-dump` as the current client name.
- The original MariaDB installation used only `mariadb-server`, but physical backups with `mariabackup` on RHEL 9 require the `mariadb-backup` package. I added that package.
- The original security command used `mysql_secure_installation`. I changed it to `mariadb-secure-installation`, the current MariaDB command name.
- The original post did not include required `mariabackup` workflow details. I added the backup user privileges documented by Red Hat, the `--backup` command, the required `--prepare` step, and the `--copy-back` restore flow with ownership and SELinux context restoration.

## Review Notes
The restored physical backup instructions require an empty data directory. In production, administrators should verify backup integrity and preserve or snapshot the existing data directory before clearing it.
