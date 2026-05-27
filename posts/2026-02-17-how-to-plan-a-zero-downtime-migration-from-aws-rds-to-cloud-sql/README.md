# How to Plan a Zero-Downtime Migration from AWS RDS to Cloud SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, AWS RDS, Database Migration, Zero Downtime

Description: Step-by-step guide to planning and executing a zero-downtime database migration from AWS RDS to Google Cloud SQL using continuous replication and cutover strategies.

---

Migrating a production database from AWS RDS to Google Cloud SQL without downtime is one of the more nerve-wracking tasks you will face as a cloud engineer. The stakes are high - any gap in availability means lost transactions, angry users, and potentially corrupted data. But with the right approach, you can pull it off cleanly.

I have done this migration for PostgreSQL and MySQL workloads, and the key is continuous replication. You set up a pipeline that keeps both databases in sync, validate everything, and then cut over in seconds rather than hours.

## Prerequisites

Before you start, make sure you have these pieces in place:

- A Cloud SQL instance provisioned in GCP with the same engine version as your RDS instance (or a compatible newer version)
- Network connectivity between AWS and GCP (Cloud VPN or Interconnect)
- Google Cloud Database Migration Service (DMS) enabled in your project
- Sufficient storage and compute allocated on the Cloud SQL side

The network piece is critical. Your AWS RDS instance needs to be reachable from the Cloud SQL destination instance, either through a private connectivity option such as VPC peering or via public IP with proper security group rules.

## Architecture Overview

Here is how the zero-downtime migration works at a high level:

```mermaid
graph LR
    A[AWS RDS Primary] -->|Continuous Replication| B[GCP Database Migration Service]
    B -->|Writes| C[Cloud SQL Instance]
    D[Application] -->|Reads/Writes| A
    D -.->|After Cutover| C
```

The idea is simple: DMS reads the binary log (MySQL) or WAL (PostgreSQL) from your RDS instance and applies changes to Cloud SQL in near-real-time. Your application keeps talking to RDS until you are ready to switch.

## Step 1: Prepare Your RDS Instance

First, make sure your RDS instance is configured for logical replication. For MySQL, you need automated backups enabled, binary logs retained long enough for the migration, and binlog in ROW format. For PostgreSQL, you need logical replication enabled.

This shows how to check and enable the required settings for MySQL on RDS:

```bash
# Check current binlog settings on your RDS instance

# Connect to your RDS MySQL instance and verify
mysql -h your-rds-endpoint.amazonaws.com -u admin -p -e "
  SHOW VARIABLES LIKE 'log_bin';
  SHOW VARIABLES LIKE 'binlog_format';
  SHOW VARIABLES LIKE 'binlog_row_image';
"

# Retain enough binary log history for the migration window
mysql -h your-rds-endpoint.amazonaws.com -u admin -p -e "
  CALL mysql.rds_set_configuration('binlog retention hours', 168);
"

# If binlog_format is not ROW, update the RDS parameter group.
# For RDS for MySQL this parameter is dynamic, but existing sessions might need
# to reconnect before they use the new value.
aws rds modify-db-parameter-group \
    --db-parameter-group-name your-param-group \
    --parameters "ParameterName=binlog_format,ParameterValue=ROW,ApplyMethod=immediate"
```

For PostgreSQL, update the RDS parameter group:

```bash
# Enable logical replication for PostgreSQL RDS
# This requires a reboot of the RDS instance
aws rds modify-db-parameter-group \
    --db-parameter-group-name your-pg-param-group \
    --parameters "ParameterName=rds.logical_replication,ParameterValue=1,ApplyMethod=pending-reboot"

# Reboot the instance to apply changes
aws rds reboot-db-instance --db-instance-identifier your-rds-instance
```

Note that the PostgreSQL reboot is required and should be scheduled in a maintenance window. The interruption is usually brief, but the exact duration depends on your instance size, engine state, and Multi-AZ failover behavior.

## Step 2: Set Up Cloud SQL

Create your destination Cloud SQL instance with the right specs. Match or exceed the compute and storage of your RDS instance.

```bash
# Create a Cloud SQL instance for PostgreSQL
# Match the version and spec to your RDS source
gcloud sql instances create my-cloud-sql \
    --database-version=POSTGRES_15 \
    --tier=db-custom-4-16384 \
    --region=us-central1 \
    --storage-size=100 \
    --storage-type=SSD \
    --availability-type=REGIONAL \
    --backup-start-time=04:00

# For DMS migrations to an existing Cloud SQL for PostgreSQL instance,
# keep the destination empty except for system configuration data.
```

## Step 3: Configure Database Migration Service

DMS is the glue that makes this work. Create a connection profile for both the source and destination.

```bash
# Create a PostgreSQL connection profile for the source (AWS RDS)
gcloud database-migration connection-profiles create postgresql source-rds \
    --region=us-central1 \
    --display-name="AWS RDS Source" \
    --host=your-rds-endpoint.amazonaws.com \
    --port=5432 \
    --database=myapp_production \
    --username=migration_user \
    --password=your-password

# Create a PostgreSQL connection profile for the existing destination (Cloud SQL)
gcloud database-migration connection-profiles create postgresql dest-cloudsql \
    --region=us-central1 \
    --display-name="Cloud SQL Destination" \
    --cloudsql-instance=my-cloud-sql
```

Now create the migration job:

```bash
# Create a continuous migration job
# This will handle initial data load and ongoing replication
gcloud database-migration migration-jobs create rds-to-cloudsql \
    --region=us-central1 \
    --display-name="RDS to Cloud SQL Migration" \
    --source=source-rds \
    --destination=dest-cloudsql \
    --type=CONTINUOUS

# For an existing Cloud SQL destination, demote it to a replica before starting
gcloud database-migration migration-jobs demote-destination rds-to-cloudsql \
    --region=us-central1
```

## Step 4: Run the Initial Data Load

Start the migration job. DMS will first do a full dump of your RDS database, then switch to continuous replication.

```bash
# Start the migration job
gcloud database-migration migration-jobs start rds-to-cloudsql \
    --region=us-central1

# Check the status of the migration
gcloud database-migration migration-jobs describe rds-to-cloudsql \
    --region=us-central1 \
    --format="table(name,state,phase,error)"
```

The initial load time depends on your database size. For a 100GB database, expect anywhere from 30 minutes to a few hours. During this time, your application continues to work normally against RDS.

## Step 5: Monitor Replication Lag

Once the initial load completes, DMS switches to continuous replication mode. Monitor the replication lag to make sure it stays close to zero.

```bash
# Check the migration job state and phase
gcloud database-migration migration-jobs describe rds-to-cloudsql \
    --region=us-central1 \
    --format="value(state,phase)"
```

For the actual lag value, use the DMS migration job Monitoring tab or Cloud Monitoring metrics such as `datamigration.googleapis.com/migration_job/max_replica_sec_lag` and `datamigration.googleapis.com/migration_job/max_replica_bytes_lag`. You want the lag to be zero before you attempt cutover. If it is spiking, investigate whether your Cloud SQL instance has enough resources or if there are particularly heavy write patterns on the source.

## Step 6: Validate Data Integrity

Before cutting over, validate that the data in Cloud SQL matches what is in RDS. You can do this with row counts and checksums on critical tables.

```bash
# Compare row counts between source and destination
# Run these queries against both databases and compare
psql -h your-rds-endpoint.amazonaws.com -U admin -d myapp_production -c "
  SELECT 'users' as tbl, count(*) FROM users
  UNION ALL
  SELECT 'orders' as tbl, count(*) FROM orders
  UNION ALL
  SELECT 'transactions' as tbl, count(*) FROM transactions;
"

# Run the same against Cloud SQL
gcloud sql connect my-cloud-sql --user=postgres --database=myapp_production << 'EOF'
  SELECT 'users' as tbl, count(*) FROM users
  UNION ALL
  SELECT 'orders' as tbl, count(*) FROM orders
  UNION ALL
  SELECT 'transactions' as tbl, count(*) FROM transactions;
EOF
```

## Step 7: The Cutover

This is the moment of truth. The cutover process looks like this:

```mermaid
sequenceDiagram
    participant App as Application
    participant RDS as AWS RDS
    participant DMS as Migration Service
    participant SQL as Cloud SQL

    App->>RDS: Normal traffic
    DMS->>SQL: Continuous replication
    Note over App: Start cutover window
    App->>App: Stop writes (maintenance mode)
    DMS->>SQL: Final sync (seconds)
    Note over DMS: Replication lag = 0
    DMS->>DMS: Promote Cloud SQL
    App->>SQL: Switch connection string
    App->>SQL: Resume normal traffic
```

In practice, the cutover steps are:

1. Put your application in maintenance mode (stop writes, or queue them)
2. Wait for replication lag to hit zero
3. Promote the Cloud SQL destination using DMS
4. Update your application connection strings to point to Cloud SQL
5. Take the application out of maintenance mode

The actual downtime window is typically 30-60 seconds if you have your connection string changes automated through environment variables or a configuration service.

```bash
# Promote the Cloud SQL instance (finalize the migration)
gcloud database-migration migration-jobs promote rds-to-cloudsql \
    --region=us-central1
```

## Step 8: Post-Migration Verification

After cutover, monitor your application closely for the first few hours:

- Check query performance in Cloud SQL using the Query Insights dashboard
- Monitor error rates in your application logs
- Verify that all application features that interact with the database work correctly
- Keep the RDS instance running for at least 48 hours as a rollback option

## Rollback Plan

Always have a rollback plan. If something goes wrong after cutover, you need a way to switch back to RDS without losing writes that were accepted by Cloud SQL. The safest approach is to keep the RDS instance running and either keep the application in a no-write mode until the cutover is verified, or have a tested reverse replication or resynchronization path ready before production cutover. Do not simply switch the connection string back to RDS after Cloud SQL has accepted writes unless those writes have been copied back.

Zero-downtime database migration is achievable with careful planning. The tools are there - DMS handles the heavy lifting of continuous replication. Your job is to plan the cutover choreography and test it in a staging environment before doing it in production.
