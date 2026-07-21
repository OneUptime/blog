# How to Design an Idempotent Consumer for At-Least-Once Messaging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Messaging, Reliability, Distributed System, PostgreSQL

Description: Design an idempotent message consumer that handles redelivery safely with stable IDs, atomic database claims, and correct acknowledgments.

---

At-least-once messaging deliberately prefers retrying a message over silently losing it. The tradeoff is that a consumer can receive the same logical event more than once. A correct consumer therefore makes repeated delivery produce the same durable result as one delivery.

The difficult part is not recognizing the word "duplicate." It is closing the failure window between changing business state and telling the broker that processing succeeded.

## Why Redelivery Is Normal

Imagine a consumer that applies a payment, commits the database transaction, and then crashes before acknowledging the message. The broker cannot know that the payment committed, so it delivers the message again.

The major brokers express this in different ways:

- Kafka documents at-least-once processing when records are processed before the consumer position is saved. A crash between those steps causes records to be processed again.
- RabbitMQ automatically requeues unacknowledged deliveries when a channel or connection closes. Its redelivered flag is a hint that a delivery may have been seen before, not a durable message identity.
- Amazon SQS standard queues can return another stored copy of a message when an unavailable copy was not removed by a delete operation. A visibility timeout only makes a received message temporarily invisible. If the message is not deleted in time, it becomes available again.

Retries, rebalances, timeouts, network ambiguity, and operator-requested replay all lead to the same design requirement. Treat every delivery as potentially repeated.

## Define the Idempotent Effect

Idempotency belongs to a business operation, not to a consumer process. Setting an order status to paid may already be idempotent if the transition is guarded correctly. Incrementing a balance, sending an email, or creating a refund is not naturally idempotent.

Write down the effect that must happen once:

- apply one ledger entry for a payment event;
- create one shipment for an order;
- emit one downstream event for a state transition; or
- record the latest version of a customer profile.

The consumer can then use a natural business key, a version check, or a separate processing ledger to enforce that rule.

## Require a Stable Event ID

The producer should create an immutable event ID when it creates the logical event. The same ID must survive publish retries, broker redelivery, dead-letter queue moves, and replay.

Scope the key to the logical consumer. A useful database key is the pair of consumer name and event ID. Two independent consumers may each need to process the same event once, so making the event ID globally unique in a shared ledger can incorrectly suppress valid work.

Do not use a RabbitMQ delivery tag as the event ID because it identifies a delivery only within one channel. A Kafka topic, partition, and offset can identify one Kafka log record, but a domain event ID is more portable across republishing and migration. Hashing the whole payload is also a weak primary identity: two legitimate events can have identical payloads, while equivalent payloads can serialize differently.

## Claim and Mutate in One Transaction

For business state stored in PostgreSQL, a processing ledger can use a composite primary key:

~~~sql
CREATE TABLE processed_messages (
    consumer_name text NOT NULL,
    message_id text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (consumer_name, message_id)
);
~~~

PostgreSQL enforces the primary key under concurrency. INSERT with ON CONFLICT DO NOTHING lets competing deliveries attempt the claim without a check-then-insert race:

~~~text
begin database transaction

claim = execute:
    INSERT INTO processed_messages (consumer_name, message_id)
    VALUES ('apply-payment-v1', 'evt_01JXYZ')
    ON CONFLICT (consumer_name, message_id) DO NOTHING
    RETURNING message_id

if claim returned a row:
    update the account balance
    insert the transactional outbox event
else:
    make no business change

commit database transaction
~~~

The application must branch on whether the INSERT returned a row. If it returned nothing, another committed transaction already claimed that consumer and message pair, so the application commits no business change and treats the delivery as successfully handled.

Most importantly, the claim row, business update, and any transactional outbox row must be in the same database transaction. PostgreSQL transactions make those database steps all-or-nothing. If the transaction rolls back, the claim rolls back too and a retry can process the event.

Committing the claim before the business update is unsafe. A crash between them makes the retry skip work that never happened. Applying the update before recording the claim is also unsafe. A crash in that gap permits the update to happen twice.

## Acknowledge Only After Commit

The safe sequence is:

1. Receive the delivery.
2. Begin the database transaction.
3. Attempt the unique claim.
4. If newly claimed, apply business changes and write any outbox records.
5. Commit the database transaction.
6. Acknowledge, delete, or commit the broker position.

For RabbitMQ, use manual acknowledgments and acknowledge on the same channel after the database commit. For SQS, delete the message with its current receipt handle after the commit, and extend the visibility timeout when processing might exceed it. For Kafka, save the consumer position after successful processing when using ordinary at-least-once consumption.

There is still a crash window after the database commit and before broker acknowledgment. That is expected. Redelivery enters the same transaction, loses the unique-key race, performs no second mutation, and is then acknowledged.

Acknowledging first reverses the risk. If the consumer crashes after the acknowledgment but before committing business state, the broker may not redeliver and the effect is lost.

## Respect Transaction Boundaries

A PostgreSQL transaction cannot atomically include an arbitrary HTTP API, email provider, or second database. Calling an external service inside the transaction does not make that call roll back when PostgreSQL rolls back.

Use one of these approaches instead:

- pass the same stable idempotency key to a downstream API that officially supports it;
- write an outbox record in the business transaction, then publish it with a retrying dispatcher;
- model the external operation as a persisted state machine and reconcile ambiguous outcomes; or
- make the downstream resource use a unique business key, such as one shipment per order.

Kafka transactions have the same boundary. Kafka can atomically commit consumed offsets and records produced to Kafka topics. Kafka's documentation states that exactly-once delivery to other destination systems generally requires cooperation from those systems. A Kafka transaction does not silently absorb an unrelated SQL or HTTP operation.

## Retention Is Part of Correctness

A deduplication row is useful only while it exists. Keep it for at least the longest period during which a message can return, including broker retention, dead-letter recovery, backup restoration, delayed retries, and intentional replay.

Deleting old rows changes the semantics: an old event becomes processable again. That may be acceptable for a projection that can be rebuilt, but dangerous for payments or notifications. For permanent business invariants, prefer a natural unique key on the business record rather than a short-lived processing ledger.

If event IDs could be reused across producers or environments, include the producer, tenant, or source stream in the uniqueness scope. If a new consumer version should intentionally reprocess old events, use a new consumer identity instead of deleting claims blindly.

## Handle Failures Other Than Duplicates

Deduplication does not replace retry policy. Classify transient failures for retry and permanent malformed messages for rejection or dead-letter handling. A poison message can otherwise loop forever.

Track at least:

- newly claimed messages and duplicates suppressed;
- transaction failures and serialization retries;
- message age and delivery attempt count;
- acknowledgment or delete failures after commit;
- deduplication table growth and cleanup; and
- outbox backlog and downstream idempotency conflicts.

Test with deliberate crashes at every boundary: before the claim, after the claim, after the business update, after commit, and after acknowledgment. Run two consumers concurrently with the same event ID. The final business state should match one successful application, while every delivery eventually reaches a terminal broker state.

## The Practical Guarantee

An idempotent consumer does not promise that the broker delivers once. It promises that repeated delivery has one intended durable effect within a clearly defined scope.

The strongest common pattern is a stable event ID, a database-enforced unique claim, the claim and business mutation in one transaction, and broker acknowledgment only after commit. Add an outbox or downstream idempotency contract when work crosses that transaction boundary.

## Official Documentation

- [Apache Kafka message delivery semantics and transactions](https://kafka.apache.org/43/design/design/#messagesemantics)
- [RabbitMQ consumer acknowledgements and redelivery](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL INSERT and ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
