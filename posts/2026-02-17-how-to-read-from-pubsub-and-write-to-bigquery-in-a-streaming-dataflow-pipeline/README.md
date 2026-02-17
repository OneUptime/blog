# How to Read from Pub/Sub and Write to BigQuery in a Streaming Dataflow Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Pub/Sub, BigQuery, Streaming

Description: Build a complete streaming pipeline that reads messages from Google Cloud Pub/Sub, transforms them, and writes the results to BigQuery using Dataflow.

---

The Pub/Sub to BigQuery pipeline is probably the most common streaming pattern on Google Cloud. Events flow into Pub/Sub from applications, IoT devices, or other services. Dataflow picks them up, transforms them, and lands them in BigQuery for analytics. It sounds simple, but there are important details around schema handling, error management, and write strategies that can make or break your pipeline in production.

Let me walk through building this pipeline from scratch, covering the patterns that work well at scale.

## Project Setup

First, make sure you have the right dependencies. Here is the Maven configuration for a Dataflow pipeline that reads from Pub/Sub and writes to BigQuery.

```xml
<!-- Key dependencies for Pub/Sub to BigQuery pipeline -->
<dependencies>
    <dependency>
        <groupId>org.apache.beam</groupId>
        <artifactId>beam-sdks-java-core</artifactId>
        <version>2.52.0</version>
    </dependency>
    <dependency>
        <groupId>org.apache.beam</groupId>
        <artifactId>beam-runners-google-cloud-dataflow-java</artifactId>
        <version>2.52.0</version>
    </dependency>
    <dependency>
        <groupId>org.apache.beam</groupId>
        <artifactId>beam-sdks-java-io-google-cloud-platform</artifactId>
        <version>2.52.0</version>
    </dependency>
</dependencies>
```

## The Basic Pipeline

Here is a complete working pipeline that reads JSON messages from Pub/Sub, parses them into BigQuery table rows, and writes them to a BigQuery table.

```java
// Complete Pub/Sub to BigQuery streaming pipeline
public class PubSubToBigQuery {

    public interface Options extends DataflowPipelineOptions {
        @Description("Pub/Sub subscription to read from")
        @Validation.Required
        String getInputSubscription();
        void setInputSubscription(String value);

        @Description("BigQuery table to write to (project:dataset.table)")
        @Validation.Required
        String getOutputTable();
        void setOutputTable(String value);
    }

    public static void main(String[] args) {
        Options options = PipelineOptionsFactory
            .fromArgs(args)
            .withValidation()
            .as(Options.class);

        // Set streaming mode explicitly
        options.setStreaming(true);

        Pipeline pipeline = Pipeline.create(options);

        pipeline
            // Step 1: Read raw JSON strings from Pub/Sub
            .apply("ReadPubSub", PubsubIO.readStrings()
                .fromSubscription(options.getInputSubscription()))

            // Step 2: Parse JSON into BigQuery TableRow objects
            .apply("ParseJSON", ParDo.of(new JsonToTableRowFn()))

            // Step 3: Write to BigQuery
            .apply("WriteBigQuery", BigQueryIO.writeTableRows()
                .to(options.getOutputTable())
                .withSchema(getTableSchema())
                .withWriteDisposition(WriteDisposition.WRITE_APPEND)
                .withCreateDisposition(CreateDisposition.CREATE_IF_NEEDED));

        pipeline.run();
    }
}
```

## Parsing JSON Messages

The parsing step is where most errors occur. Always handle malformed messages gracefully.

```java
// Parse JSON messages into BigQuery TableRow objects with error handling
public class JsonToTableRowFn extends DoFn<String, TableRow> {

    // Counter for tracking parse failures
    private final Counter parseErrors = Metrics.counter(
        JsonToTableRowFn.class, "parse-errors");

    @ProcessElement
    public void processElement(ProcessContext c) {
        String json = c.element();

        try {
            JsonObject obj = JsonParser.parseString(json).getAsJsonObject();

            // Build a TableRow from the parsed JSON
            TableRow row = new TableRow()
                .set("event_id", obj.get("event_id").getAsString())
                .set("user_id", obj.get("user_id").getAsString())
                .set("event_type", obj.get("event_type").getAsString())
                .set("timestamp", obj.get("timestamp").getAsString())
                .set("properties", obj.has("properties")
                    ? obj.get("properties").toString()
                    : "{}");

            c.output(row);

        } catch (Exception e) {
            // Increment error counter for monitoring
            parseErrors.inc();
            LOG.warn("Failed to parse message: {}", json, e);
        }
    }
}
```

## Defining the BigQuery Schema

You need to provide a schema when using `CREATE_IF_NEEDED` or when you want Dataflow to validate rows before writing.

```java
// Define the BigQuery table schema
private static TableSchema getTableSchema() {
    return new TableSchema().setFields(Arrays.asList(
        new TableFieldSchema()
            .setName("event_id")
            .setType("STRING")
            .setMode("REQUIRED"),
        new TableFieldSchema()
            .setName("user_id")
            .setType("STRING")
            .setMode("REQUIRED"),
        new TableFieldSchema()
            .setName("event_type")
            .setType("STRING")
            .setMode("REQUIRED"),
        new TableFieldSchema()
            .setName("timestamp")
            .setType("TIMESTAMP")
            .setMode("REQUIRED"),
        new TableFieldSchema()
            .setName("properties")
            .setType("STRING")
            .setMode("NULLABLE")
    ));
}
```

## Adding a Dead Letter Queue

In a production pipeline, you should not just log and drop failed records. Route them to a dead letter destination.

```java
// Pipeline with dead letter queue for failed records
final TupleTag<TableRow> successTag = new TupleTag<TableRow>() {};
final TupleTag<String> deadLetterTag = new TupleTag<String>() {};

PCollectionTuple parsed = pipeline
    .apply("ReadPubSub", PubsubIO.readStrings()
        .fromSubscription(options.getInputSubscription()))
    .apply("ParseWithDLQ", ParDo.of(
        new DoFn<String, TableRow>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                try {
                    TableRow row = parseJson(c.element());
                    c.output(row);
                } catch (Exception e) {
                    // Send failed records to dead letter output
                    c.output(deadLetterTag, c.element());
                }
            }
        }).withOutputTags(successTag, TupleTagList.of(deadLetterTag)));

// Write successful records to BigQuery
parsed.get(successTag)
    .apply("WriteBQ", BigQueryIO.writeTableRows()
        .to(options.getOutputTable())
        .withSchema(getTableSchema())
        .withWriteDisposition(WriteDisposition.WRITE_APPEND));

// Write failed records to a dead letter topic
parsed.get(deadLetterTag)
    .apply("WriteDLQ", PubsubIO.writeStrings()
        .to("projects/my-project/topics/events-dlq"));
```

## Choosing the Right BigQuery Write Method

BigQuery offers different write methods, and the choice significantly impacts performance and cost.

**Streaming inserts** are the default for streaming pipelines. They offer low latency but cost $0.01 per 200 MB inserted.

**Storage Write API** is the newer, recommended approach. It offers better performance, exactly-once semantics, and lower cost.

```java
// Use the Storage Write API for better performance and lower cost
.apply("WriteBQ", BigQueryIO.writeTableRows()
    .to(options.getOutputTable())
    .withSchema(getTableSchema())
    .withWriteDisposition(WriteDisposition.WRITE_APPEND)
    .withCreateDisposition(CreateDisposition.CREATE_IF_NEEDED)
    .withMethod(BigQueryIO.Write.Method.STORAGE_WRITE_API)  // Use Storage Write API
    .withTriggeringFrequency(Duration.standardSeconds(10))   // Flush every 10 seconds
    .withNumStorageWriteApiStreams(3));                       // Parallel write streams
```

The Storage Write API batches records and writes them in chunks, which is more efficient than individual streaming inserts. The `triggeringFrequency` controls how often Dataflow flushes records to BigQuery.

## Handling BigQuery Write Failures

Even with good parsing, writes can fail due to schema mismatches, quota limits, or transient errors. BigQuery IO provides a way to handle these.

```java
// Handle BigQuery write failures with the Storage Write API
WriteResult writeResult = parsed.get(successTag)
    .apply("WriteBQ", BigQueryIO.writeTableRows()
        .to(options.getOutputTable())
        .withSchema(getTableSchema())
        .withWriteDisposition(WriteDisposition.WRITE_APPEND)
        .withMethod(BigQueryIO.Write.Method.STORAGE_WRITE_API)
        .withTriggeringFrequency(Duration.standardSeconds(10)));

// Capture rows that failed to write
writeResult.getFailedStorageApiInserts()
    .apply("LogFailedInserts", ParDo.of(
        new DoFn<BigQueryStorageApiInsertError, Void>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                BigQueryStorageApiInsertError error = c.element();
                LOG.error("Failed to insert row: {} - Error: {}",
                    error.getRow(), error.getErrorMessage());
            }
        }));
```

## Using Pub/Sub Message Attributes

Pub/Sub messages have both a body and attributes. You might want to use attributes for routing or metadata.

```java
// Read full Pub/Sub messages to access attributes
PCollection<PubsubMessage> messages = pipeline
    .apply("ReadPubSub", PubsubIO.readMessages()
        .fromSubscription(options.getInputSubscription()));

// Extract attributes and body
PCollection<TableRow> rows = messages
    .apply("ParseWithAttributes", ParDo.of(
        new DoFn<PubsubMessage, TableRow>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                PubsubMessage msg = c.element();

                // Get message body
                String body = new String(msg.getPayload(), StandardCharsets.UTF_8);

                // Get attributes for enrichment
                String source = msg.getAttribute("source");
                String version = msg.getAttribute("schema_version");

                JsonObject obj = JsonParser.parseString(body).getAsJsonObject();

                TableRow row = new TableRow()
                    .set("event_data", body)
                    .set("source_system", source)
                    .set("schema_version", version)
                    .set("ingestion_time", Instant.now().toString());

                c.output(row);
            }
        }));
```

## Dynamic Table Routing

Sometimes you want to route different events to different BigQuery tables based on the message content.

```java
// Route events to different BigQuery tables based on event type
.apply("WriteBQ", BigQueryIO.writeTableRows()
    .to(new SerializableFunction<ValueInSingleWindow<TableRow>, TableDestination>() {
        @Override
        public TableDestination apply(ValueInSingleWindow<TableRow> input) {
            TableRow row = input.getValue();
            String eventType = (String) row.get("event_type");

            // Route to different tables based on event type
            String table = String.format(
                "my-project:events.%s_events", eventType.toLowerCase());

            return new TableDestination(table, "Events of type: " + eventType);
        }
    })
    .withSchema(getTableSchema())
    .withWriteDisposition(WriteDisposition.WRITE_APPEND)
    .withCreateDisposition(CreateDisposition.CREATE_IF_NEEDED));
```

## Launching the Pipeline

Deploy the pipeline with the Dataflow runner.

```bash
# Launch the streaming pipeline
mvn compile exec:java \
  -Dexec.mainClass=com.example.PubSubToBigQuery \
  -Dexec.args=" \
    --project=my-gcp-project \
    --runner=DataflowRunner \
    --region=us-central1 \
    --inputSubscription=projects/my-project/subscriptions/events-sub \
    --outputTable=my-project:analytics.raw_events \
    --tempLocation=gs://my-bucket/temp \
    --numWorkers=3 \
    --maxNumWorkers=10 \
    --autoscalingAlgorithm=THROUGHPUT_BASED \
    --streaming"
```

The Pub/Sub to BigQuery pattern is a workhorse of GCP data architectures. Once you have the basic pipeline running, you can layer on windowing, enrichment, and more sophisticated error handling to meet your specific requirements. Start simple, validate end to end, and then add complexity incrementally.
