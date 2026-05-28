# How to Migrate Azure SQL Database to Google Cloud SQL for SQL Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud SQL, Azure SQL Database, SQL Server, Database Migration, Cloud Migration

Description: A complete guide to migrating Azure SQL Database instances to Google Cloud SQL for SQL Server, including BACPAC export, schema migration, and data transfer strategies.

---

Azure SQL Database and Google Cloud SQL for SQL Server both provide SQL Server-compatible database engines, which makes this one of the more straightforward database migrations between cloud providers. Your schemas, stored procedures, and queries should work with minimal changes if they avoid service-specific features. The main differences are in the managed service features, networking, and administration tools.

## Service Comparison

| Feature | Azure SQL Database | Cloud SQL for SQL Server |
|---------|-------------------|------------------------|
| SQL Server versions | Varies by tier | SQL Server 2017, 2019, 2022, 2025 |
| Max storage | 4 TB (general) / 128 TB (hyperscale) | 64 TB |
| Read replicas | Yes | Enterprise editions |
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
    MaxSizeBytes:maxSizeBytes,
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
    SUM(ps.row_count) AS RowCount,
    CAST(ROUND(SUM(ps.reserved_page_count) * 8 / 1024.0, 2) AS DECIMAL(18,2)) AS SizeMB
FROM sys.tables t
INNER JOIN sys.dm_db_partition_stats ps ON t.object_id = ps.object_id
WHERE t.is_ms_shipped = 0
  AND ps.index_id IN (0, 1)
GROUP BY t.name
ORDER BY SizeMB DESC;
```

## Step 2: Create the Cloud SQL Instance

Provision a Cloud SQL for SQL Server instance that matches your Azure SQL Database tier.

```bash
# Map Azure SQL tiers to Cloud SQL configurations:
# Azure S3 (50 DTU) -> 2 vCPU, 7680 MB RAM
# Azure P2 (250 DTU) -> 4 vCPU, 26624 MB RAM
# Azure BC_Gen5_8 -> 8 vCPU, 53248 MB RAM

# Create the Cloud SQL instance
gcloud beta sql instances create my-sqlserver \
  --database-version=SQLSERVER_2022_STANDARD \
  --cpu=4 \
  --memory=26624MB \
  --region=us-central1 \
  --root-password=your-strong-password \
  --storage-size=100 \
  --storage-auto-increase \
  --availability-type=REGIONAL \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --no-assign-ip \
  --network=projects/my-project/global/networks/default

# Create the database only if you will load data with SQL scripts or bcp.
# Do not pre-create it before a BAK or BACPAC import.
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

Cloud SQL for SQL Server supports importing BAK files directly. If you exported as BACPAC, import it with SqlPackage or restore it to a temporary SQL Server instance and create a BAK from there.

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

BACPAC files cannot be imported with `gcloud sql import bak`. Use SqlPackage to import the BACPAC into Cloud SQL, or convert it to a BAK using a temporary SQL Server instance.

```bash
# Import a BACPAC with SqlPackage
SqlPackage /Action:Import \
  /SourceFile:mydb.bacpac \
  /TargetServerName:10.0.0.5 \
  /TargetDatabaseName:mydb \
  /TargetUser:sqlserver \
  /TargetPassword:YourPassword \
  /TargetEncryptConnection:True \
  /TargetTrustServerCertificate:True
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
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/cpu/utilization" AND resource.label.database_id="my-project:my-sqlserver"' \
  --if='> 0.8' \
  --duration=300s \
  --condition-display-name="CPU above 80%" \
  --notification-channels=projects/my-project/notificationChannels/12345

# Create an alert for storage usage
gcloud monitoring policies create \
  --display-name="Cloud SQL Storage Alert" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/disk/utilization" AND resource.label.database_id="my-project:my-sqlserver"' \
  --if='> 0.8' \
  --duration=300s \
  --condition-display-name="Storage above 80%" \
  --notification-channels=projects/my-project/notificationChannels/12345
```

## Differences to Be Aware Of

- Cloud SQL for SQL Server does not support elastic pools (Azure SQL's multi-database pricing model).
- CLR assemblies are not supported in Cloud SQL.
- Some SQL Server Agent features may have limitations.
- Linked servers are supported in Cloud SQL with limitations.
- SQL Server Integration Services (SSIS) packages cannot be hosted on or executed from Cloud SQL. Run SSIS on a separate host connected to Cloud SQL, or use Dataflow or alternative ETL tools.

## Summary

Migrating Azure SQL Database to Cloud SQL for SQL Server is one of the simpler database migrations when your workload uses portable SQL Server features. The BAK import path is the fastest for one-time migrations when a native SQL Server backup is available, while BACPAC imports are common for Azure SQL Database. Focus your testing on connection string changes, any Azure-specific features you might be using (elastic pools, CLR, SSIS), and ensuring your application's connection method works with Cloud SQL Auth Proxy or direct private IP connectivity.
