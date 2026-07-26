# Restored Percona Server Won’t Start? Fix Datadir Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Percona XtraBackup, Restore, Troubleshooting

Description: Diagnose a Percona Server that will not start after restore by checking preparation, datadir selection, ownership, security labels, and accidental initialization.

---

The most important rule after a physical restore is simple: **do not run `mysqld --initialize` on the restored data directory**.

`--initialize` creates a new data dictionary, system tablespace, grant tables, and root account in an empty directory. An XtraBackup restore already contains those structures. Initializing it is not a repair step; at best MySQL refuses because the directory is not empty, and at worst an incorrect path creates a second, unrelated instance and obscures the real problem.

Use initialization only once for a brand-new empty datadir. For a restore, prepare the backup, copy it into an empty target, correct ownership and security policy, and start it with the matching server configuration.

## Read the First Real Error

Do not repeatedly restart the service before capturing the error:

The examples below use the `mysql` service unit. On systems where the installed unit is `mysqld`, substitute that name in every `systemctl` and `journalctl -u` command.

```bash
systemctl status mysql --no-pager -l
journalctl -u mysql -b --no-pager -n 200
```

Also inspect the configured error log if it is not sent to the journal:

```bash
my_print_defaults mysqld
grep -E '^(datadir|log-error|socket)' /etc/mysql/my.cnf /etc/mysql/mysql.conf.d/* 2>/dev/null
```

Classify the first error, not the cascade after it. Common signatures include:

- `Permission denied`: ownership, mode bits, a parent directory, SELinux, or AppArmor;
- `Data Dictionary initialization failed`: wrong or incomplete files, incompatible version, or an accidental empty datadir;
- redo/LSN or corruption messages: backup was not prepared, prepare was interrupted, or the backup is incomplete;
- `Unable to lock ... error: 11`: another `mysqld` is using the files;
- missing keyring or decryption errors: encryption configuration or keys are absent;
- unknown variables: the restored configuration does not match the installed server build.

## Confirm the Service Is Looking at the Restored Directory

Resolve configuration before changing permissions:

```bash
mysqld --verbose --help 2>/dev/null | grep -A1 '^datadir'
systemctl cat mysql
findmnt -T /var/lib/mysql
```

Then inspect the intended directory without modifying it:

```bash
ls -ld /var /var/lib /var/lib/mysql
find /var/lib/mysql -maxdepth 2 -printf '%u:%g %m %p\n' | head -80
```

A surprisingly common failure is a successful restore to `/data/mysql` while systemd starts MySQL with `/var/lib/mysql`, or a mount that was absent during restore and later hides the copied files.

Check that the restored tree has core physical-backup content such as the `mysql` schema directory, system tablespaces, redo files as produced by the relevant version, and application schema directories. Do not delete individual files based on a generic internet fix.

## Verify the Backup Was Prepared

Before `--copy-back`, a full backup must be prepared:

```bash
xtrabackup \
  --prepare \
  --target-dir=/srv/restore/2026-07-26
```

The operation must exit successfully and end with `completed OK!`. XtraBackup's prepare phase applies redo and undo so files copied at different times become consistent.

The correct restore sequence is:

```bash
systemctl stop mysql

# The configured destination must be empty before copy-back.
xtrabackup \
  --copy-back \
  --datadir=/var/lib/mysql \
  --target-dir=/srv/restore/2026-07-26

chown -R mysql:mysql /var/lib/mysql
systemctl start mysql
```

Do not run these destructive steps against a path until its mount and purpose have been independently confirmed. Preserve the original backup.

## Fix Unix Ownership and Traversal

XtraBackup is often run as `root`, so restored files can be owned by `root`. Percona's restore documentation explicitly requires checking ownership and permissions; `mysqld` normally runs as `mysql`.

```bash
chown -R mysql:mysql /var/lib/mysql
find /var/lib/mysql -xdev ! -user mysql -o ! -group mysql
namei -l /var/lib/mysql/ibdata1
```

`namei` matters because the `mysql` user needs execute/traverse permission on every parent directory. A correct `/srv/mysql/data` mode cannot compensate for an inaccessible `/srv/mysql`.

Test access as the service identity:

```bash
sudo -u mysql test -r /var/lib/mysql/ibdata1
sudo -u mysql test -w /var/lib/mysql
```

Avoid broad `chmod -R 777` repairs. They expose database files and do not fix mandatory access controls. Preserve sensible restrictive modes and let package defaults or your hardened policy define the exact values.

## Check SELinux, AppArmor, and systemd Sandboxing

If discretionary permissions are correct but the log still says permission denied, inspect the operating-system policy.

On SELinux systems:

```bash
ls -Zd /var/lib/mysql
ausearch -m AVC -ts recent
restorecon -RFv /var/lib/mysql
```

For a non-default datadir, define the appropriate MySQL file context using the distribution's documented policy rather than repeatedly applying an ad hoc `chcon`, which can be lost during relabeling.

On AppArmor systems:

```bash
journalctl -k -b | grep -i apparmor
aa-status
```

Add a deliberate rule for a custom data path and reload the profile. Also inspect the service unit for `ProtectSystem`, `ReadWritePaths`, or other sandboxing if the datadir moved.

## Treat Encryption and External Tablespaces as Part of the Datadir

For Percona XtraBackup 8.4, a backup of encrypted InnoDB tablespaces needs access to the matching keyring component configuration and key material during prepare and copy-back; the server needs access at startup. Backup-level encryption (the `--encrypt` option) is separate and must be decrypted with its backup encryption key before prepare. For a file-backed keyring, XtraBackup does not include the keyring file in the backup; it is sensitive recovery material, so protect and restore it separately according to the Percona keyring documentation.

Physical backups can also reference general or file-per-table tablespaces outside the main datadir. Inspect `xtrabackup_tablespaces` and the saved `backup-my.cnf`. Confirm the external paths exist, are mounted, are owned by `mysql`, and are allowed by SELinux/AppArmor before startup.

## Use `--initialize` Only for a Truly New Instance

For a new binary-tarball installation with a confirmed empty target, initialization is appropriate:

```bash
install -d -o mysql -g mysql -m 750 /srv/mysql/new-data
sudo -u mysql mysqld \
  --initialize \
  --datadir=/srv/mysql/new-data
```

That workflow is unrelated to XtraBackup restore. If you accidentally initialized the wrong directory, stop. Do not copy application `.ibd` files into the newly initialized datadir and expect the data dictionary to discover them. Preserve both trees, return to the untouched backup, empty the correct restore target using an approved procedure, and repeat prepare/copy-back.

## Validate Before Reopening Traffic

After the server reaches `ready for connections`, keep application traffic blocked while checking:

```sql
SELECT VERSION(), @@datadir, @@server_uuid, @@read_only;
SHOW DATABASES;
SELECT COUNT(*), MAX(updated_at) FROM app.orders;
```

Review the full startup log for recovery warnings, missing tablespaces, keyring errors, and upgrade messages. Verify users and grants, run application read checks, and perform a rollback-only write test. A running process proves that InnoDB opened; it does not prove that the intended recovery point is complete.

## Official Documentation

- [Percona XtraBackup: prepare a full backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-full-backup.html)
- [Percona XtraBackup: restore a backup](https://docs.percona.com/percona-xtrabackup/8.4/restore-a-backup.html)
- [Percona XtraBackup restore tutorial and permission repair](https://docs.percona.com/percona-xtrabackup/8.4/quickstart-restore-back.html)
- [Percona Server 8.4 post-installation and initialization](https://docs.percona.com/percona-server/8.4/post-installation.html)
- [Percona Server SELinux guidance](https://docs.percona.com/percona-server/8.4/selinux.html)
