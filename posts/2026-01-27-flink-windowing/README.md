# How to Implement Flink Windowing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Flink, Stream Processing, Windowing, Real-Time Analytics, Java, Big Data

Description: A comprehensive guide to implementing window-based stream processing in Apache Flink, covering tumbling, sliding, session, and global windows with triggers, evictors, and late data handling.

---

> Windows are the backbone of stateful stream processing. They let you group unbounded streams into finite chunks for aggregation, analysis, and action. Master windowing, and you master real-time analytics.

Stream processing deals with infinite data flows. Unlike batch processing where you know the dataset boundaries, streams never end. Windows solve this by creating logical boundaries that let you perform computations over finite subsets of your data. Apache Flink provides one of the most powerful and flexible windowing systems in the stream processing ecosystem.

This guide covers everything you need to implement production-ready windowing in Flink: window types, window functions, triggers, evictors, watermarks, and handling late data.

---

## Table of Contents

1. Window Fundamentals
2. Tumbling Windows
3. Sliding Windows
4. Session Windows
5. Global Windows
6. Window Functions
7. Triggers
8. Evictors
9. Watermarks and Windows
10. Late Data Handling
11. Best Practices Summary

---

## 1. Window Fundamentals

Before diving into specific window types, understand the core concepts:

| Concept | Description |
|---------|-------------|
| Window | A finite view over an unbounded stream, defined by time or count |
| Window Assigner | Determines which window(s) an element belongs to |
| Window Function | The computation applied to elements within a window |
| Trigger | Decides when a window is ready to be processed |
| Evictor | Optionally removes elements from a window before/after processing |
| Allowed Lateness | Grace period for late-arriving elements after window closes |

Windows can be keyed or non-keyed:

```java
// Keyed window - partitions by key, then applies window
stream
    .keyBy(event -> event.getUserId())
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .sum("amount");

// Non-keyed window - all elements go to single window (parallelism = 1)
stream
    .windowAll(TumblingEventTimeWindows.of(Time.minutes(5)))
    .sum("amount");
```

Always prefer keyed windows for parallelism and scalability.

---

## 2. Tumbling Windows

Tumbling windows are fixed-size, non-overlapping windows. Each element belongs to exactly one window.

```
Time:    |----0----|----1----|----2----|----3----|
Window:  [   W1    ][   W2    ][   W3    ][   W4   ]
```

### Event-Time Tumbling Window

```java
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

// Define the data stream with timestamps and watermarks
DataStream<SensorReading> readings = env
    .addSource(new SensorSource())
    .assignTimestampsAndWatermarks(
        WatermarkStrategy
            .<SensorReading>forBoundedOutOfOrderness(Duration.ofSeconds(5))
            .withTimestampAssigner((event, timestamp) -> event.getTimestamp())
    );

// Apply 1-minute tumbling window
DataStream<SensorReading> avgReadings = readings
    .keyBy(SensorReading::getSensorId)
    // Creates non-overlapping 1-minute windows based on event time
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .aggregate(new AverageAggregate());
```

### Processing-Time Tumbling Window

```java
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;

// Processing time uses wall-clock time of the Flink operator
DataStream<Transaction> hourlyTotals = transactions
    .keyBy(Transaction::getAccountId)
    // Window based on when Flink processes the event, not when it occurred
    .window(TumblingProcessingTimeWindows.of(Time.hours(1)))
    .sum("amount");
```

### Window Offset

Align windows to custom boundaries (e.g., start at 15 minutes past the hour):

```java
// Default: windows start at epoch (00:00, 01:00, 02:00...)
// With offset: windows start at 00:15, 01:15, 02:15...
DataStream<Stats> aligned = stream
    .keyBy(Event::getRegion)
    .window(TumblingEventTimeWindows.of(
        Time.hours(1),           // window size
        Time.minutes(15)         // offset from epoch
    ))
    .process(new StatsFunction());
```

---

## 3. Sliding Windows

Sliding windows have a fixed size but can overlap. An element may belong to multiple windows.

```
Time:     |----0----|----1----|----2----|----3----|
Window 1: [    W1 (size=2)    ]
Window 2:           [    W2 (size=2)    ]
Window 3:                     [    W3 (size=2)    ]
Slide: 1
```

### Event-Time Sliding Window

```java
import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;

// Calculate rolling 5-minute average, updated every 1 minute
// Each event will be assigned to 5 different windows
DataStream<MetricAvg> rollingAvg = metrics
    .keyBy(Metric::getServiceName)
    .window(SlidingEventTimeWindows.of(
        Time.minutes(5),    // window size
        Time.minutes(1)     // slide interval
    ))
    .aggregate(new AverageAggregate());
```

### Sliding Window Use Cases

```java
// Real-time alerting: 10-second windows sliding every 1 second
// Detect if error rate exceeds threshold in any 10-second period
DataStream<Alert> alerts = errorEvents
    .keyBy(ErrorEvent::getServiceId)
    .window(SlidingEventTimeWindows.of(
        Time.seconds(10),   // look at last 10 seconds
        Time.seconds(1)     // check every second
    ))
    .aggregate(new ErrorRateAggregate())
    .filter(rate -> rate.getErrorRate() > 0.05)  // >5% error rate
    .map(rate -> new Alert(rate.getServiceId(), "High error rate"));
```

**Caution**: Sliding windows with small slide intervals relative to window size create many overlapping windows, increasing memory usage. If `windowSize / slideInterval = N`, each element is stored in N windows.

---

## 4. Session Windows

Session windows group elements by activity. A window closes when there is a gap of inactivity (no events) exceeding the defined timeout.

```
Events:   E1  E2     E3  E4  E5          E6  E7
Gap:           <gap>              <gap>
Sessions: [  S1   ]  [    S2    ]        [ S3  ]
```

### Static Session Gap

```java
import org.apache.flink.streaming.api.windowing.assigners.EventTimeSessionWindows;

// Group user clickstream into sessions
// Session ends after 30 minutes of inactivity
DataStream<UserSession> sessions = clicks
    .keyBy(ClickEvent::getUserId)
    .window(EventTimeSessionWindows.withGap(Time.minutes(30)))
    .process(new SessionAggregator());
```

### Dynamic Session Gap

Different keys can have different session timeouts:

```java
import org.apache.flink.streaming.api.windowing.assigners.EventTimeSessionWindows;
import org.apache.flink.streaming.api.windowing.assigners.SessionWindowTimeGapExtractor;

// Premium users get longer session timeout
DataStream<UserSession> sessions = clicks
    .keyBy(ClickEvent::getUserId)
    .window(EventTimeSessionWindows.withDynamicGap(
        new SessionWindowTimeGapExtractor<ClickEvent>() {
            @Override
            public long extract(ClickEvent event) {
                // Return gap in milliseconds
                if (event.isPremiumUser()) {
                    return Time.hours(1).toMilliseconds();
                }
                return Time.minutes(30).toMilliseconds();
            }
        }
    ))
    .process(new SessionAggregator());
```

### Session Window Process Function

```java
// Comprehensive session analysis
public class SessionAggregator
    extends ProcessWindowFunction<ClickEvent, UserSession, String, TimeWindow> {

    @Override
    public void process(
            String userId,
            Context context,
            Iterable<ClickEvent> events,
            Collector<UserSession> out) {

        // Collect all events in the session
        List<ClickEvent> eventList = new ArrayList<>();
        for (ClickEvent event : events) {
            eventList.add(event);
        }

        // Sort by timestamp
        eventList.sort(Comparator.comparing(ClickEvent::getTimestamp));

        // Build session summary
        UserSession session = UserSession.builder()
            .userId(userId)
            .sessionStart(context.window().getStart())
            .sessionEnd(context.window().getEnd())
            .eventCount(eventList.size())
            .firstEvent(eventList.get(0))
            .lastEvent(eventList.get(eventList.size() - 1))
            .pageViews(countPageViews(eventList))
            .build();

        out.collect(session);
    }
}
```

---

## 5. Global Windows

Global windows assign all elements to a single, never-ending window. You must define a custom trigger; otherwise, no computation ever fires.

```java
import org.apache.flink.streaming.api.windowing.assigners.GlobalWindows;
import org.apache.flink.streaming.api.windowing.triggers.CountTrigger;

// Trigger computation every 100 elements per key
DataStream<BatchResult> batched = events
    .keyBy(Event::getCategory)
    .window(GlobalWindows.create())
    .trigger(CountTrigger.of(100))  // Required: without trigger, window never fires
    .process(new BatchProcessor());
```

### Custom Global Window Trigger

```java
// Fire on count OR timeout, whichever comes first
public class CountOrTimeoutTrigger<T> extends Trigger<T, GlobalWindow> {

    private final long maxCount;
    private final long timeoutMs;
    private final ValueStateDescriptor<Long> countDesc =
        new ValueStateDescriptor<>("count", Long.class);

    public CountOrTimeoutTrigger(long maxCount, long timeoutMs) {
        this.maxCount = maxCount;
        this.timeoutMs = timeoutMs;
    }

    @Override
    public TriggerResult onElement(T element, long timestamp,
            GlobalWindow window, TriggerContext ctx) throws Exception {

        // Increment count
        ValueState<Long> countState = ctx.getPartitionedState(countDesc);
        Long count = countState.value();
        count = (count == null) ? 1L : count + 1;
        countState.update(count);

        // Register timeout timer on first element
        if (count == 1) {
            ctx.registerProcessingTimeTimer(
                ctx.getCurrentProcessingTime() + timeoutMs
            );
        }

        // Fire if count threshold reached
        if (count >= maxCount) {
            countState.clear();
            return TriggerResult.FIRE_AND_PURGE;
        }

        return TriggerResult.CONTINUE;
    }

    @Override
    public TriggerResult onProcessingTime(long time,
            GlobalWindow window, TriggerContext ctx) throws Exception {
        // Fire on timeout
        ctx.getPartitionedState(countDesc).clear();
        return TriggerResult.FIRE_AND_PURGE;
    }

    @Override
    public TriggerResult onEventTime(long time,
            GlobalWindow window, TriggerContext ctx) {
        return TriggerResult.CONTINUE;
    }

    @Override
    public void clear(GlobalWindow window, TriggerContext ctx) throws Exception {
        ctx.getPartitionedState(countDesc).clear();
    }
}
```

---

## 6. Window Functions

Window functions define the computation applied to window contents. Flink provides three types with different trade-offs:

| Function Type | Incremental | Access to All Elements | Metadata Access |
|---------------|-------------|------------------------|-----------------|
| ReduceFunction | Yes | No | No |
| AggregateFunction | Yes | No | No |
| ProcessWindowFunction | No | Yes | Yes |

### ReduceFunction

Most efficient for simple reductions with same input/output type:

```java
// Sum transaction amounts per account
DataStream<Transaction> totals = transactions
    .keyBy(Transaction::getAccountId)
    .window(TumblingEventTimeWindows.of(Time.hours(1)))
    .reduce(new ReduceFunction<Transaction>() {
        @Override
        public Transaction reduce(Transaction t1, Transaction t2) {
            // Combine two transactions into one
            return new Transaction(
                t1.getAccountId(),
                t1.getAmount() + t2.getAmount(),
                Math.max(t1.getTimestamp(), t2.getTimestamp())
            );
        }
    });
```

### AggregateFunction

More flexible with separate accumulator type:

```java
// Calculate average with count tracking
public class AverageAggregate
    implements AggregateFunction<SensorReading, AverageAccumulator, Double> {

    // Accumulator holds running sum and count
    public static class AverageAccumulator {
        public double sum = 0;
        public long count = 0;
    }

    @Override
    public AverageAccumulator createAccumulator() {
        return new AverageAccumulator();
    }

    @Override
    public AverageAccumulator add(SensorReading reading, AverageAccumulator acc) {
        acc.sum += reading.getValue();
        acc.count++;
        return acc;
    }

    @Override
    public Double getResult(AverageAccumulator acc) {
        return acc.count > 0 ? acc.sum / acc.count : 0.0;
    }

    @Override
    public AverageAccumulator merge(AverageAccumulator a, AverageAccumulator b) {
        a.sum += b.sum;
        a.count += b.count;
        return a;
    }
}

// Usage
DataStream<Double> averages = readings
    .keyBy(SensorReading::getSensorId)
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .aggregate(new AverageAggregate());
```

### ProcessWindowFunction

Full access to window contents and metadata:

```java
public class StatisticsFunction
    extends ProcessWindowFunction<SensorReading, Statistics, String, TimeWindow> {

    @Override
    public void process(
            String sensorId,
            Context context,
            Iterable<SensorReading> readings,
            Collector<Statistics> out) {

        // Access window metadata
        long windowStart = context.window().getStart();
        long windowEnd = context.window().getEnd();

        // Calculate statistics over all elements
        DoubleSummaryStatistics stats = StreamSupport
            .stream(readings.spliterator(), false)
            .mapToDouble(SensorReading::getValue)
            .summaryStatistics();

        out.collect(new Statistics(
            sensorId,
            windowStart,
            windowEnd,
            stats.getMin(),
            stats.getMax(),
            stats.getAverage(),
            stats.getCount()
        ));
    }
}
```

### Combining Aggregate with Process

Get both incremental aggregation efficiency and window metadata:

```java
// Incremental aggregation + window metadata access
DataStream<EnrichedResult> results = readings
    .keyBy(SensorReading::getSensorId)
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .aggregate(
        new AverageAggregate(),  // Incremental pre-aggregation
        new ProcessWindowFunction<Double, EnrichedResult, String, TimeWindow>() {
            @Override
            public void process(String key, Context ctx,
                    Iterable<Double> avgValues, Collector<EnrichedResult> out) {
                Double avg = avgValues.iterator().next();
                out.collect(new EnrichedResult(
                    key,
                    avg,
                    ctx.window().getStart(),
                    ctx.window().getEnd()
                ));
            }
        }
    );
```

---

## 7. Triggers

Triggers determine when a window's contents should be processed. The default trigger fires when the watermark passes the window end time.

### Built-in Triggers

| Trigger | Description |
|---------|-------------|
| EventTimeTrigger | Fires when watermark passes window end (default for event-time windows) |
| ProcessingTimeTrigger | Fires when processing time passes window end (default for processing-time windows) |
| CountTrigger | Fires after N elements |
| PurgingTrigger | Wraps another trigger and purges window after firing |
| ContinuousEventTimeTrigger | Fires periodically based on event time |
| ContinuousProcessingTimeTrigger | Fires periodically based on processing time |

### Custom Trigger Example

```java
// Trigger that fires early for important events
public class ImportantEventTrigger extends Trigger<Event, TimeWindow> {

    @Override
    public TriggerResult onElement(Event event, long timestamp,
            TimeWindow window, TriggerContext ctx) {

        // Fire immediately for critical events
        if (event.getPriority() == Priority.CRITICAL) {
            return TriggerResult.FIRE;  // Fire but keep window contents
        }

        // Register event-time timer for window end
        ctx.registerEventTimeTimer(window.maxTimestamp());
        return TriggerResult.CONTINUE;
    }

    @Override
    public TriggerResult onEventTime(long time,
            TimeWindow window, TriggerContext ctx) {
        // Fire and purge at window end
        if (time == window.maxTimestamp()) {
            return TriggerResult.FIRE_AND_PURGE;
        }
        return TriggerResult.CONTINUE;
    }

    @Override
    public TriggerResult onProcessingTime(long time,
            TimeWindow window, TriggerContext ctx) {
        return TriggerResult.CONTINUE;
    }

    @Override
    public void clear(TimeWindow window, TriggerContext ctx) {
        ctx.deleteEventTimeTimer(window.maxTimestamp());
    }
}

// Usage
DataStream<Alert> alerts = events
    .keyBy(Event::getDeviceId)
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .trigger(new ImportantEventTrigger())
    .process(new AlertGenerator());
```

### Trigger Results

| Result | Action |
|--------|--------|
| CONTINUE | Do nothing, wait for more elements |
| FIRE | Process window contents, keep window state |
| PURGE | Discard window contents without processing |
| FIRE_AND_PURGE | Process and then discard window contents |

---

## 8. Evictors

Evictors remove elements from a window before (pre-eviction) or after (post-eviction) the window function is applied.

### Built-in Evictors

```java
import org.apache.flink.streaming.api.windowing.evictors.*;

// Keep only recent elements by count
DataStream<Result> countEvicted = stream
    .keyBy(Event::getKey)
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .evictor(CountEvictor.of(1000))  // Keep max 1000 elements
    .process(new WindowProcessor());

// Keep only recent elements by time
DataStream<Result> timeEvicted = stream
    .keyBy(Event::getKey)
    .window(GlobalWindows.create())
    .trigger(CountTrigger.of(100))
    .evictor(TimeEvictor.of(Time.minutes(5)))  // Keep only last 5 minutes
    .process(new WindowProcessor());

// Remove elements above threshold
DataStream<Result> deltaEvicted = stream
    .keyBy(Event::getKey)
    .window(TumblingEventTimeWindows.of(Time.hours(1)))
    .evictor(DeltaEvictor.of(
        100.0,  // threshold
        new DeltaFunction<Event>() {
            @Override
            public double getDelta(Event oldEvent, Event newEvent) {
                return Math.abs(newEvent.getValue() - oldEvent.getValue());
            }
        }
    ))
    .process(new WindowProcessor());
```

### Custom Evictor

```java
// Evictor that removes outliers before processing
public class OutlierEvictor implements Evictor<SensorReading, TimeWindow> {

    private final double stdDevThreshold;

    public OutlierEvictor(double stdDevThreshold) {
        this.stdDevThreshold = stdDevThreshold;
    }

    @Override
    public void evictBefore(Iterable<TimestampedValue<SensorReading>> elements,
            int size, TimeWindow window, EvictorContext ctx) {

        // Calculate mean and standard deviation
        DoubleSummaryStatistics stats = StreamSupport
            .stream(elements.spliterator(), false)
            .mapToDouble(e -> e.getValue().getValue())
            .summaryStatistics();

        double mean = stats.getAverage();
        double variance = StreamSupport
            .stream(elements.spliterator(), false)
            .mapToDouble(e -> Math.pow(e.getValue().getValue() - mean, 2))
            .average()
            .orElse(0);
        double stdDev = Math.sqrt(variance);

        // Remove elements outside threshold
        Iterator<TimestampedValue<SensorReading>> iterator = elements.iterator();
        while (iterator.hasNext()) {
            TimestampedValue<SensorReading> element = iterator.next();
            double zScore = Math.abs(element.getValue().getValue() - mean) / stdDev;
            if (zScore > stdDevThreshold) {
                iterator.remove();
            }
        }
    }

    @Override
    public void evictAfter(Iterable<TimestampedValue<SensorReading>> elements,
            int size, TimeWindow window, EvictorContext ctx) {
        // No post-eviction needed
    }
}
```

**Warning**: Evictors prevent some optimizations. Flink cannot use incremental aggregation (ReduceFunction/AggregateFunction pre-aggregation) with evictors because elements might be removed before processing.

---

## 9. Watermarks and Windows

Watermarks are the mechanism that tracks event-time progress. They tell Flink that no more events with timestamp less than the watermark should arrive.

### Watermark Strategies

```java
import org.apache.flink.api.common.eventtime.*;

// Strategy 1: Bounded out-of-orderness (most common)
// Assumes events can be up to 5 seconds late
WatermarkStrategy<Event> bounded = WatermarkStrategy
    .<Event>forBoundedOutOfOrderness(Duration.ofSeconds(5))
    .withTimestampAssigner((event, timestamp) -> event.getEventTime());

// Strategy 2: Monotonously increasing timestamps
// For perfectly ordered streams (rare in practice)
WatermarkStrategy<Event> monotonous = WatermarkStrategy
    .<Event>forMonotonousTimestamps()
    .withTimestampAssigner((event, timestamp) -> event.getEventTime());

// Strategy 3: Custom watermark generator
WatermarkStrategy<Event> custom = WatermarkStrategy
    .<Event>forGenerator(ctx -> new CustomWatermarkGenerator())
    .withTimestampAssigner((event, timestamp) -> event.getEventTime());
```

### Custom Watermark Generator

```java
public class CustomWatermarkGenerator
    implements WatermarkGenerator<Event> {

    private long maxTimestamp = Long.MIN_VALUE;
    private final long maxOutOfOrderness = 5000; // 5 seconds

    @Override
    public void onEvent(Event event, long eventTimestamp,
            WatermarkOutput output) {
        // Track maximum timestamp seen
        maxTimestamp = Math.max(maxTimestamp, eventTimestamp);

        // Optionally emit watermark on every event
        // output.emitWatermark(new Watermark(maxTimestamp - maxOutOfOrderness));
    }

    @Override
    public void onPeriodicEmit(WatermarkOutput output) {
        // Called periodically (default: every 200ms)
        // Emit watermark based on max timestamp seen
        output.emitWatermark(new Watermark(maxTimestamp - maxOutOfOrderness));
    }
}
```

### Watermark Alignment Across Sources

```java
// Handle idle sources that stop emitting
WatermarkStrategy<Event> withIdleness = WatermarkStrategy
    .<Event>forBoundedOutOfOrderness(Duration.ofSeconds(5))
    .withTimestampAssigner((event, ts) -> event.getEventTime())
    .withIdleness(Duration.ofMinutes(1));  // Mark source idle after 1 min
```

### How Watermarks Affect Windows

```
Event Time:     1  2  3  4  5  6  7  8  9  10
Events:         E  E     E  E     E     E  E
Watermark:            W(3)     W(6)        W(9)
Window [0-5]:   [E  E     E  E]  -> fires when W(5) arrives
Window [5-10]:                  [E     E  E] -> fires when W(10) arrives
```

A window fires when the watermark passes `window.maxTimestamp()`. For a window `[0, 5)`, this is timestamp `4999` (exclusive end).

---

## 10. Late Data Handling

Even with watermarks, data can arrive late. Flink provides mechanisms to handle this.

### Allowed Lateness

```java
// Allow late events up to 1 minute after window closes
DataStream<Result> results = events
    .keyBy(Event::getKey)
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .allowedLateness(Time.minutes(1))  // Accept late data
    .aggregate(new SumAggregate());
```

With allowed lateness:
- Window fires when watermark passes window end (normal trigger)
- Window state is retained for the allowed lateness period
- Late events trigger recomputation and emit updated results
- After lateness period, window state is purged and late events are dropped

### Side Output for Late Data

```java
// Capture late events in a side output
final OutputTag<Event> lateTag = new OutputTag<Event>("late-events"){};

SingleOutputStreamOperator<Result> results = events
    .keyBy(Event::getKey)
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .allowedLateness(Time.minutes(1))
    .sideOutputLateData(lateTag)  // Route late events to side output
    .process(new WindowProcessor());

// Process late events separately
DataStream<Event> lateEvents = results.getSideOutput(lateTag);
lateEvents.addSink(new LateEventHandler());
```

### Complete Late Data Handling Pattern

```java
public class RobustWindowingPipeline {

    private static final OutputTag<Transaction> LATE_DATA =
        new OutputTag<Transaction>("late-data"){};

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env =
            StreamExecutionEnvironment.getExecutionEnvironment();

        // Source with watermarks
        DataStream<Transaction> transactions = env
            .addSource(new TransactionSource())
            .assignTimestampsAndWatermarks(
                WatermarkStrategy
                    .<Transaction>forBoundedOutOfOrderness(Duration.ofSeconds(10))
                    .withTimestampAssigner((tx, ts) -> tx.getTimestamp())
                    .withIdleness(Duration.ofMinutes(5))
            );

        // Windowed aggregation with late data handling
        SingleOutputStreamOperator<HourlyTotal> totals = transactions
            .keyBy(Transaction::getAccountId)
            .window(TumblingEventTimeWindows.of(Time.hours(1)))
            .allowedLateness(Time.minutes(30))  // 30-minute grace period
            .sideOutputLateData(LATE_DATA)
            .aggregate(
                new TotalAmountAggregate(),
                new EnrichWithWindowMetadata()
            );

        // Main output: windowed totals (may include updates from late data)
        totals.addSink(new TotalsSink());

        // Side output: events that arrived after the grace period
        // Log for investigation or reprocess in batch
        DataStream<Transaction> lateTransactions = totals.getSideOutput(LATE_DATA);
        lateTransactions
            .map(tx -> "LATE: " + tx.toString())
            .addSink(new LogSink());

        env.execute("Robust Windowing Pipeline");
    }
}
```

### Late Data Decision Matrix

| Scenario | Strategy |
|----------|----------|
| Minimal lateness tolerance | No allowed lateness, drop late data |
| Accept some corrections | Set allowed lateness, emit updates |
| Need to audit late data | Use side output + allowed lateness |
| Zero data loss requirement | Side output to durable storage, batch reprocess |

---

## 11. Best Practices Summary

### Window Selection

1. **Tumbling windows** for non-overlapping aggregations (hourly reports, daily summaries)
2. **Sliding windows** for moving averages and trend detection (alerting, monitoring)
3. **Session windows** for user activity grouping (web analytics, user behavior)
4. **Global windows** only when you need full control with custom triggers

### Performance Optimization

1. **Prefer keyed windows** over `windowAll` for parallelism
2. **Use incremental aggregation** (ReduceFunction/AggregateFunction) when possible
3. **Avoid evictors** unless absolutely necessary (they disable pre-aggregation)
4. **Set appropriate parallelism** based on key cardinality
5. **Monitor window state size** to prevent memory issues

### Watermark Configuration

1. **Set bounded out-of-orderness** based on observed data lateness
2. **Configure idleness timeout** for sources that may stop emitting
3. **Start conservative** (higher out-of-orderness) and tune down based on late data rates

### Late Data Handling

1. **Always consider late data** in production systems
2. **Use side outputs** to capture and audit late events
3. **Balance lateness tolerance** against state retention costs
4. **Document your lateness guarantees** for downstream consumers

### Code Organization

```java
// Good: Separate concerns, reusable components
public class TransactionPipeline {

    private static final Time WINDOW_SIZE = Time.hours(1);
    private static final Duration MAX_LATENESS = Duration.ofMinutes(30);
    private static final Duration WATERMARK_DELAY = Duration.ofSeconds(10);

    public DataStream<HourlyTotal> buildPipeline(
            DataStream<Transaction> source) {
        return source
            .assignTimestampsAndWatermarks(createWatermarkStrategy())
            .keyBy(Transaction::getAccountId)
            .window(TumblingEventTimeWindows.of(WINDOW_SIZE))
            .allowedLateness(Time.milliseconds(MAX_LATENESS.toMillis()))
            .aggregate(new TotalAggregate(), new WindowEnricher());
    }

    private WatermarkStrategy<Transaction> createWatermarkStrategy() {
        return WatermarkStrategy
            .<Transaction>forBoundedOutOfOrderness(WATERMARK_DELAY)
            .withTimestampAssigner((tx, ts) -> tx.getTimestamp())
            .withIdleness(Duration.ofMinutes(5));
    }
}
```

### Testing Windows

```java
// Use MiniClusterWithClientResource for integration tests
@Test
public void testTumblingWindow() throws Exception {
    StreamExecutionEnvironment env =
        StreamExecutionEnvironment.getExecutionEnvironment();
    env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime);

    // Use test harness for unit testing window functions
    TumblingEventTimeWindows assigner =
        TumblingEventTimeWindows.of(Time.seconds(5));

    // Create test events with timestamps
    List<Event> testEvents = Arrays.asList(
        new Event("key1", 1000L, 10.0),
        new Event("key1", 2000L, 20.0),
        new Event("key1", 4000L, 30.0)
    );

    // Verify window assignment
    for (Event event : testEvents) {
        Collection<TimeWindow> windows =
            assigner.assignWindows(event, event.getTimestamp(), null);
        assertEquals(1, windows.size());
        TimeWindow window = windows.iterator().next();
        assertEquals(0, window.getStart());
        assertEquals(5000, window.getEnd());
    }
}
```

---

## Summary

Flink windowing is powerful but requires understanding the interplay between window assigners, triggers, watermarks, and late data handling. Start simple with tumbling windows and built-in triggers, then add complexity as needed.

Key takeaways:
- Choose window type based on your aggregation semantics
- Always configure watermarks for event-time processing
- Plan for late data from the start
- Use incremental aggregation for performance
- Test windows thoroughly with various timing scenarios

---

*Need to monitor your Flink jobs and track windowing metrics? [OneUptime](https://oneuptime.com) provides real-time observability for your stream processing pipelines with metrics, traces, and alerting.*
