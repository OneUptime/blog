# How to Use Stateful Processing in Apache Beam for Session Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Apache Beam, Stateful Processing, Streaming

Description: Learn how to use stateful and timely processing in Apache Beam to build session analysis pipelines that track user behavior across events in Dataflow.

---

Session analysis is about understanding what users do during a visit to your application. How many pages did they view? What was the sequence of actions? How long between actions? Did they convert?

You might think session windows alone handle this, but they only group events - they do not let you maintain running state across those events. For true session analysis, you need stateful processing. This lets your DoFn remember information from previous elements and use it when processing new ones.

## What is Stateful Processing?

In a normal DoFn, each element is processed independently. You have no access to what came before. Stateful processing changes this by giving your DoFn access to persistent state that survives across elements for the same key.

For session analysis, this means you can track things like:
- Running count of events in a session
- The sequence of pages visited
- Time since last activity
- Whether a conversion happened

## Setting Up State Specs

You declare state variables using `@StateId` annotations. Each state variable has a specific type that determines what kind of data it stores.

```java
// Stateful DoFn that tracks user session metrics
public class SessionAnalysisFn
    extends DoFn<KV<String, UserEvent>, SessionSummary> {

    // State: total event count in the session
    @StateId("eventCount")
    private final StateSpec<ValueState<Integer>> eventCountSpec =
        StateSpecs.value(VarIntCoder.of());

    // State: timestamp of the first event in the session
    @StateId("sessionStart")
    private final StateSpec<ValueState<Long>> sessionStartSpec =
        StateSpecs.value(VarLongCoder.of());

    // State: timestamp of the most recent event
    @StateId("lastActivity")
    private final StateSpec<ValueState<Long>> lastActivitySpec =
        StateSpecs.value(VarLongCoder.of());

    // State: set of unique pages visited
    @StateId("pagesVisited")
    private final StateSpec<BagState<String>> pagesVisitedSpec =
        StateSpecs.bag(StringUtf8Coder.of());

    // State: whether a conversion occurred
    @StateId("converted")
    private final StateSpec<ValueState<Boolean>> convertedSpec =
        StateSpecs.value(BooleanCoder.of());
}
```

## Processing Elements with State

Inside your `@ProcessElement` method, you read and write state for each incoming element.

```java
@ProcessElement
public void processElement(
        ProcessContext c,
        @StateId("eventCount") ValueState<Integer> eventCount,
        @StateId("sessionStart") ValueState<Long> sessionStart,
        @StateId("lastActivity") ValueState<Long> lastActivity,
        @StateId("pagesVisited") BagState<String> pagesVisited,
        @StateId("converted") ValueState<Boolean> converted) {

    KV<String, UserEvent> input = c.element();
    String userId = input.getKey();
    UserEvent event = input.getValue();
    long eventTimestamp = event.getTimestamp();

    // Update event count
    Integer currentCount = eventCount.read();
    if (currentCount == null) {
        currentCount = 0;
    }
    eventCount.write(currentCount + 1);

    // Set session start time on first event
    if (sessionStart.read() == null) {
        sessionStart.write(eventTimestamp);
    }

    // Update last activity timestamp
    lastActivity.write(eventTimestamp);

    // Track unique pages visited
    if (event.getPage() != null) {
        pagesVisited.add(event.getPage());
    }

    // Check for conversion events
    if ("purchase".equals(event.getType()) || "signup".equals(event.getType())) {
        converted.write(true);
    }

    // Output a running session summary with each event
    SessionSummary summary = new SessionSummary(
        userId,
        currentCount + 1,
        sessionStart.read(),
        eventTimestamp,
        converted.read() != null && converted.read()
    );

    c.output(summary);
}
```

## Using Timers for Session Timeout

State alone does not tell you when a session ends. You need timers to detect inactivity gaps and emit final session summaries.

```java
// Complete stateful DoFn with timer for session expiry
public class SessionTrackerFn
    extends DoFn<KV<String, UserEvent>, SessionSummary> {

    private static final Duration SESSION_GAP = Duration.standardMinutes(30);

    @StateId("eventCount")
    private final StateSpec<ValueState<Integer>> eventCountSpec =
        StateSpecs.value(VarIntCoder.of());

    @StateId("sessionStart")
    private final StateSpec<ValueState<Long>> sessionStartSpec =
        StateSpecs.value(VarLongCoder.of());

    @StateId("lastEventTime")
    private final StateSpec<ValueState<Long>> lastEventTimeSpec =
        StateSpecs.value(VarLongCoder.of());

    @StateId("totalDuration")
    private final StateSpec<ValueState<Long>> totalDurationSpec =
        StateSpecs.value(VarLongCoder.of());

    @StateId("converted")
    private final StateSpec<ValueState<Boolean>> convertedSpec =
        StateSpecs.value(BooleanCoder.of());

    // Timer that fires when the session gap expires
    @TimerId("sessionTimeout")
    private final TimerSpec sessionTimeoutSpec =
        TimerSpecs.timer(TimeDomain.EVENT_TIME);

    @ProcessElement
    public void processElement(
            ProcessContext c,
            @StateId("eventCount") ValueState<Integer> eventCount,
            @StateId("sessionStart") ValueState<Long> sessionStart,
            @StateId("lastEventTime") ValueState<Long> lastEventTime,
            @StateId("totalDuration") ValueState<Long> totalDuration,
            @StateId("converted") ValueState<Boolean> converted,
            @TimerId("sessionTimeout") Timer sessionTimeout) {

        UserEvent event = c.element().getValue();
        long timestamp = event.getTimestamp();

        // Update event count
        Integer count = eventCount.read();
        eventCount.write(count == null ? 1 : count + 1);

        // Track session start
        if (sessionStart.read() == null) {
            sessionStart.write(timestamp);
        }

        // Calculate time since last event
        Long prevTime = lastEventTime.read();
        if (prevTime != null) {
            long gap = timestamp - prevTime;
            Long currentDuration = totalDuration.read();
            totalDuration.write((currentDuration == null ? 0 : currentDuration) + gap);
        }

        lastEventTime.write(timestamp);

        // Check for conversion
        if ("purchase".equals(event.getType())) {
            converted.write(true);
        }

        // Reset the session timeout timer
        // It fires SESSION_GAP after the latest event
        sessionTimeout.set(
            Instant.ofEpochMilli(timestamp).plus(SESSION_GAP));
    }

    @OnTimer("sessionTimeout")
    public void onSessionTimeout(
            OutputReceiver<SessionSummary> output,
            @StateId("eventCount") ValueState<Integer> eventCount,
            @StateId("sessionStart") ValueState<Long> sessionStart,
            @StateId("lastEventTime") ValueState<Long> lastEventTime,
            @StateId("totalDuration") ValueState<Long> totalDuration,
            @StateId("converted") ValueState<Boolean> converted) {

        // Session has expired - emit the final summary
        SessionSummary summary = new SessionSummary(
            eventCount.read(),
            sessionStart.read(),
            lastEventTime.read(),
            totalDuration.read() != null ? totalDuration.read() : 0,
            converted.read() != null && converted.read()
        );

        output.output(summary);

        // Clear all state for this key
        eventCount.clear();
        sessionStart.clear();
        lastEventTime.clear();
        totalDuration.clear();
        converted.clear();
    }
}
```

## Wiring the Pipeline

Here is how to use the stateful DoFn in a complete pipeline.

```java
// Complete session analysis pipeline
Pipeline pipeline = Pipeline.create(options);

PCollection<SessionSummary> sessions = pipeline
    // Read events from Pub/Sub
    .apply("ReadEvents", PubsubIO.readStrings()
        .fromSubscription("projects/my-project/subscriptions/events"))

    // Parse into UserEvent objects
    .apply("ParseEvents", ParDo.of(new ParseEventFn()))

    // Key by user ID (required for stateful processing)
    .apply("KeyByUser", WithKeys.<String, UserEvent>of(
        event -> event.getUserId()))

    // Apply session analysis with state and timers
    .apply("AnalyzeSessions", ParDo.of(new SessionTrackerFn()));

// Write session summaries to BigQuery
sessions
    .apply("ToTableRow", ParDo.of(new SessionToTableRowFn()))
    .apply("WriteBQ", BigQueryIO.writeTableRows()
        .to("project:analytics.session_summaries")
        .withWriteDisposition(WriteDisposition.WRITE_APPEND));

pipeline.run();
```

## State Types

Apache Beam provides several state types for different use cases.

**ValueState** stores a single value. Good for counters, flags, and timestamps.

**BagState** stores an unordered collection of values. Good for accumulating events.

**CombiningState** stores a value that is updated using a CombineFn. Good for running aggregations that can be computed incrementally.

```java
// CombiningState for running sum of revenue
@StateId("totalRevenue")
private final StateSpec<CombiningState<Double, double[], Double>> revenueSpec =
    StateSpecs.combining(
        DoubleCoder.of(),
        Sum.ofDoubles().getAccumulatorCoder(null, DoubleCoder.of()),
        Sum.ofDoubles());

// MapState for tracking counts per event type
@StateId("typeCounts")
private final StateSpec<MapState<String, Integer>> typeCountsSpec =
    StateSpecs.map(StringUtf8Coder.of(), VarIntCoder.of());
```

## Handling Late Data with State

Stateful processing interacts with watermarks and allowed lateness. Late data still gets processed by the stateful DoFn as long as the state has not been cleared.

```java
// Apply windowing with allowed lateness before stateful processing
PCollection<KV<String, UserEvent>> windowed = keyedEvents
    .apply("Window", Window.<KV<String, UserEvent>>into(
        Sessions.withGapDuration(Duration.standardMinutes(30)))
        .withAllowedLateness(Duration.standardHours(2))
        .accumulatingFiredPanes());

PCollection<SessionSummary> sessions = windowed
    .apply("TrackSession", ParDo.of(new SessionTrackerFn()));
```

## State Size Considerations

State is persisted by Dataflow and must be checkpointed periodically. Large state slows down checkpointing and can cause performance issues.

Keep BagState from growing unbounded. If you are accumulating events in a bag, periodically flush and clear it.

Use CombiningState instead of BagState when you only need an aggregate. CombiningState maintains a fixed-size accumulator regardless of how many elements it has seen.

Monitor state size in the Dataflow console. The "State Size" metric shows how much state each step is maintaining. If it keeps growing, you have a state leak.

Stateful processing in Apache Beam is a powerful tool for session analysis and similar use cases where you need to track information across events. Combined with timers, it gives you full control over when state is accumulated, when results are emitted, and when state is cleaned up. Start simple, monitor state size, and add complexity incrementally.
