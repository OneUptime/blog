# How to Back Up and Restore PostgreSQL Databases on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Backup, Database

Description: Back up and restore PostgreSQL databases on RHEL using pg_dump and pg_restore.

---

## Overview

Back up and restore PostgreSQL databases on RHEL using pg_dump and pg_restore. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database backups

## Step 1 - Install the PostgreSQL Packages

```bash
sudo dnf install -y postgresql-server postgresql
```

Initialize the database cluster and start PostgreSQL:

```bash
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql.service
```

## Step 2 - Perform Initial Configuration

Edit the main configuration file:

- PostgreSQL: `/var/lib/pgsql/data/postgresql.conf` and `/var/lib/pgsql/data/pg_hba.conf`

Adjust memory settings, connection limits, and authentication methods to match your workload.

## Step 3 - Create Users and Databases

```bash
sudo -u postgres psql -c "CREATE USER myappuser WITH PASSWORD 'secure-password';"
sudo -u postgres createdb myappdb -O myappuser
```

Use a strong password and store application credentials securely.

## Step 4 - Back Up the Database

Create a backup directory and dump the database in PostgreSQL's custom archive format:

```bash
sudo install -d -o postgres -g postgres -m 700 /var/lib/pgsql/backups
sudo -u postgres pg_dump -F c -d myappdb -f /var/lib/pgsql/backups/myappdb.dump
```

## Step 5 - Restore and Verify the Backup

Restore the custom-format backup with `pg_restore` into a new database:

```bash
sudo -u postgres createdb myappdb_restore -O myappuser
sudo -u postgres pg_restore -d myappdb_restore /var/lib/pgsql/backups/myappdb.dump
sudo -u postgres psql -d myappdb_restore -c "SELECT current_database();"
```

## Summary

You have learned how to back up and restore PostgreSQL databases. Always secure your database with strong passwords, restricted network access, and regular backups.
