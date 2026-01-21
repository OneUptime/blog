# How to Build Windowed Aggregations with Kafka Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Kafka Streams, Windowed Aggregations, Time Windows, Stream Processing, Real-time Analytics

Description: Learn how to implement windowed aggregations in Kafka Streams, including tumbling, hopping, sliding, and session windows for time-based analytics and real-time data processing.

---

Windowed aggregations allow you to group and aggregate events over time periods. Kafka Streams provides several window types for different use cases, from fixed time buckets to dynamic session windows.

## Window Types Overview

```
Tumbling Windows (fixed, non-overlapping):
|-------|-------|-------|
   5m      5m      5m

Hopping Windows (fixed, overlapping):
|-------|
    |-------|
        |-------|
  5m window, 1m advance

Sliding Windows (fixed, event-driven):
Created around each event, includes all events within window duration

Session Windows (dynamic, gap-based):
|---user activity---|   gap   |---more activity---|
     session 1                      session 2
```

## Tumbling Windows

Non-overlapping, fixed-size windows:

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import java.time.Duration;

public class TumblingWindowExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Transaction> transactions = builder.stream("transactions",
            Consumed.with(Serdes.String(), transactionSerde));

        // 5-minute tumbling windows
        TimeWindowedKStream<String, Transaction> windowed = transactions
            .groupByKey()
            .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)));

        // Count transactions per window
        KTable<Windowed<String>, Long> counts = windowed.count(
            Materialized.as("transaction-counts")
        );

        // Sum amounts per window
        KTable<Windowed<String>, Double> totals = windowed.aggregate(
            () -> 0.0,
            (key, transaction, total) -> total + transaction.getAmount(),
            Materialized.<String, Double, WindowStore<Bytes, byte[]>>as("transaction-totals")
                .withValueSerde(Serdes.Double())
        );

        // Output with window info
        counts.toStream()
            .map((windowedKey, count) -> {
                String key = windowedKey.key();
                long windowStart = windowedKey.window().start();
                long windowEnd = windowedKey.window().end();
                return KeyValue.pair(
                    key,
                    String.format("Window [%d-%d]: count=%d", windowStart, windowEnd, count)
                );
            })
            .to("transaction-counts-output");

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}
```

### Tumbling Window with Grace Period

Grace period allows late-arriving events to be included:

```java
// 5-minute windows with 1-minute grace period
TimeWindows windows = TimeWindows
    .ofSizeAndGrace(Duration.ofMinutes(5), Duration.ofMinutes(1));

KTable<Windowed<String>, Long> counts = stream
    .groupByKey()
    .windowedBy(windows)
    .count();
```

## Hopping Windows

Overlapping windows that advance at fixed intervals:

```java
public class HoppingWindowExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Metric> metrics = builder.stream("metrics",
            Consumed.with(Serdes.String(), metricSerde));

        // 10-minute windows, advancing every 1 minute
        // Each event appears in 10 different windows
        HoppingWindows windows = HoppingWindows
            .ofSizeWithNoGrace(Duration.ofMinutes(10))
            .advanceBy(Duration.ofMinutes(1));

        KTable<Windowed<String>, MetricAggregate> aggregates = metrics
            .groupByKey()
            .windowedBy(windows)
            .aggregate(
                MetricAggregate::new,
                (key, metric, agg) -> agg.add(metric),
                Materialized.<String, MetricAggregate, WindowStore<Bytes, byte[]>>as("metric-aggregates")
                    .withValueSerde(metricAggregateSerde)
            );

        // Calculate moving averages
        aggregates.toStream()
            .mapValues(agg -> agg.getAverage())
            .to("metric-averages", Produced.with(windowedStringSerde, Serdes.Double()));

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}

class MetricAggregate {
    private double sum = 0.0;
    private long count = 0;

    public MetricAggregate add(Metric metric) {
        sum += metric.getValue();
        count++;
        return this;
    }

    public double getAverage() {
        return count > 0 ? sum / count : 0.0;
    }
}
```

## Sliding Windows

Windows created around each event - useful for detecting patterns:

```java
public class SlidingWindowExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, LoginAttempt> logins = builder.stream("login-attempts",
            Consumed.with(Serdes.String(), loginAttemptSerde));

        // Detect multiple failed logins within 5 minutes
        SlidingWindows windows = SlidingWindows
            .ofTimeDifferenceAndGrace(Duration.ofMinutes(5), Duration.ofMinutes(1));

        KTable<Windowed<String>, Long> failedLoginCounts = logins
            .filter((key, login) -> !login.isSuccessful())
            .groupBy((key, login) -> login.getUserId())
            .windowedBy(windows)
            .count(Materialized.as("failed-login-counts"));

        // Alert on suspicious activity (more than 5 failed attempts)
        failedLoginCounts.toStream()
            .filter((windowedKey, count) -> count >= 5)
            .mapValues((windowedKey, count) -> new SecurityAlert(
                windowedKey.key(),
                count,
                windowedKey.window().start(),
                windowedKey.window().end()
            ))
            .to("security-alerts", Produced.with(windowedStringSerde, alertSerde));

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}
```

## Session Windows

Dynamic windows based on activity gaps:

```java
public class SessionWindowExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, UserEvent> events = builder.stream("user-events",
            Consumed.with(Serdes.String(), userEventSerde));

        // Session window with 30-minute inactivity gap
        SessionWindows sessionWindows = SessionWindows
            .ofInactivityGapAndGrace(Duration.ofMinutes(30), Duration.ofMinutes(5));

        // Aggregate user sessions
        KTable<Windowed<String>, UserSession> sessions = events
            .groupBy((key, event) -> event.getUserId(),
                Grouped.with(Serdes.String(), userEventSerde))
            .windowedBy(sessionWindows)
            .aggregate(
                UserSession::new,
                // Aggregator - add event to session
                (userId, event, session) -> session.addEvent(event),
                // Session merger - combine sessions when gap closes
                (userId, session1, session2) -> session1.merge(session2),
                Materialized.<String, UserSession, SessionStore<Bytes, byte[]>>as("user-sessions")
                    .withValueSerde(userSessionSerde)
            );

        // Output completed sessions
        sessions.toStream()
            .map((windowedKey, session) -> {
                String userId = windowedKey.key();
                long sessionStart = windowedKey.window().start();
                long sessionEnd = windowedKey.window().end();
                return KeyValue.pair(userId, new SessionSummary(
                    userId,
                    sessionStart,
                    sessionEnd,
                    session.getEventCount(),
                    session.getPageViews()
                ));
            })
            .to("session-summaries");

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}

class UserSession {
    private List<UserEvent> events = new ArrayList<>();
    private int pageViews = 0;

    public UserSession addEvent(UserEvent event) {
        events.add(event);
        if (event.getType().equals("page_view")) {
            pageViews++;
        }
        return this;
    }

    public UserSession merge(UserSession other) {
        events.addAll(other.events);
        pageViews += other.pageViews;
        return this;
    }

    public int getEventCount() {
        return events.size();
    }

    public int getPageViews() {
        return pageViews;
    }
}
```

## Suppression for Final Results

Emit only final window results, not intermediate updates:

```java
import static org.apache.kafka.streams.kstream.Suppressed.*;

public class SuppressedWindowExample {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<String, Sale> sales = builder.stream("sales");

        // Daily sales totals - emit only final result
        KTable<Windowed<String>, Double> dailyTotals = sales
            .groupByKey()
            .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofDays(1)))
            .aggregate(
                () -> 0.0,
                (key, sale, total) -> total + sale.getAmount(),
                Materialized.<String, Double, WindowStore<Bytes, byte[]>>as("daily-sales")
                    .withValueSerde(Serdes.Double())
            )
            // Suppress until window closes
            .suppress(Suppressed.untilWindowCloses(unbounded()));

        // Only emits once per window when it closes
        dailyTotals.toStream().to("daily-sales-final");

        KafkaStreams streams = new KafkaStreams(builder.build(), getConfig());
        streams.start();
    }
}
```

### Suppression with Buffer Limits

```java
// Suppress with memory limits
.suppress(Suppressed.untilWindowCloses(
    BufferConfig.maxRecords(10000)
        .maxBytes(64 * 1024 * 1024) // 64MB
        .emitEarlyWhenFull() // Emit if buffer fills before window closes
))

// Suppress until time limit (for session windows)
.suppress(Suppressed.untilTimeLimit(
    Duration.ofMinutes(5),
    BufferConfig.unbounded()
))
```

## Querying Windowed Stores

```java
public class WindowedStoreQuery {
    private final KafkaStreams streams;

    public WindowedStoreQuery(KafkaStreams streams) {
        this.streams = streams;
    }

    // Query specific time range
    public List<WindowedCount> getCountsInTimeRange(
        String key,
        Instant from,
        Instant to
    ) {
        ReadOnlyWindowStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "transaction-counts",
                QueryableStoreTypes.windowStore()
            )
        );

        List<WindowedCount> results = new ArrayList<>();
        try (WindowStoreIterator<Long> iterator = store.fetch(key, from, to)) {
            while (iterator.hasNext()) {
                KeyValue<Long, Long> entry = iterator.next();
                results.add(new WindowedCount(key, entry.key, entry.value));
            }
        }
        return results;
    }

    // Query all keys for a time range
    public Map<String, Long> getAllCountsForWindow(Instant windowStart) {
        ReadOnlyWindowStore<String, Long> store = streams.store(
            StoreQueryParameters.fromNameAndType(
                "transaction-counts",
                QueryableStoreTypes.windowStore()
            )
        );

        Map<String, Long> results = new HashMap<>();
        Instant windowEnd = windowStart.plus(Duration.ofMinutes(5));

        try (KeyValueIterator<Windowed<String>, Long> iterator =
                store.fetchAll(windowStart, windowEnd)) {
            while (iterator.hasNext()) {
                KeyValue<Windowed<String>, Long> entry = iterator.next();
                results.put(entry.key.key(), entry.value);
            }
        }
        return results;
    }
}

record WindowedCount(String key, long windowStart, long count) {}
```

## Session Store Queries

```java
public List<SessionInfo> getUserSessions(String userId, Instant from, Instant to) {
    ReadOnlySessionStore<String, UserSession> store = streams.store(
        StoreQueryParameters.fromNameAndType(
            "user-sessions",
            QueryableStoreTypes.sessionStore()
        )
    );

    List<SessionInfo> results = new ArrayList<>();
    try (KeyValueIterator<Windowed<String>, UserSession> iterator =
            store.fetch(userId)) {
        while (iterator.hasNext()) {
            KeyValue<Windowed<String>, UserSession> entry = iterator.next();
            Window window = entry.key.window();

            if (window.start() >= from.toEpochMilli() &&
                window.end() <= to.toEpochMilli()) {
                results.add(new SessionInfo(
                    userId,
                    Instant.ofEpochMilli(window.start()),
                    Instant.ofEpochMilli(window.end()),
                    entry.value.getEventCount()
                ));
            }
        }
    }
    return results;
}
```

## Custom Window Implementation

```java
import org.apache.kafka.streams.kstream.Windows;
import org.apache.kafka.streams.kstream.internals.TimeWindow;

// Business hours window - 9 AM to 5 PM
public class BusinessHoursWindows extends Windows<TimeWindow> {
    private final ZoneId timezone;

    public BusinessHoursWindows(ZoneId timezone) {
        this.timezone = timezone;
    }

    @Override
    public Map<Long, TimeWindow> windowsFor(long timestamp) {
        ZonedDateTime dateTime = Instant.ofEpochMilli(timestamp)
            .atZone(timezone);

        // Get business day start (9 AM)
        ZonedDateTime dayStart = dateTime
            .withHour(9).withMinute(0).withSecond(0).withNano(0);

        // Get business day end (5 PM)
        ZonedDateTime dayEnd = dateTime
            .withHour(17).withMinute(0).withSecond(0).withNano(0);

        // If timestamp is within business hours
        if (dateTime.getHour() >= 9 && dateTime.getHour() < 17) {
            Map<Long, TimeWindow> windows = new HashMap<>();
            windows.put(
                dayStart.toInstant().toEpochMilli(),
                new TimeWindow(
                    dayStart.toInstant().toEpochMilli(),
                    dayEnd.toInstant().toEpochMilli()
                )
            );
            return windows;
        }

        return Collections.emptyMap();
    }

    @Override
    public long size() {
        return Duration.ofHours(8).toMillis();
    }

    @Override
    public long gracePeriodMs() {
        return Duration.ofMinutes(30).toMillis();
    }
}
```

## Best Practices

### 1. Choose Appropriate Window Size

```java
// Real-time dashboards: small windows
TimeWindows.ofSizeWithNoGrace(Duration.ofSeconds(10))

// Hourly reports: larger windows
TimeWindows.ofSizeWithNoGrace(Duration.ofHours(1))

// Daily aggregations: use suppression
TimeWindows.ofSizeWithNoGrace(Duration.ofDays(1))
    .suppress(untilWindowCloses(unbounded()))
```

### 2. Handle Late Data

```java
// Allow 5 minutes of late data
TimeWindows.ofSizeAndGrace(
    Duration.ofMinutes(10),
    Duration.ofMinutes(5)
)

// For session windows
SessionWindows.ofInactivityGapAndGrace(
    Duration.ofMinutes(30),
    Duration.ofMinutes(10)
)
```

### 3. Configure Retention

```java
Materialized.<String, Long, WindowStore<Bytes, byte[]>>as("my-window-store")
    .withRetention(Duration.ofDays(7)) // Keep 7 days of windows
    .withValueSerde(Serdes.Long())
```

## Summary

| Window Type | Use Case | Overlap |
|-------------|----------|---------|
| Tumbling | Fixed-period aggregations | No |
| Hopping | Moving averages, smoothing | Yes |
| Sliding | Event-driven analysis | Yes |
| Session | User activity tracking | Dynamic |

Choose the right window type based on your analytics requirements. Use suppression for final results and appropriate grace periods for late data handling.
