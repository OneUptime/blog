# How to Connect Power BI to Azure Synapse Analytics Serverless SQL Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power BI, Azure Synapse, Serverless SQL, Analytics, Data Lake, Power Platform, Azure

Description: Connect Power BI to Azure Synapse Analytics serverless SQL pools to query data lake files directly without provisioning dedicated compute resources.

---

Azure Synapse Analytics serverless SQL pools let you query files in your data lake using standard T-SQL without provisioning any compute infrastructure. When you connect Power BI to these serverless pools, you get the flexibility of data lake storage with the familiarity of SQL-based reporting. There is no data movement, no ETL pipelines to manage, and you pay only for the data scanned by your queries.

This guide covers the end-to-end setup: configuring the serverless SQL pool, creating views over data lake files, connecting Power BI, and optimizing for performance.

## Why Serverless SQL Pools with Power BI?

Traditional data warehousing requires moving data from a lake into a dedicated warehouse. Serverless SQL pools skip that step by querying files in place. Benefits for Power BI users:

- No infrastructure to manage. The pool scales automatically.
- Pay per query (per TB of data scanned), not per hour of compute.
- Query Parquet, CSV, JSON, and Delta Lake files directly.
- Use standard T-SQL, which Power BI already speaks fluently.
- Ideal for exploration and ad-hoc reporting on data lake data.

The tradeoff is query performance. Serverless pools are slower than dedicated pools for repetitive queries because there is no caching. For dashboards with heavy refresh cycles, consider import mode or a hybrid approach.

## Step 1: Set Up the Serverless SQL Pool

Every Synapse workspace comes with a built-in serverless SQL pool. You do not need to create one - it is always available.

### Create a Database

Connect to the serverless SQL pool endpoint (it looks like `yourworkspace-ondemand.sql.azuresynapse.net`) and create a database:

```sql
-- Create a database for your Power BI reporting views
-- This database does not store data - it stores metadata only
CREATE DATABASE SalesReporting;
```

### Create a Data Source

Point the database at your data lake:

```sql
USE SalesReporting;

-- Create a credential for accessing the data lake
-- Use a managed identity or SAS token
CREATE DATABASE SCOPED CREDENTIAL DataLakeCredential
WITH IDENTITY = 'Managed Identity';

-- Create an external data source pointing to your ADLS Gen2 container
CREATE EXTERNAL DATA SOURCE SalesDataLake
WITH (
    LOCATION = 'https://yourdatalake.dfs.core.windows.net/sales-data',
    CREDENTIAL = DataLakeCredential
);
```

### Create a File Format

Define how your files are structured:

```sql
-- Define the format for Parquet files
-- Parquet is the recommended format for Power BI queries
CREATE EXTERNAL FILE FORMAT ParquetFormat
WITH (FORMAT_TYPE = PARQUET);

-- Define the format for CSV files if you have those too
CREATE EXTERNAL FILE FORMAT CsvFormat
WITH (
    FORMAT_TYPE = DELIMITEDTEXT,
    FORMAT_OPTIONS (
        FIELD_TERMINATOR = ',',
        STRING_DELIMITER = '"',
        FIRST_ROW = 2  -- Skip header row
    )
);
```

## Step 2: Create Views Over Data Lake Files

Power BI connects best to views rather than raw OPENROWSET queries. Views provide a stable interface and let you handle schema evolution.

### View for Parquet Files

```sql
-- Create a view over partitioned Parquet files in the data lake
-- The filepath() function extracts partition values from the folder structure
CREATE VIEW dbo.vw_SalesOrders AS
SELECT
    OrderId,
    CustomerId,
    ProductId,
    Quantity,
    UnitPrice,
    Quantity * UnitPrice AS TotalAmount,
    OrderDate,
    -- Extract year and month from the partition path
    filepath(1) AS SalesYear,
    filepath(2) AS SalesMonth
FROM OPENROWSET(
    BULK 'orders/year=*/month=*/*.parquet',
    DATA_SOURCE = 'SalesDataLake',
    FORMAT = 'PARQUET'
) AS orders;
```

### View for Delta Lake Files

```sql
-- Create a view over Delta Lake tables
-- Delta format supports ACID transactions and time travel
CREATE VIEW dbo.vw_Customers AS
SELECT
    CustomerId,
    FirstName,
    LastName,
    Email,
    Region,
    SignupDate
FROM OPENROWSET(
    BULK 'customers/',
    DATA_SOURCE = 'SalesDataLake',
    FORMAT = 'DELTA'
) AS customers;
```

### Aggregated View for Dashboards

```sql
-- Pre-aggregate data for dashboard performance
-- Power BI queries against this view will scan less data
CREATE VIEW dbo.vw_MonthlySalesSummary AS
SELECT
    filepath(1) AS SalesYear,
    filepath(2) AS SalesMonth,
    COUNT(*) AS OrderCount,
    SUM(Quantity * UnitPrice) AS TotalRevenue,
    AVG(Quantity * UnitPrice) AS AvgOrderValue,
    COUNT(DISTINCT CustomerId) AS UniqueCustomers
FROM OPENROWSET(
    BULK 'orders/year=*/month=*/*.parquet',
    DATA_SOURCE = 'SalesDataLake',
    FORMAT = 'PARQUET'
) AS orders
GROUP BY filepath(1), filepath(2);
```

## Step 3: Connect Power BI Desktop

### Install Prerequisites

Make sure you have:
- Power BI Desktop (latest version)
- Azure AD account with access to the Synapse workspace

### Create the Connection

1. Open Power BI Desktop.
2. Click Get Data > Azure > Azure Synapse Analytics SQL.
3. Enter the server: `yourworkspace-ondemand.sql.azuresynapse.net`
4. Enter the database: `SalesReporting`
5. Choose the data connectivity mode:
   - **DirectQuery**: Queries run against Synapse on every interaction. Good for real-time data but slower dashboards.
   - **Import**: Data is loaded into Power BI. Faster dashboards but requires scheduled refresh.
6. Click OK.
7. Authenticate with your Azure AD credentials.
8. Select the views you created and click Load.

### Choosing Between DirectQuery and Import

For serverless SQL pools, this decision matters more than usual:

**DirectQuery pros:**
- Always shows the latest data
- No storage limits in Power BI
- Good for large datasets that do not fit in Power BI memory

**DirectQuery cons:**
- Every visual interaction triggers a query against Synapse
- You pay for each query (per TB scanned)
- Slower dashboard interactions
- Limited DAX function support

**Import pros:**
- Fast dashboard interactions
- Full DAX support
- Fixed cost after initial data load

**Import cons:**
- Data is only as fresh as the last refresh
- Dataset size limits (1 GB for Pro, 400 GB for Premium)
- Refresh can be slow for large datasets

For most reporting scenarios, Import mode with scheduled refresh is the better choice. Use DirectQuery only when you need truly live data or when the dataset is too large to import.

## Step 4: Optimize for Power BI

### Partition Your Data

Partitioned data means queries can skip irrelevant files. If your Power BI report filters by year and month, partition your Parquet files accordingly:

```
/orders/year=2025/month=01/data.parquet
/orders/year=2025/month=02/data.parquet
/orders/year=2025/month=03/data.parquet
```

When Power BI filters on `SalesYear = '2025' AND SalesMonth = '03'`, the serverless pool reads only the March 2025 file.

### Use Parquet Format

Parquet is columnar and compressed, which means:
- Queries that select a few columns read less data
- Compression reduces the bytes scanned (and the cost)
- Predicate pushdown works at the row group level

CSV files require reading entire rows even if you need one column. For Power BI workloads, always convert CSV to Parquet.

### Right-Size Your Files

- Too many small files: Overhead from opening and reading metadata for each file.
- Too few large files: Cannot parallelize reads efficiently.
- Ideal file size: 100 MB to 1 GB per Parquet file.

### Create Statistics

Statistics help the query optimizer make better decisions:

```sql
-- Create statistics on columns commonly used in Power BI filters
-- This improves query plan quality
CREATE STATISTICS stat_OrderDate ON dbo.vw_SalesOrders (OrderDate);
CREATE STATISTICS stat_CustomerId ON dbo.vw_SalesOrders (CustomerId);
CREATE STATISTICS stat_SalesYear ON dbo.vw_SalesOrders (SalesYear);
```

## Step 5: Publish and Schedule Refresh

### Publish to Power BI Service

1. In Power BI Desktop, click Publish.
2. Select the workspace.
3. Wait for the upload to complete.

### Configure Data Gateway (If Needed)

Serverless SQL pools use Azure AD authentication, so you typically do not need an on-premises data gateway. The Power BI service can connect directly to the Synapse endpoint.

However, if your Synapse workspace is behind a virtual network, you need an on-premises data gateway or a VNet data gateway.

### Set Up Scheduled Refresh

1. Go to the Power BI service > Settings for your dataset.
2. Under Gateway connection, configure the credentials.
3. Under Scheduled refresh:
   - Enable refresh.
   - Set the frequency (e.g., daily at 6 AM).
   - Configure failure notifications.

### Monitor Costs

Since serverless pools charge per TB scanned, monitor your costs:

1. In the Azure portal, go to your Synapse workspace > Monitoring > SQL requests.
2. Check the data processed per query.
3. Set up budget alerts in Azure Cost Management.

For Import mode, cost is incurred at each refresh. For DirectQuery, cost is incurred with every user interaction. Track both.

## Step 6: Security

### Row-Level Security

You can implement row-level security in the serverless SQL views:

```sql
-- View that filters data based on the user's email
-- Power BI passes the user identity through the connection
CREATE VIEW dbo.vw_MySalesOrders AS
SELECT *
FROM OPENROWSET(
    BULK 'orders/year=*/month=*/*.parquet',
    DATA_SOURCE = 'SalesDataLake',
    FORMAT = 'PARQUET'
) AS orders
WHERE SalesRepEmail = SUSER_SNAME();
```

Alternatively, implement row-level security in Power BI using DAX.

### Data Lake ACLs

Control who can access the underlying data lake files using ADLS Gen2 ACLs. The managed identity used by the serverless SQL pool needs read access to the files.

## Wrapping Up

Connecting Power BI to Azure Synapse serverless SQL pools gives you SQL-based reporting over data lake files without provisioning dedicated infrastructure. The key steps are creating views over your data lake files, choosing the right connectivity mode (Import vs DirectQuery), optimizing file format and partitioning for cost and performance, and setting up security. For most reporting scenarios, use Parquet files with proper partitioning, Import mode with scheduled refresh, and views that pre-aggregate data for dashboard performance.
