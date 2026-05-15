# How to Configure PostgreSQL with SSL/TLS Encryption on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, SSL, TLS, Security

Description: Configure PostgreSQL with SSL/TLS encryption on RHEL 9 to secure connections.

---

## Overview

Configure PostgreSQL with SSL/TLS encryption on RHEL 9 to secure connections. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database storage
- A TLS private key and server certificate for the PostgreSQL server

## Step 1 - Install the Database Packages

Install PostgreSQL and initialize the database cluster:

```bash
sudo dnf install -y postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

## Step 2 - Perform Initial Configuration

Copy the server certificate and private key into the PostgreSQL data directory, then set ownership and permissions:

```bash
sudo cp server.crt server.key /var/lib/pgsql/data/
sudo chown postgres:postgres /var/lib/pgsql/data/server.crt /var/lib/pgsql/data/server.key
sudo chmod 0400 /var/lib/pgsql/data/server.key
```

Edit `/var/lib/pgsql/data/postgresql.conf` and enable TLS:

```conf
ssl = on
password_encryption = scram-sha-256
```

If remote connections are needed, also set the listen address:

```conf
listen_addresses = '*'
```

Restart PostgreSQL so the TLS and password encryption settings are active:

```bash
sudo systemctl restart postgresql
```

## Step 3 - Create Users and Databases

Create an application user with a password and a database owned by that user:

```bash
sudo -u postgres psql -c "CREATE ROLE myappuser WITH LOGIN PASSWORD 'secure-password';"
sudo -u postgres createdb myappdb -O myappuser
```

Use a strong password in production.

## Step 4 - Configure Network Access

Edit `/var/lib/pgsql/data/pg_hba.conf` and require encrypted TCP connections by using `hostssl` entries. Place these entries before broader `host` entries for the same database, user, and address range:

```conf
# TYPE    DATABASE    USER         ADDRESS          METHOD
hostssl   myappdb     myappuser    127.0.0.1/32     scram-sha-256
hostssl   myappdb     myappuser    ::1/128          scram-sha-256
hostssl   myappdb     myappuser    192.0.2.0/24     scram-sha-256
```

Replace `192.0.2.0/24` with the remote client network that should be allowed to connect.

Restart PostgreSQL so the `pg_hba.conf` changes are active:

```bash
sudo systemctl restart postgresql
```

If remote connections are needed, open the PostgreSQL service in the firewall:

```bash
sudo firewall-cmd --permanent --add-service=postgresql
sudo firewall-cmd --reload
```

## Step 5 - Verify the Setup

Connect to the database with TLS required and confirm that the connection is encrypted:

```bash
psql "host=localhost dbname=myappdb user=myappuser sslmode=require" -c "SELECT version();"
psql "host=localhost dbname=myappdb user=myappuser sslmode=require" -c "SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid();"
```

## Summary

You have learned how to configure PostgreSQL with SSL/TLS encryption. Always secure your database with strong passwords, restricted network access, and regular backups.
