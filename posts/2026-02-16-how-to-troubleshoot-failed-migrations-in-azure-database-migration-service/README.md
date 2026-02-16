# How to Troubleshoot Failed Migrations in Azure Database Migration Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Database Migration, Troubleshooting, DMS, Azure Database Migration Service, Error Resolution, Migration Failures

Description: A practical troubleshooting guide for common Azure Database Migration Service failures including connectivity issues, schema errors, and CDC problems.

---

Database migrations fail. It is not a question of if, but when and how. Azure Database Migration Service (DMS) is a solid tool, but it depends on network connectivity, source database configuration, target database readiness, and a dozen other factors that can go wrong. This guide covers the most common DMS failure scenarios and how to fix them.

## Getting Diagnostic Information

Before troubleshooting, you need to know what actually went wrong. DMS provides several layers of diagnostic information.

### Check the Migration Activity Status

```bash
# Get the overall status and any error messages
az dms project task show \
  --name my-migration-task \
  --resource-group rg-migration \
  --service-name my-dms-instance \
  --project-name my-migration-project \
  --expand output \
  --query "properties.output[]" \
  -o json
```

The output includes error details for each table and an overall migration state. Look for entries where `state` is `Failed` or `Error`.

### Check Activity Logs

In the Azure Portal:
1. Navigate to your DMS instance.
2. Click on "Activity log" in the left menu.
3. Filter by the time range of your migration.
4. Look for failed operations and their error details.

### Check DMS Metrics

```bash
# Check DMS metrics for errors during the migration period
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-migration/providers/Microsoft.DataMigration/services/my-dms-instance" \
  --metric "FailedMigrations" \
  --interval PT1H \
  --output table
```

## Problem 1: Connection Failures to Source Database

**Symptoms**: The migration task fails immediately with "Unable to connect to source server" or "A network-related or instance-specific error occurred."

**Common Causes and Fixes**:

**Firewall blocking DMS**: DMS runs inside a VNet subnet. The source database's firewall must allow connections from the DMS subnet's IP range.

```bash
# Check the DMS subnet IP range
az network vnet subnet show \
  --name snet-dms \
  --vnet-name vnet-migration \
  --resource-group rg-migration \
  --query "addressPrefix" -o tsv
```

Add this IP range to your source database's firewall rules.

**VPN or ExpressRoute not configured**: If the source is on-premises, the DMS VNet must be connected to your on-premises network via VPN or ExpressRoute.

```bash
# Verify VPN gateway is connected
az network vpn-connection show \
  --name my-vpn-connection \
  --resource-group rg-network \
  --query "connectionStatus" -o tsv
# Should return "Connected"
```

**Wrong port or protocol**: SQL Server defaults to port 1433. If your source uses a non-default port, make sure DMS is configured with the correct port.

**SQL Server Browser Service**: If using named instances, the SQL Server Browser service must be running on the source and UDP port 1434 must be open.

## Problem 2: Connection Failures to Target Database

**Symptoms**: "Unable to connect to target server" or authentication failures.

**Fixes**:

**Azure SQL firewall**: The target Azure SQL Database must allow connections from the DMS subnet.

```bash
# Add a VNet firewall rule for the DMS subnet
az sql server vnet-rule create \
  --name allow-dms-subnet \
  --resource-group rg-migration \
  --server my-azure-sql-server \
  --vnet-name vnet-migration \
  --subnet snet-dms
```

**Wrong credentials**: Double-check the username and password. For Azure SQL, the username format is just `sqladmin`, not `sqladmin@servername` (the latter format was required in older tools but is not needed with DMS).

**Database does not exist**: DMS does not create the target database. You must create it before starting the migration.

## Problem 3: Schema Mismatch Errors

**Symptoms**: "Invalid object name 'dbo.TableName'" or "Column name or number of supplied values does not match table definition."

This happens when the target database schema does not match what DMS expects. Either the table is missing, has different columns, or has incompatible data types.

**Fixes**:

```sql
-- Compare schema between source and target
-- Run on source to get column definitions:
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
       IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Run the same query on the target and compare
```

Common schema mismatches:
- Missing tables on the target (forgot to migrate schema before data)
- Column type differences (e.g., NVARCHAR(MAX) on source vs. NVARCHAR(4000) on target)
- Missing columns (schema was migrated from an older version of the source)
- Identity columns configured differently

**Resolution**: Re-export the schema from the source and re-apply it to the target, or manually fix the specific columns that differ.

## Problem 4: Primary Key Requirement for Online Migration

**Symptoms**: "Table does not have a primary key" or "CDC is not supported for tables without primary keys."

Online migration uses change data capture, which requires primary keys on all tables to track changes.

**Fix**:

```sql
-- Find tables without primary keys
SELECT t.name AS TableName
FROM sys.tables t
LEFT JOIN sys.key_constraints kc
    ON t.object_id = kc.parent_object_id AND kc.type = 'PK'
WHERE kc.object_id IS NULL;

-- Add primary keys where needed
-- If the table has a natural key:
ALTER TABLE dbo.AuditLog
ADD CONSTRAINT PK_AuditLog PRIMARY KEY (LogId);

-- If there is no natural key, add a surrogate key:
ALTER TABLE dbo.ImportedData
ADD RowId INT IDENTITY(1,1);

ALTER TABLE dbo.ImportedData
ADD CONSTRAINT PK_ImportedData PRIMARY KEY (RowId);
```

## Problem 5: Transaction Log Issues (Online Migration)

**Symptoms**: "Unable to read transaction log" or "Log reader agent encountered error."

**Common causes**:

**Recovery model is Simple**: Online migration requires Full recovery model.

```sql
-- Check and fix recovery model
SELECT name, recovery_model_desc FROM sys.databases WHERE name = 'MyAppDB';
-- If Simple, change to Full:
ALTER DATABASE MyAppDB SET RECOVERY FULL;
-- Then take a full backup to initialize the log chain:
BACKUP DATABASE MyAppDB TO DISK = 'NUL';
```

**Transaction log full**: The log grows during online migration because DMS needs to read uncommitted portions.

```sql
-- Check log space usage
DBCC SQLPERF(LOGSPACE);

-- If the log is full, take a log backup to free space
BACKUP LOG MyAppDB TO DISK = 'C:\Backups\MyAppDB_Log.trn';
```

**Log truncation**: If a log backup job truncates the log before DMS reads it, CDC will lose track of changes.

```sql
-- Check when the last log backup occurred
SELECT database_name, type, backup_start_date, backup_finish_date
FROM msdb.dbo.backupset
WHERE database_name = 'MyAppDB' AND type = 'L'
ORDER BY backup_start_date DESC;
```

## Problem 6: Performance and Timeout Issues

**Symptoms**: Migration runs extremely slowly, times out, or the DMS instance runs at 100% CPU.

**Fixes**:

**Increase DMS vCores**: If the DMS instance is bottlenecked on CPU, scale up.

```bash
# Scale up the DMS instance
az dms update \
  --name my-dms-instance \
  --resource-group rg-migration \
  --sku-name Premium_4vCores
```

**Reduce parallel table loads**: DMS migrates tables in parallel by default. If your source or target cannot handle the load, reduce parallelism in the migration settings.

**Source server overloaded**: The migration reads every row from the source. If the source is a production database under heavy load, the migration competes for I/O and CPU.

Consider:
- Running the migration during off-peak hours
- Using a read replica as the migration source (if available)
- Increasing source server resources temporarily

**Network bandwidth**: If the source is on-premises and connected via VPN, the migration throughput is limited by the VPN bandwidth. A 100 Mbps VPN will transfer about 10 GB per hour at best.

## Problem 7: Data Truncation and Conversion Errors

**Symptoms**: "String or binary data would be truncated" or "Error converting data type."

**Fixes**:

```sql
-- Find oversized data that would be truncated
-- If target column is NVARCHAR(100) but source has longer values:
SELECT COLUMN_NAME, MAX(LEN(ColumnName)) AS MaxLength
FROM SourceTable
GROUP BY COLUMN_NAME;

-- Fix by increasing the target column size or trimming the source data
ALTER TABLE dbo.Customers
ALTER COLUMN CustomerName NVARCHAR(200);
```

For data type conversion errors, check the specific values that cause failures:

```sql
-- Find rows with non-numeric data in a column being migrated to INT
SELECT *
FROM SourceTable
WHERE ISNUMERIC(SomeColumn) = 0 AND SomeColumn IS NOT NULL;
```

## Problem 8: Migration Task Stuck in "Running" State

**Symptoms**: The migration shows as "Running" but no data is being transferred for an extended period.

**Diagnosis**:

```bash
# Check if the task is actually making progress
az dms project task show \
  --name my-migration-task \
  --resource-group rg-migration \
  --service-name my-dms-instance \
  --project-name my-migration-project \
  --expand output \
  --query "properties.output[?resultType=='MigrationLevelOutput'].{state:state, startedOn:startedOn, endedOn:endedOn}"
```

If the task is genuinely stuck:
1. Cancel the task.
2. Verify source and target connectivity.
3. Check DMS instance health.
4. Restart the DMS instance if necessary.
5. Re-create and re-run the migration task.

```bash
# Cancel a stuck task
az dms project task cancel \
  --name my-migration-task \
  --resource-group rg-migration \
  --service-name my-dms-instance \
  --project-name my-migration-project
```

## General Troubleshooting Checklist

When a migration fails, run through this checklist:

1. Can DMS reach the source? (Network, firewall, VPN)
2. Can DMS reach the target? (Firewall rules, credentials)
3. Does the target schema match the source? (Tables, columns, types)
4. Do all tables have primary keys? (Required for online migration)
5. Is the source in Full recovery model? (Required for online migration)
6. Is there enough disk space on the source for log growth?
7. Is the DMS instance sized appropriately? (vCores, network bandwidth)
8. Are there any data values that would fail type conversion?

## Wrapping Up

DMS migration failures almost always fall into one of a few categories: connectivity issues, schema mismatches, CDC requirements not met, or performance bottlenecks. The key to efficient troubleshooting is getting the error details from the migration task output, identifying which category the failure falls into, and applying the targeted fix. When in doubt, check the basics first - connectivity and credentials resolve most initial failures. For ongoing issues during online migration, focus on the transaction log and source server load.
