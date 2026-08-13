# Decide Whether a Spark Structured Streaming Checkpoint Can Survive a Query Change

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Structured Streaming, Checkpointing, State Store, Schema Evolution, Stream Processing

Description: Classify Structured Streaming query changes as reusable, conditional, or checkpoint-breaking and migrate stateful pipelines without guessing at recovery semantics.

---

A Structured Streaming checkpoint is not just a bookmark. It records source progress, batch commit information, query metadata, and state-store data for stateful operators. Reusing it after changing code asks the new query to interpret progress and state written by the old query.

Some changes are supported or conditionally meaningful. Others are explicitly not allowed and can fail with unpredictable errors. Never discover compatibility by pointing a production query at the only copy of its checkpoint.

## Classify the Change Before Deployment

The official recovery-semantics section groups changes by sources, sinks, stateless operations, and stateful operations.

### Input sources

Changing the number or type of input sources is not allowed. Changing source parameters depends on the source and query. The guide gives rate limits as an allowed example, while changing subscribed Kafka topics is generally not allowed because results are unpredictable.

For Kafka, options such as `startingOffsets` apply when a *new* query starts. When a query resumes, Spark continues from offsets recorded in the checkpoint. Changing `startingOffsets` while retaining the checkpoint does not rewind or skip the established progress.

### Stateless projections and filters

Adding or removing filters can be allowed. A projection change with the same output schema can be allowed. A different output schema is conditional on whether the sink supports it and what the semantic change means.

“Allowed” is not synonymous with “same result.” Adding a filter after the checkpoint causes future rows to be filtered; it does not retroactively rewrite prior sink output.

### Output sinks

Sink-type and sink-parameter changes are case-specific. The guide lists examples: some sink transitions are allowed, while others are not; changing a file sink's output directory is not allowed, whereas changing a Kafka output topic is allowed for new data. Review the current guide for the exact combination rather than generalizing from one example.

### Stateful operations

For the stateful operations listed in Spark's general recovery-semantics guide, state-schema changes are not allowed between restarts from the same checkpoint. This includes:

- number/type of streaming aggregation keys or aggregates;
- number/type of streaming deduplication columns;
- stream-stream join key schema or join type;
- user-defined state schema or timeout type for legacy `mapGroupsWithState`/`flatMapGroupsWithState` operations.

The restored state was encoded for the old operator contract. Renaming a function in source code may be harmless, while adding one grouping field is not.

Spark 4.x's `transformWithState` is a documented, narrowly scoped exception rather than permission to evolve every stateful plan. Its current guide allows state variables to be added or removed and supports value-side schema evolution when the state-store encoding format is Avro. Key-side schema evolution is not supported. Follow that API's exact evolution rules; they do not make aggregation, deduplication, join, or legacy `mapGroupsWithState` checkpoint changes compatible.

## Treat Operator Order and Count as State Schema

Stateful operators are associated with checkpointed state and plan topology. Adding, deleting, or reordering a stateful aggregation, deduplication, stream-stream join, or arbitrary stateful operator can invalidate correspondence with existing state.

Diff the logical intent, not just the output schema:

```text
old: source -> watermark -> groupBy(account_id, 10m window) -> sink
new: source -> watermark -> dropDuplicates(event_id) -> groupBy(account_id, 10m window) -> sink
```

Even if the sink columns are unchanged, the new deduplication adds state and changes operator layout. Plan for a new checkpoint unless the official documentation for your precise version and feature explicitly provides a migration.

Some SQL configurations are also checkpoint invariants. The current guide says that `spark.sql.shuffle.partitions`, `spark.sql.streaming.stateStore.providerClass`, and `spark.sql.streaming.multipleWatermarkPolicy` cannot be changed after the query has run. Changing one requires discarding that checkpoint and starting a new query.

## Choose a Migration Strategy

### Reuse the checkpoint for a supported change

Use only when the documented category permits it and semantic review agrees. Back up checkpoint metadata according to the underlying storage system, deploy to a non-production clone where feasible, and verify resumed offsets, batch IDs, state metrics, and sink output.

### Start with a new checkpoint

This creates a new query. Choose its starting source position deliberately. For Kafka, configure `startingOffsets` or timestamp-based starting options supported by the connector. Starting from latest can omit backlog; starting from earliest can replay retained data. Sink idempotency/deduplication determines whether replay creates duplicates.

```python
source = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", brokers)
    .option("subscribe", "events-v2")
    .option("startingOffsets", "earliest")
    .load()
)

query = (
    transformed.writeStream
    .option("checkpointLocation", "hdfs:///checkpoints/events-v2/run-001")
    .start()
)
```

The example intentionally uses a new checkpoint path. The correct start position is a business recovery decision, not a default recommendation.

### Dual-run and cut over

For a high-risk stateful change, start the new query with an independent checkpoint and output isolated from production. Compare aggregates, watermark/state progress, latency, and source positions. Once caught up and validated, switch consumers or publish the new table/topic according to the sink's transactional capabilities.

### Export and rebuild business state

If state must be migrated, do not hand-edit opaque checkpoint files. Materialize a supported business-level snapshot, design the new query to initialize from it where the API supports initial state, or replay source history into the new state schema. The feature and Spark release determine what initialization mechanisms exist.

## Protect Checkpoint Ownership

Each continuously running query should have its own checkpoint location. Two active queries sharing one checkpoint can corrupt progress assumptions or interfere with each other. Use durable, fault-tolerant storage supported by the deployment and restrict manual writes/deletes.

Record with every deployment:

- query version and code artifact;
- checkpoint path and source/sink identities;
- source schema and subscribed topics/paths;
- output mode and trigger;
- stateful operators, keys, state schema, and timeout/watermark settings;
- last validated batch/offset and rollback plan.

This turns a checkpoint from an anonymous directory into versioned runtime state.

## Test Recovery, Not Only Fresh Starts

A CI test that always deletes its checkpoint cannot detect compatibility failures. For any intended reusable change:

1. run the old query for several micro-batches;
2. stop it cleanly;
3. preserve its sink and checkpoint;
4. start the new code with the same checkpoint;
5. add more input, including late and duplicate data;
6. validate offsets, state, output, and restart behavior.

Also test the new-checkpoint migration path and replay semantics. A rollback may be unsafe after the new code writes checkpoint state that the old code cannot understand; plan rollback as another compatibility transition.

## Do Not Use “It Started” as Proof

A changed query may start and fail only when it loads a particular state partition or processes the next batch. It may also run with semantically unexpected filtering or sink output. Monitor several completed triggers, state-operator counts, watermark progress, source start/end offsets, and sink reconciliation.

If documentation labels a change not allowed, a successful development restart does not make it supported. Use a new checkpoint and an explicit migration.

## Copy Checkpoints Only with Storage-Level Consistency

A checkpoint contains multiple logs and state files whose versions correspond to completed micro-batches. Copying it while a query is writing can capture an inconsistent mixture. Stop the query through its supported lifecycle or use a storage snapshot mechanism that provides a point-in-time consistent view. A directory copy is not automatically a valid backup on every object store.

Protect the associated sink state as well. Restoring an older checkpoint while leaving newer sink output in place can replay batches and create duplicates unless the sink's commit protocol recognizes them. Recovery testing must treat checkpoint and sink as one processing history.

## Official Documentation

- [Structured Streaming: Recovery Semantics After Query Changes](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovery-semantics-after-changes-in-a-streaming-query)
- [Structured Streaming: Recovering with Checkpointing](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovering-from-failures-with-checkpointing)
- [Structured Streaming: `transformWithState` and State Schema Evolution](https://spark.apache.org/docs/latest/streaming/structured-streaming-transform-with-state.html#state-schema-evolution)
- [Structured Streaming: Checkpoint-Bound SQL Configuration](https://spark.apache.org/docs/latest/streaming/additional-information.html#miscellaneous-notes)
- [Spark Structured Streaming Kafka Integration](https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html)
- [PySpark DataStreamWriter `option()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.option.html)
- [PySpark DataStreamWriter `outputMode()`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.outputMode.html)
- [Spark `StreamingQueryProgress` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/StreamingQueryProgress.html)
- [Spark SQL Error Conditions: Streaming State](https://spark.apache.org/docs/latest/sql-error-conditions.html)
- [Spark Structured Streaming Guide](https://spark.apache.org/docs/latest/streaming/index.html)

## Conclusion

Reuse a checkpoint only when the source, sink, stateless transformation, and stateful schema change is documented as compatible and its semantics are acceptable. Stateful topology and schema changes usually require a new checkpoint plus replay, dual-run, or supported state initialization. Version checkpoint ownership, test recovery from the old artifact, and treat offsets and sink duplication as explicit migration decisions.
