# Validation Summary: How to Chain and Prepare Percona XtraBackup Incrementals in the Correct Order

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Percona XtraBackup 8.4
- Percona Server for MySQL
- MySQL 8.4
- InnoDB incremental physical backups
- Log sequence numbers (LSNs)
- Backup preparation and restore
- Backup compression and encryption
- InnoDB tablespace encryption and keyring components

## Sources Consulted

- [Percona XtraBackup 8.4: Create an incremental backup](https://docs.percona.com/percona-xtrabackup/8.4/create-incremental-backup.html)
- [Percona XtraBackup 8.4: Prepare an incremental backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-incremental-backup.html)
- [Percona XtraBackup 8.4: Prepare a full backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-full-backup.html)
- [Percona XtraBackup 8.4: The xtrabackup command-line options](https://docs.percona.com/percona-xtrabackup/8.4/xtrabackup-option-reference.html)
- [Percona XtraBackup 8.4: Create a full backup](https://docs.percona.com/percona-xtrabackup/8.4/create-full-backup.html)
- [Percona XtraBackup 8.4: XtraBackup backup files](https://docs.percona.com/percona-xtrabackup/8.4/generated-files.html)
- [Percona XtraBackup 8.4: Decompress and prepare a backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-compressed-backup.html)
- [Percona XtraBackup 8.4: Encrypted InnoDB tablespace backups](https://docs.percona.com/percona-xtrabackup/8.4/encrypted-innodb-tablespace-backups.html)
- [Percona XtraBackup 8.4: Restore full, incremental, and compressed backups](https://docs.percona.com/percona-xtrabackup/8.4/restore-a-backup.html)
- [Percona XtraBackup 8.4.0-3 release notes](https://docs.percona.com/percona-xtrabackup/8.4/release-notes/8.4.0-3.html)

## Issues Found

- The three backup commands placed `--login-path=backup` after ordinary options. Percona documents `--login-path` as a special option that must be supplied as the first parameter to `xtrabackup`. Moved it immediately after the executable in all three commands.
- The encryption guidance conflated XtraBackup backup-level encryption with InnoDB tablespace encryption. Clarified that encrypted backup files must be decrypted before prepare, while encrypted InnoDB tablespaces require the appropriate keyring component configuration during prepare and restore.
- The restore example stopped MySQL but did not state that the destination datadir must be empty. Added this required precondition because `xtrabackup --copy-back` does not restore over an existing populated datadir by default.

## Review Notes

- The LSN-link invariants, chronological merge order, use of `--apply-log-only` on the base and all non-final incrementals, and final prepare without `--apply-log-only` match Percona's documented workflow.
- The statement that prepare-time `--parallel` begins to affect incremental delta application in Percona XtraBackup 8.4.0-3 is accurate. Parallelism is file-level, so one large delta file is handled by one thread.
- Percona XtraBackup 8.4 can prepare backups from MySQL 8.4 and Percona Server for MySQL 8.4; earlier server release series require a compatible XtraBackup release.
- The `mysql` systemd unit name shown is common but can vary by distribution or installation.
