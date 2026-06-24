# How to Use the Java BigQuery Storage Write API for Low-Latency Streaming Inserts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Storage Write API, Java, Streaming, Data Ingestion

Description: Use the BigQuery Storage Write API in Java for low-latency streaming inserts with Protocol Buffers serialization, committed and buffered write modes, and error handling.

---

The BigQuery Storage Write API is the modern way to stream data into BigQuery. It is the recommended alternative to the older `tabledata.insertAll` API, with better performance, lower latency, and support for exactly-once delivery semantics when you use application-created streams with offsets. Instead of sending JSON rows over REST, you send Protocol Buffer-serialized data over gRPC, which cuts the serialization overhead dramatically.

In this post, I will show you how to use the Storage Write API from a Java application for streaming inserts.

## The Write Modes

The Storage Write API offers several stream types. For streaming applications, the two most common choices are:

**Default stream (at-least-once committed writes)**: Data is available for query immediately after being committed. This is the closest equivalent to the old streaming insert API. Each append is committed as soon as the server acknowledges it, but duplicate rows are possible if you retry after an uncertain failure.

**Committed stream**: You create a write stream explicitly and provide an offset with each append. BigQuery only accepts the write if the offset matches the next append offset, which gives you exactly-once writes within that stream.

For most streaming use cases, the default stream is what you want.

## Dependencies

```xml
<!-- BigQuery Storage API client -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-bigquerystorage</artifactId>
    <version>3.27.0</version>
</dependency>

<!-- JSON objects used by JsonStreamWriter examples -->
<dependency>
    <groupId>org.json</groupId>
    <artifactId>json</artifactId>
    <version>20260522</version>
</dependency>
```

## Define the Table Schema

First, create the BigQuery table that you will write to:

```sql
-- Create the target table in BigQuery
CREATE TABLE IF NOT EXISTS `my-project.my_dataset.events` (
    event_id STRING NOT NULL,
    event_type STRING NOT NULL,
    user_id STRING,
    timestamp TIMESTAMP NOT NULL,
    payload STRING,
    metric_value FLOAT64
);
```

## Writing with the Default Stream

The default stream is the simplest approach. Use the `JsonStreamWriter` to send JSON-formatted rows:

```java
public class BigQueryStreamWriter {

    private final String projectId;
    private final String datasetId;
    private final String tableId;

    public BigQueryStreamWriter(String projectId, String datasetId, String tableId) {
        this.projectId = projectId;
        this.datasetId = datasetId;
        this.tableId = tableId;
    }

    // Write events using the default stream with JsonStreamWriter
    public void writeEvents(List<EventRecord> events) throws Exception {
        TableName tableName = TableName.of(projectId, datasetId, tableId);

        // Create the JSON stream writer for the default stream
        try (BigQueryWriteClient client = BigQueryWriteClient.create();
             JsonStreamWriter writer = JsonStreamWriter.newBuilder(
                     tableName.toString(), client).build()) {

            // Convert events to JSON array
            JSONArray jsonArray = new JSONArray();
            for (EventRecord event : events) {
                JSONObject row = new JSONObject();
                row.put("event_id", event.getEventId());
                row.put("event_type", event.getEventType());
                row.put("user_id", event.getUserId());
                row.put("timestamp", event.getTimestamp().toEpochMilli() * 1000); // Microseconds
                row.put("payload", event.getPayload());
                row.put("metric_value", event.getMetricValue());
                jsonArray.put(row);
            }

            // Append rows to the stream
            ApiFuture<AppendRowsResponse> future = writer.append(jsonArray);

            // Wait for the response
            AppendRowsResponse response = future.get();

            if (response.hasError()) {
                throw new RuntimeException("Write failed: " + response.getError().getMessage());
            }

            System.out.println("Successfully wrote " + events.size() + " rows");
        }
    }
}
```

## High-Throughput Writing with Connection Pooling

For production workloads, reuse the writer and batch your appends:

```java
@Service
public class StreamingInsertService implements AutoCloseable {

    private final BigQueryWriteClient client;
    private final JsonStreamWriter writer;
    private final AtomicLong appendCount = new AtomicLong(0);

    // Initialize the writer once and reuse it
    public StreamingInsertService(
            @Value("${bigquery.project}") String project,
            @Value("${bigquery.dataset}") String dataset,
            @Value("${bigquery.table}") String table) throws Exception {

        TableName tableName = TableName.of(project, dataset, table);
        this.client = BigQueryWriteClient.create();

        this.writer = JsonStreamWriter.newBuilder(
                        tableName.toString(), client)
                .setEnableConnectionPool(true)
                .build();
    }

    // Append a batch of records asynchronously
    public CompletableFuture<Long> appendAsync(List<EventRecord> records) {
        JSONArray jsonArray = toJsonArray(records);

        ApiFuture<AppendRowsResponse> apiFuture = writer.append(jsonArray);

        // Convert ApiFuture to CompletableFuture
        CompletableFuture<Long> result = new CompletableFuture<>();

        ApiFutures.addCallback(apiFuture, new ApiFutureCallback<>() {
            @Override
            public void onSuccess(AppendRowsResponse response) {
                if (response.hasError()) {
                    result.completeExceptionally(new RuntimeException(
                            "Append error: " + response.getError().getMessage()));
                    return;
                }
                long count = appendCount.addAndGet(records.size());
                result.complete(count);
            }

            @Override
            public void onFailure(Throwable t) {
                result.completeExceptionally(t);
            }
        }, MoreExecutors.directExecutor());

        return result;
    }

    // Synchronous batch append with retry
    public void appendWithRetry(List<EventRecord> records, int maxRetries) throws Exception {
        int attempt = 0;
        Exception lastException = null;

        while (attempt < maxRetries) {
            try {
                JSONArray jsonArray = toJsonArray(records);
                AppendRowsResponse response = writer.append(jsonArray).get(30, TimeUnit.SECONDS);

                if (response.hasError()) {
                    throw new RuntimeException("Append error: "
                            + response.getError().getMessage());
                }
                return; // Success

            } catch (Exception e) {
                lastException = e;
                attempt++;
                if (attempt < maxRetries) {
                    long backoff = (long) Math.pow(2, attempt) * 100;
                    Thread.sleep(backoff);
                }
            }
        }

        throw new RuntimeException("Failed after " + maxRetries + " attempts", lastException);
    }

    private JSONArray toJsonArray(List<EventRecord> records) {
        JSONArray array = new JSONArray();
        for (EventRecord record : records) {
            JSONObject row = new JSONObject();
            row.put("event_id", record.getEventId());
            row.put("event_type", record.getEventType());
            row.put("user_id", record.getUserId());
            row.put("timestamp", record.getTimestamp().toEpochMilli() * 1000);
            row.put("payload", record.getPayload());
            row.put("metric_value", record.getMetricValue());
            array.put(row);
        }
        return array;
    }

    @Override
    public void close() throws Exception {
        if (writer != null) {
            writer.close();
        }
        if (client != null) {
            client.close();
        }
    }
}
```

## Committed Stream for Exactly-Once Writes

When you need exactly-once semantics, create a committed stream and provide offsets with your appends:

```java
// Committed stream writer for exactly-once semantics
public class CommittedStreamWriter implements AutoCloseable {

    private final BigQueryWriteClient client;
    private final String streamName;
    private final JsonStreamWriter writer;

    public CommittedStreamWriter(String project, String dataset, String table) throws Exception {
        this.client = BigQueryWriteClient.create();

        TableName tableName = TableName.of(project, dataset, table);

        // Create a committed write stream
        WriteStream writeStream = WriteStream.newBuilder()
                .setType(WriteStream.Type.COMMITTED)
                .build();

        CreateWriteStreamRequest createRequest = CreateWriteStreamRequest.newBuilder()
                .setParent(tableName.toString())
                .setWriteStream(writeStream)
                .build();

        WriteStream createdStream = client.createWriteStream(createRequest);
        this.streamName = createdStream.getName();

        this.writer = JsonStreamWriter.newBuilder(
                streamName, createdStream.getTableSchema(), client).build();
    }

    // Append data at the expected offset for idempotent retries
    public long appendAtOffset(List<EventRecord> records, long offset) throws Exception {
        JSONArray jsonArray = new JSONArray();
        for (EventRecord record : records) {
            JSONObject row = new JSONObject();
            row.put("event_id", record.getEventId());
            row.put("event_type", record.getEventType());
            row.put("timestamp", record.getTimestamp().toEpochMilli() * 1000);
            jsonArray.put(row);
        }

        AppendRowsResponse response = writer.append(jsonArray, offset).get();
        if (response.hasError()) {
            throw new RuntimeException("Append error: " + response.getError().getMessage());
        }
        return response.getAppendResult().getOffset().getValue();
    }

    // Finalize the stream when no more appends are expected
    public void finalizeStream() {
        FinalizeWriteStreamRequest request = FinalizeWriteStreamRequest.newBuilder()
                .setName(streamName)
                .build();
        client.finalizeWriteStream(request);
    }

    @Override
    public void close() throws Exception {
        writer.close();
        client.close();
    }
}
```

## REST Controller for Streaming Ingestion

Expose the streaming insert through a REST endpoint:

```java
@RestController
@RequestMapping("/api/events")
public class EventIngestionController {

    private final StreamingInsertService insertService;

    public EventIngestionController(StreamingInsertService insertService) {
        this.insertService = insertService;
    }

    // Ingest a batch of events
    @PostMapping("/ingest")
    public ResponseEntity<Map<String, Object>> ingestEvents(
            @RequestBody List<EventRecord> events) throws Exception {

        insertService.appendWithRetry(events, 3);

        return ResponseEntity.ok(Map.of(
                "status", "accepted",
                "count", events.size()));
    }

    // Async ingestion endpoint
    @PostMapping("/ingest-async")
    public ResponseEntity<Map<String, String>> ingestAsync(
            @RequestBody List<EventRecord> events) {

        insertService.appendAsync(events)
                .thenAccept(count -> System.out.println("Total rows written: " + count))
                .exceptionally(t -> {
                    System.err.println("Async write failed: " + t.getMessage());
                    return null;
                });

        return ResponseEntity.accepted().body(Map.of(
                "status", "accepted",
                "count", String.valueOf(events.size())));
    }
}
```

## Performance Tips

A few things that make a significant difference in throughput:

Batch your appends. Sending one row at a time creates overhead. Batch 100-500 rows per append call. The API supports up to 20MB per append request.

Reuse the `JsonStreamWriter`. Creating a new writer for every append is expensive because it involves establishing a gRPC connection.

Use async appends and process the futures in bulk. This lets you pipeline multiple append calls without waiting for each one to complete.

Monitor the `AppendRowsResponse` for errors. Schema mismatches, quota limits, and transient errors all show up in the response.

## Wrapping Up

The BigQuery Storage Write API is significantly faster than the legacy streaming insert API. The gRPC transport and Protocol Buffer serialization cut the overhead per row. The default stream gives you low-latency inserts with data available for query immediately. A committed stream with offsets gives you exactly-once semantics for cases where duplicate data would be a problem. Reuse writers, batch your appends, and use async patterns for the best throughput.
