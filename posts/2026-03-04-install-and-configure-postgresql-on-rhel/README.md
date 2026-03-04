# How to Install and Configure PostgreSQL on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Database, Installation, Configuration

Description: Install PostgreSQL on RHEL, initialize the database cluster, configure authentication and network access, and run basic administrative tasks.

---

PostgreSQL is a powerful open-source relational database available in the default RHEL repositories. This guide covers installation, initial configuration, and basic administration.

## Install PostgreSQL

```bash
# Install PostgreSQL server and client
sudo dnf install -y postgresql-server postgresql-contrib

# Check the installed version
postgres --version
```

## Initialize the Database

```bash
# Initialize the data directory
sudo postgresql-setup --initdb

# Start and enable PostgreSQL
sudo systemctl enable --now postgresql

# Verify it is running
systemctl status postgresql
```

## Configure Authentication

By default, PostgreSQL uses `ident` authentication for local connections. For password-based access, edit `pg_hba.conf`:

```bash
# Edit the host-based authentication file
sudo vi /var/lib/pgsql/data/pg_hba.conf

# Change ident to md5 (or scram-sha-256) for local connections:
# Original:
# local   all   all                 peer
# host    all   all   127.0.0.1/32  ident

# Updated:
# local   all   all                 peer
# host    all   all   127.0.0.1/32  scram-sha-256
# host    all   all   192.168.1.0/24 scram-sha-256
```

## Configure Network Access

```bash
# Edit postgresql.conf to listen on all interfaces
sudo vi /var/lib/pgsql/data/postgresql.conf

# Change listen_addresses
# listen_addresses = '*'
# port = 5432

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Set the postgres User Password

```bash
# Connect as the postgres user
sudo -u postgres psql

# Set a password
ALTER USER postgres WITH PASSWORD 'your_secure_password';

# Exit
\q
```

## Create a Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create a new user
CREATE USER myapp WITH PASSWORD 'apppassword';

# Create a database owned by the new user
CREATE DATABASE myappdb OWNER myapp;

# Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE myappdb TO myapp;

\q
```

## Open the Firewall

```bash
sudo firewall-cmd --permanent --add-service=postgresql
sudo firewall-cmd --reload
```

## Test the Connection

```bash
# Connect using the new user
psql -h 127.0.0.1 -U myapp -d myappdb

# List databases
\l

# List tables in the current database
\dt

# Exit
\q
```

## Basic Administration Commands

```bash
# Check database sizes
sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database ORDER BY pg_database_size(pg_database.datname) DESC;"

# Show active connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check PostgreSQL logs
sudo journalctl -u postgresql --since "1 hour ago"

# Reload configuration without restart
sudo -u postgres psql -c "SELECT pg_reload_conf();"
```

PostgreSQL on RHEL is production-ready out of the box. For production use, consider tuning shared_buffers, work_mem, and enabling SSL.
