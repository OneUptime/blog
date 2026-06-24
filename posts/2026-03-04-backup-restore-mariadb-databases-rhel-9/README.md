# How to Back Up and Restore MariaDB Databases on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, Backup, Database

Description: Back up and restore MariaDB databases on RHEL 9 using mysqldump and mariabackup.

---

## Overview

Back up and restore MariaDB databases on RHEL 9 using mariadb-dump and mariabackup. Proper database backups are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database storage

## Step 1 - Install the MariaDB Packages

```bash
sudo dnf install -y mariadb-server mariadb-backup
sudo systemctl enable --now mariadb.service
sudo mariadb-secure-installation
```

## Step 2 - Create a Logical Backup

Use `mariadb-dump` for a logical SQL backup. The `mysqldump` name may still exist as a compatibility link, but `mariadb-dump` is the current MariaDB client name.

```bash
mariadb-dump -u root -p --routines --events --triggers --single-transaction --result-file=myappdb.sql --databases myappdb
```

Use `--all-databases` instead of `--databases myappdb` if you need to back up every database on the server.

## Step 3 - Restore a Logical Backup

Restore the SQL dump into a running MariaDB server:

```bash
mariadb -u root -p < myappdb.sql
```

If the database already exists and the dump does not contain `DROP` statements, remove the existing database or tables before importing the file.

## Step 4 - Create a Physical Backup

Create a backup user for mariabackup:

```sql
CREATE USER 'backupuser'@'localhost' IDENTIFIED BY 'secure-password';
GRANT RELOAD, LOCK TABLES, REPLICATION CLIENT ON *.* TO 'backupuser'@'localhost';
FLUSH PRIVILEGES;
```

Then create the backup in an empty or new target directory:

```bash
mariabackup --backup --target-dir=/var/mariadb/backup --user=backupuser --password=secure-password
```

Prepare the backup before restoring it:

```bash
mariabackup --prepare --target-dir=/var/mariadb/backup
```

## Step 5 - Restore a Physical Backup

Stop MariaDB and make sure the data directory is empty before restoring a mariabackup backup:

```bash
sudo systemctl stop mariadb.service
sudo rm -rf /var/lib/mysql/*
sudo mariabackup --copy-back --target-dir=/var/mariadb/backup
sudo chown -R mysql:mysql /var/lib/mysql
sudo restorecon -Rv /var/lib/mysql
sudo systemctl start mariadb.service
```

## Summary

You have learned how to back up and restore MariaDB databases. Always secure your database with strong passwords, restricted network access, and regular backups.
