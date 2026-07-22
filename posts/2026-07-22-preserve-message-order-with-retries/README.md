# How to Preserve Message Order When Retries and Redelivery Are Enabled

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Message Ordering, Retry, Message Redelivery, Apache Kafka, Amazon SQS, RabbitMQ

Description: Preserve causal order through partitioning, serial per-key execution, order-aware retries, and version checks across common brokers.

---

Retries preserve correctness only when they respect the same ordering domain as normal delivery. If event 7 for an account fails while event 8 succeeds, redelivering event 7 later has already violated causal processing even if the broker originally delivered both in order.

Define the scope of order—usually one entity or aggregate—route that scope to one ordered broker lane, process one sequence at a time, and do not checkpoint or acknowledge past a failed predecessor. Add sequence validation in business state because broker order alone does not cover every replay and republish path.

## Define what “in order” means

Global order across all messages is rarely required and severely limits parallelism. Common scopes are:

- all events for one order;
- commands for one device;
- ledger entries for one account;
- changes for one database key;
- records within one source partition.

Call this the ordering key. Events with different keys may run concurrently; events with the same key must follow their sequence. State the rule as an invariant, such as “version 12 for an order cannot commit before version 11,” rather than the vague “the queue is FIFO.”

## Broker order is only the first half

Ordered delivery does not guarantee ordered completion. A consumer can receive events 11 and 12 in order, submit both to a thread pool, and commit 12 first. A retry queue can remove failed 11 from the main lane and allow 12 through. A dead-letter action can do the same deliberately.

Preserving order therefore requires all of these:

1. Producers choose the same ordering key consistently.
2. The broker maps that key to one ordered lane.
3. The consumer serializes effects within that lane or uses an ordered completion frontier.
4. Retry stays in front of later work for the same key.
5. The business store rejects stale or gapped versions.

## Kafka: key, partition, and contiguous offsets

Kafka guarantees order within a topic partition, not across partitions. Events with the same key are normally routed to the same partition, so an `order_id` or `account_id` is the natural record key.

```java
producer.send(new ProducerRecord<>(
    "order-events",
    event.orderId(),     // ordering key
    serialize(event)
));
```

Keep producer idempotence enabled. Kafka documents that with idempotence disabled, retries and more than one in-flight request can let a later batch appear before an earlier retried batch. Idempotence is enabled by default when compatible settings are used and requires no more than five in-flight requests per connection.

On the consumer side, one consumer in a group owns a partition at a time, but application worker pools can still reorder completion. Process the partition serially, or maintain per-key queues plus a per-partition contiguous offset frontier. Never commit offset 103 while failed offset 101 is unresolved merely because 102 completed.

For blocking retry, pause the affected partition, continue polling as required for group membership, retry with bounded backoff, then resume. This preserves partition order but stalls unrelated keys that share the partition. More partitions reduce that blast radius at operational cost.

A retry topic frees the source partition but breaks strict order unless later records for the same key are also held. Use it only when out-of-order handling is acceptable, when effects are version-gated, or when a separate sequencer buffers each key.

Adding partitions deserves planning. Kafka's operations documentation warns that key distribution can change when partition count increases, which can affect ordering for existing keys. Coordinate producer routing and drain or version transitions if the same key might move while older events remain in its previous partition.

## SQS FIFO: use a domain message group

SQS FIFO orders messages within a `MessageGroupId`. Later messages in the group are not made available through subsequent receives while an earlier received message remains in flight. Different groups can run concurrently.

```javascript
await sqs.send(new SendMessageCommand({
  QueueUrl: queueUrl,
  MessageBody: JSON.stringify(event),
  MessageGroupId: event.accountId,
  MessageDeduplicationId: event.eventId
}));
```

Use one stable group ID per ordering key. A constant group ID gives total queue order and poor parallelism. A random ID per message gives parallelism and no entity order.

If processing fails, do not delete the message. When visibility expires, it becomes available again and the group remains blocked behind it. Size and renew visibility so a slow valid attempt does not overlap its redelivery.

For Lambda partial batch responses on FIFO queues, AWS explicitly recommends stopping after the first failure and returning both failed and unprocessed messages. Continuing through the batch could apply later messages first even though SQS delivered the batch in group order.

Moving a poisoned message to a FIFO dead-letter queue allows later group messages to proceed, so end-to-end business order is no longer strict. Choose between availability and order consciously: quarantine the whole key, block and repair, or let version checks defer later events.

## RabbitMQ: account for consumers and requeue

RabbitMQ queues are ordered collections, but multiple active consumers process concurrently and requeueing can change observed order. Priorities also allow higher-priority messages to overtake lower-priority ones.

RabbitMQ documents two primary choices for preserved order:

- a stream, whose immutable offsets do not change; or
- a queue with Single Active Consumer, plus ordered returns for requeued messages.

Single Active Consumer keeps one consumer active and promotes another on failure. It preserves dispatch continuity but does not make the handler idempotent. An unacknowledged message is requeued when the active consumer's channel closes, so the replacement may repeat an effect.

If ordering is per entity rather than global, partition entities across queues and run a single active consumer for each lane. Keep the hash and queue-count transition stable, or migrate keys with an explicit cutover sequence.

Avoid immediate `nack(requeue=true)` loops. They can consume broker and network resources while repeatedly presenting the same head failure. Use bounded delayed retry that continues to block or fence only the affected ordering key.

## Choose a retry strategy by its ordering effect

### Blocking retry

Stop the lane at the failed record and retry it in place. This gives the strongest order and simplest state model. One unavailable dependency or poison record can halt every key sharing that lane, so attempts must be bounded and observable.

### Deferred retry with a held suffix

Move the failed record to delayed storage, but mark the ordering key blocked. Buffer or defer every later version for that key until the failed version succeeds or is resolved. This improves unrelated-key throughput at the cost of a durable per-key sequencer.

### Process ahead with versioned effects

Allow delivery and attempts out of order, but make the business store accept only the next version. Later records become deferred rather than successful. This can work for projections with a repair process, but it requires durable gap tracking and must avoid an endless hot retry loop.

### Skip or dead-letter

Declare that later work may continue after a terminal failure. This is often correct for independent jobs and often wrong for ledgers or state transitions. Record the broken-order decision and provide reconciliation; do not still claim strict processing order.

## Enforce sequence in the business state

Carry both a stable event ID and monotonic aggregate version:

```sql
UPDATE account_projection
SET balance_minor = :new_balance,
    version = :incoming_version
WHERE account_id = :account_id
  AND version = :incoming_version - 1;
```

Interpret a zero-row result by reading current state:

- current version equals incoming version: likely duplicate;
- current version is greater: stale event;
- current version is lower by more than one: gap; defer and alert;
- no aggregate exists: missing creation or invalid route.

Perform inbox deduplication and the conditional state update in one transaction. A broker can redeliver the same version after a crash, and the inbox prevents a repeated effect. The version rule detects different event IDs that are stale or out of order.

Do not rely on wall-clock timestamps for sequence. Clocks skew, concurrent producers race, and equal timestamps occur. Allocate versions at the authoritative aggregate update, ideally in the same database transaction as the outbox event.

## Preserve order across a consumer rebalance

During Kafka revocation or a RabbitMQ consumer failover, stop assigning new work, drain or cancel in-flight work for the affected lanes, commit only completed contiguous progress, and fence stale workers. The new owner must start from the durable checkpoint and state version.

A callback cannot handle every hard failure. Include an ownership epoch or lease version in delayed database writes so a worker that lost its lane cannot commit after the replacement has started.

## Test overtaking, not just delivery

Create versions 1 through 20 for several keys. Delay version 7, fail it transiently, crash its worker, and let other keys continue. Assert that:

- versions for the delayed key commit in sequence;
- unrelated keys continue according to the chosen isolation scope;
- version 7 can run more than once but has one effect;
- no checkpoint advances past its unresolved hole;
- terminal handling has the documented block-or-skip outcome.

Repeat during a producer retry, partition or consumer reassignment, visibility expiry, Single Active Consumer failover, and dead-letter redrive. Measure blocked-key age, gap count, retry attempts, stale-version rejection, and per-lane backlog—not only overall queue depth.

Message order survives retries only when the retry path is part of the ordering design. Keep each causal key on one lane, keep its checkpoint behind the first unresolved event, and make stored versions the final authority when infrastructure behavior and application concurrency meet.

## Official Documentation

- [Apache Kafka 4.3 introduction and partition ordering](https://kafka.apache.org/43/getting-started/introduction/)
- [Apache Kafka 4.3 producer configuration](https://kafka.apache.org/43/configuration/producer-configs/)
- [Apache Kafka 4.3 topic partition changes](https://kafka.apache.org/43/operations/basic-kafka-operations/#modifying-topics)
- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Amazon SQS FIFO delivery logic](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html)
- [Using SQS FIFO message group IDs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagegroupid-property.html)
- [AWS Lambda SQS partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [RabbitMQ message ordering](https://www.rabbitmq.com/docs/queues#message-ordering)
- [RabbitMQ Single Active Consumer](https://www.rabbitmq.com/docs/consumers#single-active-consumer)
