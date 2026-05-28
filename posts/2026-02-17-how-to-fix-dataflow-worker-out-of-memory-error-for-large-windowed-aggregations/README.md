# How to Fix Dataflow Worker Out of Memory Error for Large Windowed Aggregations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Apache Beam, Memory, Performance

Description: Resolve out of memory errors on Google Cloud Dataflow workers when running large windowed aggregations that accumulate too much data per window.

---

Your Dataflow streaming pipeline crashes with an OutOfMemoryError during windowed aggregations. Workers get killed, restart, process more data, and crash again in a cycle. This typically happens when a window accumulates more data than a single worker's memory can hold. Large windows (hourly, daily) combined with high-volume keys create situations where millions of elements pile up before the window fires. This post walks through the causes and practical solutions.

## Why Windowed Aggregations Cause OOM

In a windowed `GroupByKey` aggregation, Beam groups all values for a key within a window before your aggregation code consumes them. For a 1-hour fixed window with 10,000 events per second for a single key, that is 36 million elements associated with one key-window before the window closes and the aggregation runs.

The problem is compounded by:
- Large element sizes (each element has significant payload)
- Many active windows (especially with sliding windows that overlap)
- Accumulation mode set to ACCUMULATING instead of DISCARDING
- Session windows that merge and grow unbounded

## Step 1: Check Worker Memory Configuration

First, verify your worker memory and see if the OOM is a simple resource constraint:

```bash
# Check the current worker configuration

gcloud dataflow jobs describe JOB_ID \
    --region=us-central1 \
    --format="json(environment.workerPools)"
```

Dataflow selects a worker machine type by default. If the selected worker does not have enough memory, upgrade to a larger machine type:

```bash
# Launch with larger workers
gcloud dataflow jobs run your-job \
    --gcs-location=gs://your-bucket/templates/your-template \
    --region=us-central1 \
    --worker-machine-type=n2-highmem-4 \
    --max-workers=10
```

The `n2-highmem` family provides more memory per CPU, which is ideal for memory-intensive aggregations.

## Step 2: Switch from GroupByKey to CombinePerKey

The most impactful fix. If your aggregation can be expressed as a combiner, it uses far less memory because Beam can pre-aggregate values into compact accumulators instead of passing all elements to your aggregation code:

```python
# Bad: GroupByKey exposes all values for the key-window to your aggregation
results = (
    events
    | 'Window' >> beam.WindowInto(beam.window.FixedWindows(3600))
    | 'KeyByUser' >> beam.Map(lambda e: (e['user_id'], e))
    | 'Group' >> beam.GroupByKey()  # Groups ALL values per key per window
    | 'Aggregate' >> beam.Map(lambda kv: (kv[0], compute_stats(kv[1])))
)

# Good: CombinePerKey maintains compact accumulators per key
class StatsAccumulator(beam.CombineFn):
    """Memory-efficient aggregation using a fixed-size accumulator."""

    def create_accumulator(self):
        return {'count': 0, 'sum': 0.0, 'min': float('inf'), 'max': float('-inf')}

    def add_input(self, acc, element):
        acc['count'] += 1
        acc['sum'] += element['value']
        acc['min'] = min(acc['min'], element['value'])
        acc['max'] = max(acc['max'], element['value'])
        return acc

    def merge_accumulators(self, accumulators):
        merged = self.create_accumulator()
        for acc in accumulators:
            merged['count'] += acc['count']
            merged['sum'] += acc['sum']
            merged['min'] = min(merged['min'], acc['min'])
            merged['max'] = max(merged['max'], acc['max'])
        return merged

    def extract_output(self, acc):
        return {
            'count': acc['count'],
            'avg': acc['sum'] / acc['count'] if acc['count'] > 0 else 0,
            'min': acc['min'],
            'max': acc['max']
        }

results = (
    events
    | 'Window' >> beam.WindowInto(beam.window.FixedWindows(3600))
    | 'KeyByUser' >> beam.Map(lambda e: (e['user_id'], e))
    | 'CombineStats' >> beam.CombinePerKey(StatsAccumulator())
)
```

The combiner accumulator stays constant size regardless of how many elements are in the window. For a window with 36 million elements, instead of processing an iterable of 36 million objects, the combiner works with small dictionaries that can be merged.

## Step 3: Use Triggering to Emit Partial Results

Instead of waiting for the entire window to close, use triggers to emit partial results throughout the window:

```python
# Trigger every 1000 elements or every 60 seconds, whichever comes first
windowed = (
    events
    | 'Window' >> beam.WindowInto(
        beam.window.FixedWindows(3600),  # 1-hour windows
        trigger=beam.trigger.Repeatedly(
            beam.trigger.AfterAny(
                beam.trigger.AfterCount(1000),          # Every 1000 elements
                beam.trigger.AfterProcessingTime(60)    # Or every 60 seconds
            )
        ),
        accumulation_mode=beam.trigger.AccumulationMode.DISCARDING  # Drop after emit
    )
)
```

The `DISCARDING` accumulation mode is critical here. It tells Dataflow to discard elements after they have been emitted in a pane, freeing memory. With `ACCUMULATING` mode, elements are kept and re-emitted with each trigger firing, which uses even more memory.

## Step 4: Reduce Window Size

If you do not strictly need hourly or daily aggregations, use smaller windows:

```python
# Use 5-minute windows instead of 1-hour windows
windowed = (
    events
    | 'SmallWindows' >> beam.WindowInto(beam.window.FixedWindows(300))
    | 'KeyAndCombine' >> beam.CombinePerKey(StatsAccumulator())
)

# If you need hourly results, re-window and combine the 5-minute results
hourly = (
    windowed
    | 'HourlyWindow' >> beam.WindowInto(beam.window.FixedWindows(3600))
    | 'HourlyCombine' >> beam.CombinePerKey(MergeStatsAccumulator())
)
```

This two-stage approach keeps each individual window small, preventing memory issues, while still producing the hourly results you need.

## Step 5: Handle Sliding Windows Carefully

Sliding windows are particularly memory-hungry because each element belongs to multiple windows. A 1-hour window sliding every 5 minutes assigns each element to 12 windows:

```python
# This assigns each element to 12 overlapping windows
sliding = beam.WindowInto(
    beam.window.SlidingWindows(3600, 300)  # 1-hour window, 5-minute slide
)
```

If memory is an issue, consider replacing sliding windows with fixed windows plus a custom post-processing step:

```python
# Use fixed windows and compute sliding aggregations in post-processing
fixed_results = (
    events
    | 'FixedWindows' >> beam.WindowInto(beam.window.FixedWindows(300))
    | 'Aggregate' >> beam.CombinePerKey(StatsAccumulator())
)

# Write fixed window results and compute sliding aggregations downstream
# (in BigQuery, for example, using window functions)
```

## Step 6: Limit Session Window Growth

Session windows can grow unbounded if events keep arriving within the gap duration. A session that lasts all day for a single key accumulates an enormous amount of data:

```python
# Dangerous: Sessions with no size limit
sessions = beam.WindowInto(
    beam.window.Sessions(600)  # 10-minute gap
    # A constantly active key creates a single session for the whole day
)
```

Add a maximum session duration using a custom window function or use triggers to limit how much data accumulates:

```python
# Use triggers to cap memory usage in sessions
capped_sessions = beam.WindowInto(
    beam.window.Sessions(600),
    trigger=beam.trigger.Repeatedly(
        beam.trigger.AfterCount(10000)  # Emit and discard every 10000 elements
    ),
    accumulation_mode=beam.trigger.AccumulationMode.DISCARDING
)
```

## Step 7: Profile Memory Usage

Enable Dataflow profiling to understand where memory is being consumed. For Java heap profiling, include both the profiler and heap sampling flags:

```bash
# Enable profiling when launching the job
gcloud dataflow jobs run your-job \
    --gcs-location=gs://your-bucket/templates/your-template \
    --region=us-central1 \
    --additional-experiments=enable_google_cloud_profiler,enable_google_cloud_heap_sampling
```

Then check the profiler in the Google Cloud Console under Profiler. Look at heap allocation data to identify which objects are consuming the most memory. For Python pipelines, Cloud Profiler supports CPU profiling but not heap profiling.

## Step 8: Tune JVM Settings (Java Pipelines)

For Java pipelines, cache and grouping-table settings can affect how much heap the SDK harness uses:

```java
import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.options.SdkHarnessOptions;

// Reduce caches that can contribute to worker heap pressure
PipelineOptions options = PipelineOptionsFactory.create();
options.as(DataflowPipelineOptions.class)
    .setWorkerCacheMb(128);  // Reduce cache to free heap for data

options.as(SdkHarnessOptions.class)
    .setMaxCacheMemoryUsageMb(512);

options.as(SdkHarnessOptions.class)
    .setGroupingTableMaxSizeMb(50);
```

If you see Java 16+ module-access errors from libraries that use reflection, configure SDK harness module opens:

```bash
# Open a JDK module/package to the library that needs reflective access
--jdkAddOpenModules=java.base/java.lang=jamm
```

## Quick Decision Guide

```mermaid
flowchart TD
    A[OOM in Windowed Aggregation] --> B{Can you use CombinePerKey?}
    B -->|Yes| C[Switch to CombinePerKey]
    B -->|No| D{Is the window too large?}
    D -->|Yes| E[Reduce window size or use two-stage]
    D -->|No| F{Using sliding windows?}
    F -->|Yes| G[Switch to fixed windows]
    F -->|No| H{Can you trigger more often?}
    H -->|Yes| I[Add triggers with DISCARDING mode]
    H -->|No| J[Increase worker memory]
```

## Monitoring Memory Usage

Set up alerts for worker memory usage with [OneUptime](https://oneuptime.com). Tracking memory consumption trends over time helps you anticipate OOM issues before they cause pipeline failures, especially as data volumes grow.

The fundamental principle is to avoid storing all elements in memory at once. Use combiners for constant-memory aggregations, triggers for early emission, and smaller windows to limit accumulation.
