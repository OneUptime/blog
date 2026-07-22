# Kafka Offset Commits: Before or After Processing?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Consumer Offset, At-Least-Once Delivery, Idempotency, Transaction, Consumer Group

Description: Choose Kafka offset commit timing correctly, including auto-commit, sync and async commits, rebalances, long processing, and transactions.

---

Commit Kafka offsets after processing when losing a record is unacceptable. A crash after the effect but before the commit may repeat work, so the effect must be idempotent. Commit before processing only when skipping work after a crash is an accepted at-most-once tradeoff.

That short answer hides several details. Kafka tracks positions per partition, commits the offset of the next record, and can reassign a partition while work is still in flight. `enable.auto.commit`, synchronous commits, asynchronous commits, and transactions solve different parts of the problem.

This guide follows the Apache Kafka 4.3 documentation and Java client API.

## Separate Position From Committed Position

A Kafka consumer has two important positions for each partition:

- The current position is the offset of the next record `poll()` will return. It advances when `poll()` gives records to the application.
- The committed position is stored in Kafka and is the recovery point used after restart or rebalance.

Processing is an application concept. Kafka does not know that a database transaction, HTTP call, or handler callback succeeded merely because `poll()` returned a record.

If offset 41 was processed successfully, the value to commit is 42. The Kafka 4.3 API explicitly says the committed offset should identify the next message to consume. `ConsumerRecords.nextOffsets()` supplies the next offsets, including leader-epoch metadata, for every partition whose position advanced during the poll.

Offsets are cumulative within a partition. Committing 42 means every lower offset is considered complete for that consumer group. You cannot safely commit around a processing hole where offset 40 is still running but 41 has finished.

## Commit Before Processing: At-Most-Once

The failure sequence is simple:

```text
poll record at offset 41
commit offset 42
crash before applying the effect
restart at offset 42
```

Offset 41 will not be returned again to that group under normal recovery, so its effect is lost. This ordering can fit disposable, rapidly superseded work where duplication is more harmful than omission. It is usually wrong for payments, orders, audit events, or durable projections.

## Commit After Processing: At-Least-Once

Reversing the order protects against loss:

```text
poll record at offset 41
commit the business effect
crash before committing offset 42
restart from the older committed offset
process offset 41 again
```

The duplicate is expected. Use a stable event ID, a database unique constraint, a conditional state transition, or a downstream idempotency key so repeated handling produces one acceptable effect.

Batch size defines the replay window. If 500 records are processed and one offset is committed after the whole batch, a crash can repeat much of that batch. Committing more often reduces replay but increases coordinator traffic and latency. The correct interval follows the cost of repetition and the throughput requirement.

## What `enable.auto.commit` Actually Means

Kafka 4.3 defaults `enable.auto.commit` to `true` and `auto.commit.interval.ms` to five seconds. The configuration periodically commits consumer offsets. It does not wait for an application callback or verify that a side effect finished.

The critical input is the position advanced by `poll()`. The Kafka consumer documentation says automatic commits can still provide at-least-once delivery only if the application completely consumes every record returned by a poll before the next poll or before closing. Otherwise, a committed offset can move ahead of actual processing and records can be missed.

This synchronous loop can satisfy that condition if `handle()` returns only after durable completion:

```java
while (running) {
    ConsumerRecords<String, Event> records = consumer.poll(Duration.ofMillis(500));
    for (ConsumerRecord<String, Event> record : records) {
        handle(record); // Must finish before the next poll.
    }
}
```

Auto-commit becomes dangerous when the poll thread hands records to a worker pool and immediately polls again. Kafka sees returned positions advancing while workers may still be running. Disable auto-commit for that design and track completed offsets explicitly.

## Manual Synchronous Commits

With `enable.auto.commit=false`, the application controls when Kafka records progress. `commitSync()` blocks until the commit succeeds, an unrecoverable error occurs, or the configured timeout expires. Failures are reported to the caller, which makes it a straightforward choice at a batch boundary or graceful shutdown.

```java
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

while (running) {
    ConsumerRecords<String, Event> records = consumer.poll(Duration.ofMillis(500));

    for (ConsumerRecord<String, Event> record : records) {
        processIdempotently(record);
    }

    if (!records.isEmpty()) {
        consumer.commitSync(records.nextOffsets());
    }
}
```

This example commits only after every returned record finishes. If processing throws, it must not commit offsets beyond the failed record. On restart, successfully processed records in the uncommitted batch can repeat, which is why `processIdempotently` is not optional for important effects.

A synchronous commit adds a coordinator round trip to the processing path. Commit per record only when that latency and load are justified. Per-partition or batch commits usually offer a better balance.

## Manual Asynchronous Commits

`commitAsync()` submits the commit without blocking. Kafka 4.3 documents that multiple asynchronous commit calls and their callbacks are ordered. Errors go to the callback when one is supplied; without a callback they are discarded.

Always provide a callback and record failures:

```java
consumer.commitAsync(records.nextOffsets(), (offsets, error) -> {
    if (error != null) {
        log.warn("Offset commit failed for {}", offsets, error);
    }
});
```

Do not blindly resubmit a stale offset map from an old callback after newer work has completed. A later retry is a new commit call and can move progress backward. Track the highest contiguous processed offset per partition and verify current ownership before retrying.

A useful hybrid is asynchronous commits during steady-state processing and a synchronous commit for completed work during orderly shutdown or partition revocation. Kafka documents ordering between async submissions and a subsequent sync commit, subject to the active group protocol. Handle the sync result rather than assuming it succeeded.

## Rebalances Change Who May Commit

With dynamic subscription, group membership or topic changes can reassign partitions. A `ConsumerRebalanceListener` gives the application an opportunity to flush state and commit completed offsets for partitions being revoked.

Commit only work that is actually complete. Once the consumer no longer owns a partition, a commit can fail with `CommitFailedException`. Kafka describes this as a safety mechanism that prevents an inactive group member from committing offsets. A classic-protocol consumer using a duplicate static `group.instance.id` can also be fenced.

`RebalanceInProgressException` means ownership is not yet settled. Calling `poll()` can complete the rebalance, but the assignment and fetch positions may then differ. Do not retry the old commit map without rechecking both.

Rebalance callbacks reduce unnecessary replay during planned movement. They cannot make an external side effect and an offset commit atomic, and a hard crash provides no callback.

## Keep Processing Within the Poll Contract

`max.poll.interval.ms` bounds the delay between `poll()` calls under consumer group management. Kafka 4.3 defaults it to five minutes. If a dynamic consumer exceeds it, the client is considered failed and its partitions can be reassigned. With a non-null `group.instance.id`, reassignment is delayed until the applicable session timeout after heartbeats stop, but processing still needs a deliberate design.

Reduce `max.poll.records`, raise the interval when justified, or separate polling from processing. If using worker threads:

- keep `KafkaConsumer` access on one owner thread, except for the documented thread-safe `wakeup()` call;
- pause partitions whose records are in flight;
- continue polling often enough for group progress;
- resume only after work completes;
- commit only the highest contiguous completed offset for each partition;
- stop stale workers from applying effects after partition revocation.

The last point is application fencing. Kafka can reject a stale offset commit, but it cannot automatically undo a stale worker's database write.

## Transactions Have a Specific Boundary

After calling `initTransactions()` once, a transactional producer can atomically write Kafka output records and consumed offsets:

```java
producer.beginTransaction();

for (ConsumerRecord<String, Event> record : records) {
    producer.send(transform(record));
}

producer.sendOffsetsToTransaction(records.nextOffsets(), consumer.groupMetadata());
producer.commitTransaction();
```

Kafka's producer API says the consumer should use `enable.auto.commit=false` and should not manually commit offsets in this pattern. Downstream consumers that must hide aborted transactional writes use `isolation.level=read_committed`. If processing fails, abort the transaction and reset the consumer position before reprocessing.

The transaction covers Kafka output and group offsets. It does not include an arbitrary database, payment provider, or email service. For a relational output, Kafka documents storing the result and source offset together in one database transaction, then restoring the consumer position from that database. That moves offset management outside Kafka and requires careful assignment, seek, and rebalance handling. Another common approach is an idempotent inbox transaction followed by a normal Kafka offset commit.

## Operate the Decision

Track the fetched position, highest completed offset, committed offset, and end offset separately. Alert on commit failures, commit age, rebalances, poll-interval breaches, processing holes, duplicate-detection hits, and business reconciliation failures. Consumer lag alone cannot reveal work that was committed before it completed.

Test crashes before the effect, after the effect, before the commit, during a commit, and during a rebalance. Include slow handlers that exceed the poll interval and out-of-order worker completion within one partition.

The safe default for durable work is manual progress after an idempotent effect. Use auto-commit only when the complete poll batch is truly finished before another poll. Use Kafka transactions when both progress and output fit inside Kafka's transaction boundary. Every other design should state clearly whether its unresolved failure is loss or repetition.

## Official Documentation

- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/configuration/consumer-configs/)
- [Apache Kafka 4.3 delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Apache Kafka 4.3 `KafkaProducer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Apache Kafka 4.3 `ConsumerRebalanceListener` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html)
