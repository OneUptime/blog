# How to Migrate from Amazon RDS PostgreSQL to AlloyDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, PostgreSQL, AWS RDS, Migration, Database

Description: A step-by-step guide to migrating from Amazon RDS for PostgreSQL to Google Cloud AlloyDB using Database Migration Service for a cross-cloud database migration.

---

Moving a PostgreSQL database from Amazon RDS to Google Cloud AlloyDB is a cross-cloud migration that requires careful planning. The database needs to be transferred without losing data, and ideally with minimal downtime. Google Cloud Database Migration Service (DMS) supports RDS PostgreSQL as a source, which means you get managed replication rather than having to cobble together a custom solution with pg_dump or manual logical replication.

In this post, I will cover the full migration path from RDS PostgreSQL to AlloyDB, including the networking setup between AWS and GCP.

## Architecture Overview

The migration flow looks like this:

1. RDS PostgreSQL streams WAL (Write-Ahead Log) data via logical replication
2. DMS reads the replication stream over a VPN or interconnect between AWS and GCP
3. DMS writes the data to AlloyDB in your GCP VPC
4. Once replication is caught up, you cut over your applications to AlloyDB

The key requirement is network connectivity between AWS (where RDS lives) and GCP (where AlloyDB lives). You need either a VPN tunnel or a dedicated interconnect between the two clouds.

## Prerequisites

- An RDS PostgreSQL instance running version 10 or later
- A GCP project with AlloyDB and DMS APIs enabled
- Network connectivity between AWS VPC and GCP VPC (VPN or interconnect)
- The source RDS instance must have logical replication enabled

## Step 1 - Configure RDS for Logical Replication

RDS PostgreSQL needs logical replication enabled at the parameter group level:

```bash
# In AWS CLI, create a parameter group with logical replication
aws rds create-db-parameter-group \
  --db-parameter-group-name logical-replication \
  --db-parameter-group-family postgres15 \
  --description "Enable logical replication for DMS migration"

# Set the rds.logical_replication parameter
aws rds modify-db-parameter-group \
  --db-parameter-group-name logical-replication \
  --parameters "ParameterName=rds.logical_replication,ParameterValue=1,ApplyMethod=pending-reboot"

# Apply the parameter group to your RDS instance
aws rds modify-db-instance \
  --db-instance-identifier my-rds-instance \
  --db-parameter-group-name logical-replication

# Reboot the RDS instance to apply changes
aws rds reboot-db-instance \
  --db-instance-identifier my-rds-instance
```

After the reboot, verify logical replication is active:

```bash
# Connect to RDS and check wal_level
psql -h my-rds-instance.xxx.us-east-1.rds.amazonaws.com -U postgres -c "SHOW wal_level;"
# Should return 'logical'
```

## Step 2 - Set Up Network Connectivity

You need a VPN tunnel between AWS and GCP. Here is the GCP side setup:

```bash
# Create a Cloud VPN gateway in GCP
gcloud compute vpn-gateways create gcp-vpn-gw \
  --network=default \
  --region=us-central1

# Create a Cloud Router
gcloud compute routers create gcp-router \
  --network=default \
  --region=us-central1

# Create a VPN tunnel (replace with your AWS VPN endpoint IP)
gcloud compute vpn-tunnels create aws-tunnel \
  --region=us-central1 \
  --peer-address=AWS_VPN_ENDPOINT_IP \
  --shared-secret=YOUR_SHARED_SECRET \
  --vpn-gateway=gcp-vpn-gw \
  --interface=0 \
  --router=gcp-router
```

On the AWS side, create a Site-to-Site VPN connection pointing to the GCP VPN gateway's public IP. The details depend on your AWS networking setup, but the key is that RDS's private IP must be routable from GCP.

Verify connectivity by pinging the RDS instance's private IP from a GCP VM:

```bash
# Test connectivity from a GCP VM to the RDS instance
# (Note: RDS does not respond to ICMP, so use nc to test the PostgreSQL port)
nc -zv RDS_PRIVATE_IP 5432 -w 5
```

## Step 3 - Create the AlloyDB Destination

If you do not already have an AlloyDB cluster, create one:

```bash
# Create an AlloyDB cluster
gcloud alloydb clusters create migration-target \
  --region=us-central1 \
  --network=default \
  --password=STRONG_PASSWORD

# Create the primary instance
gcloud alloydb instances create primary-instance \
  --cluster=migration-target \
  --region=us-central1 \
  --instance-type=PRIMARY \
  --cpu-count=4
```

## Step 4 - Create DMS Connection Profiles

Create a connection profile for the RDS source:

```bash
# Create source connection profile for RDS PostgreSQL
gcloud database-migration connection-profiles create rds-source \
  --region=us-central1 \
  --display-name="Amazon RDS PostgreSQL" \
  --provider=POSTGRESQL \
  --host=RDS_PRIVATE_IP \
  --port=5432 \
  --username=postgres \
  --password=RDS_PASSWORD
```

Create a connection profile for the AlloyDB destination:

```bash
# Create destination connection profile for AlloyDB
gcloud database-migration connection-profiles create alloydb-dest \
  --region=us-central1 \
  --display-name="AlloyDB Destination" \
  --provider=ALLOYDB \
  --alloydb-cluster=migration-target
```

## Step 5 - Create and Start the Migration Job

```bash
# Create the migration job with continuous replication
gcloud database-migration migration-jobs create rds-to-alloydb \
  --region=us-central1 \
  --display-name="RDS to AlloyDB Migration" \
  --type=CONTINUOUS \
  --source=rds-source \
  --destination=alloydb-dest \
  --peer-vpc=default
```

Start the migration:

```bash
# Start the migration job
gcloud database-migration migration-jobs start rds-to-alloydb \
  --region=us-central1
```

Monitor progress:

```bash
# Monitor migration job status
gcloud database-migration migration-jobs describe rds-to-alloydb \
  --region=us-central1 \
  --format="yaml(state,phase,error)"
```

## Step 6 - Monitor and Validate

While the migration is running, monitor replication lag and data consistency:

```bash
# Check migration job status and phase
gcloud database-migration migration-jobs describe rds-to-alloydb \
  --region=us-central1
```

Run validation queries on both source and destination:

```bash
# Compare row counts on source (RDS)
psql -h RDS_HOST -U postgres -d mydb -c \
  "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"

# Compare row counts on destination (AlloyDB)
psql -h ALLOYDB_IP -U postgres -d mydb -c \
  "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"
```

## Step 7 - Cutover

When replication is caught up and you are ready to switch:

1. Put your application in maintenance mode (stop writes to RDS)
2. Wait for the replication lag to drop to zero
3. Promote the AlloyDB instance

```bash
# Promote AlloyDB as the primary database
gcloud database-migration migration-jobs promote rds-to-alloydb \
  --region=us-central1
```

4. Update your application connection strings to point to AlloyDB
5. Restart your application

## Step 8 - Post-Migration Tasks

After successful cutover:

```bash
# Verify AlloyDB is serving traffic correctly
psql -h ALLOYDB_IP -U postgres -d mydb -c "SELECT version();"
psql -h ALLOYDB_IP -U postgres -d mydb -c "SELECT count(*) FROM critical_table;"
```

Clean up migration resources:

```bash
# Delete the migration job and connection profiles
gcloud database-migration migration-jobs delete rds-to-alloydb --region=us-central1
gcloud database-migration connection-profiles delete rds-source --region=us-central1
gcloud database-migration connection-profiles delete alloydb-dest --region=us-central1
```

Keep the RDS instance running for a rollback period (at least a week). After you are confident the migration is stable, decommission it.

## Handling Extensions and Custom Types

Before migration, compare PostgreSQL extensions between RDS and AlloyDB:

```sql
-- On RDS: List installed extensions
SELECT extname, extversion FROM pg_extension ORDER BY extname;

-- Check AlloyDB supported extensions in the documentation
-- Common extensions like pg_trgm, uuid-ossp, and hstore are supported
```

If RDS uses an extension that AlloyDB does not support, you need to refactor your schema before migration.

## Application Connection String Changes

Here is what a typical connection string change looks like:

```python
# Before: Connecting to RDS
DATABASE_URL = "postgresql://user:pass@my-rds.xxx.us-east-1.rds.amazonaws.com:5432/mydb"

# After: Connecting to AlloyDB
DATABASE_URL = "postgresql://user:pass@10.0.0.5:5432/mydb"
```

If your application uses AWS Secrets Manager for the RDS password, switch to Google Cloud Secret Manager:

```bash
# Store the AlloyDB password in Secret Manager
echo -n "ALLOYDB_PASSWORD" | gcloud secrets create alloydb-password --data-file=-
```

## Cost Comparison Considerations

After migration, compare your costs. AlloyDB pricing is based on compute (vCPUs) and storage (data stored). RDS pricing is based on instance size and provisioned storage. The performance improvements from AlloyDB may let you use a smaller instance for the same workload, which could offset the per-unit price difference.

Migrating from RDS PostgreSQL to AlloyDB is a significant infrastructure change, but the Database Migration Service makes the data transfer portion manageable. The networking setup between AWS and GCP is usually the most complex part. Plan your VPN connectivity first, validate it works, and then the database migration itself is relatively smooth.
