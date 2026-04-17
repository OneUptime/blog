# How to Use azureBlobStorage() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Azure Blob Storage, Table Function, Cloud Storage, Integration

Description: Learn how to use the azureBlobStorage() table function in ClickHouse to read and write data directly from Azure Blob Storage containers.

---

## What Is azureBlobStorage()?

The `azureBlobStorage()` table function allows ClickHouse to read from and write to Azure Blob Storage as if it were a regular table. This enables cloud-native ETL pipelines, data lake integration, and incremental data imports without intermediate storage layers.

## Basic Syntax

```sql
SELECT *
FROM azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=KEY;EndpointSuffix=core.windows.net',
    'mycontainer',
    'data/events/*.parquet',
    'Parquet'
)
LIMIT 100;
```

The positional arguments differ depending on whether you use a connection string or a storage account URL:

- **Connection string form:** `azureBlobStorage(connection_string, container_name, blobpath, format)`
- **Storage account URL form:** `azureBlobStorage(storage_account_url, container_name, blobpath, account_name, account_key, format)`

Format, compression, and structure are optional trailing arguments in both forms.

## Supported Formats

```text
Parquet       - efficient columnar format for analytics
CSV           - comma-separated values
TSV           - tab-separated values
JSONEachRow   - one JSON object per line
ORC           - optimized row columnar
Avro          - schema-based binary format
```

## Reading Parquet Files from Azure

```sql
SELECT
    toDate(event_time) AS day,
    count() AS events,
    sum(revenue) AS total_revenue
FROM azureBlobStorage(
    'https://myaccount.blob.core.windows.net',
    'analytics-container',
    '2025/*/events.parquet',
    'myaccount',
    'ACCOUNT_KEY',
    'Parquet'
)
GROUP BY day
ORDER BY day;
```

## Using Named Collections for Credentials

Store credentials in a named collection to avoid embedding them in queries:

```xml
<!-- named_collections.xml -->
<named_collections>
    <azure_prod>
        <connection_string>DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=SECRET;EndpointSuffix=core.windows.net</connection_string>
        <container>analytics-container</container>
    </azure_prod>
</named_collections>
```

```sql
SELECT count()
FROM azureBlobStorage(azure_prod, blob_path = 'data/2025-01/*.parquet', format = 'Parquet');
```

## Writing Data to Azure Blob Storage

```sql
INSERT INTO FUNCTION azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=KEY;EndpointSuffix=core.windows.net',
    'export-container',
    'exports/daily_summary.parquet',
    'Parquet'
)
SELECT
    toDate(event_time) AS day,
    count() AS events
FROM analytics.events
GROUP BY day;
```

## Creating an External Table Alias

For repeated access, create a table alias so you don't repeat connection strings:

```sql
CREATE TABLE azure_events AS
azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=KEY;EndpointSuffix=core.windows.net',
    'analytics-container',
    'events/*.parquet',
    'Parquet'
);

SELECT count() FROM azure_events;
```

## Schema Inference

ClickHouse can infer the schema automatically from Parquet and ORC files:

```sql
DESCRIBE TABLE azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=KEY;EndpointSuffix=core.windows.net',
    'analytics-container',
    'events/sample.parquet',
    'Parquet'
);
```

## Filtering by Partition Path

Use path-based filtering with wildcards to read only specific partitions:

```sql
SELECT sum(revenue)
FROM azureBlobStorage(
    'https://myaccount.blob.core.windows.net',
    'analytics-container',
    '2025/01/*/events.parquet',  -- only January 2025
    'myaccount',
    'ACCOUNT_KEY',
    'Parquet'
);
```

## Summary

The `azureBlobStorage()` table function provides seamless integration between ClickHouse and Azure Blob Storage. Use it for cloud data lake queries, scheduled exports, and incremental ingestion pipelines. Named collections keep credentials out of query text, and schema inference simplifies onboarding new datasets.
