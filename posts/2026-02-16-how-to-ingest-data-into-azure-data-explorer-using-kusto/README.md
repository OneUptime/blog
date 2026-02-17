# How to Ingest Data into Azure Data Explorer Using Kusto

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Data Explorer, Kusto, Data Ingestion, Log Analytics, Time Series Data, Azure Cloud, Big Data

Description: A comprehensive guide to ingesting data into Azure Data Explorer using various methods including queued ingestion, streaming, and SDK-based approaches.

---

Azure Data Explorer (ADX) is a fast analytics service designed for exploring large volumes of structured and semi-structured data in near real time. It excels at log analytics, IoT telemetry, time-series analysis, and ad-hoc exploration of big datasets. But before you can query your data, you need to get it into ADX. The ingestion layer supports multiple methods, from simple one-time imports to continuous streaming pipelines.

In this post, we will cover the different ingestion methods available in Azure Data Explorer, walk through practical examples using the Kusto query language and SDKs, and discuss how to choose the right approach for your workload.

## Understanding ADX Ingestion

Azure Data Explorer has two primary ingestion modes:

**Batched (Queued) Ingestion**: Events are collected into batches and ingested together. This is the default mode and is optimized for throughput. Batching introduces a small delay (typically 5 minutes or less) but provides better efficiency and lower costs.

**Streaming Ingestion**: Events are ingested one at a time (or in small batches) with sub-second latency. This is ideal for scenarios where you need data to be queryable immediately but comes with higher resource overhead.

Most workloads should start with batched ingestion and switch to streaming only for tables where sub-second query freshness is required.

## Setting Up a Database and Table

Before ingesting data, create the destination table. Connect to your ADX cluster using the Kusto Web Explorer (KWE) at `https://dataexplorer.azure.com` or use the Azure Data Explorer desktop app.

```kql
// Create a database (done through Azure portal or CLI)
// Then create a table to hold application logs

// Define the table schema
.create table AppLogs (
    Timestamp: datetime,
    Level: string,
    Service: string,
    Message: string,
    TraceId: string,
    UserId: string,
    DurationMs: real,
    Properties: dynamic
)

// Create an ingestion mapping for JSON data
// This tells ADX how to map JSON fields to table columns
.create table AppLogs ingestion json mapping 'AppLogsJsonMapping'
'['
'  {"column": "Timestamp", "path": "$.timestamp", "datatype": "datetime"},'
'  {"column": "Level", "path": "$.level", "datatype": "string"},'
'  {"column": "Service", "path": "$.service", "datatype": "string"},'
'  {"column": "Message", "path": "$.message", "datatype": "string"},'
'  {"column": "TraceId", "path": "$.traceId", "datatype": "string"},'
'  {"column": "UserId", "path": "$.userId", "datatype": "string"},'
'  {"column": "DurationMs", "path": "$.durationMs", "datatype": "real"},'
'  {"column": "Properties", "path": "$.properties", "datatype": "dynamic"}'
']'
```

## Inline Ingestion with .ingest inline

For quick tests and small datasets, you can ingest data directly from a query:

```kql
// Ingest a few rows inline for testing
// This is not suitable for production ingestion - use it for development only
.ingest inline into table AppLogs <|
2026-02-16T10:00:00Z,INFO,auth-service,"User login successful",trace-001,user-123,45.2,
2026-02-16T10:00:01Z,WARN,payment-service,"Payment retry attempt 2",trace-002,user-456,1250.8,
2026-02-16T10:00:02Z,ERROR,order-service,"Order validation failed: missing address",trace-003,user-789,12.5,
```

## Ingesting from Azure Blob Storage

For bulk data loads, ingest from files stored in Azure Blob Storage:

```kql
// Ingest JSON data from a blob storage file
// Uses the JSON mapping we created earlier
.ingest into table AppLogs (
    h'https://mystorageaccount.blob.core.windows.net/logs/2026/02/16/app-logs.json.gz;impersonate'
) with (
    format = 'multijson',
    ingestionMappingReference = 'AppLogsJsonMapping',
    tags = '["source:blob", "date:2026-02-16"]'
)

// Ingest CSV data from blob storage
.ingest into table AppLogs (
    h'https://mystorageaccount.blob.core.windows.net/logs/2026/02/16/app-logs.csv;impersonate'
) with (
    format = 'csv',
    ignoreFirstRecord = true
)
```

## Ingesting with the Python SDK

For programmatic ingestion from applications, use the Kusto Python SDK:

```python
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
from azure.kusto.ingest import (
    QueuedIngestClient,
    IngestionProperties,
    DataFormat,
    ColumnMapping,
    JsonColumnMapping
)
import json
import tempfile
import os

# Create connection to the ingestion endpoint
# Note: use the ingest- prefix for the ingestion endpoint
cluster_ingest_uri = "https://ingest-mycluster.eastus.kusto.windows.net"
database = "mydb"

# Authenticate using Azure AD
kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(cluster_ingest_uri)
ingest_client = QueuedIngestClient(kcsb)

# Define ingestion properties
ingestion_props = IngestionProperties(
    database=database,
    table="AppLogs",
    data_format=DataFormat.MULTIJSON,
    ingestion_mapping_reference="AppLogsJsonMapping"
)

# Prepare the data as a JSON file
log_events = [
    {
        "timestamp": "2026-02-16T12:00:00Z",
        "level": "INFO",
        "service": "user-service",
        "message": "User profile updated",
        "traceId": "trace-100",
        "userId": "user-500",
        "durationMs": 23.4,
        "properties": {"field": "email", "oldValue": "old@test.com"}
    },
    {
        "timestamp": "2026-02-16T12:00:01Z",
        "level": "ERROR",
        "service": "notification-service",
        "message": "Failed to send push notification",
        "traceId": "trace-101",
        "userId": "user-501",
        "durationMs": 5000.0,
        "properties": {"errorCode": "PUSH_TIMEOUT", "retryCount": 3}
    }
]

# Write to a temporary file and ingest
temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
for event in log_events:
    temp_file.write(json.dumps(event) + '\n')
temp_file.close()

# Ingest the file - this queues the ingestion and returns immediately
ingest_client.ingest_from_file(
    temp_file.name,
    ingestion_properties=ingestion_props
)

print("Ingestion queued successfully")
os.unlink(temp_file.name)
```

## Ingesting with the .NET SDK

```csharp
using Kusto.Data;
using Kusto.Data.Common;
using Kusto.Ingest;
using System.Text.Json;

// Create the ingestion client
var ingestUri = "https://ingest-mycluster.eastus.kusto.windows.net";
var kcsb = new KustoConnectionStringBuilder(ingestUri)
    .WithAadAzCliAuthentication();

using var ingestClient = KustoIngestFactory.CreateQueuedIngestClient(kcsb);

// Define ingestion properties
var ingestionProps = new KustoIngestionProperties("mydb", "AppLogs")
{
    Format = DataSourceFormat.multijson,
    IngestionMapping = new IngestionMapping
    {
        IngestionMappingReference = "AppLogsJsonMapping"
    }
};

// Create and ingest a stream of JSON events
var events = new[]
{
    new { timestamp = "2026-02-16T13:00:00Z", level = "INFO",
          service = "api-gateway", message = "Request processed",
          traceId = "trace-200", userId = "user-600",
          durationMs = 15.7, properties = new { statusCode = 200 } }
};

// Serialize and ingest
var jsonData = string.Join("\n", events.Select(e => JsonSerializer.Serialize(e)));
using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(jsonData));

// Queue the ingestion
await ingestClient.IngestFromStreamAsync(stream, ingestionProps);
Console.WriteLine("Ingestion queued successfully");
```

## Event Grid Ingestion (Continuous from Blob Storage)

For continuous ingestion of files landing in blob storage, set up Event Grid notifications:

```kql
// Create a continuous ingestion pipeline from blob storage
// New files landing in the container are automatically ingested
.create table AppLogs ingestion batching policy @'{"MaximumBatchingTimeSpan": "00:00:30"}'

// Create an Event Grid data connection (done through Azure portal or CLI)
// This watches a storage container for new blobs and ingests them automatically
```

Using Azure CLI to create the data connection:

```bash
# Create an Event Grid data connection for continuous blob ingestion
az kusto data-connection event-grid create \
  --resource-group my-resource-group \
  --cluster-name mycluster \
  --database-name mydb \
  --data-connection-name "blob-ingestion" \
  --storage-account-resource-id "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --event-hub-resource-id "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.EventHub/namespaces/{ns}/eventhubs/{eh}" \
  --consumer-group '$Default' \
  --table-name "AppLogs" \
  --mapping-rule-name "AppLogsJsonMapping" \
  --data-format "MULTIJSON" \
  --blob-storage-event-type "Microsoft.Storage.BlobCreated"
```

## Ingestion Batching Policy

Control how ADX batches incoming data before committing to storage:

```kql
// View current batching policy
.show table AppLogs policy ingestionbatching

// Set aggressive batching for near-real-time freshness
// Ingest when any of these conditions are met:
// - 30 seconds elapsed since first event in batch
// - 500MB of data accumulated
// - 1000 files accumulated
.alter table AppLogs policy ingestionbatching
@'{"MaximumBatchingTimeSpan": "00:00:30", "MaximumNumberOfItems": 1000, "MaximumRawDataSizeMB": 500}'

// For less latency-sensitive tables, use default batching (5 minutes)
// which gives better compression and query performance
.alter table AppLogs policy ingestionbatching
@'{"MaximumBatchingTimeSpan": "00:05:00", "MaximumNumberOfItems": 1000, "MaximumRawDataSizeMB": 1024}'
```

## Monitoring Ingestion

Track ingestion status and troubleshoot failures:

```kql
// Check recent ingestion operations
.show ingestion failures
| where Table == "AppLogs"
| where FailedOn > ago(24h)
| project FailedOn, OperationId, Database, Table, FailureKind, Details
| order by FailedOn desc
| take 20

// Check successful ingestions
.show commands
| where CommandType == "DataIngestPull"
| where StartedOn > ago(1h)
| project StartedOn, Duration, State, Text
| order by StartedOn desc

// Monitor ingestion volume over time
.show table AppLogs extents
| summarize
    ExtentCount = count(),
    TotalRows = sum(RowCount),
    TotalOriginalSize = sum(OriginalSize),
    TotalCompressedSize = sum(CompressedSize)
| extend CompressionRatio = round(toreal(TotalOriginalSize) / TotalCompressedSize, 2)
```

## Data Retention Policy

Configure how long data is retained:

```kql
// Set retention to 90 days for the AppLogs table
.alter table AppLogs policy retention
@'{"SoftDeletePeriod": "90.00:00:00", "Recoverability": "Enabled"}'

// Check current retention policy
.show table AppLogs policy retention
```

## Summary

Azure Data Explorer provides flexible ingestion options for different scenarios. Use inline ingestion for quick tests, blob storage ingestion for bulk loads, SDK-based ingestion for application integration, and Event Grid data connections for continuous automated ingestion from storage. Start with queued (batched) ingestion for most workloads - it provides the best cost-to-performance ratio. Tune the batching policy to balance freshness and efficiency, and monitor ingestion failures to catch issues before they affect your analytics. Once your data is ingested, ADX's Kusto query engine makes it fast and easy to explore and analyze.
