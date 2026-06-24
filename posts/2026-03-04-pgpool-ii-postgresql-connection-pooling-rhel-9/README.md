# How to Set Up pgpool-II for PostgreSQL Connection Pooling on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Pgpool-II, Connection Pooling

Description: Set up pgpool-II on RHEL 9 for PostgreSQL connection pooling and load balancing.

---

## Overview

Set up pgpool-II on RHEL 9 for PostgreSQL connection pooling. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- A running PostgreSQL backend, or sufficient disk space to install one locally

## Step 1 - Install PostgreSQL and pgpool-II

Install PostgreSQL from the RHEL repositories:

```bash
sudo dnf install -y postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Install the pgpool-II repository and the pgpool-II package that matches your PostgreSQL major version. The example below uses the RHEL 9 default PostgreSQL 13 packages:

```bash
sudo dnf install -y https://www.pgpool.net/yum/rpms/4.7/redhat/rhel-9-x86_64/pgpool-II-release-4.7-1.noarch.rpm
sudo dnf install -y pgpool-II-pg13
```

## Step 2 - Perform Initial Configuration

Edit the pgpool-II configuration file:

```bash
sudo vi /etc/pgpool-II/pgpool.conf
```

Set the listener, backend, and pool settings to match your PostgreSQL server:

```ini
listen_addresses = '*'
port = 9999
backend_clustering_mode = raw
backend_hostname0 = '127.0.0.1'
backend_port0 = 5432
backend_weight0 = 1
connection_cache = on
num_init_children = 32
max_pool = 4
```

Adjust `backend_hostname0`, `backend_port0`, `num_init_children`, and `max_pool` to match your workload.

## Step 3 - Create Users and Databases

Create the PostgreSQL user and database that applications will access through pgpool-II:

```bash
sudo -u postgres psql -c "CREATE USER myappuser WITH PASSWORD 'secure-password';"
sudo -u postgres createdb myappdb -O myappuser
```

## Step 4 - Configure Network Access

If remote connections to pgpool-II are needed, allow the pgpool-II host in PostgreSQL's `pg_hba.conf`, then open the pgpool-II listener port:

```bash
sudo vi /var/lib/pgsql/data/pg_hba.conf
sudo firewall-cmd --permanent --add-port=9999/tcp
sudo firewall-cmd --reload
sudo systemctl reload postgresql
```

Start and enable pgpool-II after PostgreSQL is running:

```bash
sudo systemctl enable --now pgpool.service
```

## Step 5 - Verify the Setup

Connect through pgpool-II and run a test query:

```bash
psql -h localhost -p 9999 -U myappuser myappdb -c "SELECT version();"
```

## Summary

You have learned how to set up pgpool-II for PostgreSQL connection pooling. Always secure your database with strong passwords, restricted network access, and regular backups.
