# How to Migrate On-Premises SQL Server to Cloud SQL for SQL Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, SQL Server, Database Migration, Window

Description: A detailed guide for migrating on-premises SQL Server databases to Cloud SQL for SQL Server on GCP with minimal application downtime.

---

SQL Server migrations to the cloud are tricky because databases sit at the center of everything. Every minute of downtime during a database migration directly impacts your applications and users. Cloud SQL for SQL Server on GCP gives you a fully managed SQL Server instance with automated backups, patching, and high availability. The challenge is getting your data there without a long maintenance window. Here is how to do it with minimal downtime.

## Assess Your SQL Server Environment

Start by understanding your source database:

```sql
-- Check SQL Server version and edition
SELECT @@VERSION;

-- Check database sizes
SELECT
    name AS DatabaseName,
    CAST(SUM(size) * 8.0 / 1024 / 1024 AS DECIMAL(10,2)) AS SizeGB
FROM sys.master_files
GROUP BY name
ORDER BY SizeGB DESC;

-- Check features in use that might not be supported in Cloud SQL
SELECT
    feature_name,
    feature_id
FROM sys.dm_db_persisted_sku_features;

-- List databases and their compatibility levels
SELECT
    name,
    compatibility_level,
    recovery_model_desc,
    state_desc
FROM sys.databases
WHERE database_id > 4;  -- Skip system databases

-- Check for SQL Server Agent jobs
SELECT
    j.name AS JobName,
    j.enabled,
    s.name AS ScheduleName
FROM msdb.dbo.sysjobs j
LEFT JOIN msdb.dbo.sysjobschedules js ON j.job_id = js.job_id
LEFT JOIN msdb.dbo.sysschedules s ON js.schedule_id = s.schedule_id;
```

### Cloud SQL for SQL Server Limitations

Know these before you start:

- SQL Server versions supported: 2017, 2019, 2022, and 2025, depending on edition
- Maximum storage: 64 TB
- SQL Server Agent is available, but review job permissions and any OS-level dependencies before migrating
- SSIS and SSRS can run on a separate host and connect to Cloud SQL, but you cannot host or execute SSIS packages or SSRS from the Cloud SQL instance; SSAS is not supported
- Review cross-database queries and test them during migration
- Linked servers are supported only for SQL Server data sources and require the Cloud SQL linked servers flag
- No CLR assemblies
- Limited access to system databases

If your application depends on any unsupported features, you will need to refactor those components.

## Set Up Cloud SQL for SQL Server

Create the target instance:

```bash
# Create a Cloud SQL for SQL Server instance

gcloud sql instances create my-sqlserver \
  --database-version SQLSERVER_2019_STANDARD \
  --tier db-custom-8-32768 \
  --region us-central1 \
  --availability-type REGIONAL \
  --storage-type SSD \
  --storage-size 200 \
  --storage-auto-increase \
  --backup-start-time 02:00 \
  --root-password "YourStrongPassword123!"

# Configure the instance for the migration
# Allow connections from your on-premises IP
gcloud sql instances patch my-sqlserver \
  --authorized-networks 203.0.113.0/24

# Or use private IP within your VPC
gcloud sql instances patch my-sqlserver \
  --network my-vpc \
  --no-assign-ip
```

## Migration Strategy 1 - Backup and Restore (Shorter Downtime)

Cloud SQL for SQL Server supports importing .bak files from Cloud Storage. This is the simplest approach for databases that can tolerate a maintenance window.

```bash
# On the source SQL Server, create a full backup
# Run this T-SQL on the source server
```

```sql
-- Create a full backup of the database
BACKUP DATABASE [MyDatabase]
TO DISK = 'C:\Backups\MyDatabase_Full.bak'
WITH FORMAT, COMPRESSION, STATS = 10;

-- Note the backup completion time
SELECT GETDATE() AS BackupCompleted;
```

Upload the backup to Cloud Storage and import it:

```bash
# Upload the backup file to Cloud Storage
gcloud storage cp "C:\Backups\MyDatabase_Full.bak" gs://my-migration-bucket/

# Import the backup into Cloud SQL
gcloud sql import bak my-sqlserver \
  gs://my-migration-bucket/MyDatabase_Full.bak \
  --database MyDatabase
```

To minimize downtime, use a combination of full backup and transaction log backups:

```sql
-- Step 1: Take a full backup (can be done while the database is live)
BACKUP DATABASE [MyDatabase]
TO DISK = 'C:\Backups\MyDatabase_Full.bak'
WITH FORMAT, COMPRESSION;

-- Step 2: After the full backup is restored in Cloud SQL,
-- take a transaction log backup to capture changes since the full backup
BACKUP LOG [MyDatabase]
TO DISK = 'C:\Backups\MyDatabase_Log1.trn'
WITH COMPRESSION;

-- Step 3: During the final cutover window, take the last log backup
-- with NORECOVERY to prevent further changes
BACKUP LOG [MyDatabase]
TO DISK = 'C:\Backups\MyDatabase_LogFinal.trn'
WITH NORECOVERY, COMPRESSION;
```

```bash
# Import the full backup with NORECOVERY, then import transaction log backups in order
gcloud sql import bak my-sqlserver \
  gs://my-migration-bucket/MyDatabase_Full.bak \
  --database MyDatabase \
  --bak-type FULL \
  --no-recovery

gcloud sql import bak my-sqlserver \
  gs://my-migration-bucket/MyDatabase_Log1.trn \
  --database MyDatabase \
  --bak-type TLOG \
  --no-recovery

gcloud sql import bak my-sqlserver \
  gs://my-migration-bucket/MyDatabase_LogFinal.trn \
  --database MyDatabase \
  --bak-type TLOG

# Bring the database online after the last log is restored
gcloud sql import bak my-sqlserver \
  --database MyDatabase \
  --recovery-only
```

## Migration Strategy 2 - Database Migration Service (Minimal Downtime)

For near-zero downtime, use Google's Database Migration Service (DMS). For homogeneous SQL Server migrations to Cloud SQL for SQL Server, DMS uses full, optional differential, and transaction log backup files uploaded to Cloud Storage. It does not require you to enable SQL Server CDC tables with `sp_cdc_enable_db`.

```bash
# Step 1: Upload the full backup to the Cloud Storage bucket
# DMS expects database folders with full, diff, and log subfolders.
gcloud storage cp "C:\Backups\MyDatabase_Full.bak" \
  gs://my-migration-bucket/MyDatabase/full/MyDatabase.1771286400.bak
```

```sql
-- Before taking the full backup, use the full or bulk-logged recovery model
-- so transaction log backups are available
ALTER DATABASE [MyDatabase] SET RECOVERY FULL;

-- Take transaction log backups while the migration job is running
BACKUP LOG [MyDatabase]
TO DISK = 'C:\Backups\MyDatabase.1771287300.trn'
WITH COMPRESSION;
```

```bash
# Upload transaction log backups to the log folder as they are created
gcloud storage cp "C:\Backups\MyDatabase.1771287300.trn" \
  gs://my-migration-bucket/MyDatabase/log/MyDatabase.1771287300.trn

# Step 2: Create a DMS connection profile for the source backup bucket
gcloud database-migration connection-profiles create sqlserver sqlserver-source \
  --region us-central1 \
  --display-name "SQL Server backup bucket" \
  --gcs-bucket my-migration-bucket

# Step 3: Create a connection profile for the destination
gcloud database-migration connection-profiles create sqlserver cloudsql-dest \
  --region us-central1 \
  --display-name "Cloud SQL destination" \
  --cloudsql-instance my-sqlserver \
  --username migration_user \
  --password "destination-password"

# Step 4: Create the migration job with continuous replication
gcloud database-migration migration-jobs create sqlserver-migration \
  --region us-central1 \
  --source sqlserver-source \
  --destination cloudsql-dest \
  --type CONTINUOUS \
  --sqlserver-databases MyDatabase

# Step 5: Start the migration
gcloud database-migration migration-jobs start sqlserver-migration \
  --region us-central1
```

Monitor the migration progress:

```bash
# Check migration job status
gcloud database-migration migration-jobs describe sqlserver-migration \
  --region us-central1

# The job goes through these phases:
# 1. Initial load from the full backup
# 2. Optional load from differential backups
# 3. Incremental load from transaction log backups
# 4. Ready to promote after the final transaction log backup is processed
```

## Cutover Process

When the continuous replication is caught up and you are ready to switch:

```bash
# Step 1: Stop application writes to the source database

# Step 2: Take and upload the final transaction log backup.
# Name the file with a .trn.final suffix so DMS knows to stop incremental load.

# Step 3: Wait for DMS to process the final transaction log backup
# Monitor the migration job status
gcloud database-migration migration-jobs describe sqlserver-migration \
  --region us-central1 \
  --format "value(state)"

# Step 4: Promote the Cloud SQL instance
gcloud database-migration migration-jobs promote sqlserver-migration \
  --region us-central1

# Step 5: Update your application connection strings to point to Cloud SQL
# Old: Server=on-prem-sql.internal;Database=MyDatabase;
# New: Server=<cloud-sql-ip>;Database=MyDatabase;

# Step 6: Restart applications with the new connection string
```

## Post-Migration Tasks

After cutover, verify and clean up:

```sql
-- Verify row counts match between source and target
-- Run on both source and Cloud SQL
SELECT 'Orders' AS TableName, COUNT(*) AS RowCount FROM Orders
UNION ALL
SELECT 'Customers', COUNT(*) FROM Customers
UNION ALL
SELECT 'OrderItems', COUNT(*) FROM OrderItems;

-- Verify indexes exist
SELECT
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name IS NOT NULL
ORDER BY t.name, i.name;

-- Check for any missing stored procedures
SELECT name, type_desc
FROM sys.objects
WHERE type IN ('P', 'FN', 'IF', 'TF')
ORDER BY name;
```

## Replacing or Updating SQL Server Agent Jobs

Cloud SQL for SQL Server includes SQL Server Agent, but jobs with file-system, OS-level, SSIS, SSRS, or external network dependencies may need to be changed or moved to GCP alternatives:

```bash
# Use Cloud Scheduler to trigger Cloud Functions that execute SQL
gcloud scheduler jobs create http daily-data-cleanup \
  --schedule "0 3 * * *" \
  --uri "https://us-central1-my-project.cloudfunctions.net/sql-maintenance" \
  --http-method POST \
  --message-body '{"query": "EXEC sp_cleanup_old_records"}'
```

## Common Issues

- **Collation mismatches.** Verify that the Cloud SQL instance uses the same collation as your source database. You can set a default collation, such as `SQL_Latin1_General_CP1_CI_AS`, when creating the instance.
- **Login migration.** Database logins need to be recreated on Cloud SQL. Cloud SQL supports Windows Authentication through supported directory integrations, but you need to configure it explicitly.
- **Large databases.** Backup/restore for databases over 1 TB can take many hours. Use DMS for large databases to minimize cutover time.
- **Application connection strings.** Update all connection strings, including those in configuration files, environment variables, and connection pooling configurations.

A well-planned SQL Server migration to Cloud SQL can achieve cutover windows of just a few minutes using DMS with continuous replication. The key is thorough testing beforehand and a clear rollback plan in case something unexpected happens during cutover.
