# How to Migrate an On-Premises MySQL Database to Azure Database for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Migration, Cloud Migration, Database Migration, DMS, DevOps

Description: A comprehensive guide to migrating your on-premises MySQL database to Azure Database for MySQL using multiple approaches and best practices.

---

Moving a MySQL database from on-premises to Azure is one of those tasks that sounds simple but has a lot of moving parts. You need to handle schema migration, data transfer, application cutover, and testing - all while keeping downtime to a minimum. In this post, I will walk through the main migration approaches, the tools available, and the practical steps to get your MySQL database running on Azure Database for MySQL Flexible Server.

## Choosing Your Migration Approach

There are three main approaches, each with different trade-offs:

| Approach | Downtime | Complexity | Best For |
|----------|----------|------------|----------|
| Dump and restore (mysqldump) | High | Low | Small databases (< 10 GB) |
| Azure Database Migration Service (DMS) | Low (online) | Medium | Medium to large databases |
| mydumper/myloader | Medium | Medium | Large databases needing parallelism |

For small databases, a simple mysqldump and restore works fine. For larger databases where you need minimal downtime, Azure DMS with online migration is the way to go.

## Pre-Migration Assessment

Before you start moving data, spend time on assessment. This step catches issues that would otherwise surprise you during migration.

### Check MySQL Version Compatibility

Azure Database for MySQL Flexible Server supports MySQL 5.7 and 8.0. If your on-premises server runs an older version, you will need to upgrade first.

```bash
# Check your current MySQL version
mysql -u root -p -e "SELECT VERSION();"
```

### Audit Database Size

Know how big your databases are:

```sql
-- Get the size of each database in MB
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
GROUP BY table_schema
ORDER BY SUM(data_length + index_length) DESC;
```

### Check for Unsupported Features

Some MySQL features are not available in the managed service:

- SUPER privilege is not available.
- FILE privilege is not available (no LOAD DATA INFILE from server-side files).
- Some storage engines are not supported (only InnoDB and MEMORY are fully supported).
- Custom plugins and UDFs are not supported.

Run this check for non-InnoDB tables:

```sql
-- Find tables not using InnoDB engine
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE engine != 'InnoDB'
  AND table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys');
```

Convert any MyISAM tables to InnoDB before migration:

```sql
-- Convert a table from MyISAM to InnoDB
ALTER TABLE mydb.mytable ENGINE = InnoDB;
```

### Check for Definer Issues

Stored procedures, views, and triggers often reference specific users in their DEFINER clause. These users might not exist on the target server.

```sql
-- Find all definers used in routines and views
SELECT DISTINCT definer
FROM information_schema.routines
WHERE routine_schema NOT IN ('mysql', 'sys');

SELECT DISTINCT definer
FROM information_schema.views
WHERE table_schema NOT IN ('mysql', 'sys', 'information_schema');
```

## Method 1: mysqldump and Restore

This is the simplest approach. It creates a logical dump of your database and restores it on Azure.

### Step 1: Create the Target Server

```bash
# Create the Azure MySQL Flexible Server
az mysql flexible-server create \
  --resource-group myResourceGroup \
  --name my-azure-mysql \
  --location eastus \
  --admin-user azureadmin \
  --admin-password 'StrongPassword123!' \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose \
  --version 8.0.21 \
  --storage-size 256
```

### Step 2: Dump the Source Database

```bash
# Dump the database with routines, triggers, and events
# --single-transaction ensures a consistent snapshot without locking
# --routines includes stored procedures and functions
# --triggers includes triggers
# --set-gtid-purged=OFF avoids GTID-related issues
mysqldump \
  --host=localhost \
  --user=root \
  --password \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  --databases myapp > myapp_dump.sql
```

### Step 3: Optimize the Dump for Faster Import

Before importing, configure the target server for bulk loading:

```bash
# Temporarily increase max_allowed_packet for large imports
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-azure-mysql \
  --name max_allowed_packet \
  --value 1073741824

# Disable foreign key checks and unique checks for faster import
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-azure-mysql \
  --name foreign_key_checks \
  --value OFF
```

### Step 4: Restore to Azure

```bash
# Restore the dump to the Azure server
mysql \
  --host=my-azure-mysql.mysql.database.azure.com \
  --user=azureadmin \
  --password='StrongPassword123!' \
  --ssl-mode=REQUIRED \
  < myapp_dump.sql
```

### Step 5: Re-enable Safety Settings

```bash
# Re-enable foreign key checks
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-azure-mysql \
  --name foreign_key_checks \
  --value ON
```

## Method 2: Azure Database Migration Service (DMS)

For larger databases or when you need minimal downtime, use DMS. It supports online migration, which means it migrates the data while your source database continues serving traffic, then performs a final cutover when you are ready.

### Step 1: Set Up DMS

Create a DMS instance in the Azure portal:

1. Search for "Azure Database Migration Service" in the portal.
2. Click "Create."
3. Select the pricing tier (Standard for offline, Premium for online migrations).
4. Place it in a VNet that can reach both your source and target servers.

### Step 2: Configure Source Connectivity

Your on-premises MySQL server needs to be reachable from Azure. Options include:

- VPN Gateway between your on-premises network and Azure VNet
- ExpressRoute connection
- Opening the MySQL port through your firewall (least recommended)

Enable binary logging on your source for online migration:

```ini
# Add to my.cnf on the source server
[mysqld]
# Enable binary logging for replication
log-bin = mysql-bin
# Use row-based replication for DMS compatibility
binlog_format = ROW
# Set a unique server ID
server-id = 1
# Keep binlogs for at least 5 days
expire_logs_days = 5
```

Restart MySQL after changing these settings.

### Step 3: Create the Migration Project

In the DMS instance:

1. Click "New migration project."
2. Set source type to MySQL.
3. Set target type to Azure Database for MySQL.
4. Choose "Online data migration" for minimal downtime.
5. Enter source and target connection details.
6. Select the databases to migrate.
7. Start the migration.

DMS will perform an initial full data load, then switch to continuous sync using binlog replication.

### Step 4: Monitor and Cutover

Monitor the migration progress in the portal. Once the initial load completes and ongoing replication catches up (lag drops to near zero):

1. Stop writes to the source database.
2. Wait for DMS to show zero lag.
3. Complete the cutover in DMS.
4. Update your application connection strings to point to Azure.
5. Verify everything works.
6. Re-enable traffic.

## Method 3: mydumper/myloader

For large databases (50+ GB), mydumper provides parallel dump and restore, which is significantly faster than mysqldump:

```bash
# Install mydumper
sudo apt-get install mydumper

# Dump with 8 parallel threads
mydumper \
  --host=localhost \
  --user=root \
  --password='SourcePassword' \
  --threads=8 \
  --compress \
  --outputdir=/backup/myapp \
  --database=myapp

# Restore with 8 parallel threads to Azure
myloader \
  --host=my-azure-mysql.mysql.database.azure.com \
  --user=azureadmin \
  --password='StrongPassword123!' \
  --threads=8 \
  --directory=/backup/myapp \
  --database=myapp \
  --ssl
```

The parallel threads make a huge difference for large databases. A 100 GB database that takes hours with mysqldump might finish in under an hour with mydumper.

## Post-Migration Validation

After migration, validate thoroughly:

```sql
-- Compare row counts between source and target for each table
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'myapp'
ORDER BY table_name;

-- Check that all stored procedures migrated
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'myapp';

-- Verify views exist
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'myapp';
```

Run your application's test suite against the new database. Check that queries return the expected results and that performance is acceptable.

## Application Cutover

The final step is switching your application to the new database:

1. Put your application in maintenance mode.
2. Take a final backup of the source.
3. If using DMS, complete the cutover. If using dump/restore, do a final incremental sync.
4. Update connection strings in your application configuration.
5. Deploy the updated configuration.
6. Test critical application flows.
7. Take the application out of maintenance mode.
8. Monitor closely for the first few hours.

Keep the source database running for at least a week after cutover. If something goes wrong, you want the option to roll back.

## Common Migration Issues

**Character set mismatches**: Ensure the target uses the same character set as the source. Check with `SHOW VARIABLES LIKE 'character_set%'` on both servers.

**Timezone differences**: Set the timezone on the Azure server to match your source if your application depends on server time.

**Missing users**: Create application users on the Azure server before cutover. Remember that user accounts are not migrated automatically.

**Performance differences**: The first few hours after migration might show different query performance. Give the InnoDB buffer pool time to warm up.

## Summary

Migrating MySQL to Azure is a well-trodden path with solid tooling. For small databases, mysqldump works fine. For larger workloads needing minimal downtime, Azure DMS handles the heavy lifting. Whatever method you choose, invest time in pre-migration assessment, thorough testing, and a clear cutover plan. The migration itself is the easy part - making sure everything works correctly on the other side is where the real effort goes.
