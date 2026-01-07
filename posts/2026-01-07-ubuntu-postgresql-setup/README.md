# How to Install and Secure PostgreSQL on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, PostgreSQL, Database, Security

Description: Install and secure PostgreSQL on Ubuntu with proper configuration, automated backups, and streaming replication for production databases.

---

PostgreSQL is one of the most powerful and feature-rich open-source relational database management systems available. Known for its reliability, data integrity, and extensibility, PostgreSQL is the database of choice for many production environments. This comprehensive guide will walk you through installing PostgreSQL on Ubuntu, securing it for production use, setting up automated backups, and configuring streaming replication for high availability.

## Prerequisites

Before we begin, ensure you have:

- Ubuntu 22.04 LTS or Ubuntu 24.04 LTS server
- Root or sudo access to the server
- Basic familiarity with Linux command line
- At least 2GB of RAM (4GB+ recommended for production)
- Sufficient disk space for your database needs

## Part 1: Installing PostgreSQL

### Step 1: Update System Packages

Always start by updating your system packages to ensure you have the latest security patches.

```bash
# Update the package list and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install PostgreSQL

Ubuntu's default repositories include PostgreSQL. For the latest version, we'll add the official PostgreSQL repository.

```bash
# Install required dependencies for adding repositories
sudo apt install -y wget gnupg2 lsb-release

# Add the official PostgreSQL repository GPG key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg

# Add the PostgreSQL repository to your sources list
echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Update package list with the new repository
sudo apt update

# Install PostgreSQL 16 (latest stable version as of 2026)
sudo apt install -y postgresql-16 postgresql-contrib-16
```

### Step 3: Verify Installation

Confirm that PostgreSQL is installed and running correctly.

```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Verify PostgreSQL version
psql --version

# Check if PostgreSQL is listening on the default port
sudo ss -tlnp | grep 5432
```

### Step 4: Enable PostgreSQL to Start on Boot

Ensure PostgreSQL starts automatically when the server boots.

```bash
# Enable PostgreSQL to start on system boot
sudo systemctl enable postgresql

# Start the PostgreSQL service if not already running
sudo systemctl start postgresql
```

## Part 2: Initial Configuration

PostgreSQL's configuration is managed through two primary files: `postgresql.conf` for server settings and `pg_hba.conf` for client authentication.

### Understanding Configuration File Locations

```bash
# Find the configuration directory for your PostgreSQL installation
sudo -u postgres psql -c "SHOW config_file;"

# The configuration files are typically located at:
# /etc/postgresql/16/main/postgresql.conf
# /etc/postgresql/16/main/pg_hba.conf
```

### Step 1: Configure postgresql.conf

The `postgresql.conf` file controls server behavior, performance settings, and connection parameters.

```bash
# Create a backup of the original configuration
sudo cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup

# Open the configuration file for editing
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Apply these essential configuration changes for a production environment:

```ini
# =============================================================================
# CONNECTION AND AUTHENTICATION
# =============================================================================

# Listen on all network interfaces (use specific IPs in production)
# Default is 'localhost' which only allows local connections
listen_addresses = '*'

# Default PostgreSQL port - change if you need to use a non-standard port
port = 5432

# Maximum number of concurrent connections
# Adjust based on your application needs and available memory
max_connections = 200

# =============================================================================
# MEMORY SETTINGS
# =============================================================================

# Shared memory buffer size - typically 25% of available RAM
# For a server with 16GB RAM, set this to 4GB
shared_buffers = 4GB

# Memory for complex sort operations and hash tables
# 256MB is a good starting point for most workloads
work_mem = 256MB

# Memory for maintenance operations like VACUUM, CREATE INDEX
# 1GB is suitable for medium-sized databases
maintenance_work_mem = 1GB

# Memory for each autovacuum worker process
autovacuum_work_mem = 512MB

# Effective cache size - estimate of OS disk cache available
# Typically 50-75% of total RAM
effective_cache_size = 12GB

# =============================================================================
# WRITE-AHEAD LOG (WAL) SETTINGS
# =============================================================================

# WAL level - 'replica' enables streaming replication
wal_level = replica

# Number of WAL segments to keep for replication
# Higher values provide more buffer for slow standbys
max_wal_senders = 10

# Maximum number of replication slots
max_replication_slots = 10

# Maximum size of WAL files to retain
wal_keep_size = 1GB

# Synchronization level for WAL writes
# 'on' ensures durability but impacts performance
synchronous_commit = on

# =============================================================================
# CHECKPOINT SETTINGS
# =============================================================================

# Maximum time between automatic WAL checkpoints
checkpoint_timeout = 15min

# Maximum size of WAL before triggering a checkpoint
max_wal_size = 4GB

# Minimum size of WAL between checkpoints
min_wal_size = 1GB

# Spread checkpoint writes to reduce I/O spikes
checkpoint_completion_target = 0.9

# =============================================================================
# LOGGING SETTINGS
# =============================================================================

# Enable logging collector
logging_collector = on

# Log file directory
log_directory = 'pg_log'

# Log file naming pattern with rotation
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'

# Log rotation based on time
log_rotation_age = 1d

# Log rotation based on size
log_rotation_size = 100MB

# Log slow queries taking longer than 1 second
log_min_duration_statement = 1000

# Log all connection attempts
log_connections = on

# Log all disconnections
log_disconnections = on

# Include timestamp in log entries
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Log lock wait events
log_lock_waits = on

# Log autovacuum operations taking longer than 0 seconds
log_autovacuum_min_duration = 0

# =============================================================================
# AUTOVACUUM SETTINGS
# =============================================================================

# Enable autovacuum (should always be on)
autovacuum = on

# Maximum number of autovacuum worker processes
autovacuum_max_workers = 4

# Time between autovacuum runs
autovacuum_naptime = 30s

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# Password encryption method - scram-sha-256 is more secure than md5
password_encryption = scram-sha-256

# SSL configuration (detailed in SSL section below)
ssl = on
ssl_cert_file = '/etc/postgresql/16/main/server.crt'
ssl_key_file = '/etc/postgresql/16/main/server.key'
```

### Step 2: Configure pg_hba.conf

The `pg_hba.conf` file controls client authentication - who can connect, from where, and how they authenticate.

```bash
# Create a backup of the original pg_hba.conf
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup

# Open pg_hba.conf for editing
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Configure secure authentication rules:

```conf
# =============================================================================
# PostgreSQL Client Authentication Configuration File
# =============================================================================
#
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# =============================================================================

# Local connections for the postgres superuser using peer authentication
# Peer authentication uses the OS username for authentication
local   all             postgres                                peer

# Local connections for all other users require password authentication
local   all             all                                     scram-sha-256

# IPv4 local connections - localhost only
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 local connections - localhost only
host    all             all             ::1/128                 scram-sha-256

# Allow connections from your application servers (replace with actual IPs)
# Use SSL for all remote connections
hostssl all             all             10.0.0.0/8              scram-sha-256
hostssl all             all             192.168.0.0/16          scram-sha-256

# Replication connections - allow from standby servers only
# Replace with your standby server IP addresses
hostssl replication     replicator      10.0.1.0/24             scram-sha-256

# Deny all other connections by default
# This line is implicit but included for clarity
# host    all             all             0.0.0.0/0               reject
```

### Step 3: Apply Configuration Changes

Restart PostgreSQL to apply the new configuration.

```bash
# Validate configuration syntax before restarting
sudo -u postgres pg_ctlcluster 16 main check

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql

# Verify PostgreSQL is running with new settings
sudo systemctl status postgresql

# Check the logs for any configuration errors
sudo tail -50 /var/log/postgresql/postgresql-16-main.log
```

## Part 3: User and Role Management

PostgreSQL uses a sophisticated role-based access control system. Proper user and role management is crucial for security.

### Step 1: Set a Strong Password for the postgres Superuser

The default postgres user has no password set. Secure it immediately.

```bash
# Connect to PostgreSQL as the postgres superuser
sudo -u postgres psql

# Set a strong password for the postgres superuser
# Use a password manager to generate a secure password
\password postgres
```

### Step 2: Create Application-Specific Roles

Create separate roles for different applications and purposes to follow the principle of least privilege.

```sql
-- Connect as postgres superuser first
-- sudo -u postgres psql

-- Create a role for your application with login capability
-- NOSUPERUSER: Cannot bypass permission checks
-- NOCREATEDB: Cannot create new databases
-- NOCREATEROLE: Cannot create new roles
CREATE ROLE app_user WITH
    LOGIN
    PASSWORD 'your_secure_password_here'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    CONNECTION LIMIT 50;

-- Create a read-only role for reporting and analytics
CREATE ROLE readonly_user WITH
    LOGIN
    PASSWORD 'another_secure_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    CONNECTION LIMIT 20;

-- Create a role for backup operations
CREATE ROLE backup_user WITH
    LOGIN
    PASSWORD 'backup_secure_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    REPLICATION;

-- Create a replication role for streaming replication
CREATE ROLE replicator WITH
    LOGIN
    PASSWORD 'replication_secure_password'
    REPLICATION;
```

### Step 3: Create Databases and Assign Permissions

Create application databases and grant appropriate permissions.

```sql
-- Create a database for your application
CREATE DATABASE myapp_production
    WITH OWNER = app_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Connect to the new database
\c myapp_production

-- Grant all privileges on the database to the application user
GRANT ALL PRIVILEGES ON DATABASE myapp_production TO app_user;

-- Grant connect privilege to the read-only user
GRANT CONNECT ON DATABASE myapp_production TO readonly_user;

-- Create schemas for better organization
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION app_user;

-- Grant usage on the schema to readonly_user
GRANT USAGE ON SCHEMA app TO readonly_user;

-- Grant SELECT on all tables in the schema to readonly_user
ALTER DEFAULT PRIVILEGES FOR ROLE app_user IN SCHEMA app
    GRANT SELECT ON TABLES TO readonly_user;

-- Grant SELECT on all sequences to readonly_user
ALTER DEFAULT PRIVILEGES FOR ROLE app_user IN SCHEMA app
    GRANT SELECT ON SEQUENCES TO readonly_user;
```

### Step 4: Verify User Permissions

Confirm that permissions are correctly configured.

```sql
-- List all roles and their attributes
\du

-- List all databases and their owners
\l

-- Check permissions on a specific database
\c myapp_production
\dn+

-- List all tables and their owners in current database
\dt *.*

-- Check specific table permissions
\dp app.*
```

## Part 4: SSL/TLS Configuration

Encrypting database connections is essential for protecting sensitive data in transit.

### Step 1: Generate SSL Certificates

For production, use certificates from a trusted Certificate Authority. For testing, self-signed certificates work.

```bash
# Create a directory for SSL certificates
sudo mkdir -p /etc/postgresql/16/main/ssl

# Generate a private key for the server
sudo openssl genrsa -out /etc/postgresql/16/main/ssl/server.key 4096

# Set restrictive permissions on the private key
sudo chmod 600 /etc/postgresql/16/main/ssl/server.key
sudo chown postgres:postgres /etc/postgresql/16/main/ssl/server.key

# Generate a self-signed certificate (for testing)
# For production, use a CSR and get it signed by a CA
sudo openssl req -new -x509 -days 365 \
    -key /etc/postgresql/16/main/ssl/server.key \
    -out /etc/postgresql/16/main/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=db.example.com"

# Set permissions on the certificate
sudo chmod 644 /etc/postgresql/16/main/ssl/server.crt
sudo chown postgres:postgres /etc/postgresql/16/main/ssl/server.crt
```

### Step 2: Configure PostgreSQL for SSL

Update `postgresql.conf` to use the SSL certificates.

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Add or update these SSL settings:

```ini
# =============================================================================
# SSL CONFIGURATION
# =============================================================================

# Enable SSL connections
ssl = on

# Path to the server certificate
ssl_cert_file = '/etc/postgresql/16/main/ssl/server.crt'

# Path to the server private key
ssl_key_file = '/etc/postgresql/16/main/ssl/server.key'

# Minimum TLS version - TLS 1.2 or higher for security
ssl_min_protocol_version = 'TLSv1.2'

# Prefer server cipher order for better security
ssl_prefer_server_ciphers = on

# Strong cipher suites only
ssl_ciphers = 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256'
```

### Step 3: Verify SSL Configuration

Restart PostgreSQL and verify SSL is working.

```bash
# Restart PostgreSQL to apply SSL configuration
sudo systemctl restart postgresql

# Test SSL connection from localhost
psql "host=localhost dbname=postgres user=postgres sslmode=require"

# Once connected, verify SSL is being used
# Run this SQL command in psql
SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();

# Check SSL certificate details from command line
openssl s_client -connect localhost:5432 -starttls postgres
```

## Part 5: Backup Strategies

Regular backups are critical for disaster recovery. PostgreSQL offers several backup methods.

### Strategy 1: Logical Backups with pg_dump

`pg_dump` creates logical backups that are portable and human-readable.

```bash
# Create a backup directory with proper permissions
sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql

# Backup a single database in custom format (compressed, most flexible)
sudo -u postgres pg_dump \
    --format=custom \
    --verbose \
    --file=/var/backups/postgresql/myapp_production_$(date +%Y%m%d_%H%M%S).dump \
    myapp_production

# Backup a single database in plain SQL format (human-readable)
sudo -u postgres pg_dump \
    --format=plain \
    --verbose \
    --file=/var/backups/postgresql/myapp_production_$(date +%Y%m%d_%H%M%S).sql \
    myapp_production

# Backup all databases using pg_dumpall
sudo -u postgres pg_dumpall \
    --verbose \
    --file=/var/backups/postgresql/all_databases_$(date +%Y%m%d_%H%M%S).sql

# Backup only global objects (roles, tablespaces)
sudo -u postgres pg_dumpall \
    --globals-only \
    --file=/var/backups/postgresql/globals_$(date +%Y%m%d_%H%M%S).sql
```

### Strategy 2: Physical Backups with pg_basebackup

`pg_basebackup` creates physical backups suitable for point-in-time recovery and setting up standbys.

```bash
# Create a base backup with WAL files included
sudo -u postgres pg_basebackup \
    --pgdata=/var/backups/postgresql/basebackup_$(date +%Y%m%d_%H%M%S) \
    --format=tar \
    --gzip \
    --wal-method=stream \
    --checkpoint=fast \
    --progress \
    --verbose

# Create a backup suitable for creating a standby server
sudo -u postgres pg_basebackup \
    --pgdata=/var/backups/postgresql/standby_base \
    --wal-method=stream \
    --write-recovery-conf \
    --checkpoint=fast \
    --progress
```

### Strategy 3: Automated Backup Script

Create a comprehensive backup script for scheduled execution.

```bash
# Create the backup script
sudo nano /usr/local/bin/postgresql-backup.sh
```

Add the following script content:

```bash
#!/bin/bash
# =============================================================================
# PostgreSQL Automated Backup Script
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=30
LOG_FILE="/var/log/postgresql-backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)

# Databases to backup (space-separated list or 'all' for all databases)
DATABASES="myapp_production"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

log "Starting PostgreSQL backup on ${HOSTNAME}"

# Backup each database
for DB in ${DATABASES}; do
    BACKUP_FILE="${BACKUP_DIR}/daily/${DB}_${DATE}.dump"

    log "Backing up database: ${DB}"

    # Create the backup using pg_dump with custom format
    pg_dump \
        --format=custom \
        --compress=9 \
        --file="${BACKUP_FILE}" \
        "${DB}" || error_exit "Failed to backup ${DB}"

    # Verify backup file was created
    if [[ -f "${BACKUP_FILE}" ]]; then
        SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log "Successfully backed up ${DB} (${SIZE})"
    else
        error_exit "Backup file not created for ${DB}"
    fi
done

# Backup global objects (roles, tablespaces)
GLOBALS_FILE="${BACKUP_DIR}/daily/globals_${DATE}.sql"
log "Backing up global objects"
pg_dumpall --globals-only --file="${GLOBALS_FILE}" || error_exit "Failed to backup globals"

# Create weekly backup on Sundays
if [[ $(date +%u) -eq 7 ]]; then
    log "Creating weekly backup"
    cp "${BACKUP_DIR}/daily/"*"_${DATE}."* "${BACKUP_DIR}/weekly/" 2>/dev/null || true
fi

# Create monthly backup on the 1st of each month
if [[ $(date +%d) -eq 01 ]]; then
    log "Creating monthly backup"
    cp "${BACKUP_DIR}/daily/"*"_${DATE}."* "${BACKUP_DIR}/monthly/" 2>/dev/null || true
fi

# Remove old backups based on retention policy
log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)"
find "${BACKUP_DIR}/daily" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/weekly" -type f -mtime +90 -delete
find "${BACKUP_DIR}/monthly" -type f -mtime +365 -delete

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "Backup completed. Total backup storage: ${TOTAL_SIZE}"

log "PostgreSQL backup completed successfully"
```

Make the script executable and schedule it:

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/postgresql-backup.sh

# Create a cron job to run the backup daily at 2 AM
sudo crontab -e -u postgres
```

Add the following cron entry:

```cron
# Daily PostgreSQL backup at 2:00 AM
0 2 * * * /usr/local/bin/postgresql-backup.sh >> /var/log/postgresql-backup.log 2>&1
```

### Restoring from Backups

```bash
# Restore from a custom format dump
sudo -u postgres pg_restore \
    --verbose \
    --clean \
    --if-exists \
    --dbname=myapp_production \
    /var/backups/postgresql/daily/myapp_production_20260107_020000.dump

# Restore from a plain SQL dump
sudo -u postgres psql \
    --dbname=myapp_production \
    --file=/var/backups/postgresql/daily/myapp_production_20260107_020000.sql

# Restore to a new database
sudo -u postgres createdb myapp_production_restored
sudo -u postgres pg_restore \
    --verbose \
    --dbname=myapp_production_restored \
    /var/backups/postgresql/daily/myapp_production_20260107_020000.dump
```

## Part 6: Streaming Replication Setup

Streaming replication provides high availability by maintaining one or more standby servers synchronized with the primary.

### Primary Server Configuration

Configure the primary server to send WAL data to standbys.

```bash
# Edit postgresql.conf on the PRIMARY server
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Ensure these settings are configured:

```ini
# =============================================================================
# STREAMING REPLICATION - PRIMARY SERVER
# =============================================================================

# WAL level must be 'replica' or 'logical' for replication
wal_level = replica

# Maximum number of concurrent connections from standby servers
max_wal_senders = 10

# Number of replication slots to reserve
max_replication_slots = 10

# Amount of WAL to retain for standbys
wal_keep_size = 2GB

# Enable archiving for additional safety (optional but recommended)
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/16/archive/%f'

# Hot standby feedback to prevent query conflicts
hot_standby_feedback = on
```

Update `pg_hba.conf` to allow replication connections:

```conf
# Allow replication connections from standby server
# Replace 10.0.1.10 with your standby server's IP address
hostssl replication replicator 10.0.1.10/32 scram-sha-256
```

Create the archive directory and restart:

```bash
# Create the WAL archive directory
sudo mkdir -p /var/lib/postgresql/16/archive
sudo chown postgres:postgres /var/lib/postgresql/16/archive

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql

# Create a replication slot for the standby
sudo -u postgres psql -c "SELECT pg_create_physical_replication_slot('standby1');"
```

### Standby Server Setup

Set up the standby server to receive WAL data from the primary.

```bash
# On the STANDBY server: Stop PostgreSQL if running
sudo systemctl stop postgresql

# Remove existing data directory (CAUTION: destroys all data)
sudo rm -rf /var/lib/postgresql/16/main/*

# Create base backup from primary server
# Replace 10.0.1.1 with your primary server's IP address
sudo -u postgres pg_basebackup \
    --host=10.0.1.1 \
    --port=5432 \
    --username=replicator \
    --pgdata=/var/lib/postgresql/16/main \
    --wal-method=stream \
    --write-recovery-conf \
    --slot=standby1 \
    --checkpoint=fast \
    --progress \
    --verbose
```

The `--write-recovery-conf` flag automatically creates the standby signal file and configures replication. Verify the configuration:

```bash
# Check that standby.signal file was created
ls -la /var/lib/postgresql/16/main/standby.signal

# View the auto-generated replication configuration
cat /var/lib/postgresql/16/main/postgresql.auto.conf
```

Configure the standby server settings:

```bash
# Edit postgresql.conf on the STANDBY server
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Add these standby-specific settings:

```ini
# =============================================================================
# STREAMING REPLICATION - STANDBY SERVER
# =============================================================================

# Enable hot standby mode to allow read-only queries
hot_standby = on

# Provide feedback to primary about query execution
hot_standby_feedback = on

# Maximum delay before canceling queries that conflict with recovery
max_standby_streaming_delay = 30s

# Log recovery-related information
log_recovery_conflict_waits = on
```

Start the standby server:

```bash
# Start PostgreSQL on the standby
sudo systemctl start postgresql

# Check the standby status
sudo systemctl status postgresql

# Verify replication is working
sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"
```

### Monitoring Replication

Monitor replication status on both primary and standby servers.

```sql
-- On the PRIMARY server: Check connected standbys
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    sync_state,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- Check replication slot status
SELECT
    slot_name,
    slot_type,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;

-- On the STANDBY server: Check replication status
SELECT
    status,
    receive_start_lsn,
    received_lsn,
    last_msg_send_time,
    last_msg_receipt_time,
    latest_end_lsn,
    pg_wal_lsn_diff(received_lsn, pg_last_wal_replay_lsn()) AS replay_lag_bytes
FROM pg_stat_wal_receiver;

-- Check if standby is in recovery mode
SELECT pg_is_in_recovery();
```

## Part 7: Performance Tuning Basics

Optimize PostgreSQL for your workload with these fundamental tuning parameters.

### Memory Configuration

```ini
# =============================================================================
# MEMORY TUNING GUIDELINES
# =============================================================================

# shared_buffers: Memory for caching data
# Start with 25% of total RAM, max 8GB for most workloads
# For 32GB RAM server:
shared_buffers = 8GB

# effective_cache_size: Estimate of OS disk cache
# Set to 50-75% of total RAM
# For 32GB RAM server:
effective_cache_size = 24GB

# work_mem: Memory for sorting and hash operations per query
# Be careful - this is per-operation, not per-connection
# Total usage = work_mem * max_connections * operations_per_query
work_mem = 256MB

# maintenance_work_mem: Memory for maintenance operations
# Can be higher as these operations are less frequent
maintenance_work_mem = 2GB

# huge_pages: Use huge pages for shared memory (if available)
# Reduces TLB misses and improves performance
huge_pages = try
```

### Query Planner Settings

```ini
# =============================================================================
# QUERY PLANNER OPTIMIZATION
# =============================================================================

# random_page_cost: Cost estimate for random disk access
# Lower for SSDs (1.1-1.5), higher for HDDs (4.0)
random_page_cost = 1.1

# effective_io_concurrency: Number of concurrent disk I/O operations
# Higher for SSDs (200), lower for HDDs (2)
effective_io_concurrency = 200

# default_statistics_target: Granularity of ANALYZE statistics
# Higher values = better plans but slower ANALYZE
default_statistics_target = 100

# enable_partitionwise_join: Allow partition-wise joins
enable_partitionwise_join = on

# enable_partitionwise_aggregate: Allow partition-wise aggregation
enable_partitionwise_aggregate = on
```

### Connection Pooling with PgBouncer

For high-traffic applications, use connection pooling to reduce connection overhead.

```bash
# Install PgBouncer
sudo apt install -y pgbouncer

# Create PgBouncer configuration
sudo nano /etc/pgbouncer/pgbouncer.ini
```

Configure PgBouncer:

```ini
[databases]
# Database connection definitions
# Format: dbname = host=X port=X dbname=X
myapp_production = host=127.0.0.1 port=5432 dbname=myapp_production

[pgbouncer]
# Listen on all interfaces
listen_addr = *
listen_port = 6432

# Authentication settings
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Pool mode: session, transaction, or statement
# 'transaction' is most common for web applications
pool_mode = transaction

# Maximum client connections to accept
max_client_conn = 1000

# Default pool size per user/database pair
default_pool_size = 25

# Minimum pool size
min_pool_size = 5

# Reserve connections for superusers
reserve_pool_size = 5

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# Admin console database
admin_users = postgres
stats_users = postgres
```

Create the user list file:

```bash
# Generate password hash for PgBouncer
# The format is: "username" "password"
echo '"app_user" "your_secure_password_here"' | sudo tee /etc/pgbouncer/userlist.txt
sudo chmod 600 /etc/pgbouncer/userlist.txt
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt

# Start PgBouncer
sudo systemctl enable pgbouncer
sudo systemctl start pgbouncer

# Test connection through PgBouncer
psql -h localhost -p 6432 -U app_user -d myapp_production
```

### Essential PostgreSQL Extensions

Install useful extensions for monitoring and performance.

```sql
-- Connect as superuser
-- sudo -u postgres psql

-- Enable pg_stat_statements for query performance tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable pg_trgm for fuzzy string matching and better LIKE performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for multi-column GIN indexes
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- View installed extensions
SELECT * FROM pg_extension;
```

Add `pg_stat_statements` to postgresql.conf:

```ini
# Load pg_stat_statements module
shared_preload_libraries = 'pg_stat_statements'

# Track all statements
pg_stat_statements.track = all

# Maximum number of statements to track
pg_stat_statements.max = 10000
```

Query the pg_stat_statements view to find slow queries:

```sql
-- Find the top 10 slowest queries by total time
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent_total,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Find queries with the highest I/O
SELECT
    calls,
    shared_blks_hit,
    shared_blks_read,
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) AS hit_ratio,
    query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY shared_blks_read DESC
LIMIT 10;
```

## Security Checklist

Before going to production, verify these security measures:

```bash
#!/bin/bash
# =============================================================================
# PostgreSQL Security Audit Checklist
# =============================================================================

echo "=== PostgreSQL Security Audit ==="

# Check if listening on all interfaces
echo -n "1. Network exposure: "
sudo -u postgres psql -c "SHOW listen_addresses;" -t | tr -d ' '

# Check SSL status
echo -n "2. SSL enabled: "
sudo -u postgres psql -c "SHOW ssl;" -t | tr -d ' '

# Check password encryption method
echo -n "3. Password encryption: "
sudo -u postgres psql -c "SHOW password_encryption;" -t | tr -d ' '

# Check for users without passwords
echo "4. Users without passwords:"
sudo -u postgres psql -c "SELECT usename FROM pg_shadow WHERE passwd IS NULL;"

# Check for superusers
echo "5. Superuser accounts:"
sudo -u postgres psql -c "SELECT usename FROM pg_user WHERE usesuper = true;"

# Check connection limits
echo -n "6. Max connections: "
sudo -u postgres psql -c "SHOW max_connections;" -t | tr -d ' '

# Check log settings
echo -n "7. Connection logging: "
sudo -u postgres psql -c "SHOW log_connections;" -t | tr -d ' '

# Check for public schema permissions
echo "8. Public schema permissions:"
sudo -u postgres psql -c "SELECT grantee, privilege_type FROM information_schema.schema_privileges WHERE schema_name = 'public';"
```

## Conclusion

You now have a fully configured, secure PostgreSQL installation on Ubuntu with:

- **Secure installation** with strong authentication and SSL/TLS encryption
- **Proper user management** following the principle of least privilege
- **Automated backups** with retention policies and restoration procedures
- **Streaming replication** for high availability
- **Performance optimizations** including connection pooling and query monitoring

Regular maintenance tasks to remember:
- Monitor disk space for WAL files and backups
- Review slow query logs weekly
- Test backup restoration monthly
- Update PostgreSQL for security patches
- Monitor replication lag on standby servers

For production environments, consider additional measures like:
- Setting up monitoring with Prometheus and Grafana
- Implementing log aggregation with the ELK stack
- Using configuration management tools like Ansible
- Setting up automated failover with tools like Patroni

PostgreSQL's robustness and flexibility make it an excellent choice for production databases when properly configured and maintained.
