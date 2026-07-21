# Consumer Crashes After the Side Effect but Before Acknowledgement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed System, Message Queue, Idempotency, Kafka, RabbitMQ, Amazon SQS, Reliability

Description: Understand the crash window between a durable side effect and message acknowledgement, then contain duplicates without accepting silent loss.

---

A consumer updates the database successfully. Before it acknowledges the message, the process crashes. The broker cannot see the database commit, so it delivers the message again. The update may run twice.

This tiny interval is the central ambiguity in at-least-once processing. It exists whether completion is represented by a RabbitMQ acknowledgement, an Amazon SQS delete, or an Apache Kafka offset commit. The syntax changes, but the two durable facts remain separate:

1. the business side effect committed;
2. the messaging system recorded progress.

If those facts cannot be committed atomically, no ordering removes all risk. Processing first permits duplicates. Recording progress first permits loss.

## Walk Through the Failure

Assume message `payment-847` asks a worker to capture a payment:

```text
T1  broker delivers payment-847
T2  consumer calls the payment service
T3  payment service commits the charge
T4  consumer process crashes
T5  broker does not have an acknowledgement
T6  broker redelivers payment-847
T7  replacement consumer calls the payment service again
```

At `T4`, both sides are behaving correctly. The payment service cannot retract a committed charge merely because the client connection vanished. The broker cannot discard an unacknowledged message based on a side effect it cannot observe.

A lost acknowledgement creates the same result. The connection can fail while an acknowledgement is in flight, so the consumer may not know whether the broker received it. Retrying is the safe choice for delivery, but only if repeating the business operation is safe.

## Why Acknowledging First Is Not a Fix

Moving acknowledgement before processing changes the failure:

```text
T1  broker delivers payment-847
T2  consumer acknowledges payment-847
T3  consumer process crashes
T4  payment is never captured
```

Now the broker correctly considers the message complete, and there is nothing to redeliver. The system traded a possible duplicate for silent loss.

That choice can be reasonable for disposable data, such as a rapidly superseded UI update. It is normally unacceptable for orders, payments, entitlement changes, or compliance events. The choice should follow the business invariant, not a desire to keep duplicate metrics at zero.

## How the Major Systems Express Completion

RabbitMQ's manual acknowledgement tells the broker that the consumer has taken responsibility for a delivery. Its documentation says unacknowledged deliveries are automatically requeued when a channel or connection closes. RabbitMQ therefore tells consumers to expect redelivery and design for idempotence. Automatic acknowledgement considers a message delivered as soon as it is sent, which increases the risk of losing consumer work.

Amazon SQS keeps a received message in the queue but hides it for a visibility timeout. The consumer completes the protocol by deleting the message with its receipt handle. If it crashes after the side effect but before deletion, the timeout expires and the message can be received again. AWS also documents that standard queues may redeliver a redundant copy even when another copy was deleted.

Kafka stores consumer progress as the offset of the next record to consume in each partition. Processing a record and committing afterward gives at-least-once behavior. A crash between the effect and the offset commit causes the replacement consumer to restart from the older committed offset. Committing before processing can skip the record after a crash.

These mechanisms reduce uncertainty between a client and the broker. None automatically participates in a transaction with an arbitrary database or external API.

## Make the Local Effect Idempotent

For a relational database effect, create an inbox table keyed by both consumer and stable event ID:

```sql
CREATE TABLE consumer_inbox (
    consumer_name text NOT NULL,
    event_id text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (consumer_name, event_id)
);
```

In one database transaction, claim the event and apply the business update only when that claim is new:

```text
begin database transaction

insert (consumer_name, event_id) into consumer_inbox
if the unique key already exists:
    commit without repeating the effect
else:
    apply the business update
    commit the claim and update together

acknowledge the message after the database commit
```

The unique constraint is the concurrency control. A separate `SELECT` followed by an `INSERT` is unsafe because two consumers can both observe that no row exists. An in-memory cache is also insufficient because it disappears on restart and is not atomic with the database update.

The event ID must represent the logical operation and survive redelivery, republishing, and dead-letter replay. A delivery tag, receipt handle, or consumer instance ID identifies a transport attempt, not the business command.

## External Side Effects Need Cooperation

An inbox transaction cannot roll back an API call that already reached another system. Send a stable idempotency key when the downstream API supports one. On retry, the downstream service should return the original result instead of performing the operation again.

If the outcome is unknown, query or reconcile it using that same business identity. Do not generate a new key simply because the local attempt timed out. For operations without idempotency support, use a domain-specific ledger, conditional state transition, reservation, or compensating action. Some effects, such as sending an email, may only support detection and an explicit decision that occasional repetition is acceptable.

An outgoing message introduces another dual write: updating local state and publishing a follow-up event. The transactional outbox pattern writes the business change and an outbox row in the same local transaction. A relay publishes committed rows afterward. AWS notes that the relay can itself publish duplicates, so downstream consumers still need idempotency.

## Store Progress With the Effect When Possible

Kafka documents a stronger option for database outputs: store the result and the source offset in the same database transaction, then restore the consumer position from that stored offset. This makes the database result and progress atomic in that database.

It also transfers offset-management responsibility to the application. Partition assignment, rebalances, seeking, retention, and per-partition ordering must all be handled correctly. This technique does not make a separate payment service part of the database transaction.

For Kafka-to-Kafka processing, Kafka transactions can atomically write output records and consumer offsets. Consumers of that output must use `read_committed` when aborted transactional records must remain invisible. The transaction's guarantee stops at Kafka; an unrelated database or API is outside it.

## Handle Concurrency, Leases, and Rebalances

Redelivery may overlap the original worker. An SQS visibility timeout can expire while slow processing continues. A Kafka rebalance can move a partition after a consumer exceeds `max.poll.interval.ms`. A RabbitMQ connection can be considered dead while application work is still completing elsewhere.

Use database uniqueness or conditional updates to fence concurrent attempts. Extend an SQS visibility timeout only while verified work is progressing. Keep Kafka processing within the poll interval, reduce batch size, or pause partitions while external workers finish and commit only the highest contiguous completed offset. Bound RabbitMQ prefetch so a failed consumer does not hold excessive unacknowledged work.

A graceful shutdown narrows the window but cannot eliminate it. Stop acquiring work, finish in-flight operations, durably record their result, acknowledge, and then close. Power loss can still occur immediately after the side effect.

## Test the Ambiguous Moment

Add failure injection around every boundary:

1. crash before the side effect;
2. crash during the side-effect transaction;
3. crash immediately after commit but before acknowledgement;
4. lose the acknowledgement response;
5. allow a lease or poll interval to expire during processing;
6. run two attempts for the same event concurrently;
7. replay the event from a dead-letter path.

Assert the business invariant, not the handler invocation count. The handler may run twice while the charge, inventory reservation, or account transition happens once.

Monitor delivery attempts, redeliveries, deduplication hits, acknowledgement failures, oldest retry age, dead-letter volume, and reconciled duplicate effects. A deduplication hit is often proof that the safeguard worked. A duplicate side effect is the incident.

The reliable ordering is still side effect first, acknowledgement second when loss is unacceptable. Accept that it opens a retry window, then close the business risk with atomic local deduplication, downstream idempotency, or a transaction whose documented scope includes both facts.

## Official Documentation

- [RabbitMQ consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Apache Kafka 4.3 consumer API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.3 delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
