# How to Enable Event Hubs Capture to Archive Events to Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Event Hubs, Event Capture, Azure Blob Storage, Data Archival, Event Streaming, ADLS Gen2, Apache Avro

Description: Learn how to enable Event Hubs Capture to automatically archive streaming events to Azure Blob Storage or Data Lake Storage in Avro format.

---

Event Hubs Capture is one of those features that seems simple on the surface but saves you a surprising amount of engineering work. Instead of building a custom consumer to read events from Event Hubs and write them to storage, Capture does it automatically. Events are written to Azure Blob Storage or Azure Data Lake Storage Gen2 in Apache Avro format, organized by time-based partitions. You get a durable, queryable archive of every event that flows through your Event Hub, with zero custom code.

In this post, we will enable Capture, configure the output format and timing, query the archived data, and handle the common scenarios you will encounter in production.

## How Capture Works

When you enable Capture on an Event Hub, Azure runs an internal consumer that reads events from all partitions and writes them to your designated storage account. The process is fully managed:

- Events are batched and written periodically (configurable interval)
- Each batch is written as a single Avro file
- Files are organized in a time-based folder hierarchy
- Capture operates independently of your other consumers - it does not affect their performance or throughput
- If no events arrive during a capture interval, an empty Avro file may be written (configurable)

The default folder structure looks like this:

```
{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}
```

For example:
```
my-namespace/user-events/0/2026/02/16/14/30/00.avro
my-namespace/user-events/1/2026/02/16/14/30/00.avro
```

## Enabling Capture

### Through Azure CLI

```bash
# Enable Capture on an existing Event Hub
# Events will be written to Blob Storage every 5 minutes or every 300MB
az eventhubs eventhub update \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --name user-events \
  --enable-capture true \
  --capture-interval 300 \
  --capture-size-limit 314572800 \
  --destination-name "EventHubArchive.AzureBlockBlob" \
  --storage-account "/subscriptions/{sub-id}/resourceGroups/my-resource-group/providers/Microsoft.Storage/storageAccounts/myarchiveaccount" \
  --blob-container "event-archive" \
  --archive-name-format "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}"
```

Let us break down the key parameters:

- **capture-interval**: Time window in seconds (60-900). Events are written at least this often.
- **capture-size-limit**: Size window in bytes (10MB-500MB). Events are written when the buffer reaches this size.
- **archive-name-format**: The folder structure for captured files. You can customize this.
- **skip-empty-archives**: Set to true to avoid writing empty files when no events arrive.

### Through Azure Portal

1. Open your Event Hub in the Azure portal
2. Click "Capture" in the left menu
3. Toggle "Capture" to "On"
4. Configure the output:
   - **Capture provider**: Azure Blob Storage or Azure Data Lake Storage Gen2
   - **Storage account**: Select or create a storage account
   - **Container**: Select or create a container
5. Set the time and size windows
6. Click "Save"

### Using ADLS Gen2 Instead of Blob Storage

For workloads where you plan to query the archived data with Spark or Synapse, ADLS Gen2 is a better choice because it supports hierarchical namespaces for better performance:

```bash
# Enable Capture to ADLS Gen2
az eventhubs eventhub update \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --name user-events \
  --enable-capture true \
  --capture-interval 300 \
  --capture-size-limit 314572800 \
  --destination-name "EventHubArchive.AzureDataLake" \
  --storage-account "/subscriptions/{sub-id}/resourceGroups/my-resource-group/providers/Microsoft.Storage/storageAccounts/mydatalakeaccount" \
  --data-lake-subscription-id "{sub-id}" \
  --data-lake-account-name "mydatalakeaccount" \
  --data-lake-folder-path "event-archive" \
  --archive-name-format "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}"
```

## Custom File Naming

The default naming format includes all time components down to the second. You can customize this to match your preferred partitioning scheme:

```bash
# Date-based partitioning (common for daily batch processing)
--archive-name-format "{Namespace}/{EventHub}/year={Year}/month={Month}/day={Day}/{PartitionId}/{Hour}{Minute}{Second}"

# Simpler hourly partitioning
--archive-name-format "events/{EventHub}/{Year}-{Month}-{Day}/{Hour}/{PartitionId}"
```

Choosing a Hive-compatible partition format (`year=2026/month=02/day=16`) makes the data easy to query with Spark, Synapse, or other tools that support partition discovery.

## Understanding the Avro Format

Captured events are stored in Apache Avro format, which is a compact binary serialization format. Each Avro file contains:

- The Event Hubs envelope (sequence number, offset, enqueued time, partition key)
- The event body (your actual payload, as bytes)
- Event properties (custom properties you set when sending events)

The Avro schema for captured events looks like this:

```json
{
    "type": "record",
    "name": "EventData",
    "namespace": "Microsoft.ServiceBus.Messaging",
    "fields": [
        {"name": "SequenceNumber", "type": "long"},
        {"name": "Offset", "type": "string"},
        {"name": "EnqueuedTimeUtc", "type": "string"},
        {"name": "SystemProperties", "type": {"type": "map", "values": ["long", "double", "string", "bytes"]}},
        {"name": "Properties", "type": {"type": "map", "values": ["long", "double", "string", "bytes"]}},
        {"name": "Body", "type": ["null", "bytes"]}
    ]
}
```

## Reading Captured Data

### With Python (fastavro)

```python
import fastavro
from io import BytesIO
from azure.storage.blob import BlobServiceClient
import json

# Connect to the storage account
blob_service = BlobServiceClient.from_connection_string(
    "DefaultEndpointsProtocol=https;AccountName=myarchiveaccount;AccountKey=your-key"
)

container = blob_service.get_container_client("event-archive")

# List Avro files for a specific time range
blobs = container.list_blobs(
    name_starts_with="my-namespace/user-events/0/2026/02/16/14/"
)

for blob in blobs:
    # Download the Avro file
    blob_client = container.get_blob_client(blob.name)
    download = blob_client.download_blob()
    avro_bytes = BytesIO(download.readall())

    # Read events from the Avro file
    reader = fastavro.reader(avro_bytes)
    for record in reader:
        # The Body field contains your event payload as bytes
        body = record.get("Body")
        if body:
            # Decode the bytes to get your original JSON/string payload
            event_data = json.loads(body.decode("utf-8"))
            print(f"Sequence: {record['SequenceNumber']}, Data: {event_data}")
```

### With Apache Spark

```python
# Read captured Avro files with Spark (in Databricks or Synapse)
# Spark can read Avro natively with the spark-avro package
captured_events = spark.read.format("avro") \
    .load("abfss://event-archive@mydatalakeaccount.dfs.core.windows.net/my-namespace/user-events/*/2026/02/16/*")

# Show the raw captured data
captured_events.printSchema()
captured_events.show(5, truncate=False)

# Parse the Body column from bytes to your actual event schema
from pyspark.sql.functions import col, from_json
from pyspark.sql.types import StructType, StringType, IntegerType

# Define the schema of your event payload
event_schema = StructType() \
    .add("user_id", StringType()) \
    .add("action", StringType()) \
    .add("page", StringType()) \
    .add("timestamp", IntegerType())

# Decode and parse the event body
parsed_events = captured_events \
    .withColumn("body_string", col("Body").cast("string")) \
    .withColumn("parsed", from_json(col("body_string"), event_schema)) \
    .select(
        col("SequenceNumber"),
        col("EnqueuedTimeUtc"),
        col("parsed.user_id"),
        col("parsed.action"),
        col("parsed.page")
    )

parsed_events.show(10)
```

### With Azure Synapse Serverless SQL

You can query captured Avro files directly with Synapse serverless SQL:

```sql
-- Query captured Event Hubs data using Synapse serverless SQL
-- The OPENROWSET function reads Avro files directly from storage
SELECT
    SequenceNumber,
    EnqueuedTimeUtc,
    CAST(Body AS VARCHAR(MAX)) AS EventBody
FROM OPENROWSET(
    BULK 'https://mydatalakeaccount.dfs.core.windows.net/event-archive/my-namespace/user-events/*/2026/02/16/**',
    FORMAT = 'AVRO'
) AS events
WHERE EnqueuedTimeUtc > '2026-02-16T14:00:00Z'
ORDER BY SequenceNumber;
```

## Capture Interval and Size Tuning

The capture interval and size limit control the trade-off between file frequency and file size:

**Small interval (60 seconds), small size limit**: Produces many small files. Good for low-latency archive queries but creates a "small files problem" that can slow down Spark queries.

**Large interval (900 seconds), large size limit**: Produces fewer, larger files. Better for batch processing but means a longer delay before events are available in storage.

For most production workloads, a 5-minute interval (300 seconds) with a 300MB size limit provides a good balance:

```bash
# Recommended production settings
az eventhubs eventhub update \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --name user-events \
  --capture-interval 300 \
  --capture-size-limit 314572800 \
  --skip-empty-archives true
```

## Cost Considerations

Capture incurs costs in two areas:

1. **Event Hubs egress**: Captured data counts against your throughput unit egress capacity. Each consumer group (including Capture) consumes egress bandwidth.

2. **Storage costs**: The archived Avro files consume storage. Avro is reasonably compact, but at high event volumes, storage costs add up. Set up lifecycle management policies to move old archives to cool or archive storage tiers:

```bash
# Create a lifecycle management policy to move old archives to cool storage
az storage account management-policy create \
  --account-name myarchiveaccount \
  --resource-group my-resource-group \
  --policy '{
    "rules": [
      {
        "name": "archive-old-captures",
        "type": "Lifecycle",
        "definition": {
          "actions": {
            "baseBlob": {
              "tierToCool": {"daysAfterModificationGreaterThan": 30},
              "tierToArchive": {"daysAfterModificationGreaterThan": 90},
              "delete": {"daysAfterModificationGreaterThan": 365}
            }
          },
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["event-archive/"]
          }
        }
      }
    ]
  }'
```

## Summary

Event Hubs Capture is a zero-code way to archive your event streams to durable storage. Enable it on your Event Hub, point it at a Blob Storage or ADLS Gen2 account, and every event gets persisted in Avro format with a time-based folder structure. The captured data can be queried with Spark, Synapse, or plain Python for historical analysis, replay, and compliance. Tune the capture interval and size limits based on your file size preferences, and set up storage lifecycle policies to manage costs over time.
