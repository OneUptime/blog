# How to Upgrade PostgreSQL Versions on RHEL 9 Using pg_upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Pg_upgrade, Upgrade

Description: Upgrade PostgreSQL versions on RHEL 9 using pg_upgrade for major version migration.

---

## Overview

Upgrade PostgreSQL versions on RHEL 9 using pg_upgrade for major version migration. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- A supported source PostgreSQL version and target RHEL 9 PostgreSQL stream
- A tested backup of your PostgreSQL databases and configuration files
- Sufficient disk space for database storage and upgrade work

## Step 1 - Install the PostgreSQL Upgrade Packages

Install the target PostgreSQL server packages and the upgrade package. For PostgreSQL 13 from the RHEL 9 RPM package:

```bash
sudo dnf install -y postgresql-server postgresql-upgrade
```

For a fresh PostgreSQL 15 or PostgreSQL 16 target, select the target module stream and install the upgrade package. For example, to use PostgreSQL 16:

```bash
sudo dnf module install postgresql:16/server
sudo dnf install -y postgresql-upgrade
```

If you are upgrading from an earlier PostgreSQL module stream within RHEL 9, switch to the later stream before running the migration:

```bash
sudo dnf module switch-to postgresql:16/server
sudo dnf install -y postgresql-upgrade
```

Install any PostgreSQL server extensions you used on the old cluster for the target PostgreSQL version as well.

## Step 2 - Perform Initial Configuration

Before running the upgrade, stop PostgreSQL and make sure the old cluster data is in the default RHEL location, `/var/lib/pgsql/data/`:

```bash
sudo systemctl stop postgresql.service
```

Check the following configuration files before the upgrade:

- `/var/lib/pgsql/data/postgresql.conf`
- `/var/lib/pgsql/data/pg_hba.conf`
- `/var/lib/pgsql/data/pg_ident.conf`

The fast upgrade creates fresh configuration files for the new cluster. Keep the old files available so you can copy or merge settings after the upgrade.

## Step 3 - Run the Upgrade

Run the RHEL upgrade helper as root. It starts the `pg_upgrade` process in the background:

```bash
sudo postgresql-setup --upgrade
```

If the command fails, review the error message, fix the reported issue, and rerun the upgrade before starting the new server.

## Step 4 - Configure Network Access

After the upgrade, copy or merge the prior configuration from `/var/lib/pgsql/data-old/` into the new cluster configuration in `/var/lib/pgsql/data/`.

If remote connections are needed, update `listen_addresses` and `pg_hba.conf`, then open the firewall:

```bash
sudo firewall-cmd --permanent --add-service=postgresql
sudo firewall-cmd --reload
```

## Step 5 - Verify the Setup

Start and enable PostgreSQL, then analyze the upgraded cluster:

```bash
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service
sudo -u postgres vacuumdb --all --analyze-in-stages
```

Connect to the database and run a test query:

```bash
sudo -u postgres psql -d postgres -c "SELECT version();"
```

## Summary

You have learned how to upgrade PostgreSQL versions using `pg_upgrade` through the RHEL `postgresql-setup --upgrade` helper. Always secure your database with strong passwords, restricted network access, and regular backups.
