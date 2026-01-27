# How to Write Flink Streaming Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Flink, Stream Processing, Real-time, Data Engineering, Java

Description: Learn how to write Apache Flink streaming jobs for real-time data processing, including DataStream API, transformations, and state management.

---

> Stream processing lets you react to data as it arrives. With Flink, you get exactly-once semantics, fault tolerance, and millisecond latency - all in a unified framework for both batch and stream workloads.

Apache Flink is a distributed stream processing framework designed for high-throughput, low-latency data pipelines. Unlike batch systems that process data in chunks, Flink processes records one at a time as they arrive, enabling real-time analytics, event-driven applications, and continuous ETL pipelines.

This guide covers everything you need to write production-ready Flink streaming jobs.

---

## Table of Contents

1. Flink Streaming Basics
2. Project Setup
3. DataStream API Fundamentals
4. Sources and Sinks
5. Transformations
6. Keyed Streams and Aggregations
7. Windowing Operations
8. State Management
9. Checkpointing and Fault Tolerance
10. Watermarks and Event Time
11. Deployment Considerations
12. Best Practices Summary

---

## 1. Flink Streaming Basics

Flink processes data as unbounded streams. Key concepts:

| Concept | Description |
|---------|-------------|
| DataStream | The core abstraction representing a stream of records |
| Operator | A transformation applied to one or more streams |
| Parallelism | Number of parallel instances of an operator |
| Task | A unit of execution running on a TaskManager |
| Checkpoint | A consistent snapshot of state for fault recovery |
| Watermark | A marker indicating event time progress |

Flink guarantees exactly-once processing semantics through checkpointing and state management. When failures occur, Flink restores from the last checkpoint and replays records.

---

## 2. Project Setup

Add Flink dependencies to your Maven project:

```xml
<!-- pom.xml -->
<properties>
    <flink.version>1.18.0</flink.version>
    <java.version>11</java.version>
</properties>

<dependencies>
    <!-- Flink core streaming API -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-streaming-java</artifactId>
        <version>${flink.version}</version>
        <scope>provided</scope>
    </dependency>

    <!-- Flink clients for job submission -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-clients</artifactId>
        <version>${flink.version}</version>
        <scope>provided</scope>
    </dependency>

    <!-- Kafka connector -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-connector-kafka</artifactId>
        <version>3.0.0-1.18</version>
    </dependency>

    <!-- JSON serialization -->
    <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-json</artifactId>
        <version>${flink.version}</version>
    </dependency>
</dependencies>
```

For Gradle:

```groovy
// build.gradle
dependencies {
    compileOnly "org.apache.flink:flink-streaming-java:1.18.0"
    compileOnly "org.apache.flink:flink-clients:1.18.0"
    implementation "org.apache.flink:flink-connector-kafka:3.0.0-1.18"
    implementation "org.apache.flink:flink-json:1.18.0"
}
```

---

## 3. DataStream API Fundamentals

Every Flink job starts with a `StreamExecutionEnvironment`:

```java
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.datastream.DataStream;

public class BasicFlinkJob {
    public static void main(String[] args) throws Exception {
        // Create the execution environment
        // This is the entry point for all Flink streaming programs
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Set parallelism for the entire job
        // Each operator will run with this many parallel instances
        env.setParallelism(4);

        // Create a simple stream from a collection (for testing)
        DataStream<String> stream = env.fromElements(
            "event-1", "event-2", "event-3", "event-4"
        );

        // Apply a transformation and print results
        stream
            .map(s -> s.toUpperCase())
            .print();  // Writes to stdout - useful for debugging

        // Execute the job - nothing runs until this is called
        env.execute("Basic Flink Job");
    }
}
```

The execution environment configures job-level settings like parallelism, checkpointing, and restart strategies. Nothing executes until you call `env.execute()`.

---

## 4. Sources and Sinks

Sources read data into Flink; sinks write results out.

### Kafka Source

```java
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;

public class KafkaSourceExample {
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Configure Kafka source with consumer properties
        KafkaSource<String> source = KafkaSource.<String>builder()
            .setBootstrapServers("kafka:9092")
            .setTopics("events")
            .setGroupId("flink-consumer-group")
            // Start from committed offsets, fall back to earliest
            .setStartingOffsets(OffsetsInitializer.committedOffsets(
                OffsetsInitializer.OffsetsInitializerReset.EARLIEST))
            .setValueOnlyDeserializer(new SimpleStringSchema())
            .build();

        // Create the stream with a watermark strategy
        DataStream<String> kafkaStream = env.fromSource(
            source,
            WatermarkStrategy.noWatermarks(),  // We'll cover watermarks later
            "Kafka Source"
        );

        kafkaStream
            .map(record -> "Processed: " + record)
            .print();

        env.execute("Kafka Consumer Job");
    }
}
```

### Kafka Sink

```java
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.base.DeliveryGuarantee;
import org.apache.flink.api.common.serialization.SimpleStringSchema;

public class KafkaSinkExample {
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Enable checkpointing for exactly-once delivery
        env.enableCheckpointing(60000);  // Checkpoint every 60 seconds

        DataStream<String> stream = env.fromElements("output-1", "output-2");

        // Configure Kafka sink with delivery guarantees
        KafkaSink<String> sink = KafkaSink.<String>builder()
            .setBootstrapServers("kafka:9092")
            .setRecordSerializer(
                KafkaRecordSerializationSchema.builder()
                    .setTopic("output-events")
                    .setValueSerializationSchema(new SimpleStringSchema())
                    .build()
            )
            // EXACTLY_ONCE requires Kafka transactions and checkpointing
            .setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE)
            // Transaction prefix for Kafka producer
            .setTransactionalIdPrefix("flink-job-")
            .build();

        stream.sinkTo(sink);

        env.execute("Kafka Producer Job");
    }
}
```

### File Sink

```java
import org.apache.flink.connector.file.sink.FileSink;
import org.apache.flink.core.fs.Path;
import org.apache.flink.api.common.serialization.SimpleStringEncoder;
import org.apache.flink.streaming.api.functions.sink.filesystem.rollingpolicies.DefaultRollingPolicy;
import java.time.Duration;

// Write stream to files with rolling policy
FileSink<String> fileSink = FileSink
    .forRowFormat(new Path("/output/path"), new SimpleStringEncoder<String>("UTF-8"))
    .withRollingPolicy(
        DefaultRollingPolicy.builder()
            // Roll file after 15 minutes
            .withRolloverInterval(Duration.ofMinutes(15))
            // Or when file reaches 1GB
            .withMaxPartSize(1024 * 1024 * 1024)
            .build()
    )
    .build();

stream.sinkTo(fileSink);
```

---

## 5. Transformations

Flink provides operators for transforming streams.

### Map - One-to-One Transformation

```java
import org.apache.flink.api.common.functions.MapFunction;

// Transform each record individually
// Input: one record, Output: one record
DataStream<Event> events = inputStream.map(new MapFunction<String, Event>() {
    @Override
    public Event map(String value) throws Exception {
        // Parse JSON string into Event object
        return Event.fromJson(value);
    }
});

// Lambda version (cleaner for simple transformations)
DataStream<Integer> lengths = inputStream.map(s -> s.length());
```

### Filter - Select Records

```java
import org.apache.flink.api.common.functions.FilterFunction;

// Keep only records matching a predicate
DataStream<Event> errors = events.filter(new FilterFunction<Event>() {
    @Override
    public boolean filter(Event event) throws Exception {
        return event.getLevel().equals("ERROR");
    }
});

// Lambda version
DataStream<Event> highValue = events.filter(e -> e.getAmount() > 1000);
```

### FlatMap - One-to-Many Transformation

```java
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.util.Collector;

// Transform each record into zero or more output records
// Useful for splitting, exploding arrays, or filtering + mapping
DataStream<String> words = lines.flatMap(new FlatMapFunction<String, String>() {
    @Override
    public void flatMap(String line, Collector<String> out) throws Exception {
        // Split line into words and emit each
        for (String word : line.split("\\s+")) {
            if (!word.isEmpty()) {
                out.collect(word.toLowerCase());
            }
        }
    }
});
```

### Rich Functions - Access to Runtime Context

```java
import org.apache.flink.api.common.functions.RichMapFunction;
import org.apache.flink.configuration.Configuration;

// Rich functions provide lifecycle methods and runtime context
public class EnrichmentFunction extends RichMapFunction<Event, EnrichedEvent> {

    private transient Map<String, String> lookupTable;

    @Override
    public void open(Configuration parameters) throws Exception {
        // Called once when the operator starts
        // Initialize expensive resources here (DB connections, caches)
        lookupTable = loadLookupTable();
    }

    @Override
    public EnrichedEvent map(Event event) throws Exception {
        // Access runtime information
        int subtaskIndex = getRuntimeContext().getIndexOfThisSubtask();

        // Use initialized resources
        String enrichment = lookupTable.getOrDefault(event.getId(), "unknown");
        return new EnrichedEvent(event, enrichment, subtaskIndex);
    }

    @Override
    public void close() throws Exception {
        // Cleanup resources when operator shuts down
        if (lookupTable != null) {
            lookupTable.clear();
        }
    }
}
```

---

## 6. Keyed Streams and Aggregations

Keyed streams partition data by key, enabling stateful operations and aggregations.

```java
import org.apache.flink.api.java.functions.KeySelector;
import org.apache.flink.streaming.api.datastream.KeyedStream;

// Partition stream by a key
// All records with the same key go to the same parallel operator instance
KeyedStream<Event, String> keyedStream = events.keyBy(new KeySelector<Event, String>() {
    @Override
    public String getKey(Event event) throws Exception {
        return event.getUserId();
    }
});

// Lambda version
KeyedStream<Event, String> keyedByUser = events.keyBy(e -> e.getUserId());
```

### Built-in Aggregations

```java
// Sum a field across all records with the same key
DataStream<Transaction> totalsByUser = transactions
    .keyBy(t -> t.getUserId())
    .sum("amount");  // Sums the "amount" field

// Min/Max
DataStream<SensorReading> minTemps = readings
    .keyBy(r -> r.getSensorId())
    .min("temperature");

// Reduce - custom aggregation logic
DataStream<Event> latestEvents = events
    .keyBy(e -> e.getUserId())
    .reduce((e1, e2) -> e1.getTimestamp() > e2.getTimestamp() ? e1 : e2);
```

### Custom Aggregation with AggregateFunction

```java
import org.apache.flink.api.common.functions.AggregateFunction;

// AggregateFunction<Input, Accumulator, Output>
public class AverageAggregate implements AggregateFunction<Double, Tuple2<Double, Long>, Double> {

    @Override
    public Tuple2<Double, Long> createAccumulator() {
        // Initialize accumulator: (sum, count)
        return Tuple2.of(0.0, 0L);
    }

    @Override
    public Tuple2<Double, Long> add(Double value, Tuple2<Double, Long> acc) {
        // Add new value to accumulator
        return Tuple2.of(acc.f0 + value, acc.f1 + 1);
    }

    @Override
    public Double getResult(Tuple2<Double, Long> acc) {
        // Compute final result from accumulator
        return acc.f0 / acc.f1;
    }

    @Override
    public Tuple2<Double, Long> merge(Tuple2<Double, Long> a, Tuple2<Double, Long> b) {
        // Merge two accumulators (used in session windows)
        return Tuple2.of(a.f0 + b.f0, a.f1 + b.f1);
    }
}
```

---

## 7. Windowing Operations

Windows group records for bounded aggregations over unbounded streams.

### Tumbling Windows

Non-overlapping, fixed-size windows:

```java
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

// Count events per user in 5-minute windows
DataStream<Tuple2<String, Long>> countsPerWindow = events
    .keyBy(e -> e.getUserId())
    // Window of 5 minutes - no overlap
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .process(new ProcessWindowFunction<Event, Tuple2<String, Long>, String, TimeWindow>() {
        @Override
        public void process(String key, Context ctx, Iterable<Event> events,
                          Collector<Tuple2<String, Long>> out) {
            long count = 0;
            for (Event e : events) count++;
            out.collect(Tuple2.of(key, count));
        }
    });
```

### Sliding Windows

Overlapping windows:

```java
import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;

// 10-minute windows that slide every 1 minute
// Each event belongs to 10 windows
DataStream<Double> movingAverages = readings
    .keyBy(r -> r.getSensorId())
    .window(SlidingEventTimeWindows.of(Time.minutes(10), Time.minutes(1)))
    .aggregate(new AverageAggregate());
```

### Session Windows

Windows based on activity gaps:

```java
import org.apache.flink.streaming.api.windowing.assigners.EventTimeSessionWindows;

// Group events with gaps less than 30 minutes into sessions
DataStream<SessionSummary> sessions = clickEvents
    .keyBy(e -> e.getUserId())
    .window(EventTimeSessionWindows.withGap(Time.minutes(30)))
    .process(new SessionProcessor());
```

### Window Functions

Three types of window functions with different trade-offs:

```java
// ReduceFunction - Incremental, most efficient
// Only keeps one accumulated value per window
windowedStream.reduce((a, b) -> a.merge(b));

// AggregateFunction - Incremental with custom accumulator
// Good balance of efficiency and flexibility
windowedStream.aggregate(new MyAggregateFunction());

// ProcessWindowFunction - Access to all elements
// Most flexible but buffers all records in state
windowedStream.process(new ProcessWindowFunction<>() {
    @Override
    public void process(String key, Context ctx, Iterable<Event> elements,
                       Collector<Result> out) {
        // Access window metadata
        TimeWindow window = ctx.window();
        long windowStart = window.getStart();
        long windowEnd = window.getEnd();

        // Process all elements
        List<Event> eventList = new ArrayList<>();
        elements.forEach(eventList::add);

        // Emit result
        out.collect(new Result(key, eventList.size(), windowStart, windowEnd));
    }
});
```

---

## 8. State Management

Flink provides managed state for building stateful operators.

### Keyed State Types

```java
import org.apache.flink.api.common.state.*;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;

public class StatefulProcessor extends KeyedProcessFunction<String, Event, Alert> {

    // ValueState - single value per key
    private ValueState<Long> lastEventTime;

    // ListState - list of values per key
    private ListState<Event> recentEvents;

    // MapState - key-value map per key
    private MapState<String, Integer> counters;

    // ReducingState - automatically reduces values
    private ReducingState<Long> sum;

    @Override
    public void open(Configuration parameters) {
        // Initialize state descriptors - defines name and type
        lastEventTime = getRuntimeContext().getState(
            new ValueStateDescriptor<>("lastEventTime", Long.class));

        recentEvents = getRuntimeContext().getListState(
            new ListStateDescriptor<>("recentEvents", Event.class));

        counters = getRuntimeContext().getMapState(
            new MapStateDescriptor<>("counters", String.class, Integer.class));

        sum = getRuntimeContext().getReducingState(
            new ReducingStateDescriptor<>("sum", Long::sum, Long.class));
    }

    @Override
    public void processElement(Event event, Context ctx, Collector<Alert> out) throws Exception {
        // Read state
        Long last = lastEventTime.value();

        // Update state
        lastEventTime.update(event.getTimestamp());
        recentEvents.add(event);
        counters.put(event.getType(), counters.get(event.getType()) + 1);
        sum.add(event.getValue());

        // Detect anomaly based on state
        if (last != null && event.getTimestamp() - last > 60000) {
            out.collect(new Alert("Gap detected for user: " + ctx.getCurrentKey()));
        }
    }
}
```

### State TTL (Time-To-Live)

Automatically expire state to prevent unbounded growth:

```java
import org.apache.flink.api.common.state.StateTtlConfig;
import org.apache.flink.api.common.time.Time;

StateTtlConfig ttlConfig = StateTtlConfig
    .newBuilder(Time.hours(24))  // State expires after 24 hours
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)  // Reset TTL on updates
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .build();

ValueStateDescriptor<Long> descriptor = new ValueStateDescriptor<>("state", Long.class);
descriptor.enableTimeToLive(ttlConfig);
```

---

## 9. Checkpointing and Fault Tolerance

Checkpoints enable exactly-once processing and recovery.

```java
import org.apache.flink.streaming.api.CheckpointingMode;
import org.apache.flink.streaming.api.environment.CheckpointConfig;

StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

// Enable checkpointing every 60 seconds
env.enableCheckpointing(60000);

// Configure checkpointing behavior
CheckpointConfig config = env.getCheckpointConfig();

// Exactly-once guarantees - all operators see consistent state
config.setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);

// Minimum time between checkpoints (prevents checkpoint storms)
config.setMinPauseBetweenCheckpoints(30000);

// Checkpoint must complete within 10 minutes or it's aborted
config.setCheckpointTimeout(600000);

// Allow only one checkpoint at a time
config.setMaxConcurrentCheckpoints(1);

// Keep checkpoints after job cancellation for manual recovery
config.setExternalizedCheckpointCleanup(
    CheckpointConfig.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

// Tolerate up to 3 consecutive checkpoint failures
config.setTolerableCheckpointFailureNumber(3);
```

### State Backend Configuration

```java
import org.apache.flink.contrib.streaming.state.EmbeddedRocksDBStateBackend;
import org.apache.flink.runtime.state.hashmap.HashMapStateBackend;

// HashMapStateBackend - stores state on heap (fast but limited by memory)
env.setStateBackend(new HashMapStateBackend());

// RocksDBStateBackend - stores state on disk (handles large state)
// Recommended for production with large state
EmbeddedRocksDBStateBackend rocksDB = new EmbeddedRocksDBStateBackend(true);
env.setStateBackend(rocksDB);

// Configure checkpoint storage location
env.getCheckpointConfig().setCheckpointStorage("s3://bucket/checkpoints/");
```

### Restart Strategies

```java
import org.apache.flink.api.common.restartstrategy.RestartStrategies;
import org.apache.flink.api.common.time.Time;

// Fixed delay restart - retry 3 times with 10 second delays
env.setRestartStrategy(RestartStrategies.fixedDelayRestart(
    3,  // Number of restart attempts
    Time.seconds(10)  // Delay between attempts
));

// Exponential delay restart - increasing delays up to max
env.setRestartStrategy(RestartStrategies.exponentialDelayRestart(
    Time.seconds(1),   // Initial delay
    Time.minutes(5),   // Max delay
    2.0,               // Backoff multiplier
    Time.hours(1),     // Reset backoff after success
    0.1                // Jitter (randomization)
));

// Failure rate restart - limit failures within time window
env.setRestartStrategy(RestartStrategies.failureRateRestart(
    3,                  // Max failures
    Time.minutes(5),    // Time window
    Time.seconds(10)    // Delay between restarts
));
```

---

## 10. Watermarks and Event Time

Event time processing handles out-of-order data correctly.

### Event Time Configuration

```java
import org.apache.flink.api.common.eventtime.*;

// Create stream with event time and watermarks
DataStream<Event> events = env.fromSource(
    kafkaSource,
    // Configure watermark strategy
    WatermarkStrategy
        .<Event>forBoundedOutOfOrderness(Duration.ofSeconds(30))  // Allow 30s late data
        .withTimestampAssigner((event, timestamp) -> event.getEventTime()),  // Extract timestamp
    "Kafka Source"
);
```

### Custom Watermark Generator

```java
public class CustomWatermarkStrategy implements WatermarkStrategy<Event> {

    @Override
    public WatermarkGenerator<Event> createWatermarkGenerator(
            WatermarkGeneratorSupplier.Context context) {
        return new WatermarkGenerator<Event>() {
            private long maxTimestamp = Long.MIN_VALUE;
            private final long maxOutOfOrderness = 30000;  // 30 seconds

            @Override
            public void onEvent(Event event, long eventTimestamp, WatermarkOutput output) {
                // Track maximum timestamp seen
                maxTimestamp = Math.max(maxTimestamp, event.getEventTime());
            }

            @Override
            public void onPeriodicEmit(WatermarkOutput output) {
                // Emit watermark periodically (default: every 200ms)
                output.emitWatermark(new Watermark(maxTimestamp - maxOutOfOrderness - 1));
            }
        };
    }

    @Override
    public TimestampAssigner<Event> createTimestampAssigner(
            TimestampAssignerSupplier.Context context) {
        return (event, timestamp) -> event.getEventTime();
    }
}
```

### Handling Late Data

```java
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.util.OutputTag;

// Define side output for late data
OutputTag<Event> lateDataTag = new OutputTag<Event>("late-data") {};

SingleOutputStreamOperator<Result> results = events
    .keyBy(e -> e.getUserId())
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    // Allow late data up to 1 hour
    .allowedLateness(Time.hours(1))
    // Send extremely late data to side output
    .sideOutputLateData(lateDataTag)
    .aggregate(new MyAggregator());

// Process late data separately
DataStream<Event> lateData = results.getSideOutput(lateDataTag);
lateData.map(e -> "Late event: " + e).print();
```

---

## 11. Deployment Considerations

### Job Packaging

Build a fat JAR with all dependencies:

```xml
<!-- pom.xml -->
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-shade-plugin</artifactId>
            <version>3.5.0</version>
            <executions>
                <execution>
                    <phase>package</phase>
                    <goals>
                        <goal>shade</goal>
                    </goals>
                    <configuration>
                        <transformers>
                            <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                <mainClass>com.example.MyFlinkJob</mainClass>
                            </transformer>
                            <!-- Merge service files -->
                            <transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
                        </transformers>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### Resource Configuration

```java
// Set parallelism at different levels
env.setParallelism(8);  // Default for all operators

stream
    .map(x -> process(x)).setParallelism(4)   // Override for specific operator
    .keyBy(x -> x.getKey())
    .process(new HeavyProcessor()).setParallelism(16);  // More parallelism for heavy work

// Configure operator chaining
stream
    .map(x -> x).disableChaining()  // Force separate task
    .filter(x -> true).startNewChain();  // Start new chain here
```

### Submitting Jobs

```bash
# Submit to Flink cluster
./bin/flink run -c com.example.MyFlinkJob /path/to/my-job.jar

# With specific parallelism
./bin/flink run -p 16 -c com.example.MyFlinkJob /path/to/my-job.jar

# With savepoint
./bin/flink run -s s3://bucket/savepoints/savepoint-abc123 \
    -c com.example.MyFlinkJob /path/to/my-job.jar

# Kubernetes deployment using Flink Operator
kubectl apply -f - <<EOF
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: my-flink-job
spec:
  image: flink:1.18
  flinkVersion: v1_18
  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "2"
    state.checkpoints.dir: s3://bucket/checkpoints
  serviceAccount: flink
  jobManager:
    resource:
      memory: "2048m"
      cpu: 1
  taskManager:
    resource:
      memory: "4096m"
      cpu: 2
  job:
    jarURI: local:///opt/flink/jobs/my-job.jar
    parallelism: 4
    upgradeMode: savepoint
EOF
```

---

## 12. Best Practices Summary

### Code Organization

- Keep transformation logic in separate classes for testability
- Use POJOs or Avro for data types (better serialization)
- Configure serializers explicitly for complex types

### State Management

- Use TTL to prevent unbounded state growth
- Choose appropriate state backend (RocksDB for large state)
- Keep state keys low cardinality when possible

### Checkpointing

- Enable checkpointing for production jobs
- Use incremental checkpoints with RocksDB
- Store checkpoints in durable storage (S3, HDFS)
- Configure appropriate checkpoint intervals (balance latency vs overhead)

### Windowing

- Prefer event time over processing time
- Configure watermarks based on expected lateness
- Use allowed lateness and side outputs for late data
- Avoid very long windows (state growth)

### Performance

- Set appropriate parallelism per operator
- Avoid shuffles when possible (prefer forward partitioning)
- Use operator chaining for simple transformations
- Monitor backpressure and adjust resources

### Monitoring

- Enable metrics reporting to Prometheus or similar
- Monitor checkpoint duration and size
- Track backpressure at operator level
- Set up alerts for checkpoint failures

```java
// Example: Adding custom metrics
public class MetricProcessor extends RichMapFunction<Event, Event> {
    private transient Counter processedCounter;
    private transient Histogram processingTime;

    @Override
    public void open(Configuration parameters) {
        processedCounter = getRuntimeContext()
            .getMetricGroup()
            .counter("processed_events");

        processingTime = getRuntimeContext()
            .getMetricGroup()
            .histogram("processing_time_ms", new DescriptiveStatisticsHistogram(1000));
    }

    @Override
    public Event map(Event event) {
        long start = System.currentTimeMillis();
        // Process event
        processedCounter.inc();
        processingTime.update(System.currentTimeMillis() - start);
        return event;
    }
}
```

---

## Conclusion

Apache Flink provides a powerful framework for building real-time streaming applications with strong guarantees. Start with simple transformations, add windowing for time-based analytics, and use state management for complex business logic. Always enable checkpointing in production and monitor your jobs for backpressure and checkpoint health.

The DataStream API covered here handles most streaming use cases. For SQL-based analytics, explore Flink SQL. For complex event processing patterns, look into Flink CEP.

---

*Monitor your Flink jobs and infrastructure with [OneUptime](https://oneuptime.com) - get alerts on job failures, track metrics, and correlate issues across your entire data pipeline.*
