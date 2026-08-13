# Diagnose Rising Kafka Lag in Spark Structured Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Structured Streaming, Apache Kafka, Consumer Lag, Backpressure, Performance Tuning

Description: Measure Spark Kafka source progress correctly, locate slow triggers and partitions, and tune rate limits or parallelism only after fixing the limiting operator or sink.

---

Kafka lag rises when the latest available offset advances faster than a query's completed source position over a sustained period. In Spark Structured Streaming, first make sure the “lag” dashboard is measuring Spark's progress. The Kafka source does not commit offsets through Kafka consumer auto-commit; Spark manages consumed offsets in its checkpoint. A generic consumer-group dashboard may therefore be absent, stale, or misleading for the generated group ID.

Use Spark query progress as the canonical processing record, and compare it with Kafka's latest offsets when you need an external lag calculation.

## Measure Backlog and Throughput Together

`StreamingQueryProgress` reports trigger-level `numInputRows`, `inputRowsPerSecond`, `processedRowsPerSecond`, durations, and per-source start/end/latest offsets or source metrics supported by the connector.

```python
progress = query.lastProgress
if progress is not None:
    print(progress)
```

Persist progress events instead of sampling only `lastProgress`. For each Kafka topic-partition and trigger, retain:

- Spark start and end offsets;
- latest Kafka/source offset at observation time;
- records processed and trigger duration;
- input and processed row rates;
- `durationMs` components;
- state-operator update/commit metrics;
- sink commit latency and failures.

Offset lag is an offset-distance signal, not seconds or bytes. In an ordinary topic it is often used as a record-count approximation, but Kafka offsets can contain gaps, and transactional visibility or compaction can further separate offset distance from rows Spark will process. A partition with huge records can be more expensive at smaller offset lag. Also record the timestamp of the oldest unprocessed record if the operational objective is time delay.

Kafka's `kafka-consumer-groups.sh --describe` shows current offset, log-end offset, and lag for consumer groups that commit offsets. Because Spark's Kafka source does not commit offsets, do not substitute a manually forced `kafka.group.id` merely to make that command look familiar. The connector warns that concurrent queries with the same forced group ID can interfere and read only parts of subscribed data.

## Determine Whether the Query Is Falling Behind

Compare rates over a window, not one trigger. If arrival remains above completed processing capacity, backlog must grow. If `processedRowsPerSecond` drops only during large state commits or sink slowdowns, find that phase. If the query is often idle and catches up, a temporarily nonzero lag may be expected.

Inspect `durationMs` and the Spark UI:

- long source offset retrieval suggests Kafka connectivity/metadata issues;
- long task stages with high CPU point to parsing, UDF, join, or aggregation work;
- high shuffle read/spill/GC points to partitioning, skew, or state pressure;
- state update/commit growth points to an expanding state store;
- long `addBatch`/sink work points to file layout, database throttling, `foreachBatch`, or sink commit behavior;
- trigger execution longer than the requested processing-time interval means triggers cannot maintain that cadence.

Name the limiting stage before changing Kafka intake.

## Understand `maxOffsetsPerTrigger`

The Kafka integration supports `maxOffsetsPerTrigger`, a maximum total offsets processed per trigger, split proportionally across topic-partitions by volume.

```python
source = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", brokers)
    .option("subscribe", "events")
    .option("maxOffsetsPerTrigger", "500000")
    .load()
)
```

The number is illustrative. A cap protects batch memory, state-update size, and sink load. It also imposes a throughput ceiling. If the cap is below incoming volume per trigger over time, lag growth is expected. Raising it creates larger batches; it helps only while compute and sink capacity can process them faster than arrival without destabilizing the query.

`minOffsetsPerTrigger` and `maxTriggerDelay` can delay a trigger until enough data accumulates, with a maximum delay when data is available. These are latency/efficiency controls, not ways to erase an overloaded backlog.

Change rate options with a checkpoint only according to Structured Streaming's documented recovery semantics; rate-limit additions/changes are listed as allowed examples. Still compare state and sink behavior after the change.

## Get Enough Kafka Read Parallelism

By default, the Spark Kafka source has a one-to-one relationship between Kafka topic-partitions and Spark input partitions. A topic with four partitions cannot naturally feed hundreds of independent input tasks in a trigger. The connector's `minPartitions` option is a hint that can split large Kafka partitions into more Spark tasks; the actual number is approximate. Newer supported connectors also document `maxRecordsPerPartition`.

```python
.option("minPartitions", "64")
```

This can help when a few large Kafka partitions underutilize a large cluster. It does not add Kafka broker partitions, correct a hot partition key, or accelerate a serial sink. Compare broker fetch capacity, input task distribution, and downstream exchanges.

For durable scale, Kafka partition count and producer key distribution must support required parallelism. Repartitioning the DataFrame after reading can improve downstream balance but cannot make the source fetch more concurrently than the connector's planned input ranges.

## Fix the Slow Operator or Sink

Common high-value fixes include:

- select and parse only required fields with native Spark functions;
- replace row-at-a-time Python UDFs where native/Arrow-vectorized paths fit;
- correct skewed joins and accidental many-to-many fanout;
- add watermarks/time bounds to growing stateful operations;
- batch external writes in `foreachBatch` and make them idempotent;
- compact or redesign tiny-file sinks;
- size shuffle partitions and executors from task metrics;
- scale executors only when task parallelism and external systems can use them.

Trigger interval alone does not create capacity. Shorter intervals reduce records per micro-batch but add scheduling/commit frequency. Longer intervals amortize fixed cost but increase batch size and latency. Measure full trigger cost.

## Plan Catch-Up Separately from Steady State

A healthy query needs processing capacity above sustained arrival to reduce existing backlog. Estimate:

```text
catch-up time ≈ backlog input rows / (processing rows/s - arrival rows/s)
```

This is a planning approximation and requires all three terms to use the same unit. Do not silently substitute raw Kafka offset distance for rows when the topic has offset gaps. Rates also vary by record size, state, and sink. If processing does not exceed arrival, catch-up time is unbounded.

Raise `maxOffsetsPerTrigger` in controlled steps while watching trigger duration, memory, state commit, sink limits, and failures. An `AvailableNow` run can process data available at start in one or multiple batches and is useful for some bounded catch-up workflows; validate source/sink/query support and checkpoint ownership before changing trigger strategy.

Never “fix” lag by changing `startingOffsets` on an existing checkpoint. Resume uses checkpointed progress. Starting a new checkpoint at latest discards backlog from the new query's perspective and is a data-loss decision, not performance tuning.

## Find Partition-Level Lag Skew

Total lag can hide one hot Kafka partition. Compare end-versus-latest offsets per topic-partition and correlate them with Spark input task duration. If one producer key concentrates traffic into a partition, adding executors alone cannot increase that Kafka partition's broker-level parallelism. Connector-side range splitting may allow more Spark tasks for a large range, but broker throughput and ordered processing requirements still constrain the design.

Fix producer key distribution only with an explicit ordering and compatibility plan. Increasing Kafka partition count changes future assignment and does not redistribute existing records. Track lag by partition through the migration so an aggregate dashboard cannot declare recovery while an old hot partition remains behind.

## Official Documentation

- [Spark Structured Streaming Kafka Integration](https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html)
- [Structured Streaming Programming Guide: Monitoring](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#monitoring-streaming-queries)
- [Spark `StreamingQueryProgress` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/StreamingQueryProgress.html)
- [Spark `SourceProgress` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/SourceProgress.html)
- [Spark `Trigger` API](https://spark.apache.org/docs/latest/api/java/org/apache/spark/sql/streaming/Trigger.html)
- [Spark Web UI: Structured Streaming and Stage Metrics](https://spark.apache.org/docs/latest/web-ui.html)
- [Apache Kafka: Managing Consumer Groups](https://kafka.apache.org/43/operations/basic-kafka-operations/#managing-consumer-groups)
- [Apache Kafka: Consumer Offset Tracking](https://kafka.apache.org/43/implementation/distribution/#consumer-offset-tracking)

## Conclusion

Measure lag from Spark's checkpointed source progress and Kafka's latest offsets, not an unrelated consumer-group commit. Compare sustained arrival with completed processing, then locate the slow trigger phase or task stage. Rate caps make batches safe but can deliberately create backlog; source splitting helps only when parallelism is the limit. Fix the operator or sink, retain headroom above arrival, and treat backlog skipping as an explicit data decision.
