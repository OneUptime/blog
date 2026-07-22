# Producer Retries vs. Consumer Reprocessing: Finding the Source of Duplicate Kafka Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Producer Retry, Consumer Offset, Idempotent Producer, Duplicate Message

Description: Distinguish duplicate Kafka log records from replayed consumer records and apply the right producer-side or consumer-side correction.

---

Two events that look identical in a Kafka application can have very different origins. A producer retry can append a second log record when idempotence is disabled, while consumer recovery can process the same log record again from an older committed offset.

The fastest diagnostic is to retain both identities:

- `(topic, partition, offset)` identifies the Kafka log record;
- an application `event_id` identifies the logical business event.

Same coordinates processed twice point to consumer replay. The same `event_id` at two coordinates points to duplicate production or an intentional republication. Similar payloads without a stable event ID are not enough to decide.

## Producer duplication has two log records

A producer sends a batch, the broker appends it, and the acknowledgement is lost. From the client's perspective, the request may have failed. If the client sends it again without Kafka's idempotent-producer protection, the broker can append the batch again.

```text
first attempt:  event_id=e-91 -> orders-2@140  (acknowledgement lost)
retry:          event_id=e-91 -> orders-2@141
```

Both offsets are real records. Every consumer group can encounter both.

Kafka's `retries` setting controls automatic retries of potentially transient send failures. `delivery.timeout.ms` bounds the total time to report success or failure after `send()`, including batching, acknowledgement waits, and retriable failures. Setting retries to zero avoids this particular resend, but converts ambiguous transient failures into possible data loss. That is usually the wrong reliability tradeoff.

## Idempotent producers suppress protocol-level retry duplicates

With `enable.idempotence=true`, Kafka associates producer identity and sequence information with batches so a broker can reject a repeated batch rather than append it again. Kafka 4.3 enables idempotence by default when no conflicting configuration disables it. Its requirements include `acks=all`, retries greater than zero, and `max.in.flight.requests.per.connection` no greater than five.

Prefer an explicit production baseline when configuration can be assembled by several layers:

```properties
enable.idempotence=true
acks=all
max.in.flight.requests.per.connection=5
delivery.timeout.ms=120000
```

Leave `retries` unset unless there is a deliberate reason to override the idempotent default. Kafka's producer documentation recommends relying on `delivery.timeout.ms` to bound retry time.

Idempotence also protects ordering across allowed in-flight requests. If idempotence is disabled, retries with more than one in-flight request can let a later successful batch appear before an earlier retried batch.

## Know the limits of producer idempotence

Kafka's guarantee is not a universal business deduplication service.

First, producer idempotence applies within a producer session. A restarted producer has a new session unless a transactional identity and transaction protocol provide the relevant recovery boundary.

Second, application-level resends are new `send()` calls. If code times out waiting on a future, creates a new producer, and constructs the event again, the producer cannot infer that the new call represents an earlier logical event. The Kafka producer API specifically warns that application-level resends cannot be deduplicated by idempotence.

Third, two independent services can publish the same business operation. Each producer can be perfectly idempotent at the protocol level while the topic still receives two logical duplicates.

Give each logical operation a stable `event_id`, create it before the first send, and persist it with the business state. A transactional outbox is a common way to make that persistence atomic.

## Consumer replay has one log record

Now consider a record at `orders-2@140`:

```text
consumer reads offset 140
consumer commits database effect
consumer crashes before committing offset 141
consumer restarts at its older committed offset
consumer reads offset 140 again
```

Kafka has only one record. The consumer group applies it more than once because the durable effect and group offset are separate commits. Rebalances, process failures, manual offset resets, and failed commits can all reveal the same condition.

Kafka stores the offset of the next record to consume. A consumer that successfully handles offset 140 commits 141. Committing before the effect risks omission; committing afterward risks repetition. For durable external effects, repetition plus idempotency is generally the safer choice.

## Build evidence into every event and trace

Use a compact envelope:

```json
{
  "event_id": "01JY7M2A79P8V6K3S5QW1N4TDE",
  "event_type": "OrderApproved",
  "aggregate_id": "order-417",
  "aggregate_version": 12,
  "occurred_at": "2026-07-22T08:41:12Z",
  "payload": {
    "currency": "GBP",
    "amount_minor": 2599
  }
}
```

At production, log the `event_id` and the `RecordMetadata` topic, partition, and offset returned after an acknowledged success. With `acks=0`, the metadata offset is `-1` because the producer does not wait for a broker acknowledgement. At consumption, log the same four fields plus consumer group, handler attempt, and outcome. Do not use a payload hash as the primary identity: two legitimate events can have identical bodies, and semantically identical JSON can serialize differently.

A useful duplicate investigation groups observations as follows:

| Observation | Most likely class | Where to investigate |
|---|---|---|
| Same topic, partition, and offset | Consumer replay | Offset timing, crashes, rebalances, resets |
| Same event ID at different offsets | Duplicate production | Outbox relay, application resend, multiple producers |
| Different event IDs with the same business command | Upstream business duplicate | API idempotency and command creation |
| Same offset handled by two groups | Expected fan-out | Consumer group IDs |

The table identifies a class of cause, not guilt. An operator may intentionally replay a group, and an event can be deliberately republished. Correlate with deployment, rebalance, producer, and outbox logs.

## Diagnose producer-side duplicates

Check the effective producer configuration, not only the desired configuration. A conflicting `acks`, `retries`, or in-flight setting can disable implicit idempotence. If `enable.idempotence` is explicitly true, Kafka rejects incompatible settings instead of silently weakening it.

Then inspect application behavior:

- Is a new producer created for every request?
- Does a wrapper call `send()` again after an uncertain future result?
- Does an outbox publisher mark a row sent only after publishing, then publish it again after a crash?
- Can two service instances create the same business event independently?
- Is a dead-letter replay publishing a new copy into the source topic?

An outbox relay is usually at-least-once. If it publishes successfully and dies before marking the row sent, it publishes again. Keep the outbox event ID unchanged, and make consumers idempotent. Producer idempotence alone may not bridge relay restarts.

## Diagnose consumer-side replay

Compare the processing timestamp with consumer-group activity. Look for:

- a restart or rebalance before a successful offset commit;
- `CommitFailedException` or a commit timeout;
- processing longer than `max.poll.interval.ms`;
- auto-commit while records are still in worker threads;
- a whole-batch retry after one record failed;
- an administrative offset reset or a new group ID;
- asynchronous offset commits that were assumed successful without checking callbacks.

Track fetched position, highest contiguous completed offset, and committed offset separately. Consumer lag alone shows distance from the log end; it cannot prove that a business side effect completed once.

Use a unique constraint or conditional update keyed by `event_id` to make the handler safe. If identity is intentionally scoped to one stream, `(consumer_name, topic, partition, offset)` can work, but it does not recognize the same logical event republished elsewhere.

## Do not confuse transactions with universal exactly-once behavior

A Kafka transaction can atomically write records to Kafka and commit consumed offsets through `sendOffsetsToTransaction()`. Downstream consumers configured with `isolation.level=read_committed` do not expose aborted transactional records. This is a strong answer for Kafka-to-Kafka processing.

It does not make an arbitrary database update or REST call part of the Kafka transaction. Those consumers still need an inbox, a stable downstream idempotency key, or a reconciliation process.

Likewise, a `transactional.id` must be unique to the producer instance represented by that identity. Kafka uses it to recover and fence prior producer epochs; it is not an event ID and should not be reused as one.

## Correct the layer that owns the problem

For protocol-level producer retry duplicates, enable idempotence and compatible durability settings. For application resends and at-least-once outbox relays, preserve a stable event ID and deduplicate downstream. For consumer replay, commit only completed contiguous progress and make business effects idempotent. For duplicate business commands, enforce idempotency where the command first enters the system.

Avoid deleting all duplicates from a topic based only on equal payloads. Kafka records are immutable facts, and separate identical-looking events may be legitimate. Correct the processing projection, preserve audit evidence, and repair the producer or consumer boundary that created the unwanted result.

The central operational rule is simple: always record both Kafka identity and business identity. Without both, teams can spend hours tuning a producer for a consumer-offset problem—or changing commit logic when an outbox relay is actually publishing twice.

## Official Documentation

- [Apache Kafka 4.3 `KafkaProducer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Apache Kafka 4.3 producer configuration](https://kafka.apache.org/43/configuration/producer-configs/)
- [Apache Kafka 4.3 `KafkaConsumer` API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Apache Kafka 4.3 transaction protocol](https://kafka.apache.org/43/operations/transaction-protocol/)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
