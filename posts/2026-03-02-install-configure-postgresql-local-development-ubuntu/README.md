# How to Install and Configure PostgreSQL for Local Development on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PostgreSQL, Database, Development

Description: Install and configure PostgreSQL on Ubuntu for local development, including creating databases, configuring authentication, setting up pgAdmin, and optimizing for development use.

---

PostgreSQL is a robust relational database that is widely used in production. Setting it up properly on your local Ubuntu development machine involves more than just running `apt install` - you also need to configure authentication, create development databases and users, tune settings for a development workload, and optionally set up a graphical client.

## Installing PostgreSQL

Ubuntu's repositories include PostgreSQL, but they lag behind the current release. For the latest version, use the official PostgreSQL apt repository:

```bash
# Install prerequisites
sudo apt install curl ca-certificates -y

# Add PostgreSQL apt repository
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc

# Create the repository source list
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

# Update and install PostgreSQL 16
sudo apt update
sudo apt install postgresql-16 -y
```

Or use the Ubuntu repository version for simplicity:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
```

Check the installed version:

```bash
psql --version
```

Verify the service is running:

```bash
sudo systemctl status postgresql
```

## Understanding the Default Setup

After installation, PostgreSQL creates:
- A system user named `postgres`
- A database cluster in `/var/lib/postgresql/<version>/main/`
- A PostgreSQL superuser role named `postgres`
- A `postgres` database

The service listens on `127.0.0.1:5432` by default, accessible only from localhost.

## Connecting as the postgres User

The default authentication method requires connecting as the `postgres` OS user to access the database:

```bash
# Switch to postgres user and open psql
sudo -u postgres psql

# Check connection info
postgres=# \conninfo

# Exit
postgres=# \q
```

## Setting Up a Development User

For development, create a PostgreSQL role that matches your Ubuntu username to enable passwordless local connections:

```bash
# Create a role matching your username
sudo -u postgres createuser --createdb --superuser --pwprompt $USER

# This creates a role named after your username
# --createdb: allows creating databases
# --superuser: full administrative access (appropriate for local dev)
# --pwprompt: set a password
```

Now you can connect without switching users:

```bash
# Connect directly
psql -d postgres

# Or just
psql postgres
```

## Creating Development Databases

```bash
# Create a database for your project
createdb myproject_development

# Create with specific encoding and locale
createdb --encoding=UTF8 --locale=en_US.UTF-8 myproject_development

# Connect to the new database
psql myproject_development
```

Common database management commands in psql:

```sql
-- List all databases
\l

-- Connect to a database
\c myproject_development

-- List tables
\dt

-- Describe a table
\d tablename

-- List users/roles
\du

-- Show current connection
\conninfo
```

## Configuring Authentication (pg_hba.conf)

The Host-Based Authentication file at `/etc/postgresql/<version>/main/pg_hba.conf` controls who can connect and how:

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

For local development, a permissive setup works well. The default file looks like:

```text
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

To allow password-based connections from localhost without the `peer` restriction:

```text
# Changed to md5 for simplicity in development
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

After changes, reload PostgreSQL:

```bash
sudo systemctl reload postgresql
```

## Configuring postgresql.conf for Development

The main configuration file at `/etc/postgresql/<version>/main/postgresql.conf` has settings tuned for production. For development, adjust these:

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Key settings for a development machine:

```ini
# Connection settings
listen_addresses = 'localhost'      # Only listen locally
max_connections = 100               # Reduce from default 100 is fine

# Memory settings (adjust to ~25% of system RAM)
shared_buffers = 256MB
work_mem = 64MB
maintenance_work_mem = 128MB

# Write performance (relaxed for dev - not suitable for production)
synchronous_commit = off            # Faster writes, slight data loss risk on crash
wal_level = minimal                 # Less WAL overhead

# Query planning
random_page_cost = 1.1             # Assumes SSD storage
effective_cache_size = 1GB         # Estimate of OS cache

# Logging (useful during development)
log_statement = 'all'              # Log every SQL statement
log_duration = on                  # Log how long each statement takes
log_min_duration_statement = 100   # Log queries taking over 100ms
log_line_prefix = '%t [%p] %u@%d '

# Auto-vacuum (keep on even in development)
autovacuum = on
```

Apply changes by restarting PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Viewing Query Logs

With `log_statement = 'all'` enabled:

```bash
# Watch PostgreSQL logs in real time
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Filter for slow queries
sudo grep "duration:" /var/log/postgresql/postgresql-16-main.log
```

## Installing pgAdmin 4

pgAdmin is a comprehensive graphical interface for PostgreSQL:

```bash
# Install pgAdmin 4 desktop
curl -fsS https://www.pgadmin.org/static/packages_pgadmin_org.pub | \
  sudo gpg --dearmor -o /usr/share/keyrings/packages-pgadmin-org.gpg

sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/packages-pgadmin-org.gpg] \
  https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" \
  > /etc/apt/sources.list.d/pgadmin4.list'

sudo apt update
sudo apt install pgadmin4-desktop -y
```

### Connecting pgAdmin to Local PostgreSQL

1. Open pgAdmin 4
2. Right-click "Servers" and select "Register > Server"
3. Under "General", set a name (e.g., "Local Dev")
4. Under "Connection":
   - Host: localhost
   - Port: 5432
   - Username: your PostgreSQL username
   - Password: your password
5. Click Save

## Using psql Effectively

Several psql features make development faster:

```bash
# Enable expanded display for wide tables
\x auto

# Show execution time for queries
\timing on

# Edit a query in your editor
\e

# Run a file of SQL
\i /path/to/script.sql

# Set output format to CSV
\pset format csv

# Enable null display
\pset null '[null]'
```

### Creating a .psqlrc Configuration

```bash
cat > ~/.psqlrc << 'EOF'
-- Show NULL values explicitly
\pset null '[null]'

-- Show execution timing
\timing on

-- Auto-expanded tables
\x auto

-- Custom prompt showing database name
\set PROMPT1 '%n@%/%R%# '
\set PROMPT2 '%R%# '

-- History
\set HISTSIZE 10000
EOF
```

## Managing Multiple PostgreSQL Versions

When using the official PostgreSQL apt repository, multiple versions can coexist:

```bash
# List installed clusters
pg_lsclusters

# Start a specific version/cluster
sudo pg_ctlcluster 16 main start

# Connect to a specific port
psql -p 5432 mydb   # PostgreSQL 16
psql -p 5433 mydb   # PostgreSQL 15 (if installed)
```

## Resetting Development Databases

For development, frequently dropping and recreating databases is normal:

```bash
# Drop and recreate a database
dropdb myproject_development
createdb myproject_development

# Or from psql
psql -c "DROP DATABASE IF EXISTS myproject_development;"
psql -c "CREATE DATABASE myproject_development;"
```

## Backing Up and Restoring

```bash
# Dump a database to file
pg_dump myproject_development > backup.sql

# Compressed dump
pg_dump -Fc myproject_development > backup.dump

# Restore from SQL file
psql myproject_development < backup.sql

# Restore from compressed dump
pg_restore -d myproject_development backup.dump
```

## Summary

Setting up PostgreSQL for local development on Ubuntu involves installing from the official repository, creating a development role matching your username, configuring pg_hba.conf for local password authentication, and tuning postgresql.conf for development use (verbose logging, relaxed durability settings, appropriate memory allocation). pgAdmin 4 provides a graphical interface for database management, while psql with a configured `.psqlrc` is efficient for direct SQL work. Keeping the configuration separate from production settings avoids the temptation to use development-optimized settings (like `synchronous_commit = off`) in production.
