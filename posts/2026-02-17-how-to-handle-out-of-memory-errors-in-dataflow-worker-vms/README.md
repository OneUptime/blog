# How to Handle Out-of-Memory Errors in Dataflow Worker VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Troubleshooting, Memory Management, Performance

Description: Diagnose and fix out-of-memory errors in Google Cloud Dataflow worker VMs by understanding memory usage patterns, right-sizing workers, and optimizing pipeline code.

---

Out-of-memory (OOM) errors are one of the most frustrating problems you can face with Dataflow pipelines. The pipeline runs fine during testing with small datasets, then crashes in production when it hits real-world data volumes. Or worse, it runs for hours and then suddenly dies with a cryptic OOM error.

I have debugged more OOM issues in Dataflow than I care to count. The root cause is almost always one of a handful of patterns. Let me walk through how to diagnose the issue, identify the cause, and fix it.

## Recognizing OOM Errors

OOM errors show up in different ways depending on what ran out of memory.

**JVM heap overflow** shows up as:
```
java.lang.OutOfMemoryError: Java heap space
```

**Worker VM memory exhaustion** shows up as the worker being killed by the OS:
```
The worker lost contact with the service. The most likely cause is that the
worker VM was recycled.
```

**GC overhead limit** shows up when the garbage collector is spending too much time:
```
java.lang.OutOfMemoryError: GC overhead limit exceeded
```

Check the worker logs for these patterns.

```bash
# Search for OOM-related errors in worker logs
gcloud logging read 'resource.type="dataflow_step" AND
  resource.labels.job_id="JOB_ID" AND
  (jsonPayload.message:"OutOfMemoryError" OR
   jsonPayload.message:"worker lost contact" OR
   jsonPayload.message:"GC overhead")' \
  --project=my-project \
  --limit=20 \
  --format="json(timestamp, jsonPayload.message)"
```

## Common Causes of OOM

### 1. Large GroupByKey Results

GroupByKey collects all values for a key into a single iterable. If one key has millions of values, they all need to fit in memory on a single worker.

```java
// Dangerous: if one key has millions of values, this blows up memory
PCollection<KV<String, Iterable<Event>>> grouped = events
    .apply("GroupByUser", GroupByKey.create());

grouped.apply("ProcessGroups", ParDo.of(
    new DoFn<KV<String, Iterable<Event>>, Result>() {
        @ProcessElement
        public void processElement(ProcessContext c) {
            String userId = c.element().getKey();
            // This materializes the entire iterable in memory
            List<Event> allEvents = new ArrayList<>();
            for (Event e : c.element().getValue()) {
                allEvents.add(e);  // OOM risk if there are millions of events
            }
        }
    }));
```

The fix is to use a CombineFn that processes elements incrementally, or to add a secondary key to distribute the load.

```java
// Better: use a CombineFn that processes elements incrementally
PCollection<KV<String, Long>> counts = events
    .apply("CountPerUser", Combine.perKey(Count.combineFn()));

// Or if you need all values, process them in a streaming fashion
grouped.apply("StreamProcess", ParDo.of(
    new DoFn<KV<String, Iterable<Event>>, Result>() {
        @ProcessElement
        public void processElement(ProcessContext c) {
            String userId = c.element().getKey();
            long count = 0;
            Event latest = null;
            // Stream through without materializing the full list
            for (Event e : c.element().getValue()) {
                count++;
                if (latest == null || e.getTimestamp() > latest.getTimestamp()) {
                    latest = e;
                }
            }
            c.output(new Result(userId, count, latest));
        }
    }));
```

### 2. Large Side Inputs

Side inputs are loaded entirely into memory on each worker. A side input with millions of entries can consume gigabytes of RAM.

```java
// This loads the entire user table into memory on every worker
PCollectionView<Map<String, UserProfile>> userProfiles = pipeline
    .apply("LoadUsers", BigQueryIO.readTableRows()
        .from("project:dataset.users"))  // 10 million rows!
    .apply("ToKV", MapElements.via(new ToKVFn()))
    .apply("AsMap", View.asMap());  // 10M entries in memory on each worker
```

Solutions include reducing the side input size, using a distributed cache, or switching to direct lookups.

```java
// Option 1: Filter the side input to only needed data
PCollectionView<Map<String, UserProfile>> filteredView = pipeline
    .apply("LoadActiveUsers", BigQueryIO.readTableRows()
        .fromQuery("SELECT * FROM users WHERE last_active > '2026-01-01'"))
    .apply("ToKV", MapElements.via(new ToKVFn()))
    .apply("AsMap", View.asMap());

// Option 2: Use Bigtable for large lookup tables
public class BigtableLookupFn extends DoFn<Event, EnrichedEvent> {
    private transient BigtableDataClient client;

    @Setup
    public void setup() throws IOException {
        // Initialize once per worker lifecycle
        client = BigtableDataClient.create("project", "instance");
    }

    @ProcessElement
    public void processElement(ProcessContext c) {
        // Direct lookup instead of side input
        Row profile = client.readRow("users", c.element().getUserId());
        c.output(enrich(c.element(), profile));
    }
}
```

### 3. Unbounded Buffering in Streaming Pipelines

In streaming pipelines, windows and triggers can cause unbounded buffering if configured incorrectly.

```java
// Dangerous: global window with no trigger in a streaming pipeline
// Elements accumulate forever until memory runs out
PCollection<KV<String, Long>> dangerous = events
    .apply("GlobalWindow", Window.into(new GlobalWindows()))
    .apply("GroupAll", GroupByKey.create());  // Never fires = infinite buffering
```

Always use appropriate windows and triggers for streaming pipelines.

### 4. Object Serialization Overhead

Dataflow serializes objects between stages. If your objects are large or use inefficient serialization, memory usage spikes during serialization.

```java
// Register a coder for efficient serialization
pipeline.getCoderRegistry().registerCoderForClass(
    MyEvent.class, AvroCoder.of(MyEvent.class));

// Or use Beam schemas for automatic efficient coding
@DefaultSchema(JavaBeanSchema.class)
public class MyEvent implements Serializable {
    private String id;
    private String type;
    private long timestamp;
    // getters and setters
}
```

## Diagnosing Memory Usage

Before fixing the problem, confirm what is using memory. Check the worker metrics.

```bash
# Check memory utilization of workers
gcloud logging read 'resource.type="gce_instance" AND
  resource.labels.instance_id:"dataflow" AND
  jsonPayload.message:"memory"' \
  --project=my-project \
  --limit=20
```

You can also check the Dataflow monitoring tab in the console. Look at the per-step timing and data size. Steps that process large amounts of data per element are memory-hungry.

## Fix 1: Increase Worker Memory

The simplest fix is to use a machine type with more RAM.

```bash
# Use a high-memory machine type
gcloud dataflow jobs run my-pipeline \
  --gcs-location=gs://bucket/templates/my-template \
  --region=us-central1 \
  --worker-machine-type=n1-highmem-8

# Machine type comparison for memory:
# n1-standard-4:  15 GB RAM
# n1-standard-8:  30 GB RAM
# n1-highmem-4:   26 GB RAM
# n1-highmem-8:   52 GB RAM
# n1-highmem-16: 104 GB RAM
```

This buys you time but does not fix the underlying issue. If your data grows, you will hit the limit again.

## Fix 2: Reduce Per-Element Memory Usage

Profile your DoFn code to find where memory is allocated.

```java
// Before: allocating large buffers per element
public class IneffientFn extends DoFn<String, String> {
    @ProcessElement
    public void processElement(ProcessContext c) {
        // Creates a new large buffer for every single element
        byte[] buffer = new byte[10 * 1024 * 1024];  // 10MB per element!
        // ... process ...
        c.output(result);
    }
}

// After: reuse buffers across elements
public class EfficientFn extends DoFn<String, String> {
    private transient byte[] buffer;

    @Setup
    public void setup() {
        // Allocate once per worker, reuse across elements
        buffer = new byte[10 * 1024 * 1024];
    }

    @ProcessElement
    public void processElement(ProcessContext c) {
        // Reuse the pre-allocated buffer
        Arrays.fill(buffer, (byte) 0);
        // ... process using buffer ...
        c.output(result);
    }
}
```

## Fix 3: Use Streaming Engine

Streaming Engine offloads state management from workers to the Dataflow service. This significantly reduces worker memory usage for stateful operations, windowed aggregations, and shuffle.

```bash
# Enable Streaming Engine to reduce worker memory pressure
gcloud dataflow jobs run my-pipeline \
  --gcs-location=gs://bucket/templates/my-template \
  --region=us-central1 \
  --enable-streaming-engine \
  --worker-machine-type=n1-standard-4
```

With Streaming Engine, you can often use smaller machine types because the workers no longer need to hold state in local memory.

## Fix 4: Tune JVM Settings

For advanced cases, you can adjust the JVM heap size allocated to your pipeline code.

```bash
# Set JVM options for Dataflow workers
--experiments=worker_jvm_options="-Xmx4g -XX:+UseG1GC"
```

Be careful with this. The default JVM settings are tuned for most workloads. Only change them if you have profiled the memory usage and know what you are doing.

## Prevention Strategies

The best approach is to prevent OOM errors in the first place. Here are practices I follow.

Always test with production-scale data before deploying. A pipeline that works with 1000 records might crash with 10 million.

Monitor memory metrics continuously. Set up alerts for when worker memory usage exceeds 80% so you can investigate before it hits 100%.

Avoid collecting large amounts of data on a single key. If you must do GroupByKey, know your key distribution and plan for the worst case.

Use CombineFn for all aggregations. They process data incrementally without materializing all values in memory.

Keep side inputs small, or use alternative lookup strategies for large reference datasets.

OOM errors are solvable. The key is understanding where memory is being consumed and applying the right fix for that specific pattern.
