# How to Migrate Azure SQL Database to Google Cloud SQL for SQL Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud SQL, Azure SQL Database, SQL Server, Database Migration, Cloud Migration

Description: A complete guide to migrating Azure SQL Database instances to Google Cloud SQL for SQL Server, including BACPAC export, schema migration, and data transfer strategies.

---

Azure SQL Database and Google Cloud SQL for SQL Server both run Microsoft SQL Server under the hood, which makes this one of the more straightforward database migrations between cloud providers. The SQL Server engine is the same, so your schemas, stored procedures, and queries should work with minimal changes. The main differences are in the managed service features, networking, and administration tools.

## Service Comparison

| Feature | Azure SQL Database | Cloud SQL for SQL Server |
|---------|-------------------|------------------------|
| SQL Server versions | Varies by tier | SQL Server 2017, 2019, 2022 |
| Max storage | 4 TB (general) / 100 TB (hyperscale) | 64 TB |
| Read replicas | Yes | Yes |
| Automatic backups | Yes | Yes (automated daily) |
| Point-in-time restore | Yes | Yes |
| High availability | Built-in | Regional HA with failover replica |
| Serverless tier | Yes | No |
| DTU/vCore pricing | Both | vCPU + memory + storage |

## Step 1: Assess Your Azure SQL Database

Document your database configuration and size.

```bash
# Get Azure SQL server and database information
az sql db list \
  --server my-sql-server \
  --resource-group my-rg \
  --query '[*].{
    Name:name,
    Edition:edition,
    ServiceObjective:currentServiceObjectiveName,
    MaxSizeGB:maxSizeBytes,
    Status:status
  }' \
  --output table

# Check database size
az sql db show-usage \
  --server my-sql-server \
  --name mydb \
  --resource-group my-rg \
  --output table
```

Connect to the database and check for compatibility issues:

```sql
-- Check SQL Server compatibility level
SELECT name, compatibility_level FROM sys.databases;

-- Check for features that might not be supported in Cloud SQL
SELECT * FROM sys.dm_db_persisted_sku_features;

-- Get table sizes and row counts
SELECT
    t.name AS TableName,
    s.row_count AS RowCount,
    CAST(ROUND(SUM(a.total_pages) * 8 / 1024.0, 2) AS DECIMAL(18,2)) AS SizeMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions s ON i.object_id = s.object_id AND i.index_id = s.index_id
INNER JOIN sys.allocation_units a ON s.partition_id = a.container_id
WHERE t.is_ms_shipped = 0
GROUP BY t.name, s.row_count
ORDER BY SizeMB DESC;
```

## Step 2: Create the Cloud SQL Instance

Provision a Cloud SQL for SQL Server instance that matches your Azure SQL Database tier.

```bash
# Map Azure SQL tiers to Cloud SQL configurations:
# Azure S3 (50 DTU) -> db-custom-2-7680 (2 vCPU, 7.5 GB RAM)
# Azure P2 (250 DTU) -> db-custom-4-26624 (4 vCPU, 26 GB RAM)
# Azure BC_Gen5_8 -> db-custom-8-53248 (8 vCPU, 52 GB RAM)

# Create the Cloud SQL instance
gcloud sql instances create my-sqlserver \
  --database-version=SQLSERVER_2022_STANDARD \
  --tier=db-custom-4-26624 \
  --region=us-central1 \
  --root-password=your-strong-password \
  --storage-size=100GB \
  --storage-auto-increase \
  --availability-type=REGIONAL \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --network=projects/my-project/global/networks/default

# Create the database
gcloud sql databases create mydb --instance=my-sqlserver
```

## Step 3: Export from Azure SQL Database

There are several export options. BACPAC is the most common for Azure SQL Database.

### Option A: BACPAC Export

```bash
# Export to a BACPAC file in Azure Blob Storage
az sql db export \
  --admin-user sqladmin \
  --admin-password 'YourPassword' \
  --auth-type SQL \
  --name mydb \
  --resource-group my-rg \
  --server my-sql-server \
  --storage-key "your-storage-account-key" \
  --storage-key-type StorageAccessKey \
  --storage-uri "https://mystorageaccount.blob.core.windows.net/backups/mydb.bacpac"
```

### Option B: SQL Server Backup (if using SQL Server on a VM)

```sql
-- Create a full backup
BACKUP DATABASE mydb
TO DISK = '/var/opt/mssql/backup/mydb.bak'
WITH FORMAT, COMPRESSION;
```

### Option C: Data-tier Application Export with SqlPackage

```bash
# Use SqlPackage to export a BACPAC locally
SqlPackage /Action:Export \
  /SourceServerName:my-sql-server.database.windows.net \
  /SourceDatabaseName:mydb \
  /SourceUser:sqladmin \
  /SourcePassword:YourPassword \
  /TargetFile:mydb.bacpac
```

## Step 4: Import into Cloud SQL

Cloud SQL for SQL Server supports importing BAK files directly. If you exported as BACPAC, you need to convert it first.

### Import a BAK file:

```bash
# Upload the backup file to GCS
gsutil cp mydb.bak gs://my-migration-bucket/mydb.bak

# Import into Cloud SQL
gcloud sql import bak my-sqlserver \
  gs://my-migration-bucket/mydb.bak \
  --database=mydb
```

### If you have a BACPAC file:

BACPAC files cannot be imported directly into Cloud SQL. Convert to BAK first using a temporary SQL Server instance, or use the Database Migration Service.

```bash
# Option 1: Use DMS for the migration
gcloud database-migration connection-profiles create azure-source \
  --region=us-central1 \
  --display-name="Azure SQL Source" \
  --provider=SQLSERVER \
  --host=my-sql-server.database.windows.net \
  --port=1433 \
  --username=sqladmin \
  --password=YourPassword

gcloud database-migration migration-jobs create azure-to-cloudsql \
  --region=us-central1 \
  --display-name="Azure SQL to Cloud SQL" \
  --source=azure-source \
  --destination=my-sqlserver \
  --type=CONTINUOUS
```

## Step 5: Verify Schema and Data

After the import, validate that everything came through correctly.

```sql
-- Connect to Cloud SQL and verify
-- Compare table counts
SELECT
    t.name AS TableName,
    p.rows AS RowCount
FROM sys.tables t
INNER JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0, 1)
ORDER BY p.rows DESC;

-- Verify stored procedures exist
SELECT name, type_desc, create_date
FROM sys.procedures
ORDER BY name;

-- Verify views
SELECT name, create_date
FROM sys.views
WHERE is_ms_shipped = 0
ORDER BY name;

-- Verify indexes
SELECT
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.is_ms_shipped = 0 AND i.name IS NOT NULL
ORDER BY t.name, i.name;
```

## Step 6: Handle Connection Strings

Update your application connection strings from Azure SQL to Cloud SQL.

```python
# Old Azure SQL connection string
import pyodbc

# Azure SQL Database connection
conn_str = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=my-sql-server.database.windows.net;"
    "Database=mydb;"
    "Uid=sqladmin;"
    "Pwd=YourPassword;"
    "Encrypt=yes;"
)
conn = pyodbc.connect(conn_str)

# New Cloud SQL connection string
# Option 1: Direct connection (private IP)
conn_str = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=10.0.0.5;"  # Cloud SQL private IP
    "Database=mydb;"
    "Uid=sqlserver;"
    "Pwd=YourPassword;"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)
conn = pyodbc.connect(conn_str)

# Option 2: Using Cloud SQL Auth Proxy
# Run the proxy: cloud-sql-proxy my-project:us-central1:my-sqlserver
conn_str = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=127.0.0.1,1433;"
    "Database=mydb;"
    "Uid=sqlserver;"
    "Pwd=YourPassword;"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)
conn = pyodbc.connect(conn_str)
```

## Step 7: Set Up Cloud SQL Auth Proxy

For applications running on GKE or Compute Engine, use the Cloud SQL Auth Proxy for secure connections without managing SSL certificates.

```bash
# Download and run the Cloud SQL Auth Proxy
cloud-sql-proxy my-project:us-central1:my-sqlserver \
  --port=1433 \
  --credentials-file=service-account.json

# For GKE, use the sidecar container pattern
# Add to your pod spec:
```

```yaml
# Cloud SQL proxy sidecar for GKE pods
containers:
  - name: cloud-sql-proxy
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2
    args:
      - "--structured-logs"
      - "--port=1433"
      - "my-project:us-central1:my-sqlserver"
    securityContext:
      runAsNonRoot: true
    resources:
      requests:
        memory: "256Mi"
        cpu: "100m"
```

## Step 8: Configure Monitoring and Alerts

Set up monitoring for your Cloud SQL instance.

```bash
# Create an alert for high CPU usage
gcloud monitoring policies create \
  --display-name="Cloud SQL High CPU" \
  --condition-display-name="CPU above 80%" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/cpu/utilization"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=projects/my-project/notificationChannels/12345

# Create an alert for storage usage
gcloud monitoring policies create \
  --display-name="Cloud SQL Storage Alert" \
  --condition-display-name="Storage above 80%" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/disk/utilization"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=projects/my-project/notificationChannels/12345
```

## Differences to Be Aware Of

- Cloud SQL for SQL Server does not support elastic pools (Azure SQL's multi-database pricing model).
- CLR assemblies are not supported in Cloud SQL.
- Some SQL Server Agent features may have limitations.
- Linked servers to external databases are not supported.
- SQL Server Integration Services (SSIS) is not available - use Dataflow or alternative ETL tools.

## Summary

Migrating Azure SQL Database to Cloud SQL for SQL Server is one of the simpler database migrations because the underlying engine is identical. The BAK import path is the fastest for one-time migrations, while Database Migration Service works well for continuous replication during the cutover period. Focus your testing on connection string changes, any Azure-specific features you might be using (elastic pools, CLR, SSIS), and ensuring your application's connection method works with Cloud SQL Auth Proxy or direct private IP connectivity.
