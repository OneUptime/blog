# How to Use Side Inputs in Apache Beam for Enrichment Lookups in Dataflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Apache Beam, Data Enrichment, Side Inputs

Description: Learn how to use Apache Beam side inputs in Dataflow pipelines to enrich streaming data with lookup tables, reference data, and slowly changing dimensions.

---

Data enrichment is one of the most common operations in data pipelines. You have a stream of events with user IDs, and you need to look up user names. You have transaction records with product codes, and you need to add product descriptions. You have raw sensor data, and you need to attach device metadata.

In Apache Beam, the standard way to do this is with side inputs. A side input is a secondary PCollection that your main processing logic can access for lookups. Unlike the main input which is processed element by element, a side input is available in its entirety to each worker.

## Side Inputs vs. Direct Database Lookups

You might be tempted to just query a database directly from your DoFn. I have seen pipelines do this, and it works for small volumes. But at scale, making a database call for every single element is a bad idea. If you are processing millions of events per second, that is millions of database queries per second - your database will not be happy.

Side inputs solve this by loading the lookup data once and distributing it to all workers. The data lives in memory, so lookups are fast.

## Basic Side Input: Map Lookup

The most common pattern is loading reference data as a map and using it for key-based lookups.

```java
// Load user data from BigQuery as a side input map
PCollectionView<Map<String, String>> userNamesView = pipeline
    .apply("ReadUsers", BigQueryIO.readTableRows()
        .from("project:dataset.users"))
    .apply("ToKV", MapElements.via(
        new SimpleFunction<TableRow, KV<String, String>>() {
            @Override
            public KV<String, String> apply(TableRow row) {
                // Map user_id to display_name
                String userId = (String) row.get("user_id");
                String displayName = (String) row.get("display_name");
                return KV.of(userId, displayName);
            }
        }))
    .apply("AsMap", View.asMap());  // Convert to a Map side input

// Use the side input to enrich streaming events
PCollection<EnrichedEvent> enrichedEvents = rawEvents
    .apply("EnrichWithUserName", ParDo.of(
        new DoFn<Event, EnrichedEvent>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                Event event = c.element();

                // Access the side input map
                Map<String, String> userNames = c.sideInput(userNamesView);

                // Look up the user name
                String userName = userNames.getOrDefault(
                    event.getUserId(), "Unknown User");

                // Create enriched event with the looked-up name
                EnrichedEvent enriched = new EnrichedEvent(event, userName);
                c.output(enriched);
            }
        }).withSideInputs(userNamesView));
```

The key steps are:
1. Create a PCollection of your lookup data
2. Convert it to a `PCollectionView` using `View.asMap()`, `View.asList()`, or `View.asSingleton()`
3. Pass it to your DoFn using `.withSideInputs()`
4. Access it inside the DoFn using `c.sideInput()`

## Side Input as a List

Sometimes you need the lookup data as a list rather than a map. For example, a list of blocked IP addresses.

```java
// Load blocked IPs as a list side input
PCollectionView<List<String>> blockedIpsView = pipeline
    .apply("ReadBlockedIPs", TextIO.read()
        .from("gs://my-bucket/config/blocked_ips.txt"))
    .apply("AsList", View.asList());

// Filter out events from blocked IPs
PCollection<Event> filteredEvents = rawEvents
    .apply("FilterBlockedIPs", ParDo.of(
        new DoFn<Event, Event>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                Event event = c.element();
                List<String> blockedIps = c.sideInput(blockedIpsView);

                // Only output events from non-blocked IPs
                if (!blockedIps.contains(event.getSourceIp())) {
                    c.output(event);
                }
            }
        }).withSideInputs(blockedIpsView));
```

For large lists of values you need to check membership against, consider converting to a `Set` inside your DoFn's `@Setup` method for O(1) lookups instead of O(n) list scans.

## Side Input as a Singleton

When your lookup data is a single value - like a configuration setting or a threshold - use `View.asSingleton()`.

```java
// Load a single configuration value as a side input
PCollectionView<Double> thresholdView = pipeline
    .apply("ReadThreshold", Create.of(95.0))
    .apply("AsSingleton", View.asSingleton());

// Use the threshold in processing
PCollection<Alert> alerts = metrics
    .apply("CheckThreshold", ParDo.of(
        new DoFn<Metric, Alert>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                Metric metric = c.element();
                Double threshold = c.sideInput(thresholdView);

                if (metric.getValue() > threshold) {
                    c.output(new Alert(metric, "Exceeded threshold: " + threshold));
                }
            }
        }).withSideInputs(thresholdView));
```

## Refreshing Side Inputs in Streaming Pipelines

In a batch pipeline, side inputs are computed once and that is it. But in a streaming pipeline, your lookup data might change over time. New users sign up, product catalogs get updated, configuration changes.

You can refresh side inputs by windowing them and using triggers.

```java
// Periodically refresh side input data every 10 minutes
PCollectionView<Map<String, String>> refreshableView = pipeline
    .apply("PeriodicRead", GenerateSequence
        .from(0)
        .withRate(1, Duration.standardMinutes(10)))  // Trigger every 10 min
    .apply("FetchLatestData", ParDo.of(
        new DoFn<Long, KV<String, String>>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                // Fetch fresh data from an external source
                Map<String, String> freshData = fetchFromDatabase();
                for (Map.Entry<String, String> entry : freshData.entrySet()) {
                    c.output(KV.of(entry.getKey(), entry.getValue()));
                }
            }
        }))
    .apply("Window", Window.<KV<String, String>>into(
        new GlobalWindows())
        .triggering(Repeatedly.forever(
            AfterProcessingTime.pastFirstElementInPane()
                .plusDelayOf(Duration.standardMinutes(10))))
        .discardingFiredPanes())
    .apply("AsMap", View.asMap());
```

This pattern reads fresh data every 10 minutes and makes it available as a side input. There is a brief period during refresh where the side input might be slightly stale, but for most use cases this is acceptable.

## Side Input Size Limitations

Side inputs need to fit in memory on each worker. For Dataflow, this typically means your side input should be under a few GB. If your lookup table is larger, you have a few options.

For lookup tables that fit in memory but are on the larger side, increase your worker machine type to get more RAM.

For very large lookup tables, consider using Cloud Bigtable or a similar low-latency store and doing direct lookups from your DoFn. You can batch the lookups to reduce the number of round trips.

```java
// For large lookup tables, use batched direct lookups instead of side inputs
public class BigtableLookupFn extends DoFn<Event, EnrichedEvent> {

    private transient BigtableDataClient client;
    private static final String TABLE_ID = "user-profiles";

    @Setup
    public void setup() throws IOException {
        // Initialize Bigtable client once per worker
        client = BigtableDataClient.create("my-project", "my-instance");
    }

    @ProcessElement
    public void processElement(ProcessContext c) {
        Event event = c.element();

        // Direct lookup from Bigtable - low latency, handles large tables
        Row row = client.readRow(TABLE_ID, event.getUserId());

        String userName = "Unknown";
        if (row != null) {
            userName = row.getCells("info", "display_name")
                .get(0).getValue().toStringUtf8();
        }

        c.output(new EnrichedEvent(event, userName));
    }

    @Teardown
    public void teardown() {
        if (client != null) {
            client.close();
        }
    }
}
```

## Multiple Side Inputs

You can use multiple side inputs in a single DoFn. This is common when you need to enrich data from several reference tables.

```java
// Enrich events with data from multiple lookup tables
PCollection<FullyEnrichedEvent> enriched = rawEvents
    .apply("FullEnrichment", ParDo.of(
        new DoFn<Event, FullyEnrichedEvent>() {
            @ProcessElement
            public void processElement(ProcessContext c) {
                Event event = c.element();

                // Access multiple side inputs
                Map<String, String> users = c.sideInput(userNamesView);
                Map<String, String> products = c.sideInput(productNamesView);
                Map<String, String> regions = c.sideInput(regionNamesView);

                // Enrich with all lookup data
                FullyEnrichedEvent enrichedEvent = new FullyEnrichedEvent(
                    event,
                    users.getOrDefault(event.getUserId(), "Unknown"),
                    products.getOrDefault(event.getProductId(), "Unknown"),
                    regions.getOrDefault(event.getRegionCode(), "Unknown")
                );

                c.output(enrichedEvent);
            }
        }).withSideInputs(userNamesView, productNamesView, regionNamesView));
```

Side inputs are one of the most useful features in Apache Beam. They let you keep your enrichment logic clean and efficient while handling the complexity of distributed data access behind the scenes. Start with map-based side inputs for simple lookups, and graduate to more sophisticated patterns as your data volumes and freshness requirements grow.
