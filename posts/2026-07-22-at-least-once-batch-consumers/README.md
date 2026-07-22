# At-Least-Once Batch Consumers: Handling Partial Failures and Retries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: At-Least-Once Delivery, Batch Consumer, Partial Failure, Consumer Offset, Retry

Description: Design batch consumers around per-record outcomes, contiguous checkpoints, idempotent effects, and bounded poison-message recovery.

---

A batch is a transport and throughput optimization, not automatically one unit of business success. When 99 records succeed and one fails, an at-least-once consumer must decide whether to retry the entire batch, retry a suffix, or report the failed item individually.

For each ordered source, the safe checkpoint is always the highest contiguous point for which every earlier required effect is durable. Never checkpoint past a hole. Assume that any successfully processed record before the checkpoint can be delivered again, and make its effect idempotent.

## Separate four boundaries

Batch-processing bugs often come from treating these distinct boundaries as one:

1. **Fetch boundary:** which records the broker or event source returned together.
2. **Processing boundary:** which records the application attempted, possibly in parallel.
3. **Commit boundary:** which business changes became durable.
4. **Checkpoint boundary:** which records the source may consider complete.

A Kafka `poll()` can return records from several partitions. An SQS receive or Lambda invocation can contain several independent messages. A database bulk insert might commit all rows atomically or reject all of them. The correct acknowledgement strategy depends on all four boundaries, not simply the number of records in the callback.

## Model per-record outcomes

Track a terminal outcome for every record:

```text
SUCCEEDED       durable effect exists
DUPLICATE       durable effect already existed
RETRYABLE       no completed effect; try again later
TERMINAL        malformed or permanently rejected
NOT_ATTEMPTED   stopped behind an earlier failure
UNKNOWN         external result may have succeeded
```

Only `SUCCEEDED` and `DUPLICATE` are normally safe to checkpoint immediately. `TERMINAL` is safe only after the configured quarantine or dead-letter action succeeds. `UNKNOWN` is not a normal retry: reconcile it or retry through a stable downstream idempotency key.

Do not turn a catch-all exception into batch success. Equally, do not throw away the individual outcome data and then wonder why 99 completed effects repeat with every poison-message retry.

## Choose an explicit failure policy

There are three common policies.

### Retry the whole batch

This is simple and preserves a clear all-or-nothing checkpoint. It works well when effects are idempotent and failures are rare. Its cost is amplification: one bad record repeats every earlier successful record in the uncheckpointed batch.

AWS Lambda's SQS integration behaves this way by default. If a handler fails, all messages in the batch become visible again after the visibility timeout, including messages that were already processed.

### Retry from the first failure

Ordered streams need a contiguous checkpoint. Process records in order, stop at the first retryable failure, and report or seek to that position. Earlier successful records can be checkpointed; the failed record and suffix are retried.

AWS Lambda's Kinesis partial-batch response uses the lowest failed sequence number as the checkpoint and retries records from there. AWS notes that partial success reduces retries but cannot entirely eliminate retries of successful records.

### Retry failed items independently

Independent queue messages can often be settled individually. For SQS-triggered Lambda, `ReportBatchItemFailures` lets the handler return failed message identifiers so successful messages do not all reappear. A custom RabbitMQ consumer can acknowledge individual delivery tags.

This policy is wrong when later records depend on an earlier failed record. For SQS FIFO, AWS instructs a partial-batch handler to stop after the first failure and report both failed and unprocessed messages to preserve order.

## Compute Kafka checkpoints per partition

Kafka offsets are ordered independently for each partition. A poll can return this shape:

```text
partition 0: offsets 100, 101, 102
partition 1: offsets  50,  51
```

If partition 0 offset 101 fails but partition 1 finishes, a consumer can commit 101 for partition 0-the next record after completed offset 100-and 52 for partition 1. It must not commit 103 for partition 0 because that skips the hole at 101.

For synchronous processing with `enable.auto.commit=false`:

```java
Map<TopicPartition, OffsetAndMetadata> safe = new HashMap<>();

for (TopicPartition partition : records.partitions()) {
    for (ConsumerRecord<String, Event> record : records.records(partition)) {
        try {
            applyIdempotently(record);
            safe.put(partition, new OffsetAndMetadata(record.offset() + 1));
        } catch (RetryableException error) {
            consumer.seek(partition, record.offset());
            break;
        }
    }
}

if (!safe.isEmpty()) {
    consumer.commitSync(safe);
}
```

Production code must also coordinate retries, revocation, and records after the failed offset already returned by the poll. `ConsumerRecords.nextOffsets()` is convenient only when every applicable record in that partition completed. If processing is parallel, maintain a completion bitmap or ordered set and advance the commit frontier only while the next expected offset is complete.

## Do not let parallel completion create holes

Imagine offsets 10, 11, and 12 run concurrently. Offsets 10 and 12 finish, while 11 waits on a dependency. Committing 13 because the maximum completed offset is 12 loses offset 11 after a crash.

Track this instead:

```text
next checkpoint candidate: 10
10 complete -> advance to 11
12 complete -> remember, do not advance
11 complete -> advance through 12 to 13
```

Bound in-flight records per partition. Pause intake when the gap or memory limit is reached. For Kafka, keep the consumer polling inside its group contract while partitions are paused, and keep `KafkaConsumer` access on its owning thread.

For queue deliveries without ordered offsets, settle each successful item if the protocol permits. RabbitMQ's `multiple=true` acknowledgement is cumulative: it is unsafe when an earlier delivery tag is still running. Individual acknowledgements or an ordered acknowledgement frontier avoid that hole.

## Make partial successes durable

If every record updates the same relational database, one transaction per record gives precise retry boundaries and can be expensive. One transaction for the whole batch gives atomic batch success and increases lock time and replay size. Chunked transactions provide a middle ground.

Whichever unit you choose, make it explicit:

- one transaction per record: checkpoint after the contiguous successful sequence;
- one transaction per partition batch: roll back and retry that partition's batch on failure;
- one transaction across the fetched batch: checkpoint nothing unless the whole transaction commits;
- database bulk operation with row-level errors: map every returned error to its source identity before settlement.

Never acknowledge based only on “the database call returned.” Verify whether the driver used atomic or partial batch semantics.

Use an inbox uniqueness constraint in the same transaction as each effect. Then a crash after several records commit but before their checkpoint repeats invocations without repeating outcomes.

## Isolate poison records without hiding them

A deterministic schema or business validation failure will never improve through immediate retry. Set an attempt or age limit, preserve the original payload and identity, record a structured failure reason, and route it to a dead-letter or quarantine path.

Do not acknowledge the source record until that quarantine write is durable. Otherwise a failure in the error path loses the evidence and the work.

After isolation, decide whether order may advance. For independent jobs it usually can. For an account ledger or state-machine stream, skipping a record may corrupt every later transition. Stop the partition or entity, alert, and repair or explicitly compensate before advancing its checkpoint.

Use delayed retry for dependency outages rather than holding an entire batch in memory or immediately hammering the broker. Add exponential backoff with jitter, a total age limit, and a circuit breaker or concurrency reduction.

## Size batches by replay cost, not only throughput

Larger batches amortize network and commit overhead, but they also increase:

- time between checkpoints;
- records repeated after a crash;
- lock duration and transaction size;
- memory held by the consumer;
- probability that one record fails the batch;
- time between polls or acknowledgements.

Measure throughput against p95 and p99 completion time, retry amplification, and maximum safe replay. In Kafka, adjust `max.poll.records` and `max.poll.interval.ms` together. In SQS, visibility must cover time spent waiting locally plus processing and deletion-not merely handler CPU time. In RabbitMQ, prefetch bounds the unacknowledged replay window.

## Preserve observability at record granularity

For each batch, record:

- source range by partition, sequence, or message IDs;
- attempted, succeeded, duplicate, failed, and unattempted counts;
- first failed position for ordered sources;
- durable transaction IDs or result references where useful;
- checkpoint or acknowledgement values actually accepted;
- retry age and prior receive or delivery count.

Alert on oldest uncheckpointed record, repeated full-batch retries, checkpoint gaps, poison-record age, duplicate-inbox conflicts, and a growing distance between completed and committed positions.

Test a failure at every record position, especially first and last. Kill the consumer after one item commits, after the entire batch commits, and during checkpoint submission. Run handlers out of order, fail the quarantine destination, and trigger a rebalance while a partition batch is in flight.

The durable rule is compact: process however many records improve throughput, but checkpoint only a contiguous, proven prefix for each ordering domain. Everything behind that frontier may run again, so every completed effect must recognize its own replay.

## Official Documentation

- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 `ConsumerRecords` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecords.html)
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/configuration/consumer-configs/)
- [AWS Lambda with Amazon SQS](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [AWS Lambda SQS partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [AWS Lambda Kinesis partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html)
- [RabbitMQ consumer acknowledgements and prefetch](https://www.rabbitmq.com/docs/confirms)
