# How to Set Up PostgreSQL Streaming Replication on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Replication, High Availability

Description: Set up PostgreSQL streaming replication on RHEL 9 for high availability.

---

## Overview

Set up PostgreSQL streaming replication on RHEL 9 for high availability. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- Two RHEL 9 systems with valid subscriptions or configured repositories
- Root or sudo access
- Sufficient disk space for database storage
- Network connectivity from the standby server to the primary server on port 5432

## Step 1 - Install the Database Packages

On both the primary and standby servers:

```bash
sudo dnf install -y postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

## Step 2 - Perform Initial Configuration

On the primary server, edit `/var/lib/pgsql/data/postgresql.conf`:

```ini
listen_addresses = '*'
wal_level = replica
max_wal_senders = 10
wal_keep_size = 256MB
```

Then edit `/var/lib/pgsql/data/pg_hba.conf` and allow the standby server to connect for replication:

```ini
host    replication     replicator      standby_ip/32      scram-sha-256
```

Replace `standby_ip` with the standby server's IP address.

## Step 3 - Create the Replication User

On the primary server:

```bash
sudo -u postgres psql -c "SET password_encryption = 'scram-sha-256'; CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secure-password';"
sudo systemctl restart postgresql
```

## Step 4 - Configure Network Access

On the primary server, open the PostgreSQL service in the firewall:

```bash
sudo firewall-cmd --permanent --add-service=postgresql
sudo firewall-cmd --reload
```

## Step 5 - Create the Standby Server

On the standby server, stop PostgreSQL, replace the empty data directory with a base backup from the primary, and start PostgreSQL again:

```bash
sudo systemctl stop postgresql
sudo -u postgres find /var/lib/pgsql/data -mindepth 1 -delete
sudo -u postgres pg_basebackup -h primary_ip -D /var/lib/pgsql/data -U replicator -P -R -X stream
sudo systemctl start postgresql
```

Replace `primary_ip` with the primary server's IP address. The `-R` option writes the standby configuration and creates `standby.signal`.

## Step 6 - Verify the Setup

On the primary server, check that the standby is connected:

```sql
SELECT client_addr, state, sync_state FROM pg_stat_replication;
```

On the standby server, confirm it is running in recovery mode:

```sql
SELECT pg_is_in_recovery();
```

You can run these queries with `psql`:

```bash
sudo -u postgres psql -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

## Summary

You have learned how to set up PostgreSQL streaming replication. Always secure your database with strong passwords, restricted network access, and regular backups.
