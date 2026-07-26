# Validation Summary: Why Won’t a Restored Percona Server Start? Fixing Datadir Permissions and `--initialize`

## Status

validated

## Post Type

Technical troubleshooting guide and physical-restore runbook

## Technologies Covered

- Percona Server for MySQL 8.4
- Percona XtraBackup 8.4
- MySQL 8.4 and InnoDB
- Physical backup preparation and restore
- MySQL data-directory initialization
- Linux ownership and permissions
- systemd and journald
- SELinux and AppArmor
- InnoDB tablespace encryption, keyring components, and external tablespaces

## Sources Consulted

- [Percona XtraBackup: prepare a full backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-full-backup.html)
- [Percona XtraBackup: restore full, incremental, and compressed backups](https://docs.percona.com/percona-xtrabackup/8.4/restore-a-backup.html)
- [Percona XtraBackup: restore tutorial and permission repair](https://docs.percona.com/percona-xtrabackup/8.4/quickstart-restore-back.html)
- [Percona XtraBackup: encrypted InnoDB tablespace backups](https://docs.percona.com/percona-xtrabackup/8.4/encrypted-innodb-tablespace-backups.html)
- [Percona XtraBackup: backup files and external-tablespace metadata](https://docs.percona.com/percona-xtrabackup/8.4/generated-files.html)
- [Percona XtraBackup: server and backup version comparison](https://docs.percona.com/percona-xtrabackup/8.4/server-backup-version-comparison.html)
- [Percona Server for MySQL 8.4: post-installation and data-directory initialization](https://docs.percona.com/percona-server/8.4/post-installation.html)
- [Percona Server for MySQL 8.4: SELinux guidance](https://docs.percona.com/percona-server/8.4/selinux.html)
- [Percona Server for MySQL 8.4: AppArmor configuration](https://docs.percona.com/percona-server/8.4/configure-apparmor.html)
- [Percona Server for MySQL 8.4: service-name sanity check](https://docs.percona.com/percona-server/8.4/sanity-check.html)
- [MySQL 8.4: initializing the data directory](https://dev.mysql.com/doc/refman/8.4/en/data-directory-initialization.html)
- [MySQL 8.4: `my_print_defaults`](https://dev.mysql.com/doc/refman/8.4/en/my-print-defaults.html)
- [MySQL 8.4: the MySQL data directory](https://dev.mysql.com/doc/refman/8.4/en/data-directory.html)
- [MySQL 8.4: moving and discovering external tablespace files](https://dev.mysql.com/doc/refman/8.4/en/innodb-moving-data-files-offline.html)
- [MySQL 8.4: `server_uuid`](https://dev.mysql.com/doc/refman/8.4/en/replication-options.html)
- [systemd `journalctl` manual](https://www.freedesktop.org/software/systemd/man/255/journalctl.html)
- [systemd execution and filesystem-sandboxing manual](https://man7.org/linux/man-pages/man5/systemd.exec.5.html)
- [util-linux `findmnt` manual](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [util-linux `namei` manual](https://man7.org/linux/man-pages/man1/namei.1.html)

## Issues Found

- The service commands assumed that the systemd unit is always named `mysql`. Percona packages and installations can use either `mysql` or `mysqld`; the post now tells readers to substitute the installed unit name consistently in `systemctl` and `journalctl -u` commands.
- The encryption guidance used “encrypted backup” ambiguously, conflating backup-level encryption with encrypted InnoDB tablespaces, and it omitted Percona XtraBackup 8.4's keyring requirement during `--copy-back`. The paragraph now distinguishes the two encryption mechanisms, states that encrypted InnoDB tablespaces require the matching keyring configuration and keys during prepare and copy-back as well as server startup, requires backup-level encryption to be decrypted before prepare, and notes that XtraBackup does not include a file-backed keyring file in the backup.

## Review Notes

- The prepare and copy-back syntax, empty-datadir requirement, ownership repair, `completed OK!` check, and warning against running `mysqld --initialize` on restored files agree with the current Percona and MySQL 8.4 documentation.
- Percona XtraBackup 8.4 can prepare backups only from the MySQL/Percona Server 8.4 series. Restores from another major series require that series' compatible XtraBackup version and documented upgrade path.
- The Linux inspection commands are valid for the stated systemd-based environment; `find -printf`, `findmnt`, and `namei` are GNU findutils/util-linux facilities rather than portable POSIX interfaces.
- External file-per-table or general tablespace directories must remain known to InnoDB through the matching server configuration, including `innodb_directories` where required.
- If a physical restore is used to provision an additional replication server rather than replace the original instance, that new server must have a unique `server_uuid`; the post's validation query correctly exposes the value but does not attempt to change it.
- All five official documentation links in the post resolved to the intended Percona 8.4 pages during validation.
