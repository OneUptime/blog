# How to Migrate Amazon RDS PostgreSQL to Cloud SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Database Migration, AWS RDS

Description: Migrate your Amazon RDS PostgreSQL databases to Google Cloud SQL using the Database Migration Service for continuous replication and minimal downtime.

---

Database migrations are nerve-wracking. Your data is your most valuable asset, and any mistake during migration means potential data loss or extended downtime. Google Cloud's Database Migration Service (DMS) makes this process significantly safer by providing continuous replication from RDS PostgreSQL to Cloud SQL, allowing you to cut over when you are ready.

In this post, I will walk through the entire migration process from preparation to cutover, including the gotchas that documentation does not always cover.

## How Database Migration Service Works

DMS uses PostgreSQL logical replication under the hood. It creates a replication slot on your RDS source, performs an initial full data dump, and then continuously streams changes (CDC - Change Data Capture) until you perform the cutover.

```mermaid
flowchart LR
    A[RDS PostgreSQL] -->|Logical Replication| B[Database Migration Service]
    B -->|Initial Load + CDC| C[Cloud SQL PostgreSQL]
    D[Application] -->|Reads/Writes| A
    D -.->|After Cutover| C
```

## Prerequisites on the RDS Side

Before starting, you need to configure your RDS instance for logical replication:

```sql
-- Check current setting (needs to be 'logical')
SHOW wal_level;

-- Check that max_replication_slots is sufficient
SHOW max_replication_slots;

-- Check max_wal_senders
SHOW max_wal_senders;

-- Check that pglogical is loaded
SHOW shared_preload_libraries;
```

If wal_level is not set to logical, update the RDS parameter group:

```hcl
# rds-params.tf

# Update RDS parameter group for logical replication

resource "aws_db_parameter_group" "migration_ready" {
  family = "postgres15"
  name   = "migration-ready-postgres15"

  parameter {
    name         = "shared_preload_libraries"
    value        = "pglogical"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "rds.logical_replication"
    value        = "1"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "max_replication_slots"
    value        = "10"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "max_wal_senders"
    value        = "10"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "wal_sender_timeout"
    value        = "0"
    apply_method = "pending-reboot"
  }
}
```

After applying the parameter group, you need to reboot the RDS instance. Plan this during a maintenance window.

You also need to install pglogical in each database that DMS will migrate and grant the migration user the required access:

```sql
CREATE EXTENSION IF NOT EXISTS pglogical;

GRANT USAGE ON SCHEMA pglogical TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA pglogical TO migration_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO migration_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO migration_user;
GRANT rds_replication TO migration_user;
```

## Setting Up Network Connectivity

DMS needs network access from Google Cloud to your RDS instance. You have several options:

**Option 1: VPN between AWS and GCP (recommended for production)**

```hcl
# vpn-connectivity.tf
# VPN tunnel between GCP and AWS for database migration

resource "google_compute_vpn_gateway" "migration_vpn" {
  name    = "migration-vpn-gateway"
  network = google_compute_network.vpc.id
  project = var.project_id
  region  = var.region
}

resource "google_compute_vpn_tunnel" "to_aws" {
  name                    = "vpn-to-aws"
  peer_ip                 = var.aws_vpn_gateway_ip
  shared_secret           = var.vpn_shared_secret
  target_vpn_gateway      = google_compute_vpn_gateway.migration_vpn.id
  local_traffic_selector  = ["10.0.0.0/8"]
  remote_traffic_selector = ["172.16.0.0/12"]
  project                 = var.project_id
  region                  = var.region
}
```

**Option 2: Public IP with SSL (simpler but less secure)**

Make sure your RDS security group allows connections from the DMS IP range.

## Creating the Cloud SQL Destination

Set up the destination Cloud SQL instance:

```hcl
# cloud-sql.tf
# Destination Cloud SQL PostgreSQL instance

resource "google_sql_database_instance" "destination" {
  name             = "production-postgres-migrated"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    # Match or exceed your RDS instance size
    tier = "db-custom-4-16384"  # 4 vCPU, 16 GB RAM

    disk_size     = 100
    disk_type     = "PD_SSD"
    disk_autoresize = true

    # Enable high availability
    availability_type = "REGIONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      # Use private IP for production
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "shared_buffers"
      value = "524288"  # In 8KB pages = 4GB
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 3
      update_track = "stable"
    }
  }

  deletion_protection = true
}
```

## Creating the Migration Job

Now create the DMS migration job using gcloud:

```bash
# Create a connection profile for the RDS source
gcloud database-migration connection-profiles create postgresql \
  rds-source-profile \
  --region=us-central1 \
  --display-name="RDS PostgreSQL Source" \
  --host=mydb.cluster-abc123.us-east-1.rds.amazonaws.com \
  --port=5432 \
  --username=migration_user \
  --password="$(gcloud secrets versions access latest --secret=rds-password)" \
  --database=mydb \
  --ssl-type=SERVER_ONLY

# Create a connection profile for the existing Cloud SQL destination
gcloud database-migration connection-profiles create postgresql \
  cloudsql-destination-profile \
  --region=us-central1 \
  --display-name="Cloud SQL PostgreSQL Destination" \
  --cloudsql-instance=production-postgres-migrated

# Create the migration job
gcloud database-migration migration-jobs create \
  rds-to-cloudsql-migration \
  --region=us-central1 \
  --display-name="Production PostgreSQL Migration" \
  --source=rds-source-profile \
  --destination=cloudsql-destination-profile \
  --type=CONTINUOUS

# Demote the destination so it can act as the migration replica
gcloud database-migration migration-jobs demote-destination \
  rds-to-cloudsql-migration \
  --region=us-central1

# Verify and start the migration job
gcloud database-migration migration-jobs verify \
  rds-to-cloudsql-migration \
  --region=us-central1

gcloud database-migration migration-jobs start \
  rds-to-cloudsql-migration \
  --region=us-central1
```

## Monitoring the Migration

Track the migration progress and replication lag:

```python
# monitor_migration.py
# Monitors DMS migration job progress and replication lag
from google.cloud import clouddms_v1
import time

def monitor_migration(project_id, region, job_name):
    """Monitor the database migration job progress."""
    client = clouddms_v1.DataMigrationServiceClient()
    name = (
        f"projects/{project_id}/locations/{region}"
        f"/migrationJobs/{job_name}"
    )

    while True:
        job = client.get_migration_job(request={"name": name})

        print(f"Job: {job.display_name}")
        print(f"Phase: {job.phase}")
        print(f"State: {job.state}")

        if job.duration:
            print(f"Duration: {job.duration}")

        # Check for errors
        if job.error:
            print(f"ERROR: {job.error.message}")

        # Show replication lag if in CDC phase
        if job.phase == clouddms_v1.MigrationJob.Phase.CDC:
            print(f"Replication lag: monitoring...")

        print("---")

        if job.state in (
            clouddms_v1.MigrationJob.State.COMPLETED,
            clouddms_v1.MigrationJob.State.FAILED,
        ):
            break

        time.sleep(30)


if __name__ == "__main__":
    monitor_migration(
        "my-gcp-project",
        "us-central1",
        "rds-to-cloudsql-migration"
    )
```

## Pre-Cutover Validation

Before cutting over, validate the data:

```sql
-- Run on both RDS and Cloud SQL, compare results

-- Generate exact row count statements for all user tables
SELECT format(
    'SELECT %L AS table_name, count(*) AS row_count FROM %I.%I;',
    schemaname || '.' || relname,
    schemaname,
    relname
)
FROM pg_stat_user_tables
ORDER BY schemaname, relname;

-- Check sequence values
SELECT schemaname, sequencename, last_value
FROM pg_sequences
ORDER BY schemaname, sequencename;

-- Verify schema objects
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;

-- Check constraints
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conname;
```

Run a Python script to automate the comparison:

```python
# validate_migration.py
# Compares source and destination databases for consistency
import psycopg2
from psycopg2 import sql

def compare_databases(source_config, dest_config):
    """Compare source RDS and destination Cloud SQL databases."""
    source_conn = psycopg2.connect(**source_config)
    dest_conn = psycopg2.connect(**dest_config)

    results = {}

    # Compare table row counts
    source_counts = get_exact_row_counts(source_conn)
    dest_counts = get_exact_row_counts(dest_conn)

    mismatches = []
    for table, count in source_counts.items():
        dest_count = dest_counts.get(table, 0)
        if count != dest_count:
            mismatches.append({
                "table": table,
                "source": count,
                "destination": dest_count,
                "difference": count - dest_count,
            })

    results["row_count_mismatches"] = mismatches
    results["tables_checked"] = len(source_counts)
    results["all_match"] = len(mismatches) == 0

    source_conn.close()
    dest_conn.close()

    return results


def get_exact_row_counts(conn):
    """Return exact row counts for every non-system table."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
    """)

    counts = {}
    for schema, table in cursor.fetchall():
        query = sql.SQL("SELECT count(*) FROM {}.{}").format(
            sql.Identifier(schema),
            sql.Identifier(table),
        )
        cursor.execute(query)
        counts[f"{schema}.{table}"] = cursor.fetchone()[0]

    cursor.close()
    return counts
```

## Performing the Cutover

When you are ready to cut over:

```bash
# Step 1: Put the application in maintenance mode
# (stop writes to the source database)

# Step 2: Wait for replication lag to reach zero
gcloud database-migration migration-jobs describe \
  rds-to-cloudsql-migration \
  --region=us-central1

# Step 3: Promote the migration job (stops replication)
gcloud database-migration migration-jobs promote \
  rds-to-cloudsql-migration \
  --region=us-central1

# Step 4: Update application connection strings to point to Cloud SQL

# Step 5: Bring the application out of maintenance mode
```

## Post-Migration Tasks

After cutover, do not forget these steps:

```sql
-- Update statistics on Cloud SQL
ANALYZE;

-- Verify all sequences are correct
-- (DMS sometimes does not sync sequence values perfectly)
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Re-create any custom extensions if needed
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Wrapping Up

Migrating RDS PostgreSQL to Cloud SQL with DMS is the lowest-risk approach available. The continuous replication means your Cloud SQL instance stays in sync with RDS until you are ready to cut over, and if anything goes wrong during cutover, you can fall back to RDS quickly. The key steps are getting logical replication configured on RDS, ensuring network connectivity, running thorough validation before cutover, and having a clear rollback plan. Take the time to do a practice run with a staging database before attempting the production migration.
