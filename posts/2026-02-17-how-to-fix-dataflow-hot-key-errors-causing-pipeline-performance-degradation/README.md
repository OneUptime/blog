# How to Fix Dataflow Hot Key Errors Causing Pipeline Performance Degradation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Apache Beam, Performance, Google Cloud

Description: Diagnose and fix hot key issues in Google Cloud Dataflow pipelines that cause severe performance degradation and uneven worker utilization.

---

Your Dataflow pipeline was running fine, then suddenly some workers are maxed out while others sit idle. The job logs show "hot key" warnings, latency is through the roof, and throughput has tanked. Hot keys are one of the most common performance problems in distributed data processing, and Dataflow is no exception. This post explains what causes hot keys and the practical ways to fix them.

## What Is a Hot Key

In Dataflow (and Apache Beam generally), many operations work on key-value pairs. GroupByKey, Combine, and stateful DoFns all route elements to workers based on their key. When one key has dramatically more elements than others, the worker handling that key becomes a bottleneck. This is a hot key.

For example, if you are processing web analytics events grouped by user ID, and one user generates 10 million events while most users generate 100, the worker handling that user's key does 100,000 times more work than average.

Dataflow logs a warning when it detects this:

```
A hot key 'abc123' was detected in step 'GroupByKey'. This key processed 5000000 elements in the last 60s.
```

## Step 1: Identify the Hot Keys

First, check the Dataflow job logs for hot key warnings:

```bash
# Search for hot key warnings in Dataflow logs
gcloud logging read 'resource.type="dataflow_step" AND resource.labels.job_id="JOB_ID" AND textPayload:"hot key"' \
    --limit=20 \
    --format="table(timestamp, textPayload)"
```

The warning includes the key value and the element count, which tells you exactly which keys are problematic.

Also check the Dataflow monitoring UI. Look at the "Wall Time" for each stage. A stage with hot keys will show much higher wall time than expected.

## Step 2: Enable Hot Key Logging

If you are not seeing hot key warnings, you might need to enable them. Dataflow has hot key detection that can be configured:

```bash
# Set hot key logging when launching the pipeline
gcloud dataflow jobs run your-job \
    --gcs-location=gs://your-bucket/templates/your-template \
    --region=us-central1 \
    --additional-experiments=enable_hot_key_logging
```

Or in your pipeline code:

```java
// Enable hot key detection in pipeline options
PipelineOptions options = PipelineOptionsFactory.create();
options.as(DataflowPipelineOptions.class)
    .setExperiments(Arrays.asList("enable_hot_key_logging"));
```

## Step 3: Use Combiner Lifting

If you are doing an aggregation (sum, count, average) and have hot keys, the most effective fix is to use a CombineFn instead of a GroupByKey followed by manual aggregation. Dataflow can "lift" combiners to run partially on each worker before the shuffle, dramatically reducing the data sent for hot keys.

Instead of this:

```python
# Bad: GroupByKey + manual aggregation - hot keys will bottleneck one worker
counts = (
    events
    | 'PairWithOne' >> beam.Map(lambda e: (e['user_id'], 1))
    | 'GroupByUser' >> beam.GroupByKey()
    | 'SumCounts' >> beam.Map(lambda kv: (kv[0], sum(kv[1])))
)
```

Do this:

```python
# Good: CombinePerKey - Dataflow lifts the combination to run on each worker first
counts = (
    events
    | 'PairWithOne' >> beam.Map(lambda e: (e['user_id'], 1))
    | 'CountPerUser' >> beam.CombinePerKey(sum)  # Lifted combiner reduces hot key impact
)
```

The combiner approach reduces the hot key problem because partial aggregations happen on each worker before the final combine. Instead of sending 10 million elements for one key to a single worker, each worker sends one partial result.

## Step 4: Add a Secondary Key (Salting)

If you cannot use a combiner (because your operation is not associative and commutative), you can split hot keys into multiple sub-keys. This technique is called key salting.

```python
import random

# Salt the key to distribute hot keys across multiple workers
def salt_key(element, num_shards=100):
    """Add a random shard number to distribute hot keys."""
    key = element['user_id']
    shard = random.randint(0, num_shards - 1)
    return ((key, shard), element)

def unsalt_results(kv):
    """Remove the salt and merge results back by original key."""
    (original_key, shard), values = kv
    return (original_key, values)

# Pipeline with key salting
results = (
    events
    | 'SaltKeys' >> beam.Map(salt_key)
    | 'GroupBySaltedKey' >> beam.GroupByKey()  # Distributed across shards
    | 'ProcessShards' >> beam.Map(process_shard)
    | 'UnsaltKeys' >> beam.Map(unsalt_results)
    | 'GroupByOriginalKey' >> beam.GroupByKey()  # Merge shards - much smaller
    | 'MergeResults' >> beam.Map(merge_shards)
)
```

This distributes the hot key's elements across `num_shards` workers for the first GroupByKey. The second GroupByKey only needs to merge `num_shards` partial results per key, which is manageable.

## Step 5: Use withFanout for Combines

Apache Beam has built-in support for fanning out combines, which is essentially automatic key salting:

```java
// Java: Use withFanout to handle hot keys in CombinePerKey
PCollection<KV<String, Long>> counts = events
    .apply(MapElements.into(TypeDescriptors.kvs(
        TypeDescriptors.strings(), TypeDescriptors.longs()))
        .via(e -> KV.of(e.getUserId(), 1L)))
    .apply(Combine.<String, Long, Long>perKey(Sum.ofLongs())
        .withHotKeyFanout(100));  // Fan out hot keys into 100 sub-keys
```

The `withHotKeyFanout` method automatically handles the salting and merging for you. The argument specifies the number of sub-keys to create.

You can also use a dynamic fanout that varies based on the key:

```java
// Dynamic fanout - more shards for hotter keys
.apply(Combine.<String, Long, Long>perKey(Sum.ofLongs())
    .withHotKeyFanout(new SerializableFunction<String, Integer>() {
        public Integer apply(String key) {
            // Known hot keys get more fanout
            if (KNOWN_HOT_KEYS.contains(key)) {
                return 1000;
            }
            return 1;  // Regular keys do not need fanout
        }
    }));
```

## Step 6: Filter or Pre-aggregate Before GroupByKey

Sometimes the simplest fix is to reduce the data volume before it reaches the GroupByKey:

```python
# Pre-aggregate in a windowed fashion before the main GroupByKey
windowed_counts = (
    events
    | 'FixedWindows' >> beam.WindowInto(
        beam.window.FixedWindows(60))  # 1-minute windows
    | 'PairWithOne' >> beam.Map(lambda e: (e['user_id'], 1))
    | 'PreAggregate' >> beam.CombinePerKey(sum)  # Aggregate per minute first
)

# Now group by larger windows - much less data per key
final_counts = (
    windowed_counts
    | 'HourlyWindows' >> beam.WindowInto(
        beam.window.FixedWindows(3600))  # 1-hour windows
    | 'FinalAggregate' >> beam.CombinePerKey(sum)
)
```

This two-stage aggregation reduces the data volume at each stage, making hot keys less impactful.

## Step 7: Consider Reshuffle

If you have a ParDo after a GroupByKey that is slow for hot keys, you can add a Reshuffle step to redistribute the work:

```python
# Reshuffle after processing to redistribute across workers
processed = (
    grouped_data
    | 'ProcessGroups' >> beam.ParDo(ExpensiveProcessingDoFn())
    | 'Reshuffle' >> beam.Reshuffle()  # Redistribute output evenly
    | 'WriteResults' >> beam.io.WriteToBigQuery(...)
)
```

Reshuffle assigns new random keys, which distributes elements evenly across workers for downstream steps.

## Step 8: Monitor Key Distribution

Set up monitoring to catch hot keys early:

```python
# Add a monitoring step to track key distribution
class KeyDistributionMonitor(beam.DoFn):
    def __init__(self):
        # Create a distribution metric to track elements per key
        self.key_count = Metrics.distribution('pipeline', 'elements_per_key')

    def process(self, element):
        key, values = element
        count = len(list(values))
        self.key_count.update(count)
        yield (key, values)
```

Use [OneUptime](https://oneuptime.com) to track Dataflow pipeline metrics and get alerted when hot key warnings appear or when worker utilization becomes heavily skewed. Early detection lets you address hot keys before they cause significant pipeline degradation.

Hot keys are a fundamental challenge in distributed processing. The right solution depends on your specific use case, but combiner lifting and key salting cover the vast majority of scenarios.
