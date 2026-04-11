# How to Use MySQL Workbench for Data Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Workbench, Migration, Data, ETL

Description: Learn how to use MySQL Workbench Migration Wizard to migrate databases from other RDBMS systems like Microsoft SQL Server, PostgreSQL, and SQLite to MySQL.

---

## Introduction

MySQL Workbench includes a Migration Wizard that automates the process of moving data from other database systems to MySQL. It supports Microsoft SQL Server, PostgreSQL, Sybase, SQLite, and other ODBC-compatible sources. The wizard handles schema conversion, data type mapping, and data transfer - significantly reducing the manual work involved in database migrations.

## Supported Source Databases

- Microsoft SQL Server (2000 and later)
- Microsoft Access
- PostgreSQL
- Sybase Adaptive Server Enterprise
- SQLite
- Generic ODBC sources

## Opening the Migration Wizard

```text
Database > Migration Wizard...
```

The wizard requires:
- **Source connection** - ODBC connection to the source database
- **Target connection** - MySQL Workbench connection to the destination MySQL server

## Step 1 - Overview

The wizard shows a summary of the migration steps. Ensure the prerequisites are met:
- ODBC driver installed for the source database
- Network access to both source and target servers

## Step 2 - Source Selection

Configure the source database connection. For SQL Server:

```text
Database System: Microsoft SQL Server
Connection Method: ODBC
ODBC Driver: ODBC Driver 17 for SQL Server
Server: sqlserver.example.com
Port: 1433
Username: sa
Password: *****
```

Test the connection before proceeding.

## Step 3 - Target Selection

Select the target MySQL connection from your stored connections.

## Step 4 - Fetch Schemas

Workbench lists available schemas from the source. Select the schemas to migrate:

```text
Available Schemas:
[x] SalesDB
[ ] TempDB
```

## Step 5 - Object Selection

Choose which objects to migrate:

```text
[x] Tables
[x] Views
[x] Stored Procedures (with SQL conversion)
[ ] Triggers
```

Views and stored procedures require SQL syntax conversion, which Workbench performs automatically with manual review available.

## Step 6 - Migration

Workbench converts schema objects. Review the migration mapping:

```text
Source: [dbo].[Orders] (SQL Server)
Target: `SalesDB`.`Orders` (MySQL)

Column Mappings:
  OrderID    int IDENTITY(1,1)  ->  order_id INT NOT NULL AUTO_INCREMENT
  TotalAmt   money              ->  total_amt DECIMAL(19,4)
  OrderDate  datetime2          ->  order_date DATETIME
```

Edit mappings manually if the automatic conversion is incorrect.

## Step 7 - Schema Creation

Workbench creates the schema on the target MySQL server. Review any errors:

```text
Creating table `SalesDB`.`Orders`... SUCCESS
Creating view `SalesDB`.`v_active_orders`... WARNING: view body modified
```

## Step 8 - Data Transfer

Configure the data transfer:

```text
[x] Copy data to target
[x] Truncate target tables before copying
[x] Worker tasks: 4
```

Workbench performs a bulk INSERT migration with progress tracking:

```text
Migrating SalesDB.Orders: 1,250,000 rows - 100% complete
Duration: 00:02:15
```

## Step 9 - Report

After migration completes, a summary report shows:

```text
Tables migrated: 28
Rows transferred: 4,350,000
Errors: 0
Warnings: 3
```

Save the report for audit purposes.

## Post-Migration Validation

After migration, validate data integrity:

```sql
-- Compare row counts
SELECT COUNT(*) FROM SalesDB.Orders;

-- Spot-check values
SELECT * FROM SalesDB.Orders ORDER BY order_id LIMIT 10;

-- Verify totals
SELECT SUM(total_amt) FROM SalesDB.Orders;
```

## Summary

MySQL Workbench Migration Wizard streamlines cross-RDBMS migrations by automating schema conversion, data type mapping, and data transfer. It handles the most complex parts of migration - SQL dialect differences and data type incompatibilities - while giving you review and override control at every step. Always validate row counts and spot-check data after migration before decommissioning the source system.
