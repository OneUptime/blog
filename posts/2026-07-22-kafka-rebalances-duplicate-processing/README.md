# Why Kafka Consumer Rebalances Cause Duplicate Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Consumer Rebalance, At-Least-Once Delivery, Consumer Offset, Idempotency

Description: Understand how Kafka partition reassignment exposes uncommitted work and design consumers that remain correct when records are processed again.

---

A Kafka rebalance does not copy records. It changes which consumer owns each partition. Duplicate processing appears when the previous owner has applied a record's effect but Kafka still holds an older committed offset, so the new owner resumes from that older recovery point.

This is a normal consequence of at-least-once consumption, not proof that Kafka stored the record twice. The reliable response is to commit only completed progress, make effects idempotent, and stop old workers from continuing after they lose partition ownership.

## Follow the record through a rebalance

Suppose partition `orders-3` contains offsets 80 through 84. Consumer A reads and applies all five records, but its last committed offset is 80. Before it commits 85, another consumer joins the group and `orders-3` moves to consumer B.

```text
Kafka log:             80  81  82  83  84
effect completed:      yes yes yes yes yes
committed next offset: 80
new owner starts at:   80
```

Consumer B receives offsets 80 through 84 again. The topic, partition, and offset identify the same log records; only their application processing is repeated.

Kafka distinguishes the consumer's current position from its committed position. `poll()` advances the current position as records are returned. A commit stores the recovery position for the group, and the committed value is the offset of the *next* record to consume. Processing a record does not automatically tell Kafka that a database write, API request, or email completed.

## Why rebalances happen

Partition assignment can change when:

- a consumer joins, leaves, crashes, or becomes unreachable;
- the subscribed topic gains partitions or a pattern subscription discovers another topic;
- a member takes longer than `max.poll.interval.ms` between polls;
- an operator deploys or scales the consumer fleet;
- group membership or assignment configuration changes.

Kafka 4.3 supports both the classic and newer consumer group protocols. The newer protocol is fully incremental and can reduce disruption, while cooperative assignment avoids unnecessarily revoking unaffected partitions in compatible classic-protocol deployments. These mechanisms reduce the amount of work moved. They do not make an external effect and an offset commit atomic, and therefore cannot eliminate replay.

## The unavoidable failure window

For a consumer that writes to an ordinary database, two durable operations are involved:

1. Commit the business effect to the database.
2. Commit the source offset to Kafka.

If the offset is committed first, a crash between the two operations loses the business effect. If the database commits first, a crash in the opposite window repeats the record. Choosing database first gives at-least-once behavior, but requires idempotency.

```text
process offset 84
commit database transaction
-- process stops or partition is lost here --
commit Kafka offset 85
```

A rebalance merely makes that old recovery point visible quickly. The same replay would occur after a process restart without a rebalance.

## Commit only completed, contiguous progress

Disable automatic commits when records leave the poll thread or finish asynchronously. Track completion separately for each partition, and advance the commit frontier only past a completed prefix of records in that partition's delivery order. Kafka offsets are not guaranteed to be numerically consecutive, so track the records actually returned by `poll()` rather than waiting for every integer offset.

If offsets 40 and 42 finish while 41 is still running, committing 43 declares all three complete. A crash would then skip 41. The safe frontier remains 41 until work for offset 41 succeeds.

A simple synchronous consumer has a clear boundary:

```java
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

while (running) {
    ConsumerRecords<String, OrderEvent> records =
        consumer.poll(Duration.ofMillis(500));

    for (ConsumerRecord<String, OrderEvent> record : records) {
        applyIdempotently(record); // returns after durable completion
    }

    if (!records.isEmpty()) {
        consumer.commitSync(records.nextOffsets());
    }
}
```

This can replay the uncommitted tail after a failure, but it does not skip a failed record. `ConsumerRecords.nextOffsets()` supplies the next offsets for every partition whose position advanced during the poll.

With worker pools, maintain a per-partition completion tracker. Pause partitions with too much in-flight work, continue polling within the group contract, and resume only when capacity is available. The `KafkaConsumer` itself must remain on its owner thread; only `wakeup()` is documented as safe from another thread.

## Use rebalance callbacks correctly

A `ConsumerRebalanceListener` provides three distinct signals:

- `onPartitionsRevoked` is the planned handoff path. Stop accepting work for those partitions, wait or cancel safely, flush state, and commit only completed offsets.
- `onPartitionsAssigned` initializes the new owner from the applicable recovery state.
- `onPartitionsLost` means another member may already own the partitions. Do not assume it is still safe to commit or apply buffered effects.

Kafka recommends committing offsets during revocation to prevent unnecessary duplicate data. That is an optimization, not a correctness boundary. A killed process, network failure, or exceeded poll interval may prevent an orderly flush, and the `onPartitionsLost` documentation explicitly warns that ownership may already have moved.

Do not let a stale worker continue writing after revocation. Tag work with an ownership generation and discard results after that generation is invalidated. When the effect needs authoritative fencing across consumers, use a database lease or monotonically increasing fencing token for the partition or business entity and check it in the same transaction as the business update. Kafka can reject a stale offset commit with `CommitFailedException`; it cannot undo a stale HTTP call or database update.

## Make the effect idempotent

Use a stable event identifier, not a delivery-attempt identifier. For Kafka-specific deduplication, `(topic, partition, offset)` uniquely identifies a log position. A producer-supplied event ID is usually better when the same logical event can be republished to another topic or restored into a new cluster.

A relational inbox can join deduplication and the business update in one transaction:

```sql
BEGIN;

INSERT INTO consumed_event (consumer_name, event_id, processed_at)
VALUES ('order-projection', :event_id, now())
ON CONFLICT (consumer_name, event_id) DO NOTHING
RETURNING event_id;

-- Run this only when the INSERT returned a row.
UPDATE order_projection
SET status = :status, version = :version
WHERE order_id = :order_id AND version < :version;

COMMIT;
```

On replay, the unique constraint wins even if two owners briefly race. After either the first application or the duplicate no-op commits, the consumer may commit the Kafka offset. Keep inbox entries at least as long as a record can be replayed, including operational resets and topic restores.

An idempotent state assignment such as “set order 417 to shipped at version 9” is naturally safer than “increment shipments.” External APIs need their own stable idempotency keys because a local inbox alone cannot atomically cover a remote service.

## Know what Kafka transactions cover

A transactional Kafka producer can atomically publish output records and send consumed offsets to the transaction. Consumers of that output use `isolation.level=read_committed` when they must hide aborted writes. This is the right boundary for Kafka-to-Kafka processing.

It does not atomically include an arbitrary SQL database, payment provider, or email service. For those effects, use an inbox, a transactionally stored source offset, or another idempotency and reconciliation design.

## Reduce rebalances without depending on their absence

Tune the poll loop so normal work stays inside `max.poll.interval.ms`. Reduce `max.poll.records` for slow handlers, move long-running work behind a controlled handoff, and keep polling while paused if the architecture supports it. Static membership can reduce movement during brief restarts, and incremental assignment can reduce the number of revoked partitions.

These settings improve availability and shrink the replay window. They must not be the only duplicate defense: deployments, machine failures, stalled runtimes, and operator-triggered resets still happen.

Monitor at least:

- rebalance count, duration, and reason;
- last successful poll and last successful offset commit;
- fetched, completed, and committed offsets per partition;
- records in flight when a partition is revoked or lost;
- `CommitFailedException` and poll-interval violations;
- inbox conflicts or other duplicate-detection hits.

Test a stop immediately after the business commit and before the offset commit. Then add a second consumer to force reassignment. The expected result is repeated delivery but one business effect. Also test a lost partition while a slow worker is still active; its late result must be fenced or safely idempotent.

A good Kafka consumer does not promise that a handler runs once. It promises that however many times Kafka resumes from a committed offset, the durable business outcome remains correct.

## Official Documentation

- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 `ConsumerRebalanceListener` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html)
- [Apache Kafka 4.3 consumer configuration](https://kafka.apache.org/43/configuration/consumer-configs/)
- [Apache Kafka 4.3 consumer rebalance protocol](https://kafka.apache.org/43/operations/consumer-rebalance-protocol/)
- [Apache Kafka 4.3 delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [PostgreSQL `INSERT` and `ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html)
