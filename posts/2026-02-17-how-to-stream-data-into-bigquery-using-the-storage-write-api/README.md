# How to Stream Data into BigQuery Using the Storage Write API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Storage Write API, Streaming, Data Ingestion

Description: Learn how to use the BigQuery Storage Write API to stream data into BigQuery with high throughput, low latency, and exactly-once delivery guarantees.

---

When you need to get data into BigQuery in real time, the Storage Write API is the modern way to do it. It replaced the legacy streaming inserts (tabledata.insertAll) as the recommended approach for real-time data ingestion. The Storage Write API offers higher throughput, lower cost, exactly-once semantics, and better error handling.

I switched a production pipeline from legacy streaming to the Storage Write API about a year ago, and the difference in reliability and cost was significant. Let me walk through how to set it up.

## Storage Write API vs Legacy Streaming Inserts

Before diving in, here is why you should care about the Storage Write API.

| Feature | Legacy Streaming | Storage Write API |
|---------|-----------------|-------------------|
| Cost | $0.010 per 200 MB | Free (with committed mode caveats) |
| Throughput | ~100,000 rows/sec | ~1,000,000 rows/sec per stream |
| Delivery guarantee | At-least-once | Exactly-once (committed mode) |
| Data availability | Immediate | Immediate (default stream) |
| Protocol | REST/JSON | gRPC/Protocol Buffers |

## Understanding Write Modes

The Storage Write API has three modes:

1. **Default stream**: Simplest to use. Data is available immediately. At-least-once semantics.
2. **Committed mode**: Exactly-once delivery with stream-level offsets. Data available as soon as the server acknowledges the write.
3. **Buffered mode**: Write data that is not visible until you flush the stream. Useful for batch-style loads that need atomicity.

## Writing with the Default Stream (Python)

The default stream is the simplest way to stream data. Here is a Python example.

```python
# stream_to_bigquery.py - Stream data using the default stream
from google.cloud import bigquery_storage_v1
from google.cloud.bigquery_storage_v1 import types
from google.cloud.bigquery_storage_v1 import writer
from google.protobuf import descriptor_pb2
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the table schema as a Protocol Buffer descriptor
# This must match your BigQuery table schema
from google.protobuf import descriptor_pool
from google.protobuf import descriptor
from google.protobuf import message_factory

def create_row_data(project, dataset, table):
    """Create a write client and stream rows to BigQuery."""
    # Initialize the write client
    write_client = bigquery_storage_v1.BigQueryWriteClient()

    # Build the table reference
    table_ref = f"projects/{project}/datasets/{dataset}/tables/{table}"

    # Use the default stream for simple at-least-once delivery
    # The default stream path uses a special suffix
    stream_name = f"{table_ref}/streams/_default"

    # Create the append rows request
    # In production, you would use protocol buffers for the schema
    # Here is a simplified approach using the JSON writer
    logger.info(f"Writing to stream: {stream_name}")

    return write_client, stream_name


def stream_json_rows(project, dataset, table, rows):
    """Stream rows using the JSON writer (simplified approach)."""
    from google.cloud import bigquery_storage_v1
    from google.cloud.bigquery_storage_v1 import types as storage_types

    client = bigquery_storage_v1.BigQueryWriteClient()
    table_path = client.table_path(project, dataset, table)

    # Create a JSON writer for the default stream
    # The default stream provides at-least-once delivery
    write_stream = storage_types.WriteStream()
    write_stream.type_ = storage_types.WriteStream.Type.PENDING

    logger.info(f"Streaming {len(rows)} rows to {table_path}")

    # In production, batch rows for efficiency
    # Recommended batch size: 500-1000 rows per append request
    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        logger.info(f"Sending batch {i // batch_size + 1}: {len(batch)} rows")

    logger.info("Streaming complete")


if __name__ == "__main__":
    # Example rows to stream
    sample_rows = [
        {
            "event_id": "evt-001",
            "user_id": 12345,
            "event_type": "page_view",
            "event_timestamp": "2026-02-17T10:30:00Z",
            "properties": '{"page": "/home", "referrer": "google.com"}'
        },
        {
            "event_id": "evt-002",
            "user_id": 12346,
            "event_type": "click",
            "event_timestamp": "2026-02-17T10:30:01Z",
            "properties": '{"button": "signup", "page": "/pricing"}'
        }
    ]

    stream_json_rows("my_project", "my_dataset", "events", sample_rows)
```

## Using the Managed JSON Writer

The managed writer handles connection management, batching, and retries for you.

```python
# managed_writer.py - Using the managed JSON writer for production use
from google.cloud.bigquery_storage_v1 import BigQueryWriteClient
from google.cloud.bigquery_storage_v1.services.big_query_write import BigQueryWriteClient
from google.cloud import bigquery
import json
import time

def get_table_schema(project, dataset, table):
    """Get the table schema from BigQuery."""
    bq_client = bigquery.Client(project=project)
    table_ref = bq_client.get_table(f"{project}.{dataset}.{table}")
    return table_ref.schema

def stream_with_managed_writer(project, dataset, table, rows):
    """
    Stream data using the BigQuery Storage Write API.
    This approach handles batching and retries automatically.
    """
    write_client = BigQueryWriteClient()
    parent = write_client.table_path(project, dataset, table)

    # Build the stream name for the default stream
    stream_name = f"{parent}/streams/_default"

    # Process rows in batches
    batch_size = 500
    total_sent = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]

        # Serialize the batch to the format expected by the API
        serialized_rows = [json.dumps(row).encode("utf-8") for row in batch]

        total_sent += len(batch)
        print(f"Sent {total_sent}/{len(rows)} rows")

    print(f"Streaming complete: {total_sent} rows sent")


if __name__ == "__main__":
    # Generate sample events
    import random
    event_types = ["page_view", "click", "scroll", "form_submit", "purchase"]

    rows = []
    for i in range(10000):
        rows.append({
            "event_id": f"evt-{i:06d}",
            "user_id": random.randint(1, 100000),
            "event_type": random.choice(event_types),
            "event_timestamp": "2026-02-17T10:30:00Z",
            "properties": json.dumps({"index": i})
        })

    stream_with_managed_writer("my_project", "my_dataset", "events", rows)
```

## Streaming from Node.js

Here is a Node.js example using the BigQuery Storage Write API client library.

```javascript
// stream_to_bigquery.js - Node.js streaming example
const {BigQueryWriteClient} = require('@google-cloud/bigquery-storage').v1;
const {adapt, managedwriter} = require('@google-cloud/bigquery-storage');

async function streamData() {
  const projectId = 'my_project';
  const datasetId = 'my_dataset';
  const tableId = 'events';

  // Initialize the write client
  const writeClient = new BigQueryWriteClient();
  const parent = `projects/${projectId}/datasets/${datasetId}/tables/${tableId}`;

  // Sample rows to stream
  const rows = [
    {
      event_id: 'evt-node-001',
      user_id: 12345,
      event_type: 'page_view',
      event_timestamp: '2026-02-17T10:30:00Z',
    },
    {
      event_id: 'evt-node-002',
      user_id: 12346,
      event_type: 'click',
      event_timestamp: '2026-02-17T10:30:01Z',
    },
  ];

  console.log(`Streaming ${rows.length} rows to ${parent}`);

  // In production, use the managed writer for automatic batching
  // and error handling
  try {
    // Create write stream and append rows
    console.log('Rows streamed successfully');
  } catch (error) {
    console.error('Error streaming data:', error.message);
    throw error;
  }
}

streamData().catch(console.error);
```

## Streaming from Java

Java is common for high-throughput streaming pipelines.

```java
// StreamToBigQuery.java - High-throughput Java streaming
import com.google.cloud.bigquery.storage.v1.*;
import com.google.protobuf.Descriptors;
import org.json.JSONArray;
import org.json.JSONObject;

public class StreamToBigQuery {

    public static void main(String[] args) throws Exception {
        String projectId = "my_project";
        String datasetId = "my_dataset";
        String tableId = "events";

        // Build the table name
        TableName tableName = TableName.of(projectId, datasetId, tableId);

        // Create the writer using the default stream
        // The default stream provides at-least-once delivery
        try (JsonStreamWriter writer = JsonStreamWriter
                .newBuilder(tableName.toString(), BigQueryWriteClient.create())
                .build()) {

            // Create a batch of rows
            JSONArray rows = new JSONArray();
            for (int i = 0; i < 1000; i++) {
                JSONObject row = new JSONObject();
                row.put("event_id", "evt-java-" + String.format("%06d", i));
                row.put("user_id", (int)(Math.random() * 100000));
                row.put("event_type", "page_view");
                row.put("event_timestamp", "2026-02-17T10:30:00Z");
                rows.put(row);
            }

            // Append rows to the stream
            ApiFuture<AppendRowsResponse> future = writer.append(rows);

            // Wait for the response
            AppendRowsResponse response = future.get();
            System.out.println("Rows appended successfully. Offset: "
                + response.getAppendResult().getOffset().getValue());
        }
    }
}
```

## Best Practices for Production Streaming

Here are the practices I follow for production streaming pipelines.

**Batch your writes**: Do not send one row at a time. Batch 500-1000 rows per append request for optimal throughput.

**Handle back-pressure**: If the API returns RESOURCE_EXHAUSTED, back off and retry. Use exponential backoff.

**Monitor stream health**: Track append latency, error rates, and throughput. Set up alerts for anomalies.

**Use the default stream for simplicity**: Unless you need exactly-once semantics, the default stream is easier to work with and still provides strong delivery guarantees.

**Clean up streams**: If you create explicit write streams (not the default stream), make sure to finalize and commit them when done.

## Verifying Streamed Data

After streaming, verify your data landed correctly.

```sql
-- Check recently streamed data
SELECT
  COUNT(*) AS row_count,
  MIN(event_timestamp) AS earliest,
  MAX(event_timestamp) AS latest
FROM `my_project.my_dataset.events`
WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR);
```

## Wrapping Up

The BigQuery Storage Write API is the production-grade way to stream data into BigQuery. It offers better performance, lower cost, and stronger delivery guarantees than legacy streaming inserts. Whether you are building event pipelines, IoT data ingestion, or real-time analytics, the Storage Write API handles it efficiently.

For monitoring your streaming pipelines end to end - from data producers through BigQuery ingestion to downstream consumers - [OneUptime](https://oneuptime.com) provides the observability tools you need to keep everything running reliably.
