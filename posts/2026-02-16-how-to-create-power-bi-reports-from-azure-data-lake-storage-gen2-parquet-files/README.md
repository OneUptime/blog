# How to Create Power BI Reports from Azure Data Lake Storage Gen2 Parquet Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power BI, Azure Data Lake, Parquet, Data Lake Storage Gen2, Analytics, Power Query, Azure

Description: Build Power BI reports directly from Parquet files stored in Azure Data Lake Storage Gen2 using Power Query and Synapse serverless SQL pools.

---

Azure Data Lake Storage Gen2 is where modern data platforms land their processed data. Parquet is the default format for analytical workloads because it is columnar, compressed, and supports complex types. Connecting Power BI to these Parquet files gives your analysts access to the full data lake without needing a separate data warehouse.

There are multiple ways to do this, each with different tradeoffs. This guide covers three approaches: direct connection via Power Query, connection through Azure Synapse serverless SQL pools, and using Azure Databricks as an intermediary.

## Approach 1: Direct Connection via Power Query

This is the simplest method. Power BI reads Parquet files directly from ADLS Gen2 using Power Query.

### Prerequisites

- An Azure Data Lake Storage Gen2 account with hierarchical namespace enabled.
- Parquet files in the storage account.
- Power BI Desktop installed.
- Your Azure AD account has Storage Blob Data Reader (or higher) role on the storage account.

### Connect to the Data Lake

1. Open Power BI Desktop.
2. Click Get Data > Azure > Azure Data Lake Storage Gen2.
3. Enter the URL in the format: `https://yourstorageaccount.dfs.core.windows.net/`
4. Click OK.
5. Sign in with your Azure AD credentials.

### Navigate to the Parquet Files

Power Query shows you the container and folder hierarchy. Navigate to your Parquet files.

If your files are partitioned (e.g., `/data/year=2025/month=01/part-00000.parquet`), Power Query shows each partition folder. You can select the top-level folder and Power BI will combine all files underneath.

### Transform in Power Query

Once you select the Parquet files, Power Query loads the data. You can:

1. Filter columns to reduce the dataset size.
2. Change data types for proper formatting.
3. Add calculated columns.
4. Filter rows to a specific date range.

Here is a typical Power Query M script for loading Parquet files from ADLS Gen2:

```
// Load all Parquet files from the sales-data container
// Power Query automatically handles the Parquet format
let
    // Connect to the ADLS Gen2 endpoint
    Source = AzureStorage.DataLake(
        "https://yourstorageaccount.dfs.core.windows.net/sales-data/processed/"
    ),

    // Filter to only Parquet files
    FilteredFiles = Table.SelectRows(Source, each Text.EndsWith([Name], ".parquet")),

    // Combine all Parquet files into a single table
    CombinedData = Table.Combine(
        List.Transform(FilteredFiles[Content], each Parquet.Document(_))
    ),

    // Set column data types
    TypedData = Table.TransformColumnTypes(CombinedData, {
        {"OrderId", type text},
        {"OrderDate", type datetime},
        {"CustomerId", type text},
        {"TotalAmount", type number},
        {"Region", type text}
    }),

    // Filter to the last 12 months for performance
    RecentData = Table.SelectRows(TypedData,
        each [OrderDate] > DateTime.From(Date.AddMonths(DateTime.LocalNow(), -12))
    )
in
    RecentData
```

### Limitations of Direct Connection

- **Import mode only**: Direct Parquet connection does not support DirectQuery. All data is loaded into Power BI memory.
- **No query folding**: Filters applied in Power Query execute in Power BI, not in the storage layer. Power BI reads all files and then filters.
- **Size limits**: The dataset must fit in the Power BI memory limit (1 GB for Pro, up to 400 GB for Premium).
- **Slow refresh for large datasets**: Power BI downloads and processes all files on every refresh.

## Approach 2: Azure Synapse Serverless SQL Pool

This is the recommended approach for production. Synapse serverless SQL pools query Parquet files in place and let Power BI use DirectQuery.

### Set Up Synapse Views

Create views in the serverless SQL pool that point to your Parquet files:

```sql
-- Create a database for Power BI reporting
CREATE DATABASE Analytics;
GO

USE Analytics;

-- Create credentials for accessing the data lake
CREATE DATABASE SCOPED CREDENTIAL LakeCredential
WITH IDENTITY = 'Managed Identity';

-- Create a data source pointing to the container
CREATE EXTERNAL DATA SOURCE SalesLake
WITH (
    LOCATION = 'https://yourstorageaccount.dfs.core.windows.net/sales-data',
    CREDENTIAL = LakeCredential
);

-- Create a view over the Parquet files
-- This view handles the partitioned folder structure
CREATE VIEW dbo.vw_Sales AS
SELECT
    OrderId,
    OrderDate,
    CustomerId,
    CustomerName,
    ProductCategory,
    Quantity,
    UnitPrice,
    Quantity * UnitPrice AS Revenue,
    Region,
    -- Extract partition columns from the file path
    filepath(1) AS SalesYear,
    filepath(2) AS SalesMonth
FROM OPENROWSET(
    BULK 'processed/year=*/month=*/*.parquet',
    DATA_SOURCE = 'SalesLake',
    FORMAT = 'PARQUET'
) AS sales;
```

### Connect Power BI to Synapse

1. In Power BI Desktop, click Get Data > Azure > Azure Synapse Analytics SQL.
2. Enter the serverless endpoint: `yourworkspace-ondemand.sql.azuresynapse.net`
3. Enter the database name: `Analytics`
4. Choose DirectQuery or Import mode.
5. Authenticate with Azure AD.
6. Select the views you created.

### Benefits of the Synapse Approach

- **DirectQuery support**: Reports always show the latest data.
- **Query pushdown**: Synapse optimizes queries by reading only relevant partitions and columns.
- **T-SQL interface**: Power BI generates efficient SQL queries.
- **Cost efficient**: You pay only for data scanned (about $5 per TB).
- **Join across sources**: Combine data lake files with other sources in SQL.

## Approach 3: Azure Databricks

If your data pipeline already uses Databricks, you can connect Power BI to Databricks SQL endpoints.

### Create a Databricks SQL Warehouse

1. In your Databricks workspace, go to SQL Warehouses.
2. Create a new SQL Warehouse.
3. Set the size (2X-Small is fine for development).
4. Copy the Server hostname and HTTP path.

### Register Tables in Unity Catalog

```sql
-- Create a table over the Parquet files in Delta format
-- Databricks handles schema inference automatically
CREATE TABLE IF NOT EXISTS sales.orders
USING DELTA
LOCATION 'abfss://sales-data@yourstorageaccount.dfs.core.windows.net/processed/';

-- Or create a view for quick access
CREATE VIEW sales.vw_recent_orders AS
SELECT *
FROM sales.orders
WHERE OrderDate >= DATE_ADD(CURRENT_DATE(), -365);
```

### Connect Power BI

1. Get Data > Azure > Azure Databricks.
2. Enter the Server hostname and HTTP path.
3. Authenticate with a personal access token or Azure AD.
4. Select DirectQuery mode.
5. Choose the tables/views.

## Building the Report

Regardless of the connection approach, the report building process is the same.

### Data Model

If you loaded multiple tables, set up relationships:

1. Go to the Model view.
2. Drag CustomerID from the Sales table to CustomerID in the Customers table.
3. Set the relationship type (many-to-one, single direction).

### Key Visuals for Data Lake Reports

**Stacked Bar Chart - Revenue by Category and Region**
- X-axis: ProductCategory
- Y-axis: Revenue (Sum)
- Legend: Region

**Area Chart - Monthly Revenue Trend**
- X-axis: OrderDate (by month)
- Y-axis: Revenue (Sum)

**Treemap - Top Customers by Revenue**
- Group: CustomerName
- Values: Revenue (Sum)

**KPI Card - Year-over-Year Growth**
Use DAX for the growth calculation:

```
// Calculate year-over-year revenue growth
// Uses SAMEPERIODLASTYEAR for time intelligence
YoY Growth =
VAR CurrentYear = SUM(Sales[Revenue])
VAR PreviousYear = CALCULATE(
    SUM(Sales[Revenue]),
    SAMEPERIODLASTYEAR(Calendar[Date])
)
RETURN
DIVIDE(CurrentYear - PreviousYear, PreviousYear, 0)
```

## Optimizing Parquet Files for Power BI

### File Size

Aim for 100 MB to 1 GB per file. Small files cause overhead from metadata operations. Large files reduce parallelism.

### Compression

Use Snappy compression (the default in most data processing frameworks). It provides a good balance between compression ratio and decompression speed.

### Row Group Size

Parquet files are organized into row groups. Each row group stores column data together. For analytical queries:

- Target 100,000 to 1,000,000 rows per row group.
- Avoid row groups smaller than 10,000 rows.

### Partition Strategy

Partition your files by the most common filter dimension. If Power BI reports typically filter by date, partition by year and month:

```
/sales-data/processed/year=2025/month=01/part-00000.parquet
/sales-data/processed/year=2025/month=02/part-00000.parquet
```

This way, when a report filters to January 2025, only the January files are read.

### Column Pruning

Parquet is columnar, meaning a query that selects 5 out of 50 columns only reads those 5 columns from disk. To take advantage:

- Keep wide tables (many columns) rather than joining narrow tables at query time.
- Do not create views that SELECT * if only a few columns are needed.

## Scheduled Refresh

### For Import Mode

1. Publish the report to Power BI service.
2. Go to dataset settings.
3. Configure data source credentials (Azure AD authentication).
4. Set up scheduled refresh (e.g., daily at 6 AM after the data pipeline finishes).

### For DirectQuery

No scheduled refresh needed. Reports query the data lake in real time. However, consider setting up a cache refresh if using aggregation tables.

## Wrapping Up

Creating Power BI reports from Parquet files in ADLS Gen2 is straightforward with the right approach. For quick exploration, use the direct Power Query connection. For production reporting, use Synapse serverless SQL pools to get DirectQuery support, query pushdown, and a proper SQL interface. Optimize your Parquet files with proper sizing, partitioning, and compression to keep query performance high and costs low.
