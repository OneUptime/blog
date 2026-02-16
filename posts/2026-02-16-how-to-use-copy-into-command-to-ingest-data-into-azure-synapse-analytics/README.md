# How to Use COPY INTO Command to Ingest Data into Azure Synapse Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Synapse Analytics, COPY INTO, Data Ingestion, Dedicated SQL Pool, Bulk Loading, T-SQL

Description: A detailed guide to using the COPY INTO command for fast and flexible data ingestion into Azure Synapse Analytics dedicated SQL pools.

---

The COPY INTO statement is the recommended way to load data into Azure Synapse dedicated SQL pools. It replaced PolyBase as the go-to bulk loading tool because it is simpler to use, supports more file formats, handles more edge cases in file parsing, and does not require you to create external data sources, file formats, or external tables. One statement, a few parameters, and your data is loaded.

## Why COPY INTO Over PolyBase?

PolyBase has been the standard loading tool for years, but it has limitations:

- Requires creating three objects before loading (external data source, external file format, external table)
- Limited error handling (cannot skip bad rows easily)
- Does not support all CSV edge cases (multi-character delimiters, embedded newlines in quoted fields)
- Cannot load into specific columns with reordering

COPY INTO addresses all of these. It is a single statement that handles authentication, file format, error tolerance, and column mapping.

## Basic Syntax

```sql
COPY INTO [schema].[table_name]
[(column_list)]
FROM 'external_location'
WITH (
    [FILE_TYPE = {'CSV' | 'PARQUET' | 'ORC'}]
    [,CREDENTIAL = (IDENTITY = '<identity>', SECRET = '<secret>')]
    [,FIELDTERMINATOR = '<delimiter>']
    [,ROWTERMINATOR = '<row_delimiter>']
    [,FIRSTROW = <n>]
    [,DATEFORMAT = '<date_format>']
    [,ENCODING = '<encoding>']
    [,MAXERRORS = <n>]
    [,COMPRESSION = '<compression_type>']
    [,FIELDQUOTE = '<quote_char>']
    [,IDENTITY_INSERT = {'ON' | 'OFF'}]
);
```

## Loading Parquet Files

Parquet is the preferred format for data lake storage. It is columnar, compressed, and self-describing (includes schema metadata).

```sql
-- Simple Parquet load - schema is inferred from the file
COPY INTO dbo.FactSales
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/2025/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

Since Parquet files contain column names and types, COPY INTO automatically maps file columns to table columns by name. If the file has columns not in the table, they are ignored. If the table has columns not in the file, they receive NULL or default values.

### Loading Specific Columns from Parquet

```sql
-- Load only specific columns from Parquet files
-- Useful when the file has more columns than you need
COPY INTO dbo.FactSales (OrderId, CustomerId, OrderDate, TotalAmount)
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

## Loading CSV Files

CSV files require more configuration since they do not include schema information.

### Basic CSV Load

```sql
-- Load a standard CSV file with header row
COPY INTO dbo.Customers
FROM 'https://mydatalake.dfs.core.windows.net/data/customers/customers.csv'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,                       -- Skip header row
    FIELDTERMINATOR = ',',              -- Column separator
    ROWTERMINATOR = '0x0A',            -- Line feed (Unix line endings)
    FIELDQUOTE = '"',                   -- Quote character
    ENCODING = 'UTF8'
);
```

### Handling Tab-Delimited Files

```sql
-- Load a tab-delimited file
COPY INTO dbo.LogData
FROM 'https://mydatalake.dfs.core.windows.net/data/logs/access_log.tsv'
WITH (
    FILE_TYPE = 'CSV',                  -- TSV is still FILE_TYPE = CSV
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 1,                       -- No header row
    FIELDTERMINATOR = '\t',             -- Tab delimiter
    ROWTERMINATOR = '0x0A'
);
```

### Handling Pipe-Delimited Files

```sql
-- Load a pipe-delimited file
COPY INTO dbo.ProductCatalog
FROM 'https://mydatalake.dfs.core.windows.net/data/products/catalog.dat'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,
    FIELDTERMINATOR = '|',
    ROWTERMINATOR = '0x0D0A',           -- CRLF (Windows line endings)
    ENCODING = 'UTF8'
);
```

### Handling Compressed CSV Files

```sql
-- Load gzip-compressed CSV files
COPY INTO dbo.WebEvents
FROM 'https://mydatalake.dfs.core.windows.net/data/events/*.csv.gz'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '0x0A',
    COMPRESSION = 'Gzip'
);
```

## Loading ORC Files

```sql
-- Load ORC format files (common in Hive/Hadoop ecosystems)
COPY INTO dbo.HiveData
FROM 'https://mydatalake.dfs.core.windows.net/data/hive_export/*.orc'
WITH (
    FILE_TYPE = 'ORC',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

## Column Mapping and Reordering

When file columns are in a different order than table columns, or you want to skip certain file columns, use explicit column mapping.

```sql
-- File columns: id, first_name, last_name, email, phone, created_date
-- Table columns: CustomerId, FullName, Email, CreatedDate

-- Map file columns by ordinal position
COPY INTO dbo.Customers (CustomerId, Email, CreatedDate)
FROM 'https://mydatalake.dfs.core.windows.net/data/customers/*.csv'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,
    FIELDTERMINATOR = ','
);
```

For more complex mapping with Parquet files, use auto-mapping by column name, which handles reordering automatically as long as names match.

## Error Handling

One of COPY INTO's best features is graceful error handling.

### Skip Bad Rows

```sql
-- Allow up to 100 bad rows before failing the load
-- Bad rows are silently skipped
COPY INTO dbo.SalesData
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/*.csv'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    MAXERRORS = 100                      -- Skip up to 100 bad rows
);
```

### Redirect Rejected Rows

```sql
-- Redirect rejected rows to a separate location for investigation
COPY INTO dbo.SalesData
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/*.csv'
WITH (
    FILE_TYPE = 'CSV',
    CREDENTIAL = (IDENTITY = 'Managed Identity'),
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    MAXERRORS = 1000,
    ERRORFILE = 'https://mydatalake.dfs.core.windows.net/data/rejected/',
    ERRORFILE_CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

Rejected rows are written to the error file location with details about why they were rejected. This is invaluable for data quality troubleshooting.

## Authentication Methods

### Managed Identity

The simplest and most secure option. The Synapse workspace's managed identity authenticates to storage.

```sql
COPY INTO dbo.MyTable
FROM 'https://mydatalake.dfs.core.windows.net/container/path/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (IDENTITY = 'Managed Identity')
);
```

Prerequisites:
- The Synapse workspace managed identity must have "Storage Blob Data Reader" (or Contributor) role on the storage account.

### Shared Access Signature (SAS)

```sql
COPY INTO dbo.MyTable
FROM 'https://mydatalake.dfs.core.windows.net/container/path/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (
        IDENTITY = 'SHARED ACCESS SIGNATURE',
        SECRET = 'sv=2021-06-08&ss=bfqt&srt=co&sp=rl&se=2026-12-31T23:59:59Z&sig=...'
    )
);
```

### Storage Account Key

```sql
COPY INTO dbo.MyTable
FROM 'https://mydatalake.dfs.core.windows.net/container/path/*.parquet'
WITH (
    FILE_TYPE = 'PARQUET',
    CREDENTIAL = (
        IDENTITY = 'Storage Account Key',
        SECRET = '<your-storage-account-key>'
    )
);
```

## Performance Optimization

### 1. Optimal File Sizes

The best loading performance comes from files sized between 256 MB and 1 GB. COPY INTO can read multiple files in parallel, so having 60+ files (matching the 60 distributions) maximizes parallelism.

```sql
-- Loading from a directory with many well-sized files is fastest
COPY INTO dbo.FactSales
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/optimized/*.parquet'
WITH (FILE_TYPE = 'PARQUET', CREDENTIAL = (IDENTITY = 'Managed Identity'));
```

### 2. Use Wildcards for Parallel Loading

```sql
-- Wildcard patterns enable parallel file reading
-- Single directory wildcard
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/*.parquet'

-- Recursive wildcard
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/**/*.parquet'

-- Multiple paths for parallel loading
FROM
    'https://mydatalake.dfs.core.windows.net/data/sales/region=us/*.parquet',
    'https://mydatalake.dfs.core.windows.net/data/sales/region=eu/*.parquet',
    'https://mydatalake.dfs.core.windows.net/data/sales/region=ap/*.parquet'
```

### 3. Load into HEAP Tables First

For maximum insert speed, load into a HEAP table (no clustered index), then rebuild:

```sql
-- Create staging table as HEAP for fastest loading
CREATE TABLE dbo.StagingSales (
    OrderId BIGINT,
    CustomerId INT,
    ProductId INT,
    OrderDate DATE,
    TotalAmount DECIMAL(12, 2)
)
WITH (DISTRIBUTION = ROUND_ROBIN, HEAP);

-- Load into HEAP (fastest)
COPY INTO dbo.StagingSales
FROM 'https://mydatalake.dfs.core.windows.net/data/sales/*.parquet'
WITH (FILE_TYPE = 'PARQUET', CREDENTIAL = (IDENTITY = 'Managed Identity'));

-- Move to properly indexed and distributed production table
INSERT INTO dbo.FactSales
SELECT * FROM dbo.StagingSales;
```

### 4. Increase DWU Before Large Loads

Higher DWU means more compute for reading and writing:

```bash
# Scale up before a large load
az synapse sql pool update \
  --name myDataWarehouse \
  --workspace-name my-synapse-workspace \
  --resource-group rg-synapse \
  --performance-level DW1000c
```

### 5. Use Larger Resource Classes

Assign the loading user a larger resource class for more memory per query:

```sql
-- Grant a larger resource class for the loading user
EXEC sp_addrolemember 'xlargerc', 'loading_user';
```

## Common Errors and Solutions

**"File not found"**: Check the URL path. ADLS Gen2 uses `dfs.core.windows.net`, not `blob.core.windows.net`.

**"Access denied"**: The credential does not have permission to read the storage. Check RBAC assignments or SAS token permissions.

**"String or binary data would be truncated"**: A value in the file is longer than the target column. Increase the column size or use MAXERRORS to skip bad rows.

**"Conversion failed"**: A value in the file cannot be converted to the target column type. Check date formats (DATEFORMAT parameter) or numeric values.

## Wrapping Up

COPY INTO is the simplest and most performant way to load data into Azure Synapse dedicated SQL pools. For Parquet files, it is often a one-liner. For CSV files, you need to specify delimiters and encoding but the setup is still far simpler than PolyBase. The error handling features - MAXERRORS and ERRORFILE - make it production-ready for real-world data that is never perfectly clean. Combine it with proper file sizing, HEAP staging tables, and appropriate DWU levels for loading performance that scales with your data volume.
