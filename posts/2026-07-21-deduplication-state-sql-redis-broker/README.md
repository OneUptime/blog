# Where Should Deduplication State Live: SQL, Redis, or the Message Broker?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Deduplication, SQL, Redis, Messaging, Distributed System

Description: Compare SQL, Redis, and broker-managed deduplication by transaction boundary, durability, latency, retention, and replay behavior.

---

Deduplication state answers one question: has this logical operation already produced its intended effect? SQL, Redis, and message brokers can all remember something about a message, but they do not provide interchangeable guarantees.

The best default is to keep the authoritative idempotency decision in the same transactional system as the business effect. If the consumer updates PostgreSQL, keep the claim in PostgreSQL. If it transforms Kafka records into Kafka records, a Kafka transaction can cover the consumed offsets and produced records. If all relevant state lives in Redis, an atomic Redis operation can coordinate it there.

No broker or cache transaction automatically extends to an arbitrary database or HTTP API.

## Start with the Failure Boundary

Suppose a consumer receives event evt-123 and increments an account balance.

There are two unsafe orders:

1. Record evt-123 as processed, crash, then never increment the balance.
2. Increment the balance, crash, then fail to record evt-123 and increment it again on redelivery.

The gap disappears only when the deduplication claim and balance change commit atomically. Moving the claim to a faster store does not remove the gap. It changes which failure is possible.

Before choosing a store, identify where the durable effect lives, how long duplicates can return, whether replay should bypass claims, and what loss is acceptable during restart or failover.

## Comparison at a Glance

| Location | Best fit | Strongest useful guarantee | Important limitation |
| --- | --- | --- | --- |
| SQL | Business state is in the same database | Unique claim and business mutation commit together | Cannot include an unrelated API or datastore |
| Redis | Hot duplicate suppression or effects entirely in Redis | Atomic conditional key creation, or atomic Redis-only script | TTL, eviction, persistence, and failover determine durability |
| Message broker | Broker-native retry suppression or broker-to-broker processing | Guarantee scoped to that broker's delivery and transaction model | Usually bounded or unable to cover consumer side effects |
| Hybrid | High-volume systems with durable SQL effects | Broker and cache reduce load while SQL remains authoritative | More components and more invariants to operate |

## SQL: Best When the Effect Is in SQL

For a PostgreSQL-backed consumer, create a unique key scoped to the logical consumer:

~~~sql
CREATE TABLE processed_messages (
    consumer_name text NOT NULL,
    message_id text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (consumer_name, message_id)
);
~~~

Inside one transaction, run INSERT with ON CONFLICT DO NOTHING and inspect RETURNING. Only the transaction that inserts the row applies the business update:

~~~text
begin database transaction

claim = execute:
    INSERT INTO processed_messages (consumer_name, message_id)
    VALUES ('billing-v1', 'evt-123')
    ON CONFLICT (consumer_name, message_id) DO NOTHING
    RETURNING message_id

if claim returned a row:
    update the account balance
else:
    make no business change

commit database transaction
~~~

PostgreSQL's unique constraint arbitrates concurrent inserts. Its transaction makes the claim and update all-or-nothing. After commit, the consumer acknowledges the broker. If acknowledgment fails and the message returns, the unique key suppresses a second update.

Retention must cover the replay horizon. Deleting a claim allows that old message to run again, so cleanup is a semantic decision, not just maintenance.

SQL does not solve an external side effect. An email or payment API call cannot roll back with the transaction. Use an outbox, a downstream idempotency key, or a persisted reconciliation workflow.

## Redis: Fast Conditional Claims with Configurable Durability

Redis SET supports NX to set a key only when it does not exist and EX to attach a time to live:

~~~text
SET dedupe:billing-v1:evt-123 1 NX EX 604800
~~~

An OK response means this Redis instance accepted the claim. A nil response means the key already exists. This is useful for absorbing bursts of repeated requests, coalescing work, or enforcing a deliberately bounded deduplication window.

It does not by itself make a PostgreSQL or HTTP effect exactly once:

- Set the Redis key first, then crash before the effect, and a retry may be suppressed even though the effect never happened.
- Perform the effect first, then crash before SET, and a retry may repeat the effect.

Lua scripts execute atomically inside Redis and can conditionally update several Redis keys. That helps only when the relevant business effect also lives in Redis. A script cannot atomically update PostgreSQL or call an external service.

Redis durability is a deployment choice. Options include no persistence, RDB snapshots, AOF logging with configurable fsync policies, or both. When AOF is enabled, its default `appendfsync everysec` policy can lose about one second of writes in a disaster. Replication is asynchronous by default, and even `WAIT` does not create strong consistency; acknowledged writes can still be lost during failover depending on persistence.

Expiration and eviction matter separately:

- Once the TTL expires, an old duplicate is accepted again.
- A maxmemory eviction policy can remove a key before its TTL.
- With noeviction, memory-growing writes can fail, so the consumer needs an explicit policy.
- Restoring an older snapshot can forget newer claims.

Redis is therefore a sound authoritative choice only when its configured durability, retention, and failure semantics meet the business requirement, or when all state is changed atomically within Redis. Otherwise, treat it as an optimization rather than proof that a durable external effect happened.

## The Broker: Useful but Narrow Guarantees

"Store it in the broker" means different things for different products.

### Kafka

Kafka documents at-least-once behavior when a consumer processes records and saves its position afterward. Kafka transactions can atomically include output records written to Kafka and the input consumer offsets. With read-committed consumers, that supports exactly-once processing for Kafka-to-Kafka workflows.

The boundary ends there. Kafka's documentation says exactly-once delivery to other destination systems generally requires cooperation from those systems. A Kafka transaction cannot atomically cover an arbitrary PostgreSQL transaction or HTTP request.

### Amazon SQS

SQS FIFO uses a message deduplication ID to suppress repeated sends with the same ID during a five-minute deduplication window. AWS says later sends in that window are acknowledged but not delivered, and it continues tracking the ID after the original message is received and deleted.

That protects the enqueue side within a bounded window. It does not make the consumer's business update atomic with DeleteMessage. Visibility timeout expiry and failure before deletion can still cause another processing attempt. Standard queues explicitly use at-least-once delivery and require idempotent consumers.

### RabbitMQ

RabbitMQ manual acknowledgments tell the broker when a delivery was processed. If a channel or connection closes with unacknowledged deliveries, RabbitMQ requeues them. The redelivered flag is only a hint, and delivery tags are scoped to a channel.

Those mechanisms support safe retry, but they are not a permanent application idempotency ledger. The consumer still needs an idempotent effect or durable claim.

## A Safe Hybrid Design

A hybrid can reduce load without weakening the source of truth:

1. Use broker-native deduplication or transactions where their documented scope applies.
2. Attempt the authoritative SQL claim and business mutation in one transaction.
3. After commit, populate a Redis key for hot duplicate detection.
4. Treat Redis misses as "unknown," never as permission to bypass SQL.
5. Before a Redis hit suppresses work, confirm SQL unless Redis is explicitly authoritative.

Redis loss then causes extra SQL attempts, not duplicate durable effects. SQL uniqueness still settles concurrent races. The broker controls delivery lifecycle and retry pressure.

Put the idempotency key on the business row when possible, and measure duplicate frequency before adding a cache. Verification on every cache hit may erase the expected savings.

## External APIs Need Their Own Contract

None of the three choices can alone make a local claim atomic with an arbitrary remote call. Pass a stable idempotency key to the remote API if its official contract supports one. Persist the request, current state, and remote reference so ambiguous timeouts can be reconciled.

For messages leaving SQL, commit business state and an outbox record together. A dispatcher can publish repeatedly while downstream consumers deduplicate by the stable event ID.

## Make the Decision Testable

Document key scope, retention, persistence, acknowledgment order, and replay policy. Then test:

- concurrent claims and crashes around the business commit;
- broker acknowledgment failure after commit;
- Redis restart, failover, eviction, and TTL expiry;
- replay beyond the broker's deduplication window; and
- ambiguous external API timeouts.

The right store is not the one with the shortest latency in isolation. It is the one whose atomic boundary contains the effect you need to protect, with durability and retention that match how long duplicates can return.

## Official Documentation

- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL INSERT and ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [Redis SET command](https://redis.io/docs/latest/commands/set/)
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis replication and WAIT limitations](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis Lua scripting atomicity](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Apache Kafka message delivery semantics and transactions](https://kafka.apache.org/43/design/design/#messagesemantics)
- [Amazon SQS FIFO message deduplication IDs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [RabbitMQ consumer acknowledgements and redelivery](https://www.rabbitmq.com/docs/confirms)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
