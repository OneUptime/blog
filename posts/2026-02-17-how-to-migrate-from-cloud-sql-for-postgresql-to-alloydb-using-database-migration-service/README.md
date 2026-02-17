# How to Migrate from Cloud SQL for PostgreSQL to AlloyDB Using Database Migration Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, Cloud SQL, PostgreSQL, Database Migration, DMS

Description: A complete guide to migrating from Cloud SQL for PostgreSQL to AlloyDB using Google Cloud Database Migration Service with minimal downtime.

---

If you are running Cloud SQL for PostgreSQL and want to move to AlloyDB for better performance, the Database Migration Service (DMS) is the cleanest path. DMS handles the continuous replication from Cloud SQL to AlloyDB, letting you do the cutover when you are ready with minimal downtime. No need to dump and restore manually, no need to write custom replication scripts.

In this post, I will walk through the full migration process from Cloud SQL to AlloyDB using DMS.

## Why Migrate to AlloyDB

The typical reasons teams move from Cloud SQL to AlloyDB include:

- Better performance for transactional workloads (up to 4x faster for common operations)
- The columnar engine for analytical queries without needing a separate data warehouse
- Better scaling characteristics due to the disaggregated architecture
- Lower storage costs for write-heavy workloads thanks to log-based storage

## Prerequisites

Before starting, make sure you have:

- A running Cloud SQL for PostgreSQL instance (source)
- An AlloyDB cluster (destination) or the ability to create one during migration
- The Database Migration Service API enabled
- Proper IAM permissions for both source and destination

Enable the required APIs:

```bash
# Enable Database Migration Service and related APIs
gcloud services enable datamigration.googleapis.com
gcloud services enable alloydb.googleapis.com
gcloud services enable servicenetworking.googleapis.com
```

## Step 1 - Prepare the Source Cloud SQL Instance

DMS uses PostgreSQL logical replication to stream changes from Cloud SQL to AlloyDB. You need to enable logical decoding on your Cloud SQL instance.

Set the required database flags:

```bash
# Enable logical replication on the Cloud SQL instance
gcloud sql instances patch my-cloud-sql-instance \
  --database-flags=cloudsql.logical_decoding=on

# This requires a restart. The instance will be briefly unavailable.
```

After the restart, verify the setting:

```bash
# Connect to Cloud SQL and verify the setting
gcloud sql connect my-cloud-sql-instance --user=postgres

# In the psql prompt:
# SHOW wal_level;
# Should return 'logical'
```

Also make sure the `postgres` user (or whichever user you will use for migration) has the `REPLICATION` privilege:

```sql
-- Grant replication privilege to the migration user
ALTER USER postgres WITH REPLICATION;
```

## Step 2 - Create a Connection Profile for the Source

Connection profiles in DMS define how to connect to the source and destination databases.

```bash
# Create a connection profile for the Cloud SQL source
gcloud database-migration connection-profiles create my-cloudsql-profile \
  --region=us-central1 \
  --display-name="Cloud SQL Source" \
  --provider=CLOUDSQL \
  --cloudsql-instance=my-cloud-sql-instance \
  --cloudsql-project=my-project
```

## Step 3 - Create a Connection Profile for the Destination

If you already have an AlloyDB cluster, create a connection profile pointing to it:

```bash
# Create a connection profile for the AlloyDB destination
gcloud database-migration connection-profiles create my-alloydb-profile \
  --region=us-central1 \
  --display-name="AlloyDB Destination" \
  --provider=ALLOYDB \
  --alloydb-cluster=my-alloydb-cluster
```

If you want DMS to create the AlloyDB cluster for you during migration, you can specify the cluster configuration in the migration job instead.

## Step 4 - Create the Migration Job

The migration job ties the source and destination together and manages the replication:

```bash
# Create a continuous migration job from Cloud SQL to AlloyDB
gcloud database-migration migration-jobs create my-migration-job \
  --region=us-central1 \
  --display-name="Cloud SQL to AlloyDB Migration" \
  --type=CONTINUOUS \
  --source=my-cloudsql-profile \
  --destination=my-alloydb-profile \
  --peer-vpc=default
```

The `--type=CONTINUOUS` flag sets up ongoing replication, which means changes on the source are continuously replicated to the destination. This is what allows minimal-downtime migration.

The `--peer-vpc` flag specifies the VPC network for the peering connection between DMS and the databases.

## Step 5 - Start the Migration Job

After creating the job, start it:

```bash
# Start the migration job
gcloud database-migration migration-jobs start my-migration-job \
  --region=us-central1
```

Monitor the job status:

```bash
# Check migration job status
gcloud database-migration migration-jobs describe my-migration-job \
  --region=us-central1 \
  --format="yaml(state,phase,duration,sourceDatabase,destinationDatabase)"
```

The migration goes through several phases:

1. **FULL_DUMP** - The initial full copy of all data from Cloud SQL to AlloyDB
2. **CDC** (Change Data Capture) - Continuous replication of changes
3. **PROMOTE_IN_PROGRESS** - When you trigger the cutover

The full dump phase duration depends on your database size. For a 100 GB database, expect it to take 30-60 minutes.

## Step 6 - Monitor Replication Lag

Once the migration is in the CDC phase, monitor the replication lag to know when the destination is caught up:

```bash
# Check replication lag
gcloud database-migration migration-jobs describe my-migration-job \
  --region=us-central1 \
  --format="value(cdcPosition)"
```

You can also check from the AlloyDB side by comparing transaction logs.

## Step 7 - Perform the Cutover

When you are ready to switch your applications from Cloud SQL to AlloyDB, promote the destination:

1. Stop writes to the Cloud SQL instance (update your application to enter maintenance mode or point to a read-only connection)
2. Wait for replication lag to reach zero
3. Promote the AlloyDB instance

```bash
# Promote the migration job (this makes AlloyDB the primary)
gcloud database-migration migration-jobs promote my-migration-job \
  --region=us-central1
```

After promotion, the AlloyDB instance becomes a standalone read-write database. The replication from Cloud SQL stops.

## Step 8 - Update Application Configuration

Update your application connection strings to point to the AlloyDB instance:

```python
# Before (Cloud SQL)
conn = psycopg2.connect(
    host='CLOUD_SQL_IP',
    dbname='myapp',
    user='appuser',
    password='password'
)

# After (AlloyDB)
conn = psycopg2.connect(
    host='ALLOYDB_IP',     # New AlloyDB private IP
    dbname='myapp',
    user='appuser',
    password='password'
)
```

If you are using the Cloud SQL Auth Proxy, switch to the AlloyDB Auth Proxy:

```bash
# Replace Cloud SQL Proxy with AlloyDB Auth Proxy
./alloydb-auth-proxy \
  "projects/my-project/locations/us-central1/clusters/my-alloydb-cluster/instances/my-primary"
```

## Step 9 - Validate and Clean Up

After cutover, validate that everything works:

```bash
# Connect to AlloyDB and run validation queries
psql -h ALLOYDB_IP -U postgres -d myapp -c "SELECT count(*) FROM important_table;"
psql -h ALLOYDB_IP -U postgres -d myapp -c "SELECT version();"
```

Compare row counts between source and destination for critical tables.

Once you are confident the migration is successful:

```bash
# Delete the migration job
gcloud database-migration migration-jobs delete my-migration-job \
  --region=us-central1

# Delete connection profiles
gcloud database-migration connection-profiles delete my-cloudsql-profile \
  --region=us-central1
gcloud database-migration connection-profiles delete my-alloydb-profile \
  --region=us-central1

# Keep the Cloud SQL instance for a rollback period, then delete
# gcloud sql instances delete my-cloud-sql-instance
```

## Handling Common Issues

**Logical replication not enabled** - Make sure `cloudsql.logical_decoding=on` is set and the instance has been restarted.

**Permission errors** - The DMS service account needs `cloudsql.admin` on the source and `alloydb.admin` on the destination project.

**Large sequences of DDL changes** - DMS handles most DDL automatically, but some schema changes (like adding columns with default values on large tables) can cause replication lag spikes.

**Extensions** - AlloyDB supports most common PostgreSQL extensions, but verify that all extensions used by your Cloud SQL instance are available in AlloyDB before starting migration.

The Database Migration Service makes Cloud SQL to AlloyDB migration a managed process rather than a manual one. The continuous replication approach minimizes downtime to the brief moment of cutover, which is usually under a minute for most applications.
