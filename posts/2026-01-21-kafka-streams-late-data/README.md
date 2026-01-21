# How to Handle Late-Arriving Data in Kafka Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Streams, Late Data, Event Time, Watermarks, Grace Periods

Description: Learn how to handle late-arriving data in Kafka Streams, including grace periods, watermarks, out-of-order event processing, and strategies for maintaining accuracy in windowed aggregations.

---

Late-arriving data is a common challenge in stream processing when events arrive after their processing window has closed. Kafka Streams provides several mechanisms to handle this, ensuring accurate results while managing resource constraints.

## Understanding Late Data

### Why Data Arrives Late

```
Event Time vs Processing Time:

Event created: 10:00:00 (event time)
Network delay: 5 minutes
Processing time: 10:05:00

If window closes at 10:04:00, event is "late"
```

Common causes:
- Network latency and retries
- Producer batching delays
- Partitioned systems with clock skew
- Mobile devices with intermittent connectivity
- Batch uploads from offline systems

## Grace Periods

Grace periods allow windows to accept late data:

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import java.time.Duration;

public class GracePeriodExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Event> events = builder.stream("events",
            Consumed.with(Serdes.String(), eventSerde));

        // 5-minute tumbling windows with 2-minute grace period
        TimeWindows windowsWithGrace = TimeWindows
            .ofSizeAndGrace(Duration.ofMinutes(5), Duration.ofMinutes(2));

        KTable<Windowed<String>, Long> counts = events
            .groupByKey()
            .windowedBy(windowsWithGrace)
            .count(Materialized.as("event-counts"));

        counts.toStream()
            .foreach((windowedKey, count) -> {
                System.out.printf("Window [%d - %d] Key: %s Count: %d%n",
                    windowedKey.window().start(),
                    windowedKey.window().end(),
                    windowedKey.key(),
                    count);
            });

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}
```

### How Grace Periods Work

```
Window: [10:00 - 10:05) with 2-minute grace

Timeline:
10:00 - Window opens
10:05 - Window ends (logically)
10:07 - Grace period ends, window closes

Events:
- 10:03 event arrives at 10:04 -> included (within window)
- 10:03 event arrives at 10:06 -> included (within grace)
- 10:03 event arrives at 10:08 -> dropped (after grace)
```

## Custom Timestamp Extractors

Extract event time from message content:

```java
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.streams.processor.TimestampExtractor;

public class EventTimeExtractor implements TimestampExtractor {
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public long extract(ConsumerRecord<Object, Object> record, long partitionTime) {
        try {
            if (record.value() != null) {
                Event event = mapper.readValue(
                    record.value().toString(),
                    Event.class
                );
                long eventTime = event.getTimestamp();

                // Validate timestamp
                if (eventTime > 0 && eventTime <= System.currentTimeMillis() + 60000) {
                    return eventTime;
                }
            }
        } catch (Exception e) {
            // Log error
        }

        // Fallback to partition time (last known time)
        return partitionTime;
    }
}

// Configure in stream
Consumed<String, Event> consumed = Consumed
    .with(Serdes.String(), eventSerde)
    .withTimestampExtractor(new EventTimeExtractor());

KStream<String, Event> events = builder.stream("events", consumed);
```

### Handling Invalid Timestamps

```java
public class SafeTimestampExtractor implements TimestampExtractor {
    private static final long MAX_FUTURE_MS = Duration.ofHours(1).toMillis();
    private static final long MAX_PAST_MS = Duration.ofDays(7).toMillis();

    @Override
    public long extract(ConsumerRecord<Object, Object> record, long partitionTime) {
        long eventTime = extractEventTime(record);
        long now = System.currentTimeMillis();

        // Reject future timestamps
        if (eventTime > now + MAX_FUTURE_MS) {
            log.warn("Future timestamp detected: {}, using partition time", eventTime);
            return partitionTime;
        }

        // Reject very old timestamps
        if (eventTime < now - MAX_PAST_MS) {
            log.warn("Old timestamp detected: {}, using partition time", eventTime);
            return partitionTime;
        }

        return eventTime;
    }
}
```

## Tracking Late Data

Monitor and handle dropped late events:

```java
public class LateDataTracker {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Event> events = builder.stream("events");

        // Branch into on-time and potentially late
        Map<String, KStream<String, Event>> branches = events.split(Named.as("branch-"))
            .branch(
                (key, event) -> isOnTime(event),
                Branched.as("on-time")
            )
            .branch(
                (key, event) -> isSlightlyLate(event),
                Branched.as("slightly-late")
            )
            .defaultBranch(Branched.as("very-late"));

        KStream<String, Event> onTime = branches.get("branch-on-time");
        KStream<String, Event> slightlyLate = branches.get("branch-slightly-late");
        KStream<String, Event> veryLate = branches.get("branch-very-late");

        // Process on-time events normally
        processNormally(onTime);

        // Process slightly late with extended grace
        processWithExtendedGrace(slightlyLate);

        // Send very late to dead letter topic for manual review
        veryLate.to("late-events-dlq");
    }

    private static boolean isOnTime(Event event) {
        return System.currentTimeMillis() - event.getTimestamp() < Duration.ofMinutes(5).toMillis();
    }

    private static boolean isSlightlyLate(Event event) {
        long delay = System.currentTimeMillis() - event.getTimestamp();
        return delay >= Duration.ofMinutes(5).toMillis() &&
               delay < Duration.ofMinutes(30).toMillis();
    }
}
```

## Suppression for Final Results

Emit only final window results, handling updates from late data:

```java
import static org.apache.kafka.streams.kstream.Suppressed.*;

public class SuppressedWindowsExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Transaction> transactions = builder.stream("transactions");

        // Aggregate with grace period
        KTable<Windowed<String>, TransactionSummary> windowedSummary = transactions
            .groupByKey()
            .windowedBy(TimeWindows.ofSizeAndGrace(
                Duration.ofMinutes(5),
                Duration.ofMinutes(2)
            ))
            .aggregate(
                TransactionSummary::new,
                (key, txn, summary) -> summary.add(txn),
                Materialized.<String, TransactionSummary, WindowStore<Bytes, byte[]>>
                    as("transaction-summaries")
                    .withValueSerde(transactionSummarySerde)
            );

        // Suppress until window closes (after grace period)
        KTable<Windowed<String>, TransactionSummary> finalResults = windowedSummary
            .suppress(Suppressed.untilWindowCloses(BufferConfig.unbounded()));

        // Only emits once per window with final result
        finalResults.toStream()
            .to("final-transaction-summaries");

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}
```

### Suppression with Buffer Limits

```java
// Emit early if buffer fills
.suppress(Suppressed.untilWindowCloses(
    BufferConfig.maxRecords(100000)
        .maxBytes(64 * 1024 * 1024)  // 64MB
        .emitEarlyWhenFull()
))

// Emit periodically for long windows
.suppress(Suppressed.untilTimeLimit(
    Duration.ofMinutes(1),
    BufferConfig.unbounded()
))
```

## Session Windows and Late Data

Session windows naturally handle some late data by merging sessions:

```java
public class SessionWindowLateData {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, UserActivity> activities = builder.stream("user-activities");

        // 30-minute inactivity gap with 10-minute grace
        SessionWindows sessionWindows = SessionWindows
            .ofInactivityGapAndGrace(
                Duration.ofMinutes(30),
                Duration.ofMinutes(10)
            );

        KTable<Windowed<String>, UserSession> sessions = activities
            .groupByKey()
            .windowedBy(sessionWindows)
            .aggregate(
                UserSession::new,
                (userId, activity, session) -> session.addActivity(activity),
                // Merger for combining sessions when late data closes gaps
                (userId, session1, session2) -> session1.merge(session2),
                Materialized.as("user-sessions")
            );

        sessions.toStream()
            .foreach((windowedKey, session) -> {
                System.out.printf("Session for %s: [%d - %d] activities: %d%n",
                    windowedKey.key(),
                    windowedKey.window().start(),
                    windowedKey.window().end(),
                    session.getActivityCount());
            });
    }
}
```

## Reprocessing Historical Data

Handle large amounts of late/historical data:

```java
public class HistoricalReprocessing {
    public static void main(String[] args) {
        Properties props = getConfig();

        // Configure for reprocessing
        props.put(StreamsConfig.CACHE_MAX_BYTES_BUFFERING_CONFIG, 0);
        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 100);

        StreamsBuilder builder = new StreamsBuilder();

        // Use large grace periods for historical data
        TimeWindows historicalWindows = TimeWindows
            .ofSizeAndGrace(
                Duration.ofHours(1),
                Duration.ofDays(7)  // Accept data up to 7 days late
            );

        KStream<String, Event> events = builder.stream("historical-events");

        KTable<Windowed<String>, Long> counts = events
            .groupByKey()
            .windowedBy(historicalWindows)
            .count(
                Materialized.<String, Long, WindowStore<Bytes, byte[]>>as("historical-counts")
                    .withRetention(Duration.ofDays(30))
            );

        // Suppress to get final counts
        counts.suppress(Suppressed.untilWindowCloses(
            BufferConfig.maxBytes(256 * 1024 * 1024)  // 256MB buffer
        ))
        .toStream()
        .to("historical-counts-output");
    }
}
```

## Late Data Correction Pattern

Emit corrections for late data:

```java
public class LateDataCorrection {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Event> events = builder.stream("events");

        // Track both current and previous values
        KTable<Windowed<String>, AggregateWithVersion> aggregates = events
            .groupByKey()
            .windowedBy(TimeWindows.ofSizeAndGrace(
                Duration.ofMinutes(5),
                Duration.ofMinutes(10)
            ))
            .aggregate(
                AggregateWithVersion::new,
                (key, event, agg) -> agg.update(event),
                Materialized.as("versioned-aggregates")
            );

        // Output includes version for consumers to detect updates
        aggregates.toStream()
            .mapValues(agg -> new AggregateOutput(
                agg.getValue(),
                agg.getVersion(),
                agg.isCorrection()
            ))
            .to("aggregate-outputs");
    }
}

class AggregateWithVersion {
    private long value = 0;
    private int version = 0;
    private long lastUpdateTime = 0;

    public AggregateWithVersion update(Event event) {
        value += event.getValue();
        version++;
        lastUpdateTime = System.currentTimeMillis();
        return this;
    }

    public boolean isCorrection() {
        return version > 1;  // Updated after initial emission
    }
}
```

## Monitoring Late Data

```java
public class LateDataMetrics {
    private final Counter onTimeEvents;
    private final Counter lateEvents;
    private final Counter droppedEvents;
    private final Histogram eventLatency;

    public LateDataMetrics(MeterRegistry registry) {
        onTimeEvents = registry.counter("kafka.streams.events.ontime");
        lateEvents = registry.counter("kafka.streams.events.late");
        droppedEvents = registry.counter("kafka.streams.events.dropped");
        eventLatency = registry.histogram("kafka.streams.event.latency");
    }

    public void recordEvent(Event event, boolean wasLate, boolean wasDropped) {
        long latency = System.currentTimeMillis() - event.getTimestamp();
        eventLatency.record(latency);

        if (wasDropped) {
            droppedEvents.increment();
        } else if (wasLate) {
            lateEvents.increment();
        } else {
            onTimeEvents.increment();
        }
    }
}
```

## Best Practices

### 1. Choose Appropriate Grace Periods

```java
// Real-time dashboards: small grace
TimeWindows.ofSizeAndGrace(Duration.ofMinutes(1), Duration.ofSeconds(30))

// Daily reports: larger grace
TimeWindows.ofSizeAndGrace(Duration.ofDays(1), Duration.ofHours(6))

// Financial reconciliation: very large grace
TimeWindows.ofSizeAndGrace(Duration.ofDays(1), Duration.ofDays(3))
```

### 2. Use Suppression Strategically

```java
// For dashboards: emit updates
// No suppression - get frequent updates

// For reports: emit final only
.suppress(Suppressed.untilWindowCloses(BufferConfig.unbounded()))

// For alerting: balance timeliness and accuracy
.suppress(Suppressed.untilTimeLimit(
    Duration.ofSeconds(30),
    BufferConfig.unbounded()
))
```

### 3. Handle Very Late Data Separately

```java
// Route very late data to separate processing
events
    .filter((k, v) -> isVeryLate(v))
    .to("late-data-reprocessing");

// Process in batch later
```

## Summary

| Strategy | Use Case | Trade-off |
|----------|----------|-----------|
| Grace period | Normal late data | Memory vs completeness |
| Suppression | Final results only | Latency vs accuracy |
| Session windows | Activity tracking | Complexity vs accuracy |
| Dead letter queue | Very late data | Manual intervention |
| Corrections | Update downstream | Consumer complexity |

Handle late data by understanding your accuracy requirements and choosing appropriate grace periods. Use suppression for final results and consider separate processing paths for extremely late data.
