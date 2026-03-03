# How to Install PostgreSQL on Ubuntu Server Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PostgreSQL, Database

Description: Install PostgreSQL on Ubuntu Server from the official PGDG repository, configure initial settings, and set up a database and user for application use.

---

PostgreSQL is a feature-rich, ACID-compliant relational database with strong support for advanced SQL features, JSON, full-text search, and extensibility. Ubuntu includes PostgreSQL in its default repositories, but using the PostgreSQL Global Development Group (PGDG) repository gives you access to the latest versions and faster security updates.

## Installation Methods

### From the PGDG Repository (Recommended)

The PGDG repository provides current PostgreSQL versions and is maintained by the PostgreSQL community:

```bash
# Install prerequisites
sudo apt install -y postgresql-common

# Add PGDG repository using the official script
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
```

This script automatically detects your Ubuntu version and sets up the appropriate repository. After it completes:

```bash
# Update package lists
sudo apt update

# Install PostgreSQL 16 (or the current stable version)
sudo apt install postgresql-16 postgresql-client-16 -y

# Install contrib package (useful extensions like uuid-ossp, pg_stat_statements, etc.)
sudo apt install postgresql-contrib-16 -y
```

### From Ubuntu Repositories

For simplicity, Ubuntu's default repository works fine if you do not need the absolute latest version:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
```

This installs the version bundled with your Ubuntu release.

## Verifying the Installation

```bash
# Check service status
sudo systemctl status postgresql

# Check the PostgreSQL version
psql --version
sudo -u postgres psql --version

# Verify the cluster is running
sudo pg_lsclusters
# Output shows cluster name, version, port, status, and data directory
```

You should see output like:

```text
Ver Cluster Port Status Owner    Data directory              Log file
16  main    5432 online postgres /var/lib/postgresql/16/main /var/log/postgresql/postgresql-16-main.log
```

## Understanding PostgreSQL's Installation on Ubuntu

Ubuntu's PostgreSQL installation uses the `pg_ctlcluster` system to manage multiple PostgreSQL clusters. Key locations:

```bash
# Data directory
/var/lib/postgresql/16/main/

# Configuration files
/etc/postgresql/16/main/postgresql.conf  # Main configuration
/etc/postgresql/16/main/pg_hba.conf      # Authentication configuration
/etc/postgresql/16/main/pg_ident.conf    # OS username to PostgreSQL username mapping

# Log file
/var/log/postgresql/postgresql-16-main.log

# Socket
/var/run/postgresql/.s.PGSQL.5432
```

## Connecting to PostgreSQL

PostgreSQL creates a system user called `postgres` and a database superuser also called `postgres`. Connect using the unix socket:

```bash
# Switch to postgres user and open psql
sudo -u postgres psql

# Or connect directly
sudo -u postgres psql -c "SELECT version();"
```

Check the postgres user's authentication:

```sql
-- In psql prompt
\l          -- List all databases
\du         -- List all roles (users)
\conninfo   -- Show current connection info
```

## Creating a Database and User

Always create dedicated users for applications rather than using the postgres superuser:

```bash
sudo -u postgres psql
```

```sql
-- Create an application database
CREATE DATABASE myapp_db
    ENCODING 'UTF8'
    LC_COLLATE 'en_US.UTF-8'
    LC_CTYPE 'en_US.UTF-8'
    TEMPLATE template0;

-- Create an application user with a password
CREATE USER myapp_user WITH ENCRYPTED PASSWORD 'strong-password-here';

-- Grant privileges on the database
GRANT ALL PRIVILEGES ON myapp_db TO myapp_user;

-- Connect to the database and set default privileges for future tables
\c myapp_db
GRANT ALL ON SCHEMA public TO myapp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO myapp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO myapp_user;

-- Verify the setup
\l myapp_db
\du myapp_user
```

Test the connection:

```bash
psql -h localhost -U myapp_user -d myapp_db
# Enter the password when prompted
```

## Key Configuration Settings

Edit the main PostgreSQL configuration:

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Important settings to review:

```ini
# /etc/postgresql/16/main/postgresql.conf

# Connection settings
listen_addresses = 'localhost'    # Only local connections (change to '*' for remote)
port = 5432
max_connections = 100             # Maximum simultaneous connections

# Memory settings (tune based on available RAM)
# Shared buffers: PostgreSQL's internal cache - set to 25% of RAM
shared_buffers = 512MB

# Effective cache size: estimate of OS + PostgreSQL cache (50-75% of RAM)
# Used by query planner - does not actually allocate memory
effective_cache_size = 2GB

# Work memory per sort/hash operation (not per connection)
# Total memory for sorts = work_mem * max_connections * concurrent_sorts
work_mem = 16MB

# Maintenance operations (VACUUM, CREATE INDEX)
maintenance_work_mem = 256MB

# WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query planner settings
random_page_cost = 1.1           # Lower value for SSDs (vs 4.0 for spinning disks)
effective_io_concurrency = 200   # Higher for SSDs (vs 2-4 for spinning disks)

# Logging
log_destination = 'csvlog'
logging_collector = on
log_directory = '/var/log/postgresql'
log_min_duration_statement = 1000  # Log queries taking longer than 1 second
log_line_prefix = '%m [%p] %q%u@%d '
log_checkpoints = on
log_connections = on
log_disconnections = on

# Statistics
track_activities = on
track_counts = on
track_io_timing = on
```

Apply configuration changes:

```bash
# Test configuration for syntax errors
sudo -u postgres pg_ctlcluster 16 main reload

# Or reload without restarting
sudo systemctl reload postgresql
```

Some settings require a full restart:

```bash
sudo systemctl restart postgresql
```

## Understanding pg_hba.conf Authentication

The `pg_hba.conf` file controls who can connect and how. The format is:

```text
# TYPE  DATABASE  USER  ADDRESS  METHOD
local   all       all            peer
host    all       all  127.0.0.1/32  scram-sha-256
```

Authentication methods:
- `peer` - Match OS username to PostgreSQL username (local sockets)
- `scram-sha-256` - Password authentication with modern hashing
- `md5` - Password authentication (older, avoid for new setups)
- `trust` - No authentication (dangerous, only for specific cases)

The default configuration allows the `postgres` OS user to connect without a password (peer auth) and requires a password for TCP connections.

## Managing the PostgreSQL Service

```bash
# Service management (standard systemd)
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo systemctl reload postgresql   # Reload config without full restart

# Ubuntu's pg_ctlcluster (manages multiple versions/clusters)
sudo pg_ctlcluster 16 main start
sudo pg_ctlcluster 16 main stop
sudo pg_ctlcluster 16 main reload

# Check all clusters
sudo pg_lsclusters
```

## Checking PostgreSQL is Working

```bash
# Quick connection test
sudo -u postgres psql -c "SELECT now();"

# Check number of active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# View database sizes
sudo -u postgres psql -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY pg_database_size(datname) DESC;"

# Check PostgreSQL log for errors
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

## Enabling pg_stat_statements for Query Analysis

`pg_stat_statements` tracks query performance across all databases and is invaluable for optimization:

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

```ini
# Add to shared_preload_libraries
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
```

```bash
sudo systemctl restart postgresql

sudo -u postgres psql -d myapp_db -c "CREATE EXTENSION pg_stat_statements;"

# Now query it to find slow queries
sudo -u postgres psql -d myapp_db -c "
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"
```

With PostgreSQL installed and configured, you have a powerful, reliable database server ready for production workloads. The next steps are typically enabling remote access, setting up backups, and tuning the configuration further based on your specific workload.
