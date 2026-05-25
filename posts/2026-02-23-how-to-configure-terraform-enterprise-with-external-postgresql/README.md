# How to Configure Terraform Enterprise with External PostgreSQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, PostgreSQL, Database, Configuration

Description: Configure Terraform Enterprise to use an external PostgreSQL database for production deployments with proper settings and performance tuning.

---

Terraform Enterprise can run with PostgreSQL managed by Terraform Enterprise in disk mode, or with an externally managed PostgreSQL database in external or active-active mode. Disk mode is fine for testing and some single-node deployments, but external PostgreSQL gives you control over backups, replication, scaling, and maintenance. This guide covers how to set up and configure Terraform Enterprise with an external PostgreSQL database.

## Why External PostgreSQL

In disk mode, Terraform Enterprise manages PostgreSQL on the instance and stores data on the configured persistent disk. External PostgreSQL provides:

- Independent backup and recovery
- High availability through replication
- Better performance with dedicated resources
- Compliance with database management policies
- Ability to monitor and tune the database independently

For any deployment beyond testing, external PostgreSQL is the right choice.

## PostgreSQL Version Requirements

Terraform Enterprise supports PostgreSQL versions 13.x, 14.4 and later 14.x, 15.x, 16.x, and 17.x. PostgreSQL 15, 16, or 17 is recommended for new installations:

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
  final_snapshot_identifier = "tfe-database-final-snapshot"

  # Custom PostgreSQL settings
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

-- Connect to the database and set up schemas and extensions
\c terraform_enterprise

-- TFE requires these schemas and extensions
CREATE SCHEMA IF NOT EXISTS rails AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS vault AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS registry AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS task_worker AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS terraform_enterprise AUTHORIZATION terraform;

CREATE EXTENSION IF NOT EXISTS "hstore" WITH SCHEMA "rails";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "rails";
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "registry";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO terraform;
```

## Required PostgreSQL Extensions

Terraform Enterprise requires the `hstore`, `uuid-ossp`, and `citext` extensions in specific schemas:

```sql
-- Connect to the terraform_enterprise database
\c terraform_enterprise

-- Create the required schemas and extensions
CREATE SCHEMA IF NOT EXISTS rails AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS vault AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS registry AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS task_worker AUTHORIZATION terraform;
CREATE SCHEMA IF NOT EXISTS terraform_enterprise AUTHORIZATION terraform;
CREATE EXTENSION IF NOT EXISTS "hstore" WITH SCHEMA "rails";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "rails";
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "registry";

-- Verify they are installed
SELECT extname, extnamespace::regnamespace
FROM pg_extension
WHERE extname IN ('hstore', 'uuid-ossp', 'citext');
```

If using a managed database service, make sure these extensions are available. Most managed PostgreSQL services include them, but you may need to create them explicitly.

## Configuring Terraform Enterprise

Configure the database connection through environment variables when running the Terraform Enterprise container:

```bash
# Docker run with external PostgreSQL
TFE_IMAGE_TAG="vYYYYMM-#"

docker run -d \
  --name terraform-enterprise \
  --restart always \
  -p 80:80 \
  -p 443:443 \
  -v /var/run/docker.sock:/run/docker.sock \
  -v ./certs:/etc/ssl/private/terraform-enterprise \
  -v tfe-cache:/var/cache/tfe-task-worker/terraform \
  -e TFE_LICENSE="$TFE_LICENSE" \
  -e TFE_HOSTNAME="tfe.example.com" \
  -e TFE_ENCRYPTION_PASSWORD="$TFE_ENCRYPTION_PASSWORD" \
  -e TFE_OPERATIONAL_MODE="external" \
  -e TFE_TLS_CERT_FILE="/etc/ssl/private/terraform-enterprise/cert.pem" \
  -e TFE_TLS_KEY_FILE="/etc/ssl/private/terraform-enterprise/key.pem" \
  -e TFE_DATABASE_HOST="postgres.internal.example.com:5432" \
  -e TFE_DATABASE_USER="terraform" \
  -e TFE_DATABASE_PASSWORD="your-secure-password" \
  -e TFE_DATABASE_NAME="terraform_enterprise" \
  -e TFE_DATABASE_PARAMETERS="sslmode=require" \
  -e TFE_OBJECT_STORAGE_TYPE="s3" \
  -e TFE_OBJECT_STORAGE_S3_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  -e TFE_OBJECT_STORAGE_S3_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  -e TFE_OBJECT_STORAGE_S3_BUCKET="tfe-data" \
  -e TFE_OBJECT_STORAGE_S3_REGION="us-east-1" \
  --cap-add IPC_LOCK \
  images.releases.hashicorp.com/hashicorp/terraform-enterprise:"${TFE_IMAGE_TAG}"
```

For Docker Compose:

```yaml
# docker-compose.yml
version: "3.9"

services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:${TFE_IMAGE_TAG}
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/run/docker.sock
      - ./certs:/etc/ssl/private/terraform-enterprise
      - tfe-cache:/var/cache/tfe-task-worker/terraform
    environment:
      TFE_LICENSE: "${TFE_LICENSE}"
      TFE_HOSTNAME: "tfe.example.com"
      TFE_ENCRYPTION_PASSWORD: "${TFE_ENCRYPTION_PASSWORD}"
      TFE_OPERATIONAL_MODE: "external"
      TFE_TLS_CERT_FILE: "/etc/ssl/private/terraform-enterprise/cert.pem"
      TFE_TLS_KEY_FILE: "/etc/ssl/private/terraform-enterprise/key.pem"

      # Database connection settings
      TFE_DATABASE_HOST: "postgres.internal.example.com:5432"
      TFE_DATABASE_USER: "terraform"
      TFE_DATABASE_PASSWORD: "${DB_PASSWORD}"
      TFE_DATABASE_NAME: "terraform_enterprise"
      TFE_DATABASE_PARAMETERS: "sslmode=require"

      # Object storage (required for external mode)
      TFE_OBJECT_STORAGE_TYPE: "s3"
      TFE_OBJECT_STORAGE_S3_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      TFE_OBJECT_STORAGE_S3_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      TFE_OBJECT_STORAGE_S3_BUCKET: "tfe-data"
      TFE_OBJECT_STORAGE_S3_REGION: "us-east-1"

    cap_add:
      - IPC_LOCK

volumes:
  tfe-cache:
```

For Kubernetes:

```yaml
# In the Helm values.yaml
env:
  variables:
    TFE_HOSTNAME: "tfe.example.com"
    TFE_DATABASE_HOST: "postgres.internal.example.com:5432"
    TFE_DATABASE_USER: "terraform"
    TFE_DATABASE_NAME: "terraform_enterprise"
    TFE_DATABASE_PARAMETERS: "sslmode=require"
    TFE_OBJECT_STORAGE_TYPE: "s3"
    TFE_OBJECT_STORAGE_S3_BUCKET: "tfe-data"
    TFE_OBJECT_STORAGE_S3_REGION: "us-east-1"
  secrets:
    TFE_DATABASE_PASSWORD: "${DB_PASSWORD}"
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

## Migration from Disk to External

If you started in disk mode and need to migrate to external, use Terraform Enterprise backup and restore rather than dumping the internal PostgreSQL database directly:

```bash
# Step 1: Create a backup from the old installation
export TOKEN="$OLD_TFE_BACKUP_API_TOKEN"
export OLD_TFE_HOSTNAME="old-tfe.example.com"
export NEW_TFE_HOSTNAME="new-tfe.example.com"

cat > payload.json <<'EOF'
{
  "password": "<TFE_ENCRYPTION_PASSWORD>"
}
EOF

curl \
  --header "Authorization: Bearer ${TOKEN}" \
  --request POST \
  --data @payload.json \
  --output backup.blob \
  "https://${OLD_TFE_HOSTNAME}/_backup/api/v1/backup"

# Step 2: Create a new external-mode installation with the same encryption password
# and configure TFE_DATABASE_* plus object storage settings.

# Step 3: Restore the backup to the new installation
export TOKEN="$NEW_TFE_BACKUP_API_TOKEN"
curl \
  --header "Authorization: Bearer ${TOKEN}" \
  --request POST \
  --form config=@payload.json \
  --form snapshot=@backup.blob \
  "https://${NEW_TFE_HOSTNAME}/_backup/api/v1/restore"
```

## Troubleshooting Connection Issues

```bash
# Test connectivity to the database
psql -h postgres.internal.example.com \
  -U terraform \
  -d terraform_enterprise \
  -c "SELECT 1"

# Check if the required extensions exist
psql -h postgres.internal.example.com \
  -U terraform \
  -d terraform_enterprise \
  -c "SELECT extname, extnamespace::regnamespace FROM pg_extension WHERE extname IN ('hstore', 'uuid-ossp', 'citext')"

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
