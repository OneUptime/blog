# How to Set Up Streaming Ingestion in Azure Data Explorer from Event Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Data Explorer, Streaming Ingestion, Azure Event Hubs, Real-Time Data, Kusto, Data Pipeline, Low Latency

Description: Learn how to configure streaming ingestion in Azure Data Explorer from Event Hubs for sub-second data availability in your analytical queries.

---

Standard batched ingestion in Azure Data Explorer provides data availability within a few minutes of ingestion. For many workloads, that is perfectly fine. But when you need data to be queryable within seconds of it being produced - live monitoring dashboards, real-time alerting, operational intelligence during incidents - you need streaming ingestion.

Streaming ingestion in Azure Data Explorer allows events flowing through Azure Event Hubs to appear in your ADX tables within seconds, making them immediately queryable with KQL. In this post, we will enable streaming ingestion, set up an Event Hubs data connection with streaming mode, and handle the operational considerations.

## How Streaming Ingestion Differs from Batched

In batched ingestion, events are collected into groups and written to storage as optimized data shards (extents). The batching process accumulates data for a configurable period (default 5 minutes) before committing, which produces well-compressed, well-indexed extents.

In streaming ingestion, each small batch of events is written to an initial row store immediately, making the data queryable within seconds. A background process later merges these small fragments into optimized extents. This gives you the speed of streaming with the eventual efficiency of batch processing.

The trade-off: streaming ingestion uses more CPU resources on your ADX cluster because it performs more frequent small writes instead of fewer large writes. Plan your cluster capacity accordingly.

## Prerequisites

Before enabling streaming ingestion:

1. An Azure Data Explorer cluster (at least 2 nodes recommended for streaming)
2. An Azure Event Hubs namespace with an Event Hub
3. The cluster must have streaming ingestion enabled at the cluster level
4. The target table must have a streaming ingestion policy enabled

## Step 1: Enable Streaming Ingestion on the Cluster

Streaming ingestion must be enabled at the cluster level first. This is done through the Azure portal or CLI:

```bash
# Enable streaming ingestion on the ADX cluster
# This requires a cluster restart which takes a few minutes
az kusto cluster update \
  --resource-group my-resource-group \
  --name mycluster \
  --enable-streaming-ingest true
```

Through the Azure portal:

1. Open your Azure Data Explorer cluster
2. Go to Configuration
3. Toggle "Streaming ingestion" to On
4. Click Save

The cluster needs a few minutes to reconfigure after enabling streaming ingestion.

## Step 2: Create the Target Table

Set up the table and ingestion mapping for your streaming data:

```kql
// Create a table for real-time telemetry data
.create table LiveTelemetry (
    Timestamp: datetime,
    DeviceId: string,
    MetricName: string,
    MetricValue: real,
    Tags: dynamic,
    Region: string
)

// Create a JSON ingestion mapping
.create table LiveTelemetry ingestion json mapping 'TelemetryMapping'
'['
'  {"column": "Timestamp", "path": "$.timestamp", "datatype": "datetime"},'
'  {"column": "DeviceId", "path": "$.deviceId", "datatype": "string"},'
'  {"column": "MetricName", "path": "$.metricName", "datatype": "string"},'
'  {"column": "MetricValue", "path": "$.metricValue", "datatype": "real"},'
'  {"column": "Tags", "path": "$.tags", "datatype": "dynamic"},'
'  {"column": "Region", "path": "$.region", "datatype": "string"}'
']'
```

## Step 3: Enable Streaming Ingestion Policy on the Table

The table needs an explicit streaming ingestion policy:

```kql
// Enable streaming ingestion for the LiveTelemetry table
.alter table LiveTelemetry policy streamingingestion enable

// Verify the policy is set
.show table LiveTelemetry policy streamingingestion
```

You can also enable streaming ingestion at the database level, which applies to all tables:

```kql
// Enable streaming ingestion for all tables in the database
.alter database mydb policy streamingingestion enable
```

## Step 4: Create the Event Hubs Data Connection

Now create a data connection between Event Hubs and ADX with streaming mode enabled:

```bash
# Create an Event Hubs data connection with streaming ingestion
az kusto data-connection event-hub create \
  --resource-group my-resource-group \
  --cluster-name mycluster \
  --database-name mydb \
  --data-connection-name "live-telemetry-stream" \
  --event-hub-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.EventHub/namespaces/my-eh-namespace/eventhubs/telemetry-events" \
  --consumer-group "adx-streaming" \
  --table-name "LiveTelemetry" \
  --mapping-rule-name "TelemetryMapping" \
  --data-format "MULTIJSON" \
  --event-system-properties "x-opt-enqueued-time" \
  --managed-identity-resource-id "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Kusto/clusters/mycluster"
```

Key parameters:

- **consumer-group**: Create a dedicated consumer group for the ADX connection. Do not use `$Default`.
- **data-format**: Match the format of your events (JSON, MULTIJSON, CSV, Avro, etc.)
- **mapping-rule-name**: The ingestion mapping created in Step 2.
- **managed-identity-resource-id**: Use the cluster's managed identity for authentication to Event Hubs.

### Grant ADX Access to Event Hubs

The ADX cluster's managed identity needs the "Azure Event Hubs Data Receiver" role on the Event Hub:

```bash
# Get the ADX cluster's managed identity
ADX_IDENTITY=$(az kusto cluster show \
  --resource-group my-resource-group \
  --name mycluster \
  --query identity.principalId \
  --output tsv)

# Grant Event Hubs Data Receiver role
az role assignment create \
  --role "Azure Event Hubs Data Receiver" \
  --assignee $ADX_IDENTITY \
  --scope "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.EventHub/namespaces/my-eh-namespace/eventhubs/telemetry-events"
```

## Step 5: Send Test Events

Produce some test events to your Event Hub and verify they appear in ADX:

```python
from azure.eventhub import EventHubProducerClient, EventData
import json
import time

# Create a producer
producer = EventHubProducerClient.from_connection_string(
    conn_str="your-eventhub-connection-string",
    eventhub_name="telemetry-events"
)

# Send test telemetry events
events = []
for i in range(10):
    event_data = {
        "timestamp": "2026-02-16T14:30:00Z",
        "deviceId": f"device-{i:03d}",
        "metricName": "cpu_usage",
        "metricValue": 45.0 + i * 2.5,
        "tags": {"environment": "production", "cluster": "east-1"},
        "region": "eastus"
    }
    events.append(EventData(json.dumps(event_data)))

# Send all events in a batch
event_batch = producer.create_batch()
for event in events:
    event_batch.add(event)
producer.send_batch(event_batch)
producer.close()

print("Events sent. They should appear in ADX within seconds.")
```

## Step 6: Verify Data Arrival

Wait a few seconds and then query the table:

```kql
// Check if streaming data has arrived
LiveTelemetry
| where Timestamp > ago(5m)
| take 20

// Count events by device
LiveTelemetry
| where Timestamp > ago(5m)
| summarize Count = count() by DeviceId
```

If streaming ingestion is working, data should be queryable within 5-10 seconds of being sent to Event Hubs.

## Monitoring Streaming Ingestion

### Check Ingestion Latency

```kql
// Measure the ingestion latency (time between event creation and query availability)
// Compare the event timestamp with the ingestion time
LiveTelemetry
| where Timestamp > ago(1h)
| extend IngestionTime = ingestion_time()
| extend IngestionLatencySeconds = datetime_diff('second', IngestionTime, Timestamp)
| summarize
    AvgLatency = avg(IngestionLatencySeconds),
    P50Latency = percentile(IngestionLatencySeconds, 50),
    P99Latency = percentile(IngestionLatencySeconds, 99),
    MaxLatency = max(IngestionLatencySeconds)
```

### Check Streaming Ingestion Metrics

```kql
// View streaming ingestion results (success/failure)
.show streamingingestion statistics

// Check for streaming ingestion failures
.show streamingingestion failures
| where Timestamp > ago(1h)
| project Timestamp, Database, Table, ErrorKind, ErrorMessage
```

### Fallback Behavior

If streaming ingestion fails (for example, due to schema mismatch or resource pressure), ADX automatically falls back to batched ingestion for those events. This means data is never lost, but it may take longer to become queryable. Monitor the fallback rate:

```kql
// Check streaming ingestion statistics including fallback
.show streamingingestion statistics
| where Timestamp > ago(1h)
```

## Handling Schema Changes

When you need to change the table schema, consider the impact on streaming ingestion:

```kql
// Add a new column to the table
// Streaming ingestion continues to work - new events without the column
// will have null values for it
.alter-merge table LiveTelemetry (
    Firmware: string
)

// Update the ingestion mapping to include the new column
.alter table LiveTelemetry ingestion json mapping 'TelemetryMapping'
'['
'  {"column": "Timestamp", "path": "$.timestamp", "datatype": "datetime"},'
'  {"column": "DeviceId", "path": "$.deviceId", "datatype": "string"},'
'  {"column": "MetricName", "path": "$.metricName", "datatype": "string"},'
'  {"column": "MetricValue", "path": "$.metricValue", "datatype": "real"},'
'  {"column": "Tags", "path": "$.tags", "datatype": "dynamic"},'
'  {"column": "Region", "path": "$.region", "datatype": "string"},'
'  {"column": "Firmware", "path": "$.firmware", "datatype": "string"}'
']'
```

## Performance and Capacity Planning

Streaming ingestion has higher CPU overhead compared to batched ingestion. Here are guidelines for capacity planning:

**Cluster sizing**: For streaming workloads, add 20-30% more compute capacity compared to what you would need for the same volume with batched ingestion.

**Event size**: Streaming ingestion works best with events up to 4MB. Larger payloads should use batched ingestion.

**Throughput limits**: A single ADX cluster can handle up to approximately 200MB per second of streaming ingestion, depending on the number of nodes and VM size.

**Concurrent streams**: Each data connection consumes resources. Limit the number of streaming data connections to what your cluster can handle comfortably.

## Combining Streaming and Batched Ingestion

You can use streaming ingestion for real-time data and batched ingestion for historical backfills on the same table:

```kql
// The streaming policy is on the table, but you can still ingest batches
// from blob storage using the standard batched path
.ingest into table LiveTelemetry (
    h'https://mystorageaccount.blob.core.windows.net/backfill/telemetry-2026-02-15.json.gz;impersonate'
) with (
    format = 'multijson',
    ingestionMappingReference = 'TelemetryMapping'
)
```

The batched ingestion goes through the normal batching pipeline, while real-time events continue to stream in with low latency.

## Retention and Caching

Configure caching to keep recently ingested streaming data in hot storage for fast queries:

```kql
// Keep 30 days of data in hot cache (SSD)
// Keep 365 days total before deletion
.alter table LiveTelemetry policy caching hot = 30d

.alter table LiveTelemetry policy retention
@'{"SoftDeletePeriod": "365.00:00:00", "Recoverability": "Enabled"}'
```

For streaming dashboards that only query recent data, a generous hot cache ensures sub-second query response times.

## Summary

Streaming ingestion from Event Hubs to Azure Data Explorer gives you sub-second data freshness for real-time analytics and monitoring. The setup involves enabling streaming at the cluster level, creating a streaming ingestion policy on your table, and configuring an Event Hubs data connection. The automatic fallback to batched ingestion provides resilience - if streaming encounters issues, data still arrives through the batch path. Monitor ingestion latency and fallback rates to ensure your streaming pipeline is performing as expected, and size your cluster with extra capacity to handle the higher CPU overhead of streaming writes.
