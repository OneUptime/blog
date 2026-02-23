# How to Configure Terraform Enterprise with External PostgreSQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, PostgreSQL, Database, Configuration

Description: Configure Terraform Enterprise to use an external PostgreSQL database for production deployments with proper settings and performance tuning.

---

Terraform Enterprise supports two database modes: embedded and external. The embedded mode uses a PostgreSQL instance bundled inside the container - fine for testing but not suitable for production. External PostgreSQL gives you control over backups, replication, scaling, and maintenance. This guide covers how to set up and configure Terraform Enterprise with an external PostgreSQL database.

## Why External PostgreSQL

The embedded database runs inside the Terraform Enterprise container. If the container is destroyed, so is your database. External PostgreSQL provides:

- Independent backup and recovery
- High availability through replication
- Better performance with dedicated resources
- Compliance with database management policies
- Ability to monitor and tune the database independently

For any deployment beyond testing, external PostgreSQL is the right choice.

## PostgreSQL Version Requirements

Terraform Enterprise supports PostgreSQL versions 12 through 16. PostgreSQL 15 or 16 is recommended for new installations:

```bash
# Check your PostgreSQL version
psql --version

# Or if connecting to an existing server
psql -h your-db-host -U terraform -c "SELECT version();"
```

## Setting Up PostgreSQL

### Option 1: Managed Database Service

Using a managed service (RDS, Cloud SQL, Azure Database for PostgreSQL) is the easiest path:

```hcl
# AWS RDS example
resource "aws_db_instance" "tfe" {
  identifier     = "tfe-database"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "terraform_enterprise"
  username = "terraform"
  password = var.db_password

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 14

  # Required extensions
  parameter_group_name = aws_db_parameter_group.tfe.name

  skip_final_snapshot = false
}

resource "aws_db_parameter_group" "tfe" {
  name   = "tfe-postgres15"
  family = "postgres15"

  # Recommended parameters for TFE
  parameter {
    name  = "max_connections"
    value = "256"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "work_mem"
    value = "65536"  # 64MB
  }
}
```

### Option 2: Self-Managed PostgreSQL

If you run your own PostgreSQL server:

```bash
# Install PostgreSQL 15 on Ubuntu
sudo apt-get update
sudo apt-get install -y postgresql-15

# Start and enable the service
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Create the database and user:

```sql
-- Connect as the postgres superuser
-- sudo -u postgres psql

-- Create the database user
CREATE USER terraform WITH PASSWORD 'your-secure-password';

-- Create the database
CREATE DATABASE terraform_enterprise OWNER terraform;

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE terraform_enterprise TO terraform;

-- Connect to the database and set up extensions
\c terraform_enterprise

-- TFE requires the citext extension
CREATE EXTENSION IF NOT EXISTS citext;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO terraform;
```

## Required PostgreSQL Extensions

Terraform Enterprise requires the `citext` extension for case-insensitive text comparisons:

```sql
-- Connect to the terraform_enterprise database
\c terraform_enterprise

-- Create the required extension
CREATE EXTENSION IF NOT EXISTS citext;

-- Verify it is installed
SELECT * FROM pg_extension WHERE extname = 'citext';
```

If using a managed database service, make sure the extension is available. Most managed services include `citext` by default, but you may need to create it explicitly.

## Configuring Terraform Enterprise

Configure the database connection through environment variables when running the Terraform Enterprise container:

```bash
# Docker run with external PostgreSQL
docker run -d \
  --name terraform-enterprise \
  --restart always \
  -p 443:443 \
  -p 8800:8800 \
  -v tfe-data:/var/lib/terraform-enterprise \
  -e TFE_LICENSE="$TFE_LICENSE" \
  -e TFE_HOSTNAME="tfe.example.com" \
  -e TFE_ENCRYPTION_PASSWORD="$TFE_ENCRYPTION_PASSWORD" \
  -e TFE_OPERATIONAL_MODE="external" \
  -e TFE_DATABASE_HOST="postgres.internal.example.com" \
  -e TFE_DATABASE_PORT="5432" \
  -e TFE_DATABASE_USER="terraform" \
  -e TFE_DATABASE_PASSWORD="your-secure-password" \
  -e TFE_DATABASE_NAME="terraform_enterprise" \
  -e TFE_DATABASE_PARAMETERS="sslmode=require" \
  -e TFE_OBJECT_STORAGE_TYPE="s3" \
  -e TFE_OBJECT_STORAGE_S3_BUCKET="tfe-data" \
  -e TFE_OBJECT_STORAGE_S3_REGION="us-east-1" \
  --cap-add IPC_LOCK \
  images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
```

For Docker Compose:

```yaml
# docker-compose.yml
version: "3.9"

services:
  terraform-enterprise:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
    restart: always
    ports:
      - "443:443"
      - "8800:8800"
    volumes:
      - tfe-data:/var/lib/terraform-enterprise
    environment:
      TFE_LICENSE: "${TFE_LICENSE}"
      TFE_HOSTNAME: "tfe.example.com"
      TFE_ENCRYPTION_PASSWORD: "${TFE_ENCRYPTION_PASSWORD}"
      TFE_OPERATIONAL_MODE: "external"

      # Database connection settings
      TFE_DATABASE_HOST: "postgres.internal.example.com"
      TFE_DATABASE_PORT: "5432"
      TFE_DATABASE_USER: "terraform"
      TFE_DATABASE_PASSWORD: "${DB_PASSWORD}"
      TFE_DATABASE_NAME: "terraform_enterprise"
      TFE_DATABASE_PARAMETERS: "sslmode=require"

      # Object storage (required for external mode)
      TFE_OBJECT_STORAGE_TYPE: "s3"
      TFE_OBJECT_STORAGE_S3_BUCKET: "tfe-data"
      TFE_OBJECT_STORAGE_S3_REGION: "us-east-1"

    cap_add:
      - IPC_LOCK

volumes:
  tfe-data:
```

For Kubernetes:

```yaml
# In the Helm values.yaml
tfe:
  operationalMode: external

  database:
    secretName: tfe-database
    hostKey: host
    usernameKey: username
    passwordKey: password
    nameKey: name
    sslmodeKey: sslmode
```

## Database Connection Parameters

The `TFE_DATABASE_PARAMETERS` environment variable accepts PostgreSQL connection string parameters:

```bash
# Require SSL connections
TFE_DATABASE_PARAMETERS="sslmode=require"

# Require SSL with certificate verification
TFE_DATABASE_PARAMETERS="sslmode=verify-full&sslrootcert=/etc/ssl/certs/ca-certificates.crt"

# Set connection timeout
TFE_DATABASE_PARAMETERS="sslmode=require&connect_timeout=10"
```

Available SSL modes:
- `disable` - No SSL (not recommended)
- `allow` - Try SSL, fall back to non-SSL
- `prefer` - Try SSL first, then non-SSL
- `require` - Require SSL, do not verify certificate
- `verify-ca` - Require SSL, verify the CA
- `verify-full` - Require SSL, verify CA and hostname

For production, use `require` at minimum. Use `verify-full` if your CA certificate is available.

## Performance Tuning

Tune PostgreSQL for Terraform Enterprise workloads:

```sql
-- Recommended PostgreSQL settings for TFE
-- Edit postgresql.conf or set via parameter group

-- Connection limits
-- TFE needs around 100 connections depending on concurrency
ALTER SYSTEM SET max_connections = 256;

-- Memory settings (adjust based on available RAM)
-- shared_buffers should be ~25% of system RAM
ALTER SYSTEM SET shared_buffers = '4GB';

-- work_mem affects sort and hash operations
ALTER SYSTEM SET work_mem = '64MB';

-- maintenance_work_mem for VACUUM, CREATE INDEX, etc.
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- effective_cache_size helps the planner estimate available memory
ALTER SYSTEM SET effective_cache_size = '12GB';

-- WAL settings
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Reload the configuration
SELECT pg_reload_conf();
```

For managed databases, set these through the parameter group or configuration interface provided by your cloud provider.

## Monitoring the Database

Set up monitoring to catch issues early:

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity
WHERE datname = 'terraform_enterprise';

-- Check database size
SELECT pg_size_pretty(pg_database_size('terraform_enterprise'));

-- Check table sizes
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration,
       query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND datname = 'terraform_enterprise';

-- Check replication lag (if using replicas)
SELECT client_addr,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS pending_bytes,
       pg_wal_lsn_diff(sent_lsn, write_lsn) AS write_lag_bytes,
       pg_wal_lsn_diff(write_lsn, replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;
```

## Backup Strategy

Regardless of managed or self-hosted, implement a backup strategy:

```bash
#!/bin/bash
# backup-tfe-db.sh
# Backup the Terraform Enterprise database

DB_HOST="postgres.internal.example.com"
DB_USER="terraform"
DB_NAME="terraform_enterprise"
BACKUP_DIR="/var/backups/tfe-database"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$BACKUP_DIR"

# Create a compressed backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -f "$BACKUP_DIR/tfe-db-$DATE.dump"

echo "Backup created: $BACKUP_DIR/tfe-db-$DATE.dump"

# Clean up backups older than 30 days
find "$BACKUP_DIR" -name "tfe-db-*.dump" -mtime +30 -delete
```

For managed databases, use the built-in backup features (RDS automated backups, Cloud SQL backups, etc.).

## Restoring from Backup

If you need to restore:

```bash
# Stop Terraform Enterprise first
docker stop terraform-enterprise

# Restore the database
PGPASSWORD="$DB_PASSWORD" pg_restore \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  "$BACKUP_DIR/tfe-db-2026-02-23_10-00-00.dump"

# Restart Terraform Enterprise
docker start terraform-enterprise
```

## Migration from Embedded to External

If you started with the embedded database and need to migrate to external:

```bash
# Step 1: Stop Terraform Enterprise
docker stop terraform-enterprise

# Step 2: Export from the embedded database
docker exec terraform-enterprise pg_dump \
  -U terraform \
  -d terraform_enterprise \
  -F c \
  -f /tmp/tfe-export.dump

# Copy the dump out of the container
docker cp terraform-enterprise:/tmp/tfe-export.dump ./tfe-export.dump

# Step 3: Import into the external database
PGPASSWORD="$DB_PASSWORD" pg_restore \
  -h postgres.internal.example.com \
  -U terraform \
  -d terraform_enterprise \
  -F c \
  ./tfe-export.dump

# Step 4: Update the TFE configuration to use external mode
# Change TFE_OPERATIONAL_MODE to "external"
# Add database connection variables

# Step 5: Restart Terraform Enterprise with new configuration
docker start terraform-enterprise
```

## Troubleshooting Connection Issues

```bash
# Test connectivity to the database
psql -h postgres.internal.example.com \
  -U terraform \
  -d terraform_enterprise \
  -c "SELECT 1"

# Check if the citext extension exists
psql -h postgres.internal.example.com \
  -U terraform \
  -d terraform_enterprise \
  -c "SELECT * FROM pg_extension WHERE extname = 'citext'"

# Check TFE logs for database errors
docker logs terraform-enterprise 2>&1 | grep -i "database\|postgres\|pg_"

# Verify SSL connectivity
psql "host=postgres.internal.example.com \
  dbname=terraform_enterprise \
  user=terraform \
  password=$DB_PASSWORD \
  sslmode=require" \
  -c "SHOW ssl"
```

## Summary

External PostgreSQL is essential for production Terraform Enterprise deployments. Use a managed database service when possible for automated backups, patching, and high availability. Configure SSL for connections, tune performance parameters based on your workload, and implement monitoring for connection counts, query performance, and database size. The database is the backbone of your Terraform Enterprise installation - keeping it healthy keeps your infrastructure workflows running smoothly.
