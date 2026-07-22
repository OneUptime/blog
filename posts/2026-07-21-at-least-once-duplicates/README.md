# Why At-Least-Once Delivery Creates Duplicates (and Why That Is Expected)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed Systems, Message Queues, At-Least-Once Delivery, Idempotency, Kafka, RabbitMQ, Amazon SQS

Description: See exactly where at-least-once delivery creates duplicates and design consumers that turn repeated delivery into one durable business effect.

---

At-least-once delivery creates duplicates because a distributed system cannot always tell whether work completed before communication failed. Retrying protects against loss, but the retry can repeat work that already succeeded.

That is not a broken queue. It is the intended tradeoff. The application must convert repeated delivery into one acceptable business effect.

## The Uncertainty Window

Consider a consumer handling a payment event:

```text
receive message
apply durable business effect
acknowledge message
```

If the consumer crashes before applying the effect, redelivery is necessary. If it crashes after applying the effect but before the broker records the acknowledgement, redelivery repeats the message. From the broker's perspective, both failures look like an unacknowledged delivery.

Reversing the order does not solve the problem:

```text
acknowledge message
apply durable business effect
```

Now a crash between the two steps loses the work. The message is considered complete even though its effect never occurred. This is an at-most-once style tradeoff at that consumer boundary.

The fundamental issue is that the acknowledgement and the business effect usually live in different systems. Without one atomic transaction spanning both, there is a moment when one may succeed and the other may not.

## Duplicates Also Start at the Producer

The producer has its own uncertainty window:

```text
producer sends message
broker durably stores message
broker confirmation is lost
producer retries
```

The original write succeeded, but the producer cannot know that. A retry may create another record unless the broker offers producer idempotence or deduplication and the producer uses it correctly.

Consumer idempotency is still required. Producer deduplication only covers its documented boundary and time window. It does not prevent a consumer from receiving the same stored record again after a crash.

## How Common Brokers Expose the Tradeoff

### RabbitMQ

RabbitMQ documents consumer acknowledgements and publisher confirms as separate reliability mechanisms. When a channel or connection closes with unacknowledged deliveries, RabbitMQ automatically requeues them. A consumer can therefore see a delivery it already processed.

Publisher confirms have a similar ambiguity: if a confirmation is lost, the publisher may retransmit a message that the broker already accepted. RabbitMQ explicitly recommends idempotent consumers. Its redelivered flag is a clue, not a correctness mechanism. A `true` value indicates possible prior delivery, but it cannot prove whether the business effect completed.

### Amazon SQS

Amazon SQS standard queues store redundant copies. AWS explains that a message copy can remain unavailable when another copy is deleted and later be delivered again. Standard queues therefore use at-least-once delivery.

The visibility timeout creates another retry point. A received message becomes temporarily invisible. If the consumer does not delete it before the timeout, it can become visible and be processed again, potentially while the first worker is still running. Choose and extend the timeout for real processing duration, but remember that AWS does not promise absolute duplicate prevention even during the visibility window.

### Apache Kafka

Kafka consumers normally separate processing from offset commits. Processing first and committing the offset afterward gives at-least-once behavior: a crash after processing but before the commit causes the record to be read again. Committing first can lose processing after a crash.

Kafka supports idempotent producers and transactions. Its exactly-once support can atomically combine consumed offsets with output records written to Kafka when transactional producers and `read_committed` consumers are configured correctly. That transaction does not automatically include an arbitrary database, payment provider, email service, or HTTP API.

## Duplicate Delivery Is Not Duplicate Effect

A robust consumer assumes the same logical event can arrive more than once and makes subsequent attempts harmless. The key is a stable event ID that represents the logical operation and remains unchanged across retries.

For a database-backed effect, store that ID in an inbox or processed-message table with a unique constraint. Perform the deduplication record and the business update in the same database transaction:

```text
begin transaction

attempt a conflict-safe insert of (consumer_name, event_id) into processed_messages
if no row was inserted because the unique key already exists:
    commit with no business change
else:
    apply the business update
    commit both records

acknowledge only after commit succeeds
```

The unique constraint is essential. A separate "check whether processed" query followed by an insert has a race: two workers can both observe absence and perform the effect. Let the database serialize that decision.

Choose the ID at the correct semantic level. A broker delivery tag or Kafka offset identifies a transport occurrence, not necessarily the business command. If the same order command can be republished to a different topic or queue, use an application event ID such as `order-1234:reserve-inventory:v2`.

## Make the Business Operation Idempotent Too

An inbox record protects an update in the same transaction. It cannot roll back an external call made just before a crash. For external effects:

- send a stable idempotency key to an API that supports one;
- model state changes conditionally, such as `pending` to `charged`, rather than incrementing blindly;
- use an outbox table to publish follow-up messages after committing local state;
- reconcile ambiguous operations against the downstream system;
- use a ledger or compensating action when a side effect cannot be made atomic.

Suppose a consumer charges a card and then records `processed`. A crash after the charge can cause a second charge on retry. Recording `processed` first can lose the charge. The payment provider must accept a stable idempotency key, or the application must query and reconcile the original attempt.

Emails and webhooks need an explicit product decision. Sending the same notification twice may be acceptable; issuing the same refund twice is not. Idempotency is about acceptable repeated effect, not merely identical code execution.

## Retries Need Bounds and Classification

At-least-once does not mean retry every failure forever. Separate transient failures from permanent ones. Use exponential backoff with jitter, cap concurrent retries, and send poison messages to a dead-letter path after a documented attempt or age limit.

A dead-letter queue does not finish the work. Give it an owner, alert, replay procedure, retention, and a way to preserve the original event ID. Replaying with a new ID defeats deduplication.

For long-running SQS work, extend visibility while the worker is healthy and stop extending it when progress stops. For RabbitMQ, use bounded prefetch so a failed consumer does not hold an excessive number of unacknowledged messages. For Kafka, ensure processing time and polling configuration do not cause unintended group rebalances.

## Observe Both Delivery and Effect

Useful metrics include:

- delivery attempts and redeliveries;
- deduplication hits;
- time from first delivery to durable completion;
- acknowledgement, delete, or offset-commit failures;
- visibility extensions and expired leases;
- retry age, dead-letter volume, and replay results;
- business effects reconciled as missing or repeated.

Do not alert on every deduplication hit as if it were corruption. Some duplicate attempts are expected evidence that reliability is working. Alert when the rate changes sharply, the dedupe store fails, or duplicate business effects escape the boundary.

## Test the Crash Points

Integration tests should terminate a worker at each boundary: before the transaction, during it, after commit but before acknowledgement, and after acknowledgement. Also drop producer confirmations, expire a visibility timeout, force a rebalance, and run two consumers concurrently on the same event.

The acceptance criterion is not "the handler ran once." It is "the durable business invariant holds after any allowed retry." Once that invariant is explicit, duplicate delivery becomes a routine input condition rather than a production surprise.

## Official Documentation

- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Apache Kafka design: message delivery semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Apache Kafka producer API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
