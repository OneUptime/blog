# How to Stream Data into BigQuery Using the Storage Write API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Storage Write API, Streaming, Data Ingestion

Description: Learn how to use the BigQuery Storage Write API to stream data into BigQuery with high throughput, low latency, and exactly-once delivery guarantees.

---

When you need to get data into BigQuery in real time, the Storage Write API is the modern way to do it. If you are migrating from legacy streaming inserts (`tabledata.insertAll`), the default stream is the closest Storage Write API equivalent and is the recommended starting point for real-time ingestion. The Storage Write API offers higher throughput, lower cost, exactly-once semantics when you use application-created streams with offsets, and better error handling.

I switched a production pipeline from legacy streaming to the Storage Write API about a year ago, and the difference in reliability and cost was significant. Let me walk through how to set it up.

## Storage Write API vs Legacy Streaming Inserts

Before diving in, here is why you should care about the Storage Write API.

| Feature | Legacy Streaming | Storage Write API |
|---------|-----------------|-------------------|
| Cost | $0.010 per 200 MiB | $0.025 per 1 GiB, with the first 2 TiB per month free |
| Throughput | Row-per-second streaming quotas | Project throughput and connection quotas, with one connection generally supporting at least 1 MBps and often more |
| Delivery guarantee | At-least-once | At-least-once on the default stream; exactly-once with application-created committed streams and offsets |
| Data availability | Immediate | Immediate for the default stream and committed streams |
| Protocol | REST/JSON | gRPC with Protocol Buffers, JSON writer helpers in some client libraries, and Apache Arrow support |

## Understanding Write Modes

The Storage Write API has a default stream and three application-created stream types:

1. **Default stream**: Simplest to use. Data is available immediately. At-least-once semantics.
2. **Committed type**: Exactly-once delivery when you use stream-level offsets. Data is available as soon as the server acknowledges the write.
3. **Pending type**: Write data that is not visible until you finalize and batch-commit the stream. Useful for batch-style loads that need atomicity.
4. **Buffered type**: An advanced type where rows are not visible until you flush them. Google generally recommends this only for the Apache Beam BigQuery I/O connector.

## Writing with the Default Stream (Python)

The default stream is the simplest way to stream data. The Python client is a lower-level client, so you send serialized Protocol Buffer rows. Here is a Python example.

```python
# stream_to_bigquery.py - Stream data using the default stream

from google.cloud import bigquery_storage_v1
from google.cloud.bigquery_storage_v1 import types
from google.cloud.bigquery_storage_v1 import writer
from google.protobuf import descriptor_pb2
import datetime
import json
import logging

import events_pb2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# events.proto:
# syntax = "proto2";
# message Event {
#   optional string event_id = 1;
#   optional int64 user_id = 2;
#   optional string event_type = 3;
#   optional int64 event_timestamp = 4; // BigQuery TIMESTAMP, microseconds since Unix epoch
#   optional string properties = 5;
# }
#
# Generate events_pb2.py with:
# protoc --python_out=. events.proto

TABLE_COLUMNS_TO_CHECK = [
    "event_id",
    "user_id",
    "event_type",
    "event_timestamp",
    "properties",
]


def timestamp_to_micros(value):
    """Convert an ISO-8601 timestamp to BigQuery TIMESTAMP microseconds."""
    dt = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    return int(dt.timestamp() * 1_000_000)


def create_row_data(data):
    """Serialize one row to the protocol buffer expected by BigQuery."""
    row = events_pb2.Event()
    for field in TABLE_COLUMNS_TO_CHECK:
        if field not in data:
            continue
        if field == "event_timestamp":
            setattr(row, field, timestamp_to_micros(data[field]))
        else:
            setattr(row, field, data[field])
    return row.SerializeToString()


def stream_rows(project, dataset, table, rows):
    """Stream rows to the default stream."""
    write_client = bigquery_storage_v1.BigQueryWriteClient()
    parent = write_client.table_path(project, dataset, table)
    stream_name = f"{parent}/_default"

    request_template = types.AppendRowsRequest()
    request_template.write_stream = stream_name

    proto_schema = types.ProtoSchema()
    proto_descriptor = descriptor_pb2.DescriptorProto()
    events_pb2.Event.DESCRIPTOR.CopyToProto(proto_descriptor)
    proto_schema.proto_descriptor = proto_descriptor

    proto_data = types.AppendRowsRequest.ProtoData()
    proto_data.writer_schema = proto_schema
    request_template.proto_rows = proto_data

    append_rows_stream = writer.AppendRowsStream(write_client, request_template)

    proto_rows = types.ProtoRows()
    for row in rows:
        proto_rows.serialized_rows.append(create_row_data(row))

    request = types.AppendRowsRequest()
    proto_data = types.AppendRowsRequest.ProtoData()
    proto_data.rows = proto_rows
    request.proto_rows = proto_data

    response_future = append_rows_stream.send(request)
    response_future.result()
    append_rows_stream.close()
    logger.info("Rows written to %s", parent)


if __name__ == "__main__":
    # Example rows to stream
    sample_rows = [
        {
            "event_id": "evt-001",
            "user_id": 12345,
            "event_type": "page_view",
            "event_timestamp": "2026-02-17T10:30:00Z",
            "properties": json.dumps({"page": "/home", "referrer": "google.com"}),
        },
        {
            "event_id": "evt-002",
            "user_id": 12346,
            "event_type": "click",
            "event_timestamp": "2026-02-17T10:30:01Z",
            "properties": json.dumps({"button": "signup", "page": "/pricing"}),
        },
    ]

    stream_rows("my_project", "my_dataset", "events", sample_rows)
```

## Batching with the Python Writer

The Python writer lets you reuse a connection and send batches of serialized Protocol Buffer rows. Batching and retry handling are important for production use.

```python
# batched_writer.py - Batching rows with the Python Storage Write API client
from google.cloud import bigquery_storage_v1
from google.cloud.bigquery_storage_v1 import types, writer
from google.protobuf import descriptor_pb2
import json
import random

import events_pb2
from stream_to_bigquery import create_row_data


def stream_with_batches(project, dataset, table, rows):
    """
    Stream data using the BigQuery Storage Write API.
    This approach reuses one AppendRows stream and sends rows in batches.
    """
    write_client = bigquery_storage_v1.BigQueryWriteClient()
    parent = write_client.table_path(project, dataset, table)
    stream_name = f"{parent}/_default"

    request_template = types.AppendRowsRequest()
    request_template.write_stream = stream_name

    proto_schema = types.ProtoSchema()
    proto_descriptor = descriptor_pb2.DescriptorProto()
    events_pb2.Event.DESCRIPTOR.CopyToProto(proto_descriptor)
    proto_schema.proto_descriptor = proto_descriptor

    proto_data = types.AppendRowsRequest.ProtoData()
    proto_data.writer_schema = proto_schema
    request_template.proto_rows = proto_data

    append_rows_stream = writer.AppendRowsStream(write_client, request_template)

    batch_size = 500
    total_sent = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]

        proto_rows = types.ProtoRows()
        for row in batch:
            proto_rows.serialized_rows.append(create_row_data(row))

        request = types.AppendRowsRequest()
        proto_data = types.AppendRowsRequest.ProtoData()
        proto_data.rows = proto_rows
        request.proto_rows = proto_data

        response_future = append_rows_stream.send(request)
        response_future.result()
        total_sent += len(batch)
        print(f"Sent {total_sent}/{len(rows)} rows")

    append_rows_stream.close()
    print(f"Streaming complete: {total_sent} rows sent")


if __name__ == "__main__":
    # Generate sample events
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

    stream_with_batches("my_project", "my_dataset", "events", rows)
```

## Streaming from Node.js

Here is a Node.js example using the BigQuery Storage Write API client library.

```javascript
// stream_to_bigquery.js - Node.js streaming example
const {adapt, managedwriter} = require('@google-cloud/bigquery-storage');
const {WriterClient, JSONWriter} = managedwriter;

async function streamData() {
  const projectId = 'my_project';
  const datasetId = 'my_dataset';
  const tableId = 'events';

  const destinationTable = `projects/${projectId}/datasets/${datasetId}/tables/${tableId}`;
  const writeClient = new WriterClient({projectId});

  // Sample rows to stream. JSON writers accept timestamp strings for TIMESTAMP columns.
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

  console.log(`Streaming ${rows.length} rows to ${destinationTable}`);

  try {
    const writeStream = await writeClient.getWriteStream({
      streamId: `${destinationTable}/streams/_default`,
      view: 'FULL',
    });
    const protoDescriptor = adapt.convertStorageSchemaToProto2Descriptor(
      writeStream.tableSchema,
      'root',
    );
    const connection = await writeClient.createStreamConnection({
      streamId: managedwriter.DefaultStream,
      destinationTable,
    });
    const writer = new JSONWriter({
      streamId: connection.getStreamId(),
      connection,
      protoDescriptor,
    });

    const pendingWrite = writer.appendRows(rows);
    const result = await pendingWrite.getResult();
    console.log('Rows streamed successfully:', result);
  } catch (error) {
    console.error('Error streaming data:', error.message);
    throw error;
  } finally {
    writeClient.close();
  }
}

streamData().catch(console.error);
```

## Streaming from Java

Java is common for high-throughput streaming pipelines.

```java
// StreamToBigQuery.java - High-throughput Java streaming
import com.google.api.core.ApiFuture;
import com.google.cloud.bigquery.storage.v1.AppendRowsResponse;
import com.google.cloud.bigquery.storage.v1.BigQueryWriteClient;
import com.google.cloud.bigquery.storage.v1.JsonStreamWriter;
import com.google.cloud.bigquery.storage.v1.TableName;
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
        try (BigQueryWriteClient client = BigQueryWriteClient.create();
             JsonStreamWriter writer = JsonStreamWriter
                .newBuilder(tableName.toString(), client)
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
            future.get();
            System.out.println("Rows appended successfully.");
        }
    }
}
```

## Best Practices for Production Streaming

Here are the practices I follow for production streaming pipelines.

**Batch your writes**: Do not send one row at a time. Send batches of rows in each append request for better throughput.

**Handle back-pressure**: If the API returns RESOURCE_EXHAUSTED or HTTP 429, back off and retry. Use exponential backoff.

**Monitor stream health**: Track append latency, error rates, and throughput. Use `INFORMATION_SCHEMA.WRITE_API_TIMELINE` and Google Cloud metrics for request-level monitoring.

**Use the default stream for simplicity**: Unless you need exactly-once semantics, the default stream is easier to work with and still provides strong delivery guarantees.

**Clean up streams**: If you create explicit write streams (not the default stream), finalize them when done. For pending streams, finalize and batch-commit them before the data becomes visible.

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

The BigQuery Storage Write API is the production-grade way to stream data into BigQuery. It offers better performance, lower cost, and stronger delivery guarantees than legacy streaming inserts when you use the right stream type for your workload. Whether you are building event pipelines, IoT data ingestion, or real-time analytics, the Storage Write API handles it efficiently.

For monitoring your streaming pipelines end to end - from data producers through BigQuery ingestion to downstream consumers - [OneUptime](https://oneuptime.com) provides the observability tools you need to keep everything running reliably.
