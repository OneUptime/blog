# How to Export ClickHouse Data to Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Azure Blob Storage, Export, Data Lake, ABS

Description: Learn how to export ClickHouse query results to Azure Blob Storage using the azureBlobStorage table function in Parquet, CSV, and JSON formats.

---

ClickHouse supports writing directly to Azure Blob Storage using the `azureBlobStorage` table function, enabling data lake integration with Azure Synapse, Databricks, and Power BI.

## Basic Azure Blob Export

```sql
INSERT INTO FUNCTION azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=BASE64KEY==;EndpointSuffix=core.windows.net',
    'my-container',
    'exports/events.csv',
    'CSVWithNames'
)
SELECT * FROM events
WHERE toDate(ts) = today() - 1;
```

## Exporting Parquet to Azure

```sql
INSERT INTO FUNCTION azureBlobStorage(
    'https://myaccount.blob.core.windows.net',
    'my-container',
    'events/date=2026-03-31/data.parquet',
    'myaccount',
    'BASE64ACCOUNTKEY==',
    'Parquet'
)
SELECT * FROM events
WHERE toDate(ts) = '2026-03-31';
```

Parquet files with Hive-style partitioning are directly queryable from Azure Synapse:

```sql
-- In Azure Synapse
SELECT TOP 100 *
FROM OPENROWSET(
    BULK 'https://myaccount.blob.core.windows.net/my-container/events/**',
    FORMAT = 'PARQUET'
) AS events_data;
```

## Exporting JSON Lines

```sql
INSERT INTO FUNCTION azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=BASE64KEY==;EndpointSuffix=core.windows.net',
    'my-container',
    'exports/events.ndjson',
    'JSONEachRow'
)
SELECT * FROM events LIMIT 100000;
```

## Automated Daily Export Script

```bash
#!/bin/bash
DATE=$(date -d yesterday +%Y-%m-%d)

clickhouse-client --query "
  INSERT INTO FUNCTION azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=${AZ_ACCOUNT};AccountKey=${AZ_KEY}==;EndpointSuffix=core.windows.net',
    'data-exports',
    'events/date=${DATE}/data.parquet',
    'Parquet'
  )
  SELECT * FROM events WHERE toDate(ts) = '${DATE}'
"
```

## Configuring Connection String in config.xml

```xml
<named_collections>
  <azure_conn>
    <connection_string>DefaultEndpointsProtocol=https;AccountName=...</connection_string>
    <container>my-container</container>
  </azure_conn>
</named_collections>
```

## Verifying the Export

```sql
SELECT count()
FROM azureBlobStorage(
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=KEY==;EndpointSuffix=core.windows.net',
    'my-container',
    'exports/events.csv',
    'CSVWithNames'
);
```

## Summary

ClickHouse exports data to Azure Blob Storage via the `azureBlobStorage` table function using connection strings or account key authentication. Use Parquet with date partitioning for Synapse and Databricks compatibility, and automate with daily shell scripts or ClickHouse scheduled events.
