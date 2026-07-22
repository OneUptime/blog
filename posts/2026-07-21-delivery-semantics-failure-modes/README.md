# At-Least-Once vs. At-Most-Once vs. Exactly-Once: Choosing by Failure Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed System, Message Delivery, Kafka, RabbitMQ, Amazon SQS, Exactly-Once, Reliability

Description: Choose message delivery semantics by testing loss, retry, crash, and side-effect failures instead of relying on an unscoped broker label.

---

Delivery semantics are not quality tiers where exactly-once is always best. Each semantic moves cost and risk to a different failure mode. The right choice depends on whether your application can tolerate loss, repeated work, coordination overhead, or delayed recovery.

The labels also need a boundary. A broker may deduplicate writes to its log while a consumer sends the same email twice. A stream transaction may atomically update Kafka topics while a separate database commit remains ambiguous. Define what is delivered, where, and which observable effect the guarantee covers.

## The Three Semantics

| Semantic | Failure tradeoff | Application responsibility | Common fit |
| --- | --- | --- | --- |
| At-most-once | A message may be lost, but that delivery boundary does not retry it | Accept missing work and detect unacceptable gaps | High-rate, disposable updates where freshness matters more than completeness |
| At-least-once | A message is retried under the system's durability contract, so it may arrive repeatedly | Make processing idempotent and bound retries | Jobs, business events, and integrations where loss is worse than repetition |
| Exactly-once | A documented transaction or deduplication boundary makes one result visible | Stay within that boundary and configure every participant correctly | Stateful stream processing or atomic read-process-write workflows in one cooperating system |

None of these definitions removes physical failures. Retention expiry, misconfiguration, data loss outside the durability assumptions, or an exhausted retry policy can still lose work. "At least once" is not "retry forever under every disaster," and "exactly once" is not a universal transaction across the internet.

## Choose by the Crash Point

Start with the simplest consumer sequence:

```text
receive -> process -> commit effect -> acknowledge
```

The ordering determines the ambiguity:

- Acknowledge before processing: a crash can lose the effect. This favors at-most-once behavior.
- Process before acknowledging: a crash after the effect can cause redelivery. This favors at-least-once behavior.
- Commit the effect and acknowledgement atomically: exactly-once effect is possible within that transaction's scope.

Most business effects and broker acknowledgements are in separate systems. If they cannot share a transaction, at-least-once plus idempotency is normally more practical than claiming exactly-once.

## Use a Failure Matrix

Review each candidate design against real failures:

| Failure | At-most-once response | At-least-once response | Exactly-once requirement |
| --- | --- | --- | --- |
| Producer loses the broker response | Do not retry, risking loss | Retry, risking another write | Broker deduplicates the retry within a defined identity and scope |
| Broker fails before durable replication | Message may disappear | Producer retries after failed confirmation | Commit protocol must exclude an uncommitted write |
| Consumer crashes before its effect | Message may already be acknowledged and lost | Message is redelivered | Uncommitted transaction remains invisible |
| Consumer crashes after effect, before acknowledgement | No retry only if acknowledged early, risking other loss | Message is redelivered and effect needs dedupe | Effect and progress commit atomically |
| Processing exceeds a lease or poll limit | Work may be abandoned | Another worker may process concurrently | Ownership or transaction must fence stale workers |
| Downstream is unavailable | Drop or fail fast | Retry with backoff and a terminal path | Downstream must participate or accept an idempotency identity |
| Poison message | Drop, perhaps silently | Repeats until bounded or dead-lettered | Transaction does not fix invalid input |

This table exposes the actual decision. If losing one temperature sample is harmless but processing an old one later is misleading, at-most-once may be correct. If losing an order is unacceptable and duplicate reservation can be deduplicated, use at-least-once. If a Kafka application must update several output topics and consumed offsets as one visible operation, Kafka transactions may fit.

## RabbitMQ: Acknowledgements Define the Consumer Boundary

RabbitMQ's manual consumer acknowledgements support at-least-once delivery. Unacknowledged deliveries are automatically requeued when their channel or connection closes, so consumers must handle redelivery. Acknowledging early moves toward at-most-once processing because a crash after the acknowledgement loses the work.

Publisher confirms cover the producer-to-broker path. RabbitMQ warns that retransmission after a lost confirmation can create duplicates and recommends idempotent consumers. A durable queue and persistent message improve recovery, but the broker's documented guarantees still depend on publisher confirms and the relevant replication behavior.

Use manual acknowledgement after the durable effect, a bounded prefetch, idempotency for the effect, and a dead-letter policy for permanent failures.

## Amazon SQS: Standard and FIFO Solve Different Problems

AWS documents standard SQS queues as at-least-once. Redundant storage and delete ambiguity can produce duplicate deliveries. The visibility timeout is a lease, not an acknowledgement: if processing does not end with a successful delete before the timeout, another consumer can receive the message.

SQS FIFO queues add producer-side deduplication. AWS documents a five-minute deduplication interval based on a deduplication ID or content hash. That can prevent a producer retry from creating a second enqueued message within the window. It does not make an arbitrary consumer side effect exactly once. A FIFO message can still become visible again if a consumer fails to delete it.

Choose standard queues for high-throughput work that tolerates reordering and uses idempotent consumers. Choose FIFO when ordering and producer deduplication are requirements, then still make consumers safe under redelivery.

## Kafka: Exactly-Once Has a Precise Scope

Kafka documents three common consumer patterns. Processing then committing the offset is at-least-once. Committing the offset then processing is at-most-once. Kafka's idempotent producer prevents client retries within a single producer session from creating duplicate records in Kafka's log.

Kafka transactions extend that boundary. A transactional producer can write output records to multiple Kafka partitions and commit consumed offsets as one transaction. Consumers configured with `read_committed` do not expose aborted transactional records. Kafka Streams uses these mechanisms for supported exactly-once processing.

The boundary matters. A Kafka transaction cannot atomically include a generic REST call, email, or database unless that external system provides a cooperating protocol. Kafka's design documentation recommends either an idempotent destination or storing the consumed offset with the output in the same destination transaction.

## Treat Idempotency as a Business Invariant

At-least-once is often the best default for important work because duplicate delivery can be neutralized more easily than missing work can be reconstructed. Use:

- a stable event ID preserved across every retry and replay;
- a unique constraint or inbox record committed with the local business update;
- conditional state transitions rather than blind increments;
- downstream idempotency keys for payments and APIs;
- an outbox for publishing after a local database transaction;
- reconciliation for external outcomes that remain ambiguous.

An in-memory cache is not sufficient. It disappears on restart and cannot atomically protect a database update. A separate "check then act" query is also unsafe under concurrent workers unless database concurrency control, such as a uniqueness constraint, suitable locking, or serializable isolation, serializes the decision.

Exactly-once designs require the same rigor. Verify stable transaction IDs, isolation, consumer read mode, fencing, timeout behavior, and what happens when a transaction outcome is unknown. Coordination adds latency and operational state, so use it where its scoped atomicity removes meaningful application complexity.

## Decide in Five Steps

1. **Name the effect.** Is it a stored record, account balance, notification, cache value, or topic output?
2. **Rank the harm.** Quantify the cost of one missing effect, one repeated effect, delay, and reordering.
3. **Draw the boundary.** List the producer, broker, consumer progress, database, and external services involved.
4. **Select the mechanism.** Choose early acknowledgement, retry plus idempotency, or a supported transaction whose scope matches the effect.
5. **Kill it in tests.** Crash before and after every commit, lose acknowledgements, expire leases, retry producers, and replay dead letters.

Monitor loss indicators, redelivery, deduplication hits, retry age, dead-letter volume, transaction aborts, and reconciled business outcomes. Broker health alone cannot prove the effect happened.

The best semantic is the one whose worst failure your product explicitly accepts. State that failure, document the guarantee boundary, and test the ambiguous moments. That is much more reliable than putting "exactly once" on an architecture diagram.

## Official Documentation

- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS FIFO exactly-once processing](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [Apache Kafka design: message delivery semantics](https://kafka.apache.org/43/design/design/#messagesemantics)
- [Apache Kafka producer API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
