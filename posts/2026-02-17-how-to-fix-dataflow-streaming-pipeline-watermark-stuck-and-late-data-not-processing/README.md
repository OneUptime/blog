# How to Fix Dataflow Streaming Pipeline Watermark Stuck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Streaming, Watermark, Apache Beam

Description: Troubleshoot stuck watermarks in Google Cloud Dataflow streaming pipelines and fix issues where late data is not being processed correctly.

---

Watermarks are the mechanism Dataflow uses to track progress in event time for streaming pipelines. When the watermark gets stuck, your pipeline stops making progress on windowed operations. Windows never close, triggers never fire, and late data handling breaks down. Understanding why watermarks get stuck and how to unstick them is essential for running reliable streaming pipelines.

## What Is a Watermark

A watermark is Dataflow's estimate of how far along in event time the pipeline has progressed. It answers the question: "Have we seen all data with event timestamps up to time T?"

When the watermark advances past the end of a window, that window closes and fires. If the watermark stops advancing, no windows close, and no results are emitted. Late data (data with event timestamps behind the watermark) is handled separately based on your allowed lateness configuration.

## Step 1: Check the Current Watermark Position

View the watermark in the Dataflow monitoring UI or via the command line:

```bash
# Get the watermark and other timing info for the job

gcloud beta dataflow metrics list JOB_ID \
    --region=us-central1 \
    --source=service \
    --format="table(name.name, scalar)" | grep -i watermark
```

In the Dataflow monitoring UI, look at the "Data Watermark" graph for each stage. A flat line means the watermark is stuck.

Also check the system lag metric:

```bash
# Check system lag
gcloud beta dataflow metrics list JOB_ID \
    --region=us-central1 \
    --source=service \
    --format="table(name.name, scalar)" | grep -i lag
```

Growing system lag alongside a stuck watermark confirms the pipeline is falling behind.

## Step 2: Identify the Source of the Stuck Watermark

The watermark advances based on the oldest unprocessed element across all input sources. If one source has an element with an old timestamp that is not being processed, it holds back the watermark for the entire pipeline.

Common causes of stuck watermarks:

1. An idle input source (a Pub/Sub subscription or Kafka partition with no new messages)
2. A slow or stuck worker that is not processing elements
3. Incorrect event timestamp assignment
4. A source that produces elements with very old timestamps

## Step 3: Handle Idle Sources

This is a common cause for sources or custom connectors that don't mark idle partitions correctly. If your pipeline reads from multiple sources (or a single source with multiple partitions) and one of them goes idle (no new messages), that source can hold back the global watermark if its source implementation doesn't report idleness or advance its watermark.

Apache Beam source APIs are source-specific. For Pub/Sub, there is no `withIdleTimeout` option on `PubsubIO.Read`; make sure the source is using the intended event-time attribute so Dataflow can compute the source watermark correctly:

```java
// Java: Read Pub/Sub messages with event time from a message attribute
PCollection<PubsubMessage> messages = pipeline
    .apply(PubsubIO.readMessagesWithAttributes()
        .fromSubscription("projects/my-project/subscriptions/my-sub")
        .withTimestampAttribute("event_timestamp"));
```

For Python pipelines:

```python
# Python: Read Pub/Sub messages with event time from a message attribute
from apache_beam.io import ReadFromPubSub

messages = (
    pipeline
    | 'ReadPubSub' >> ReadFromPubSub(
        subscription='projects/my-project/subscriptions/my-sub',
        with_attributes=True,
        timestamp_attribute='event_timestamp'
    )
)
```

The timestamp attribute must contain either milliseconds since the Unix epoch or an RFC 3339 timestamp such as `2015-10-29T23:41:41.123Z`. If you're using Kafka or another source, check that source connector's documentation for its supported watermark and idle-partition options. If you're using a custom source, implement watermark estimation correctly as shown in Step 8.

## Step 4: Check Timestamp Assignment

If your elements have incorrect event timestamps, the watermark will behave unexpectedly. A common mistake is assigning wall-clock time instead of the actual event time from the data:

```python
# Bad: Using processing time as event time
class BadTimestampDoFn(beam.DoFn):
    def process(self, element):
        # This assigns the current time, not the event time
        yield beam.window.TimestampedValue(element, time.time())

# Good: Extract event time from the data
class GoodTimestampDoFn(beam.DoFn):
    def process(self, element):
        # Use the event-time timestamp from the payload, in Unix seconds
        event_time = element['event_timestamp_seconds']
        yield beam.window.TimestampedValue(element, event_time)
```

Another issue is elements with timestamps far in the past. A single element with a timestamp from days ago can hold back the watermark:

```python
# Add a filter to drop elements with unreasonably old timestamps
class FilterOldEvents(beam.DoFn):
    def process(self, element, timestamp=beam.DoFn.TimestampParam):
        # Drop events older than 24 hours
        cutoff = time.time() - (24 * 3600)
        if timestamp.micros / 1e6 > cutoff:
            yield element
        else:
            # Log and count dropped elements for monitoring
            beam.metrics.Metrics.counter('pipeline', 'dropped_old_events').inc()
```

## Step 5: Configure Allowed Lateness

Even if the watermark advances correctly, late data (data arriving after the watermark has passed its window) is dropped by default. Configure allowed lateness to handle late data:

```python
# Configure windowing with allowed lateness
windowed = (
    events
    | 'Window' >> beam.WindowInto(
        beam.window.FixedWindows(300),  # 5-minute windows
        trigger=beam.trigger.AfterWatermark(
            early=beam.trigger.AfterProcessingTime(60),  # Early results every minute
            late=beam.trigger.AfterCount(1)               # Re-fire for each late element
        ),
        allowed_lateness=3600,  # 1-hour lateness, in seconds
        accumulation_mode=beam.trigger.AccumulationMode.ACCUMULATING
    )
)
```

This configuration:
- Emits early results every minute before the window closes
- Re-fires the window for each late element up to 1 hour after the window closes
- Uses ACCUMULATING mode so late results include all data seen so far

## Step 6: Debug with Watermark Hold Details

Check the Dataflow worker logs for watermark hold information:

```bash
# Search for watermark-related log messages
gcloud logging read 'resource.type="dataflow_step" AND resource.labels.job_id="JOB_ID" AND (textPayload:"watermark" OR textPayload:"hold")' \
    --limit=30 \
    --format="table(timestamp, textPayload)"
```

Look for "watermark hold" messages that indicate which transform is preventing the watermark from advancing.

In the Dataflow monitoring UI, hover over a stage in the pipeline graph. The "Output Watermark" for each stage shows you exactly where the watermark is held.

## Step 7: Handle Multiple Input Sources

If your pipeline reads from multiple sources and combines them, the global watermark is the minimum watermark across all sources:

```python
# Pipeline with multiple sources - watermark is the minimum of all
source_a = pipeline | 'ReadA' >> ReadFromPubSub(subscription=sub_a)
source_b = pipeline | 'ReadB' >> ReadFromPubSub(subscription=sub_b)

combined = (source_a, source_b) | 'Flatten' >> beam.Flatten()
```

If source B goes idle or falls behind, it can drag down the watermark for the entire pipeline, including data from source A. Make sure all sources use correct event timestamps, and check each source connector's documentation for supported idle-partition behavior.

## Step 8: Use Watermark Estimation in Custom Sources

If you have a custom source, you need to implement watermark estimation correctly:

```java
// Java: Custom unbounded source with watermark estimation
public class MySource extends UnboundedSource<MyRecord, MyCheckpoint> {

    @Override
    public UnboundedReader<MyRecord> createReader(
            PipelineOptions options, MyCheckpoint checkpoint) {
        return new MyReader(this, checkpoint);
    }

    private class MyReader extends UnboundedReader<MyRecord> {
        private Instant currentWatermark = BoundedWindow.TIMESTAMP_MIN_VALUE;

        @Override
        public Instant getWatermark() {
            if (currentWatermark.equals(BoundedWindow.TIMESTAMP_MIN_VALUE)) {
                return currentWatermark;
            }
            // Keep the watermark monotonic and behind observed event time
            // by some slack for out-of-order data.
            return currentWatermark.minus(Duration.standardSeconds(30));
        }

        @Override
        public boolean advance() {
            // Process next record and update watermark
            MyRecord record = fetchNextRecord();
            if (record != null) {
                Instant recordTimestamp = Instant.ofEpochMilli(record.getTimestamp());
                currentWatermark = currentWatermark.isBefore(recordTimestamp)
                    ? recordTimestamp
                    : currentWatermark;
                return true;
            }
            return false;
        }
    }
}
```

## Watermark Troubleshooting Summary

```mermaid
flowchart TD
    A[Watermark Stuck] --> B{Any idle sources?}
    B -->|Yes| C[Check source-specific idle partition handling]
    B -->|No| D{Old timestamps in data?}
    D -->|Yes| E[Filter old events or fix timestamp assignment]
    D -->|No| F{Slow worker?}
    F -->|Yes| G[Check worker health and data skew]
    F -->|No| H{Custom source?}
    H -->|Yes| I[Check watermark estimation logic]
    H -->|No| J[Check Dataflow worker logs for holds]
```

## Monitoring Watermarks

Use [OneUptime](https://oneuptime.com) to monitor watermark lag and system lag for your streaming pipelines. An alert on watermark stalls lets you investigate and fix issues before they cascade into significant data processing delays.

Watermark management is one of the trickier aspects of stream processing. The key principles are: make sure all sources advance their watermarks (even when idle), assign accurate event timestamps, and configure appropriate lateness to handle out-of-order data.
