# Query Across Azure SQL Databases with External Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, SQL Server, Database, Data Integration, Security

Description: Understand why elastic pools do not enable three-part queries, then configure read-only external tables with explicit authentication and network limits.

---

Putting two databases in the same Azure SQL elastic pool shares compute resources; it does not make them databases inside a traditional SQL Server instance. A query such as `SELECT ... FROM OtherDatabase.dbo.Customers` therefore does not become supported merely because both databases use the same pool or logical server.

For supported cross-database reads, Azure SQL elastic query exposes remote data through external tables. It remains a preview feature with important authentication, networking, and data-type limitations.

## Choose a suitable use case

Elastic query can fit a reporting or lookup query that needs a controlled read-only view of another Azure SQL Database. It is not a transparent replacement for every cross-database SQL Server feature, distributed write transaction, or high-volume ETL pipeline.

Define which database runs the query and which database holds the source data. The examples below use `reporting` as the query database and `catalog` as the remote source. Their placement in one elastic pool is optional and does not eliminate the remote connection.

Microsoft currently documents SQL authentication for elastic query, including the application connection to the query database, and no Private Link support for databases targeted by external data sources. If the source must be accessible only through a private endpoint, choose a different integration architecture instead of adding an external table that cannot reach it.

## Create a restricted remote reader

Connect directly to `catalog` as an authorized administrator. Assume the following table already exists:

```sql
CREATE TABLE dbo.Products
(
    ProductId int NOT NULL PRIMARY KEY,
    ProductName nvarchar(200) NOT NULL,
    IsActive bit NOT NULL
);
```

In an existing system, inspect and use the real schema rather than recreating it. Create a dedicated contained SQL user and grant only the required read access:

```sql
-- Replace this placeholder through your approved secret-provisioning process.
CREATE USER [elastic_catalog_reader]
    WITH PASSWORD = '<generated-remote-reader-password>';
GRANT SELECT ON OBJECT::dbo.Products TO [elastic_catalog_reader];
```

Do not give this account broad administrative rights. Its credential will be used by the query database to access the remote source. Rotate it through a coordinated change to both sides and keep plaintext out of source control and deployment logs.

## Configure the query database

Open a separate connection to `reporting`; Azure SQL Database does not use `USE` to switch between user databases on one session. If this database has no database master key, create one using a protected password:

```sql
-- Run only when no database master key exists in reporting.
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<generated-master-key-password>';

CREATE DATABASE SCOPED CREDENTIAL CatalogReader
WITH IDENTITY = 'elastic_catalog_reader',
     SECRET = '<generated-remote-reader-password>';

CREATE EXTERNAL DATA SOURCE CatalogSource
WITH
(
    TYPE = RDBMS,
    LOCATION = 'catalog-prod.database.windows.net',
    DATABASE_NAME = 'catalog',
    CREDENTIAL = CatalogReader
);
```

Use the real logical-server FQDN. Creating the external data source stores configuration; it does not prove that the destination accepts connections. The first actual query is where reachability and authentication failures become visible.

On the logical server that hosts `catalog`, enable **Allow Azure services and resources to access this server** so the elastic query endpoint can reach the remote database. This public-endpoint firewall rule permits connection attempts from Azure resources outside your subscription too, so the dedicated user's narrow permissions remain essential. Private Link and virtual network rules are not substitutes for this elastic-query requirement.

Only trusted administrators should have `ALTER ANY EXTERNAL DATA SOURCE`. Elastic query sends credentials, query text, parameters, and transferred data to the configured destination. Review `sys.external_data_sources` and enforce approved outbound destinations where applicable.

## Map the remote schema explicitly

In `reporting`, define the local external table:

```sql
CREATE EXTERNAL TABLE dbo.RemoteProducts
(
    ProductId int NOT NULL,
    ProductName nvarchar(200) NOT NULL,
    IsActive bit NOT NULL
)
WITH
(
    DATA_SOURCE = CatalogSource,
    SCHEMA_NAME = N'dbo',
    OBJECT_NAME = N'Products'
);

SELECT ProductId, ProductName
FROM dbo.RemoteProducts
WHERE IsActive = 1
  AND ProductId BETWEEN 1000 AND 1100;
```

Match the remote column names, types, sizes, and nullability. The external-table declaration is metadata, not a copied table and not automatic schema synchronization. Treat a remote schema migration as an integration change: update mappings and test consumers together.

The local name is `dbo.RemoteProducts`. Applications connect to `reporting` and use that name rather than a three-part reference to `catalog`.

## Understand the practical limits

External tables are read-only for elastic query. Local tables in `reporting` still support ordinary T-SQL, so a local staging or summary table can store selected results, but this does not enable direct INSERT, UPDATE, or DELETE against the remote external table.

The current limitations exclude many large-object types, with `nvarchar(max)` an exception. That exception can still disable advanced batching and significantly affect performance. Project only needed columns, filter early, and inspect actual transfer behavior before assuming a local join is pushed entirely to the remote database.

The first query can take longer while the feature initializes, especially on smaller resources. Distinguish that startup effect from steady-state performance. Remote compute and data egress remain relevant even though elastic query itself has no separate feature charge.

## Verify before enabling consumers

Test a small bounded read, then a representative query under concurrent source workload. Confirm that the dedicated remote user cannot read unrelated tables. Check how schema drift, credential rotation, source unavailability, and query timeout are surfaced to callers.

If requirements include private-only remote connectivity, cross-database writes, large recurrent transfers, or broader SQL Server compatibility, consider an application connection to each database, a data-integration job, replicated reporting data, or a service whose compatibility matches the workload.

## Conclusion

An elastic pool does not grant cross-database naming semantics. External tables provide explicit remote reads with separate credentials and constraints; use them only after validating their network, security, schema, and performance fit.

## Official Documentation

- [Elastic query overview and current limitations](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-query-overview?view=azuresql)
- [Cross-database query setup](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-query-getting-started-vertical?view=azuresql)
- [Azure SQL elastic pools](https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-pool-overview?view=azuresql)
- [CREATE EXTERNAL TABLE](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-external-table-transact-sql)
- [CREATE DATABASE SCOPED CREDENTIAL](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-database-scoped-credential-transact-sql)
