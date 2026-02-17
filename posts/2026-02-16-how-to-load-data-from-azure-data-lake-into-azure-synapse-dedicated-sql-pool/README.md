# How to Load Data from Azure Data Lake into Azure Synapse Dedicated SQL Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Synapse Analytics, Data Lake, Dedicated SQL Pool, COPY INTO, PolyBase, Data Loading

Description: Learn the best methods to load data from Azure Data Lake Storage Gen2 into Azure Synapse dedicated SQL pool including COPY INTO and PolyBase.

---

Loading data from Azure Data Lake into a Synapse dedicated SQL pool is one of the most frequent operations in any data warehouse workflow. There are several ways to do it, each with different performance characteristics, flexibility, and complexity. This guide covers the main approaches - COPY INTO, PolyBase, and Synapse pipelines - with practical examples and performance tips.

## Loading Methods Compared

| Method | Speed | Flexibility | Setup Complexity | Best For |
|--------|-------|------------|-----------------|----------|
| COPY INTO | Very fast | High | Low | Most loading scenarios |
| PolyBase (External Tables) | Very fast | Moderate | Medium | Complex ETL with SQL |
| Synapse Pipeline (Copy Activity) | Fast | Very high | Medium | Orchestrated ETL workflows |
| INSERT...SELECT from Serverless | Slow | High | Low | Small/ad-hoc loads |

Microsoft recommends COPY INTO as the primary loading method for dedicated SQL pools. It is simpler than PolyBase, supports more file formats, and performs just as well.

## Prerequisites

- An Azure Synapse workspace with a dedicated SQL pool
- An Azure Data Lake Storage Gen2 account with Parquet or CSV files
- Proper access configured (managed identity, SAS token, or storage keys)

## Method 1: COPY INTO (Recommended)

The COPY INTO statement is the simplest and most performant way to load data.

### Loading Parquet Files

```sql
-- Load Parquet files from Data Lake into a staging table
-- Parquet files include schema, so column mapping is automatic
COPY INTO dbo.StagingSales
FROM 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/year=2025/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

That is it. For Parquet files with matching column names, this is all you need.

### Loading CSV Files

CSV files require more configuration because they do not carry schema information.

```sql
-- Load CSV files with explicit format options
COPY INTO dbo.StagingCustomers
FROM 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/customers/*.csv'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,                    -- Skip header row
    FIELDTERMINATOR = ',',           -- Column delimiter
    ROWTERMINATOR = '0x0A',          -- Line ending (LF for Linux files)
    FIELDQUOTE = '"',                -- Quote character for strings with commas
    ENCODING = 'UTF8',
    DATEFORMAT = 'yyyy-MM-dd',
    MAXERRORS = 10                   -- Allow up to 10 bad rows before failing
);
```

### Loading with Column Mapping

When file columns do not match table columns (different names or different order), use explicit column mapping.

```sql
-- Load with explicit column mapping
-- File has: order_id, prod_id, cust_id, order_dt, qty, price
-- Table has: OrderId, ProductId, CustomerId, OrderDate, Quantity, UnitPrice
COPY INTO dbo.FactSales (OrderId, ProductId, CustomerId, OrderDate, Quantity, UnitPrice)
FROM 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/*.csv'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,
    FIELDTERMINATOR = ','
);
```

### Loading from Multiple Paths

```sql
-- Load from multiple file paths in a single COPY INTO
COPY INTO dbo.FactSales
FROM
    'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/year=2024/**/*.parquet',
    'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/year=2025/**/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

### Authentication Options for COPY INTO

**Managed Identity (recommended):**

```sql
-- Managed identity - the Synapse workspace identity must have
-- Storage Blob Data Reader role on the storage account
COPY INTO dbo.StagingSales
FROM 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

**SAS Token:**

```sql
-- Using a SAS token for authentication
COPY INTO dbo.StagingSales
FROM 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'SHARED ACCESS SIGNATURE',
                  SECRET = 'sv=2021-06-08&ss=b&srt=co&sp=rl&se=2026-12-31&sig=...')
);
```

**Storage Account Key:**

```sql
-- Using a storage account key
COPY INTO dbo.StagingSales
FROM 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Storage Account Key',
                  SECRET = '<storage-account-key>')
);
```

## Method 2: PolyBase (External Tables)

PolyBase uses external tables to create a SQL-accessible abstraction over files in the data lake. It is more verbose to set up but useful when you want to query files repeatedly or apply complex SQL transformations during loading.

### Step 1: Create Required Objects

```sql
-- Create a master key (required for credentials)
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<StrongPassword!>';

-- Create a database-scoped credential
CREATE DATABASE SCOPED CREDENTIAL DataLakeCredential
WITH IDENTITY = 'Managed Identity';

-- Create an external data source pointing to the data lake
CREATE EXTERNAL DATA SOURCE DataLakeSource
WITH (
    TYPE = HADOOP,
    LOCATION = 'abfss://synapse-data@synapsedatalake2026.dfs.core.windows.net',
    CREDENTIAL = DataLakeCredential
);

-- Create an external file format for Parquet
CREATE EXTERNAL FILE FORMAT ParquetFileFormat
WITH (
    FORMAT_TYPE = PARQUET,
    DATA_COMPRESSION = 'org.apache.hadoop.io.compress.SnappyCodec'
);
```

### Step 2: Create an External Table

```sql
-- Create an external table that maps to files in the data lake
CREATE EXTERNAL TABLE dbo.ExtSalesData (
    OrderId BIGINT,
    ProductId INT,
    CustomerId INT,
    OrderDate DATE,
    Quantity INT,
    UnitPrice DECIMAL(10, 2),
    TotalAmount DECIMAL(12, 2)
)
WITH (
    LOCATION = '/raw/sales/year=2025/',
    DATA_SOURCE = DataLakeSource,
    FILE_FORMAT = ParquetFileFormat
);
```

### Step 3: Load from External Table with Transformations

```sql
-- Use CTAS (Create Table As Select) to load with transformations
-- CTAS creates a new distributed table from a query
CREATE TABLE dbo.FactSales_2025
WITH (
    DISTRIBUTION = HASH(CustomerId),
    CLUSTERED COLUMNSTORE INDEX
)
AS
SELECT
    OrderId,
    ProductId,
    CustomerId,
    OrderDate,
    Quantity,
    UnitPrice,
    TotalAmount,
    YEAR(OrderDate) AS OrderYear,
    MONTH(OrderDate) AS OrderMonth
FROM dbo.ExtSalesData
WHERE TotalAmount > 0;   -- Apply data quality filter during load
```

## Method 3: Synapse Pipeline Copy Activity

For orchestrated workflows, use the Copy Activity in a Synapse pipeline.

1. Create a pipeline in Synapse Studio.
2. Add a Copy Data activity.
3. Source: Azure Data Lake Storage Gen2 dataset (Parquet or CSV).
4. Sink: Azure Synapse Analytics dataset (dedicated SQL pool table).
5. Under sink settings:
   - Copy method: PolyBase (fastest) or COPY command
   - Pre-copy script: Optional SQL to run before loading (e.g., TRUNCATE TABLE)
   - Table option: Auto-create table or use existing

The pipeline approach is ideal when loading is part of a larger ETL workflow with dependencies, error handling, and scheduling.

## Performance Optimization Tips

### 1. Use the Right Table Structure for Loading

Load into a staging table with ROUND_ROBIN distribution and HEAP index (fastest for bulk inserts), then redistribute:

```sql
-- Fast staging table - optimized for bulk loading
CREATE TABLE dbo.StagingSales (
    OrderId BIGINT,
    ProductId INT,
    CustomerId INT,
    OrderDate DATE,
    Quantity INT,
    UnitPrice DECIMAL(10, 2),
    TotalAmount DECIMAL(12, 2)
)
WITH (
    DISTRIBUTION = ROUND_ROBIN,   -- Even distribution for fast loading
    HEAP                          -- No index overhead during insert
);

-- Load data into staging
COPY INTO dbo.StagingSales
FROM 'https://synapsedatalake2026.dfs.core.windows.net/synapse-data/raw/sales/*.parquet'
WITH (FILE_TYPE = 'PARQUET', CREDENTIAL = (IDENTITY = 'Managed Identity'));

-- Insert from staging into the properly distributed production table
INSERT INTO dbo.FactSales
SELECT * FROM dbo.StagingSales;

-- Clean up staging
TRUNCATE TABLE dbo.StagingSales;
```

### 2. Scale Up Before Loading

Increase the DWU level before large loads, then scale back down:

```bash
# Scale up for loading
az synapse sql pool update \
  --name myDataWarehouse \
  --workspace-name my-synapse-workspace \
  --resource-group rg-synapse \
  --performance-level DW1000c

# After loading, scale back down
az synapse sql pool update \
  --name myDataWarehouse \
  --workspace-name my-synapse-workspace \
  --resource-group rg-synapse \
  --performance-level DW200c
```

### 3. Optimize File Sizes

The sweet spot for file size is 256 MB to 1 GB per file. Too many small files create excessive overhead. Too few large files limit parallelism.

```bash
# Check file sizes in your data lake directory
az storage fs file list \
  --file-system synapse-data \
  --path raw/sales/ \
  --account-name synapsedatalake2026 \
  --query "[].{name:name, size:contentLength}" \
  -o table
```

If you have many small files, consolidate them first using a Spark job or serverless SQL CETAS query.

### 4. Use Larger Resource Classes

For dedicated SQL pool loading, assign a larger resource class to the loading user:

```sql
-- Grant a larger resource class for faster loading
-- xlargerc gives more memory per query, enabling bigger batch sizes
ALTER ROLE xlargerc ADD MEMBER loading_user;
```

Resource class allocations:

| Resource Class | Memory per Query (DW1000c) |
|---------------|---------------------------|
| smallrc | 250 MB |
| mediumrc | 800 MB |
| largerc | 1.6 GB |
| xlargerc | 3.2 GB |

### 5. Disable Constraints During Loading

```sql
-- Disable indexes on the target table before loading
ALTER INDEX ALL ON dbo.FactSales DISABLE;

-- Load the data
COPY INTO dbo.FactSales ...;

-- Rebuild indexes after loading
ALTER INDEX ALL ON dbo.FactSales REBUILD;
```

## Wrapping Up

For loading data from Azure Data Lake into a Synapse dedicated SQL pool, COPY INTO is the go-to method for most scenarios. It is fast, simple, and supports Parquet, CSV, and other formats with minimal configuration. Use PolyBase external tables when you need to query files repeatedly or apply complex SQL transformations during the load. Use Synapse pipelines when loading is part of a larger orchestrated workflow. Regardless of the method, the performance fundamentals are the same: use staging tables with ROUND_ROBIN distribution, optimize file sizes, scale up DWU for large loads, and assign appropriate resource classes.
