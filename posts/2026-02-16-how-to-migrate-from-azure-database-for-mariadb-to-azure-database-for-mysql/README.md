# How to Migrate from Azure Database for MariaDB to Azure Database for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MariaDB, MySQL, Migration, Database Migration, Flexible Server, Cloud Database

Description: Step-by-step guide to migrating from Azure Database for MariaDB to Azure Database for MySQL Flexible Server before MariaDB reaches end of life.

---

Azure Database for MariaDB is on the retirement path. Microsoft has announced that the service will be retired, and customers need to migrate to Azure Database for MySQL Flexible Server. If you are running workloads on Azure Database for MariaDB, now is the time to plan and execute your migration.

The good news is that MariaDB and MySQL share a common heritage, and for many workloads the migration is straightforward. The not-so-good news is that there are compatibility differences that can bite you if you do not plan for them. In this post, I will walk through the entire migration process - from assessment to cutover.

## Why the Migration Is Necessary

Azure Database for MariaDB is being retired. After the retirement date, the service will no longer receive security patches, bug fixes, or support. Running on an unsupported service is a compliance and security risk you do not want to carry.

Azure Database for MySQL Flexible Server is the recommended target. It offers:

- Active development and support.
- Better price-performance ratio.
- More configuration flexibility.
- Zone-redundant high availability.
- Stop/start capability for cost savings.

## Compatibility Between MariaDB and MySQL

MariaDB forked from MySQL in 2009, and while they share SQL syntax and wire protocol, they have diverged over the years. Here are the key differences to watch for:

### Compatible Features (Usually No Issues)
- Standard SQL queries (SELECT, INSERT, UPDATE, DELETE).
- InnoDB storage engine.
- Most MySQL functions and operators.
- Stored procedures and functions (basic ones).
- Views, triggers, and events.
- INFORMATION_SCHEMA queries.

### Potentially Incompatible Features
- **Temporal tables**: MariaDB has system-versioned tables; MySQL does not support them natively.
- **Sequences**: MariaDB has SEQUENCE objects; MySQL uses AUTO_INCREMENT only.
- **JSON functions**: Some JSON function behaviors differ.
- **Window functions**: Implementation details may vary.
- **Storage engines**: MariaDB has Aria, ColumnStore, and other engines not available in MySQL.
- **Authentication plugins**: Different default plugins.
- **System variables**: Some variable names differ.

## Pre-Migration Assessment

### Step 1: Check Your MariaDB Version

```sql
-- Check the current MariaDB version
SELECT VERSION();
```

Azure Database for MariaDB runs MariaDB 10.2 or 10.3. Your target will be MySQL 8.0 on Flexible Server.

### Step 2: Identify Incompatible Features

```sql
-- Check for non-InnoDB tables
SELECT table_schema, table_name, engine
FROM information_schema.tables
WHERE engine NOT IN ('InnoDB', 'MEMORY')
  AND table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys');

-- Check for sequences (MariaDB-specific)
SELECT * FROM information_schema.sequences
WHERE sequence_schema NOT IN ('mysql', 'information_schema');

-- Check for system-versioned tables
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_type = 'SYSTEM VERSIONED';
```

### Step 3: Audit Stored Procedures and Functions

```sql
-- List all stored procedures and functions
SELECT routine_schema, routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema NOT IN ('mysql', 'sys', 'information_schema');
```

Review each stored procedure for MariaDB-specific syntax. Common issues include:

- MariaDB-specific SQL modes.
- Use of `EXECUTE IMMEDIATE` (MariaDB-specific).
- Oracle compatibility mode features.
- ROW data type (MariaDB-specific).

### Step 4: Check Application Code

Search your application code for:

- MariaDB-specific JDBC driver usage (switch to MySQL Connector/J).
- MariaDB-specific connection string parameters.
- Use of MariaDB-specific SQL syntax.

## Migration Approach

For most workloads, a dump-and-restore approach works well. For larger databases needing minimal downtime, you can use Azure DMS.

### Approach 1: mysqldump (Simple, Higher Downtime)

Best for databases under 50 GB.

### Approach 2: Azure DMS (Minimal Downtime)

Best for larger databases. Uses continuous replication for a smooth cutover.

## Step-by-Step: mysqldump Migration

### Step 1: Create the Target MySQL Flexible Server

```bash
# Create the target Azure Database for MySQL Flexible Server
az mysql flexible-server create \
  --resource-group myResourceGroup \
  --name my-mysql-target \
  --location eastus \
  --admin-user myadmin \
  --admin-password 'StrongPassword123!' \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose \
  --version 8.0.21 \
  --storage-size 256 \
  --storage-auto-grow Enabled
```

### Step 2: Configure Firewall Rules

```bash
# Allow your migration machine's IP
az mysql flexible-server firewall-rule create \
  --resource-group myResourceGroup \
  --name my-mysql-target \
  --rule-name AllowMigration \
  --start-ip-address 203.0.113.50 \
  --end-ip-address 203.0.113.50
```

### Step 3: Dump the MariaDB Database

```bash
# Dump from Azure Database for MariaDB
# Use --compatible=mysql to improve MySQL compatibility
mysqldump \
  --host=my-mariadb-server.mariadb.database.azure.com \
  --user=myadmin@my-mariadb-server \
  --password='MariaDBPassword!' \
  --ssl \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  --databases myapp > mariadb_dump.sql
```

### Step 4: Fix Compatibility Issues in the Dump

Before importing, review and fix the dump file:

```bash
# Remove MariaDB-specific syntax from the dump
# Fix the PAGE_COMPRESSED option (MariaDB-specific)
sed -i 's/PAGE_COMPRESSED=1//g' mariadb_dump.sql

# Remove PAGE_COMPRESSION_LEVEL (MariaDB-specific)
sed -i 's/PAGE_COMPRESSION_LEVEL=[0-9]*//g' mariadb_dump.sql

# Fix any SEQUENCE-related statements
# These need manual review and conversion to AUTO_INCREMENT
```

For more complex transformations, manually edit the dump file to:

- Replace MariaDB SEQUENCE objects with AUTO_INCREMENT columns.
- Remove system-versioned table clauses.
- Fix any MariaDB-specific storage engine references.
- Update authentication-related statements.

### Step 5: Optimize Target Server for Import

```bash
# Temporarily disable foreign key checks for faster import
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-target \
  --name foreign_key_checks \
  --value OFF

# Increase max_allowed_packet for large row imports
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-target \
  --name max_allowed_packet \
  --value 1073741824
```

### Step 6: Import to MySQL Flexible Server

```bash
# Import the dump into the MySQL target
mysql \
  --host=my-mysql-target.mysql.database.azure.com \
  --user=myadmin \
  --password='StrongPassword123!' \
  --ssl-mode=REQUIRED \
  < mariadb_dump.sql
```

### Step 7: Re-enable Safety Settings

```bash
# Re-enable foreign key checks
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-target \
  --name foreign_key_checks \
  --value ON
```

## Post-Migration Validation

### Verify Row Counts

```sql
-- Run on both source and target to compare
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'myapp'
ORDER BY table_name;
```

### Verify Stored Procedures

```sql
-- Check that all routines migrated
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'myapp';

-- Test critical stored procedures
CALL my_critical_procedure();
```

### Verify Views

```sql
-- Check all views are valid
SELECT table_name FROM information_schema.views
WHERE table_schema = 'myapp';

-- Test each view
SELECT * FROM my_important_view LIMIT 1;
```

### Check Character Sets

```sql
-- Verify character set consistency
SELECT
    table_name,
    column_name,
    character_set_name,
    collation_name
FROM information_schema.columns
WHERE table_schema = 'myapp'
  AND character_set_name IS NOT NULL
ORDER BY table_name, column_name;
```

## Application Changes

### Update Connection Strings

MariaDB connection strings need to change:

```python
# Before (MariaDB)
# host=my-mariadb-server.mariadb.database.azure.com
# user=myadmin@my-mariadb-server

# After (MySQL Flexible Server)
# host=my-mysql-target.mysql.database.azure.com
# user=myadmin
# (Note: the @server-name suffix is no longer needed)
```

### Update Database Drivers

If you are using the MariaDB-specific driver, switch to the MySQL driver:

**Java**: Switch from MariaDB Connector/J to MySQL Connector/J.
**Python**: mysql-connector-python works for both, but verify compatibility.
**Node.js**: The mysql2 package works for both.
**PHP**: MySQLi and PDO_MySQL work directly.

### Test Application Functionality

Run your complete test suite against the new MySQL server. Pay special attention to:

- Date and time handling (timezone differences).
- Character encoding (especially for non-ASCII data).
- Stored procedure behavior.
- Transaction handling.
- Authentication flow.

## Cutover Plan

1. **Schedule a maintenance window**: Plan for the cutover during low-traffic periods.
2. **Put application in maintenance mode**: Stop accepting new requests.
3. **Final sync**: If using DMS, wait for zero lag. If using dump/restore, do a final dump.
4. **Update connection strings**: Deploy the new configuration.
5. **Verify**: Run smoke tests against the new database.
6. **Resume traffic**: Take the application out of maintenance mode.
7. **Monitor**: Watch closely for 24-48 hours.

Keep the MariaDB server running for one week after cutover as a rollback option.

## Common Issues During Migration

**Character set differences**: MariaDB 10.3 defaults to utf8mb4 with `utf8mb4_general_ci` collation. MySQL 8.0 defaults to `utf8mb4_0900_ai_ci`. This can affect sort order and comparisons. Set the collation explicitly if your application depends on specific behavior.

**SQL mode differences**: MariaDB and MySQL have different default SQL modes. Check `@@sql_mode` on both servers and align them if needed.

**Authentication changes**: MySQL 8.0 uses `caching_sha2_password` by default. Your application client libraries must support this, or you can switch users back to `mysql_native_password`.

**GROUP BY behavior**: MySQL 8.0 does not implicitly sort GROUP BY results. Add explicit ORDER BY clauses.

## Summary

Migrating from Azure Database for MariaDB to Azure Database for MySQL Flexible Server is necessary and, for most workloads, manageable. The key is thorough pre-migration assessment to catch compatibility issues before they become production problems. Use mysqldump for smaller databases and Azure DMS for larger ones. Test everything on the target before cutover, update your application's connection strings and drivers, and keep the old server running as a safety net. Do not wait until the last minute - start your migration planning now.
