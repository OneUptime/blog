# How to Query Parquet and CSV Files in Azure Data Lake Using Synapse Serverless SQL Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Synapse Analytics, Serverless SQL Pool, Parquet, CSV, Data Lake, OPENROWSET

Description: A hands-on guide to querying Parquet and CSV files stored in Azure Data Lake directly using Synapse serverless SQL pool with practical examples.

---

One of the most powerful features of Azure Synapse Analytics is the ability to query files sitting in a data lake using plain T-SQL, without loading them into a database first. The serverless SQL pool reads Parquet, CSV, and JSON files on demand, processes them with a distributed query engine, and returns results just like a regular SQL query. You pay only for the data your queries scan - no provisioned compute, no infrastructure to manage.

This guide focuses specifically on the most common file formats: Parquet and CSV. We will cover everything from basic queries to advanced techniques like partition pruning, schema inference, and performance optimization.

## Parquet vs. CSV: What to Know

Before diving into queries, it helps to understand the fundamental differences between these formats and how they affect query behavior.

**Parquet** is a columnar binary format. Data is organized by columns rather than rows, compressed, and includes embedded schema metadata (column names and types). When you query three columns out of fifty, the engine reads only those three columns from disk. This makes Parquet dramatically more efficient for analytical queries.

**CSV** is a row-based text format. Every query reads every column because columns are not stored separately. There is no schema metadata, so you must tell the engine about column names and types. CSV files are larger (no built-in compression) and slower to query.

For data lakes, Parquet is the preferred format. Use CSV when you receive data from external systems that only export CSV, and consider converting to Parquet for repeated querying.

## Prerequisites

- An Azure Synapse workspace
- Data Lake Storage Gen2 with Parquet and/or CSV files
- Storage Blob Data Reader role assigned to the Synapse managed identity (or appropriate SAS/key credentials)

## Querying Parquet Files

### Basic Parquet Query

```sql
-- Query a Parquet file using OPENROWSET
-- Parquet files include schema, so no column definitions needed
SELECT TOP 100 *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/analytics/sales/sales_2025.parquet',
    FORMAT = 'PARQUET'
) AS sales;
```

That is all it takes. The engine reads the column names and types from the Parquet file metadata and creates a result set automatically.

### Query Multiple Files with Wildcards

Data lakes typically organize data across many files. Use wildcards to query them all at once.

```sql
-- Query all Parquet files in a directory
SELECT COUNT(*) AS TotalRows, SUM(TotalAmount) AS TotalRevenue
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/analytics/sales/*.parquet',
    FORMAT = 'PARQUET'
) AS sales;

-- Query files recursively across subdirectories
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/analytics/sales/**/*.parquet',
    FORMAT = 'PARQUET'
) AS sales
WHERE OrderDate >= '2025-06-01';
```

The `*` wildcard matches files in a single directory. The `**` wildcard matches files recursively through all subdirectories.

### Selecting Specific Columns

For Parquet files, selecting specific columns is crucial for performance. The engine performs column pruning - it physically reads only the columns you request.

```sql
-- Only reads the ProductCategory and TotalAmount columns from the files
-- Much faster and cheaper than SELECT *
SELECT
    ProductCategory,
    SUM(TotalAmount) AS Revenue,
    COUNT(*) AS OrderCount
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/analytics/sales/**/*.parquet',
    FORMAT = 'PARQUET'
) AS sales
GROUP BY ProductCategory
ORDER BY Revenue DESC;
```

### Using filepath() to Access Partition Values

Many data lakes use Hive-style partitioning (folders named `year=2025/month=01/`). You can access partition values in your queries using the `filepath()` function.

```sql
-- Access partition values from the folder structure
-- filepath(1) returns the first wildcard match, filepath(2) the second, etc.
SELECT
    filepath(1) AS SalesYear,
    filepath(2) AS SalesMonth,
    COUNT(*) AS RowCount,
    SUM(TotalAmount) AS Revenue
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/analytics/sales/year=*/month=*/*.parquet',
    FORMAT = 'PARQUET'
) AS sales
WHERE filepath(1) = '2025'    -- Partition pruning: only reads year=2025 folders
GROUP BY filepath(1), filepath(2)
ORDER BY filepath(1), filepath(2);
```

Partition pruning is a major performance optimization. When you filter on `filepath()`, the engine skips entire folders that do not match, avoiding unnecessary data reads.

### Overriding Parquet Schema

Sometimes you want to override the types inferred from Parquet metadata. Use the WITH clause.

```sql
-- Override column types from Parquet metadata
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/analytics/sales/*.parquet',
    FORMAT = 'PARQUET'
) WITH (
    OrderId BIGINT,
    CustomerId INT,
    OrderDate DATE,                     -- Force to DATE even if Parquet has TIMESTAMP
    TotalAmount DECIMAL(12, 2),         -- Control precision
    ProductCategory VARCHAR(100)        -- Control string length
) AS sales;
```

## Querying CSV Files

### Basic CSV Query with Schema Definition

```sql
-- Query a CSV file with explicit column definitions
-- Required because CSV files have no embedded schema
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/raw/customers/customers.csv',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE
) WITH (
    CustomerId INT,
    FirstName VARCHAR(100),
    LastName VARCHAR(100),
    Email VARCHAR(200),
    City VARCHAR(100),
    Country VARCHAR(100),
    SignupDate DATE
) AS customers;
```

The `PARSER_VERSION = '2.0'` is important - it supports more CSV edge cases and is generally faster than version 1.0.

### Handling CSV Without Headers

```sql
-- CSV file without a header row
-- Columns are mapped by ordinal position
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/raw/logs/access_log.csv',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    FIRSTROW = 1,                       -- Start from row 1 (no header to skip)
    FIELDTERMINATOR = ','
) WITH (
    Timestamp VARCHAR(30) 1,            -- Column ordinal position: 1
    IPAddress VARCHAR(15) 2,            -- Column ordinal position: 2
    Method VARCHAR(10) 3,
    Path VARCHAR(500) 4,
    StatusCode INT 5,
    ResponseTime INT 6
) AS logs;
```

### Handling Different Delimiters

```sql
-- Tab-separated file
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/raw/exports/data.tsv',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE,
    FIELDTERMINATOR = '\t'              -- Tab delimiter
) WITH (
    Id INT,
    Name VARCHAR(200),
    Value DECIMAL(10, 2)
) AS data;

-- Pipe-delimited file
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/raw/exports/data.dat',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    FIELDTERMINATOR = '|',              -- Pipe delimiter
    ROWTERMINATOR = '0x0A'              -- Unix line ending
) WITH (
    Col1 VARCHAR(50),
    Col2 VARCHAR(100),
    Col3 INT
) AS data;
```

### Handling Compressed CSV Files

```sql
-- Query gzip-compressed CSV files
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/raw/events/*.csv.gz',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE
) WITH (
    EventId BIGINT,
    EventType VARCHAR(50),
    EventTimestamp VARCHAR(30),
    UserId INT,
    Payload NVARCHAR(MAX)
) AS events;
```

The engine automatically detects gzip compression from the `.gz` extension.

### Handling Quoted Fields and Special Characters

```sql
-- CSV with quoted fields containing commas and newlines
SELECT *
FROM OPENROWSET(
    BULK 'https://mydatalake.dfs.core.windows.net/raw/products/catalog.csv',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE,
    FIELDTERMINATOR = ',',
    FIELDQUOTE = '"',                   -- Double-quote as field enclosure
    ESCAPECHAR = '\\'                   -- Backslash as escape character
) WITH (
    ProductId INT,
    ProductName VARCHAR(200),
    Description NVARCHAR(2000),         -- May contain commas and newlines
    Price DECIMAL(10, 2)
) AS products;
```

## Creating a Reusable Query Layer

For repeated queries, create external tables or views so users do not need to remember file paths and schema definitions.

### Create a Database and External Data Source

```sql
-- Create a database for your logical data warehouse
CREATE DATABASE DataLakeQueries;
GO
USE DataLakeQueries;
GO

-- Create an external data source to simplify file paths
CREATE EXTERNAL DATA SOURCE MyDataLake
WITH (
    LOCATION = 'https://mydatalake.dfs.core.windows.net/analytics'
);
```

### Create Views Over Parquet Files

```sql
-- Create a view that encapsulates the Parquet query
CREATE VIEW dbo.Sales AS
SELECT
    OrderId,
    CustomerId,
    ProductId,
    CAST(OrderDate AS DATE) AS OrderDate,
    Quantity,
    UnitPrice,
    TotalAmount,
    ProductCategory
FROM OPENROWSET(
    BULK 'sales/**/*.parquet',
    DATA_SOURCE = 'MyDataLake',
    FORMAT = 'PARQUET'
) AS raw_sales;
GO

-- Create a view over CSV customer data
CREATE VIEW dbo.Customers AS
SELECT *
FROM OPENROWSET(
    BULK 'dimensions/customers/*.csv',
    DATA_SOURCE = 'MyDataLake',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE
) WITH (
    CustomerId INT,
    CustomerName VARCHAR(200),
    Email VARCHAR(200),
    City VARCHAR(100),
    Country VARCHAR(100)
) AS customers;
GO

-- Now users can query like regular tables
SELECT
    c.Country,
    s.ProductCategory,
    SUM(s.TotalAmount) AS Revenue
FROM dbo.Sales s
JOIN dbo.Customers c ON s.CustomerId = c.CustomerId
GROUP BY c.Country, s.ProductCategory
ORDER BY Revenue DESC;
```

## Performance Optimization Tips

### 1. Always Prefer Parquet Over CSV

Parquet queries are typically 5-10x faster and 5-10x cheaper than equivalent CSV queries because of columnar storage and compression.

If you receive CSV data from external systems, convert it to Parquet:

```sql
-- Convert CSV to Parquet using CETAS (Create External Table As Select)
CREATE EXTERNAL TABLE dbo.CustomersParquet
WITH (
    LOCATION = 'dimensions/customers_parquet/',
    DATA_SOURCE = MyDataLake,
    FILE_FORMAT = ParquetFormat         -- Need to create this format first
)
AS
SELECT * FROM dbo.Customers;            -- Reads CSV, writes Parquet
```

### 2. Use Partition Pruning

Always filter on partition columns when possible:

```sql
-- This reads ALL files (expensive)
SELECT * FROM dbo.Sales WHERE OrderDate >= '2025-01-01';

-- This reads only year=2025 folder files (cheap)
SELECT *
FROM OPENROWSET(
    BULK 'sales/year=2025/**/*.parquet',
    DATA_SOURCE = 'MyDataLake',
    FORMAT = 'PARQUET'
) AS sales;
```

### 3. Select Only Needed Columns

```sql
-- Expensive: reads all columns
SELECT * FROM dbo.Sales;

-- Cheap: reads only two columns from Parquet
SELECT ProductCategory, SUM(TotalAmount)
FROM dbo.Sales
GROUP BY ProductCategory;
```

### 4. Optimize File Sizes

Files between 100 MB and 1 GB perform best. Too many small files (under 10 MB each) create file-listing overhead. Too few huge files limit parallelism.

### 5. Use Statistics for Better Query Plans

```sql
-- Create statistics on frequently filtered columns
CREATE STATISTICS stat_OrderDate ON dbo.Sales (OrderDate);
CREATE STATISTICS stat_ProductCategory ON dbo.Sales (ProductCategory);
```

Statistics help the serverless SQL pool generate better query plans, especially for joins and complex predicates.

## Wrapping Up

Querying Parquet and CSV files in Azure Data Lake using Synapse serverless SQL pool is a powerful way to explore and analyze data without any ETL or infrastructure setup. Parquet should be your default format - it is faster, cheaper, and self-describing. CSV is supported for compatibility with external data sources, but convert to Parquet when you will query the data repeatedly. Use views to create a clean query layer, partition your files for pruning, and always select only the columns you need. These practices keep your queries fast and your costs low.
