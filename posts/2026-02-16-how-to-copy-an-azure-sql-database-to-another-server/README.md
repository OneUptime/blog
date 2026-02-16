# How to Copy an Azure SQL Database to Another Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Database Copy, Migration, Azure, Database, Cloning, DevOps

Description: Learn multiple methods to copy an Azure SQL Database to another server, including online copy, BACPAC export/import, and cross-subscription scenarios.

---

There are many reasons you might need to copy an Azure SQL Database to another server. Maybe you are setting up a new environment, creating a testing copy of production data, migrating to a different subscription, or cloning a database for a customer demo. Azure provides several ways to accomplish this, each with different trade-offs in terms of speed, consistency, and flexibility.

In this post, I will cover the main approaches: online database copy, BACPAC export/import, and geo-restore. I will also discuss when to use each method.

## Method 1: Online Database Copy (T-SQL)

The simplest and fastest method is the online database copy. It creates a transactionally consistent copy of the source database on the same or different logical SQL server.

### Same Server Copy

To copy a database on the same server, connect to the master database and run:

```sql
-- Create a copy of mydb on the same server
-- The copy operation runs asynchronously in the background
CREATE DATABASE mydb_copy AS COPY OF mydb;
```

### Cross-Server Copy

To copy to a different server, the target server must have a login that matches the source server's admin. The simplest approach is if both servers share the same admin credentials.

Connect to the master database on the target server and run:

```sql
-- Create a copy from a source database on a different server
-- Both servers must allow connections between them
CREATE DATABASE mydb_copy AS COPY OF myserver_source.mydb;
```

### Monitoring the Copy Progress

The copy operation runs asynchronously. You can monitor it:

```sql
-- Check copy progress from the target server's master database
-- Shows percentage complete and state description
SELECT
    name,
    state_desc,
    percent_complete
FROM sys.dm_database_copies;
```

You can also check from the source:

```sql
-- Check copy status from the source server
SELECT
    partner_server,
    partner_database,
    replication_state_desc,
    percent_complete
FROM sys.dm_database_copies;
```

### Key Characteristics of Online Copy

- The copy is transactionally consistent as of the moment the copy operation completes (not when it starts).
- The source database remains fully available during the copy.
- You can copy to a different pricing tier on the target.
- Both servers must be in the same Azure subscription by default.
- The source and target can be in different regions.
- Copy time depends on database size; expect roughly 30-60 minutes for a 50 GB database.

## Method 2: Azure CLI Database Copy

The Azure CLI provides a straightforward command for copying databases:

```bash
# Copy a database to the same server with a new name
az sql db copy \
    --resource-group myResourceGroup \
    --server myserver \
    --name mydb \
    --dest-name mydb-copy
```

To copy to a different server:

```bash
# Copy a database to a different server
az sql db copy \
    --resource-group myResourceGroup \
    --server myserver-source \
    --name mydb \
    --dest-server myserver-target \
    --dest-resource-group targetResourceGroup \
    --dest-name mydb-copy
```

You can also specify a different service tier for the copy:

```bash
# Copy to a different server with a specific service tier
az sql db copy \
    --resource-group myResourceGroup \
    --server myserver-source \
    --name mydb \
    --dest-server myserver-target \
    --dest-resource-group targetResourceGroup \
    --dest-name mydb-copy \
    --service-objective S0
```

## Method 3: BACPAC Export and Import

A BACPAC file is a portable archive containing a database's schema and data. This method is useful when you need to copy across subscriptions, to Azure from on-premises, or when you want a portable backup file.

### Exporting a BACPAC

Via Azure Portal:
1. Navigate to your database.
2. Click "Export" in the top toolbar.
3. Specify a storage account and container for the BACPAC file.
4. Enter the server admin credentials.
5. Click OK. The export runs as a background job.

Via Azure CLI:

```bash
# Export a database to a BACPAC file in Azure Blob Storage
az sql db export \
    --resource-group myResourceGroup \
    --server myserver \
    --name mydb \
    --admin-user sqladmin \
    --admin-password 'YourPassword123!' \
    --storage-key-type StorageAccessKey \
    --storage-key "your-storage-account-key" \
    --storage-uri "https://mystorageaccount.blob.core.windows.net/bacpacs/mydb.bacpac"
```

Via SqlPackage (command-line tool):

```bash
# Export using SqlPackage for more control and better performance
SqlPackage /Action:Export \
    /TargetFile:"mydb.bacpac" \
    /SourceServerName:"myserver.database.windows.net" \
    /SourceDatabaseName:"mydb" \
    /SourceUser:"sqladmin" \
    /SourcePassword:"YourPassword123!"
```

### Importing a BACPAC

Via Azure Portal:
1. Navigate to your target SQL server.
2. Click "Import database" at the top.
3. Select the BACPAC file from Azure Blob Storage.
4. Configure the database name and pricing tier.
5. Enter the server admin credentials.
6. Click OK.

Via Azure CLI:

```bash
# Import a BACPAC file to create a new database
az sql db import \
    --resource-group myResourceGroup \
    --server myserver-target \
    --name mydb-imported \
    --admin-user sqladmin \
    --admin-password 'YourPassword123!' \
    --storage-key-type StorageAccessKey \
    --storage-key "your-storage-account-key" \
    --storage-uri "https://mystorageaccount.blob.core.windows.net/bacpacs/mydb.bacpac"
```

Via SqlPackage:

```bash
# Import using SqlPackage
SqlPackage /Action:Import \
    /SourceFile:"mydb.bacpac" \
    /TargetServerName:"myserver-target.database.windows.net" \
    /TargetDatabaseName:"mydb-imported" \
    /TargetUser:"sqladmin" \
    /TargetPassword:"YourPassword123!"
```

### BACPAC Considerations

- Export requires the database to be quiescent (no active write transactions) for a consistent export. For large databases with continuous writes, consider copying the database first and exporting the copy.
- Export and import times depend on database size. Large databases (100+ GB) can take hours.
- SqlPackage is generally faster and more reliable than the Azure Portal or CLI for large databases.
- BACPAC files contain both schema and data. DACPAC files contain only schema.

## Method 4: Geo-Restore

If you need to copy a database to a different region for disaster recovery purposes, you can use geo-restore. This restores from geo-redundant backups that Azure automatically stores in a paired region.

```bash
# Restore the database to a different region using geo-redundant backup
az sql db restore \
    --resource-group myResourceGroup \
    --server myserver-target \
    --name mydb-georestored \
    --resource-id "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Sql/servers/myserver-source/recoverableDatabases/mydb"
```

Geo-restore has a recovery point objective (RPO) of up to 1 hour, meaning you might lose up to an hour of data. It is not suitable for zero-data-loss copies but works well for disaster recovery scenarios.

## Choosing the Right Method

Here is a decision guide:

**Use online database copy when**:
- Source and target are in the same subscription
- You need a transactionally consistent copy
- You want the fastest copy speed
- Minimal disruption to the source is important

**Use BACPAC export/import when**:
- Copying across subscriptions
- Copying from Azure to on-premises or vice versa
- You need a portable file for archival
- The database is relatively small (under 50 GB)

**Use geo-restore when**:
- You need a copy in a different region for DR
- You can tolerate up to 1 hour of data loss
- The source region is unavailable

## Cross-Subscription Copy

Copying a database across Azure subscriptions requires the BACPAC method because online database copy does not work across subscriptions. Here is the workflow:

1. Export the source database to a BACPAC in an Azure Storage account.
2. Grant the target subscription access to the storage account (or copy the BACPAC to a storage account in the target subscription).
3. Import the BACPAC on the target server.

Alternatively, you can use Azure Data Factory to copy data table-by-table, but this does not copy schema objects like indexes, constraints, or stored procedures.

## Post-Copy Checklist

After copying a database, do not forget these steps:

1. **Update firewall rules** on the target server to allow your applications and users.
2. **Review and update users and permissions.** SQL users are copied, but Azure AD users may need to be recreated.
3. **Verify data integrity.** Run row counts and spot checks on critical tables.
4. **Update connection strings** in any applications that should point to the new database.
5. **Check indexes and statistics.** The copy includes indexes, but statistics may be stale depending on the copy method.
6. **Update elastic pool membership** if the target should be in an elastic pool.
7. **Configure auditing, TDE, and other security settings** on the target if they do not carry over.

## Performance Tips for Large Database Copies

For databases over 100 GB:

- Use a higher service tier on the target during the copy, then scale down afterward. More resources speed up the copy.
- If using BACPAC, prefer SqlPackage over the Portal. SqlPackage is significantly faster for large databases.
- Schedule copies during off-peak hours to reduce impact on the source.
- Monitor the copy progress and be prepared for it to take several hours.

## Summary

Azure SQL Database offers multiple ways to copy databases between servers. The online copy method is fastest and simplest for same-subscription copies. BACPAC export/import provides portability for cross-subscription and hybrid scenarios. Geo-restore serves disaster recovery needs. Choose the method that matches your requirements for speed, consistency, and cross-boundary support, and always verify the copied data before pointing production workloads at it.
