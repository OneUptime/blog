# How to Migrate Oracle Databases to Azure PostgreSQL Using Azure Database Migration Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Oracle, PostgreSQL, Database Migration, DMS, Azure Database Migration Service, Cloud Migration

Description: A practical guide to migrating Oracle databases to Azure Database for PostgreSQL using Azure Database Migration Service and related tools.

---

Migrating from Oracle to PostgreSQL is one of the more challenging database migration paths. The two systems have significant differences in SQL syntax, data types, stored procedure languages, and features. Azure Database Migration Service (DMS) helps with the data migration part, but the schema and application code conversion requires additional tools. This guide covers the full process from assessment to cutover.

## Understanding the Migration Complexity

Oracle to PostgreSQL is not a like-for-like migration. Unlike SQL Server to Azure SQL (which is essentially the same engine), Oracle and PostgreSQL are fundamentally different databases. Here is what makes this migration more involved:

- **PL/SQL vs. PL/pgSQL**: Oracle stored procedures use PL/SQL. PostgreSQL uses PL/pgSQL. The syntax is similar but not identical - you will need to convert every stored procedure, function, and trigger.
- **Data type differences**: Oracle NUMBER does not map cleanly to PostgreSQL numeric types. Oracle DATE includes time (PostgreSQL DATE does not). Oracle VARCHAR2 vs. PostgreSQL VARCHAR.
- **Sequences and identity**: Oracle sequences work differently from PostgreSQL sequences. Auto-increment patterns differ.
- **Package support**: Oracle has packages (collections of procedures and functions). PostgreSQL does not. You need to decompose packages into individual functions.
- **Proprietary features**: Oracle features like CONNECT BY (hierarchical queries), DECODE, NVL, and others need to be rewritten using PostgreSQL equivalents.

Because of this complexity, the migration typically involves three phases: schema conversion, data migration, and application code updates.

## Prerequisites

- An Oracle source database (11g or later)
- An Azure Database for PostgreSQL Flexible Server instance
- Azure Database Migration Service (Premium tier for online migrations)
- ora2pg (an open-source Oracle to PostgreSQL migration tool) for schema conversion
- Oracle Instant Client installed on the machine running ora2pg
- Network connectivity between the Oracle source and Azure

## Step 1: Assess the Migration with ora2pg

ora2pg is the standard tool for assessing and converting Oracle schemas to PostgreSQL. Start with an assessment to understand the scope of work.

Install ora2pg (on Linux):

```bash
# Install ora2pg from source
sudo apt-get install libdbi-perl libdbd-pg-perl
# Also need Oracle Instant Client and DBD::Oracle Perl module

# Or install via CPAN
sudo cpan Ora2Pg
```

Create an ora2pg configuration file:

```bash
# Create the ora2pg configuration file
# This defines the source Oracle connection and conversion options
cat > ora2pg.conf << 'CONF'
ORACLE_DSN    dbi:Oracle:host=oracle-server;sid=ORCL;port=1521
ORACLE_USER   migration_user
ORACLE_PWD    migration_password

# Schema to export
SCHEMA        MY_APP_SCHEMA

# Export type (TABLE, VIEW, SEQUENCE, PROCEDURE, FUNCTION, etc.)
TYPE          SHOW_REPORT

# Target PostgreSQL version
PG_VERSION    15

# Output directory
OUTPUT_DIR    /tmp/ora2pg_output

# Estimated cost unit (for migration effort assessment)
COST_UNIT_VALUE  5
CONF
```

Run the assessment report:

```bash
# Generate a migration assessment report
ora2pg -c ora2pg.conf -t SHOW_REPORT --estimate_cost

# The report shows:
# - Number of objects by type (tables, views, procedures, etc.)
# - Estimated conversion difficulty (A=easy, B=moderate, C=complex)
# - Estimated migration hours
# - Specific issues to address
```

The report gives you a migration difficulty rating from A (trivial) to C (complex). Most Oracle to PostgreSQL migrations fall into the B-C range due to PL/SQL code.

## Step 2: Convert the Schema

Use ora2pg to convert each object type. Do them separately so you can review and fix each category.

```bash
# Convert tables (DDL)
ora2pg -c ora2pg.conf -t TABLE -o tables.sql

# Convert sequences
ora2pg -c ora2pg.conf -t SEQUENCE -o sequences.sql

# Convert views
ora2pg -c ora2pg.conf -t VIEW -o views.sql

# Convert functions
ora2pg -c ora2pg.conf -t FUNCTION -o functions.sql

# Convert procedures
ora2pg -c ora2pg.conf -t PROCEDURE -o procedures.sql

# Convert triggers
ora2pg -c ora2pg.conf -t TRIGGER -o triggers.sql

# Convert package bodies (decomposed into functions)
ora2pg -c ora2pg.conf -t PACKAGE -o packages.sql
```

Review each output file carefully. ora2pg handles most conversions automatically, but you will need to manually fix:

- Complex PL/SQL constructs that do not have direct PL/pgSQL equivalents
- CONNECT BY hierarchical queries (replace with WITH RECURSIVE in PostgreSQL)
- Oracle-specific functions (NVL becomes COALESCE, DECODE becomes CASE, SYSDATE becomes CURRENT_TIMESTAMP)
- REF CURSOR handling differences
- Exception handling syntax differences

Here is an example of a common conversion:

```sql
-- Oracle PL/SQL
CREATE OR REPLACE FUNCTION get_customer_name(p_id IN NUMBER)
RETURN VARCHAR2 IS
    v_name VARCHAR2(100);
BEGIN
    SELECT customer_name INTO v_name
    FROM customers
    WHERE customer_id = p_id;
    RETURN v_name;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;

-- PostgreSQL PL/pgSQL equivalent
CREATE OR REPLACE FUNCTION get_customer_name(p_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_name VARCHAR(100);
BEGIN
    SELECT customer_name INTO v_name
    FROM customers
    WHERE customer_id = p_id;
    RETURN v_name;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

## Step 3: Create the Target PostgreSQL Database

```bash
# Create an Azure Database for PostgreSQL Flexible Server
az postgres flexible-server create \
  --name pg-target-server \
  --resource-group rg-oracle-migration \
  --location eastus \
  --admin-user pgadmin \
  --admin-password '<StrongPassword123!>' \
  --sku-name Standard_D4s_v3 \
  --storage-size 256 \
  --version 15

# Create the target database
az postgres flexible-server db create \
  --server-name pg-target-server \
  --resource-group rg-oracle-migration \
  --database-name myappdb

# Configure firewall to allow DMS access
az postgres flexible-server firewall-rule create \
  --name allow-azure-services \
  --resource-group rg-oracle-migration \
  --server-name pg-target-server \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Step 4: Apply the Converted Schema

Apply the converted schema files to the PostgreSQL target in the correct order:

```bash
# Apply schema objects in dependency order
psql "host=pg-target-server.postgres.database.azure.com dbname=myappdb \
  user=pgadmin password=<password> sslmode=require" \
  -f sequences.sql \
  -f tables.sql \
  -f views.sql \
  -f functions.sql \
  -f procedures.sql \
  -f triggers.sql
```

Fix any errors that come up during schema application. Common issues at this stage include:
- Data type mismatches (Oracle NUMBER precision mapping)
- Missing function dependencies
- Reserved word conflicts (Oracle column names that are PostgreSQL reserved words)

## Step 5: Migrate Data with Azure DMS

With the schema in place, use Azure DMS to migrate the data.

```bash
# Create a DMS instance for Oracle to PostgreSQL migration
az dms create \
  --name dms-oracle-to-pg \
  --resource-group rg-oracle-migration \
  --location eastus \
  --sku-name Premium_4vCores \
  --subnet "/subscriptions/<sub-id>/resourceGroups/rg-oracle-migration/providers/Microsoft.Network/virtualNetworks/vnet-migration/subnets/snet-dms"
```

**Using the Azure Portal to configure the migration:**

1. Navigate to the DMS instance.
2. Create a new migration project with source type "Oracle" and target type "Azure Database for PostgreSQL".
3. Configure the Oracle source connection.
4. Configure the PostgreSQL target connection.
5. Map source tables to target tables.
6. Choose online or offline migration.
7. Start the migration.

DMS handles the data type conversion during transfer. For example, Oracle NUMBER(10) maps to PostgreSQL INTEGER, Oracle CLOB maps to TEXT, and Oracle BLOB maps to BYTEA.

## Step 6: Handle Data Type Mappings

While DMS handles most data type conversions, be aware of these common mapping decisions:

| Oracle Type | PostgreSQL Type | Notes |
|---|---|---|
| NUMBER(p,s) | NUMERIC(p,s) | Direct mapping |
| NUMBER(10,0) | INTEGER or BIGINT | Use INTEGER if range fits |
| VARCHAR2(n) | VARCHAR(n) | Direct mapping |
| DATE | TIMESTAMP | Oracle DATE includes time |
| CLOB | TEXT | PostgreSQL TEXT is unlimited |
| BLOB | BYTEA | Or use Large Objects |
| RAW(n) | BYTEA | Binary data |
| LONG | TEXT | Deprecated in Oracle anyway |

Pay special attention to the Oracle DATE type. In Oracle, DATE includes hours, minutes, and seconds. In PostgreSQL, DATE is date-only. Use TIMESTAMP in PostgreSQL if you need the time component.

## Step 7: Validate and Test

After data migration, run comprehensive validation:

```sql
-- Compare row counts for all migrated tables
-- Run on Oracle:
SELECT table_name, num_rows FROM all_tables WHERE owner = 'MY_APP_SCHEMA';

-- Run equivalent on PostgreSQL:
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY relname;

-- Test converted functions
SELECT get_customer_name(1);

-- Test application queries (run your key queries against both databases
-- and compare results)
```

Also run your application's test suite against the PostgreSQL database. This is where you will find application-level SQL that needs updating - things like Oracle-specific syntax in your application code that was not covered by the schema conversion.

## Step 8: Update Application Code

This is often the most time-consuming part. Your application likely contains Oracle-specific SQL. Common changes:

- Replace Oracle outer join syntax `(+)` with standard ANSI `LEFT JOIN` / `RIGHT JOIN`
- Replace `ROWNUM` with `LIMIT` / `OFFSET`
- Replace `NVL()` with `COALESCE()`
- Replace `SYSDATE` with `CURRENT_TIMESTAMP`
- Update connection strings and drivers (from Oracle client to PostgreSQL client)
- Replace Oracle-specific error codes with PostgreSQL error codes

## Wrapping Up

Migrating from Oracle to Azure PostgreSQL is a multi-step journey that goes well beyond just copying data. The schema conversion with ora2pg handles the bulk of the structural changes, but manual review and PL/SQL-to-PL/pgSQL conversion will take significant effort. Azure DMS handles the data migration reliably, including online migration for minimal downtime. Budget the most time for testing - run your full application test suite against PostgreSQL, because the differences between Oracle and PostgreSQL will surface in ways you do not expect. Plan for the migration to take weeks or months, not days, depending on the complexity of your Oracle codebase.
