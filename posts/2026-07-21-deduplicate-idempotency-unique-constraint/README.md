# Deduplicating Messages with Idempotency Keys and Unique Database Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Deduplication, PostgreSQL, Messaging, Reliability

Description: Use stable idempotency keys and PostgreSQL unique constraints to deduplicate concurrent message deliveries without race conditions.

---

Message deduplication looks simple until two copies arrive at the same time. An application-level "have I seen this key?" query followed by an insert is not a safe gate because both consumers can observe absence before either inserts.

The database must arbitrate ownership. In PostgreSQL, a unique constraint or primary key plus INSERT with ON CONFLICT gives the consumer a concurrency-safe claim. That claim prevents a second business effect only when it is combined with the business change in the same appropriate transaction.

## What an Idempotency Key Means

An idempotency key identifies one logical operation. It does not identify one network request or one delivery attempt.

The producer should create the key before its first publish and reuse it for every retry of that event. A good scope usually includes:

- the tenant or account;
- the logical consumer or operation;
- a producer-issued event or request ID; and
- sometimes the producer or source stream.

For example, the tuple payment-ledger, tenant-42, and evt-123 can mean "apply this payment event to this tenant's ledger once." A shipping consumer can process evt-123 independently because its consumer scope is different.

Avoid generating a new key in the consumer. Every redelivery would then look new. Avoid RabbitMQ delivery tags because they are scoped to a channel and describe deliveries, not logical messages. Kafka topic, partition, and offset can identify a specific log record, but a producer-issued event ID survives republishing and transport changes more reliably.

## Payload Hashes Are Fingerprints, Not Identities

A hash of the serialized message is often useful for detecting idempotency-key misuse, but it is usually a poor key by itself.

Two legitimate operations can have identical payloads. Two representations of one operation can differ in field order, whitespace, defaults, timestamps, or serialization version. Message attributes may also live outside the body. Within Amazon SQS FIFO's five-minute producer deduplication window, content-based deduplication hashes the message body but not its attributes. This send-side feature does not make a consumer's business mutation idempotent.

Use the producer's stable key as the identity. Store a canonical request or cryptographic payload digest beside it. If a later message reuses the same key with a different digest, reject it or route it for investigation instead of silently treating it as a valid duplicate.

## Let a Unique Constraint Arbitrate

A processing table can make the key scope explicit:

~~~sql
CREATE TABLE message_receipts (
    tenant_id bigint NOT NULL,
    consumer_name text NOT NULL,
    idempotency_key text NOT NULL,
    payload_sha256 bytea NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, consumer_name, idempotency_key)
);
~~~

The primary key makes every component non-null and unique as a group. That matters because PostgreSQL unique constraints treat null values as distinct by default unless configured otherwise.

On delivery, attempt the insert directly:

~~~sql
INSERT INTO message_receipts (
    tenant_id,
    consumer_name,
    idempotency_key,
    payload_sha256
)
VALUES (
    42,
    'payment-ledger-v1',
    'evt-123',
    decode('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'hex')
)
ON CONFLICT (tenant_id, consumer_name, idempotency_key)
DO NOTHING
RETURNING payload_sha256;
~~~

If the statement returns a row, this transaction obtained the claim. If it returns no row, a committed row with that key won. Under concurrent delivery, PostgreSQL's unique index is the arbiter. One transaction can proceed, while the other waits for the conflicting transaction to commit or roll back and then observes the correct conflict outcome.

This is safer than:

~~~sql
SELECT 1
FROM message_receipts
WHERE tenant_id = 42
  AND consumer_name = 'payment-ledger-v1'
  AND idempotency_key = 'evt-123';

-- A second consumer can pass the same check before this insert.
INSERT INTO message_receipts (...) VALUES (...);
~~~

The preliminary SELECT can be useful for diagnostics, but it must not be the concurrency control. The constraint is the final authority.

## Keep the Claim and Effect Together

The unique insert closes only the race to create the receipt. It does not automatically make a separate business update atomic.

Use this transaction flow:

~~~text
begin database transaction

claim = execute the INSERT ... ON CONFLICT DO NOTHING ... RETURNING statement

if claim returned a row:
    insert the ledger entry
    update the account balance
else:
    make no business change

commit database transaction
~~~

The application must branch after the claim statement. A duplicate path performs no ledger insert or balance update. A new path performs both before committing. If anything fails, ROLLBACK removes the receipt and business changes together.

Never commit the receipt and then start a second transaction for the effect. A crash leaves a receipt for work that never happened, and retries may skip it forever. Never commit the effect before the receipt either, because a crash permits a second effect.

After the database transaction commits, acknowledge the broker delivery. A crash before acknowledgment can cause redelivery, but the committed unique row suppresses another effect.

## Put the Key on the Business Record When Possible

A separate receipt table is valuable when one message updates aggregates or several tables. When the business effect creates one durable resource, a natural uniqueness rule can be simpler:

~~~sql
CREATE TABLE refunds (
    refund_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id bigint NOT NULL,
    source_event_id text NOT NULL,
    amount_cents bigint NOT NULL,
    UNIQUE (tenant_id, source_event_id)
);
~~~

Retried inserts for the same source event cannot create two refunds. The business table itself expresses the invariant, so there is less auxiliary state to coordinate.

Use a version column for state replacement when the message represents a versioned snapshot. An UPDATE that applies only when the incoming version is newer can make repeated or stale events harmless. Deduplication and ordering are different concerns, so decide whether an older unique event should still apply.

## Validate Conflicting Reuse

When ON CONFLICT returns no row, read the existing receipt and compare its stored digest and operation metadata with the new message. Under PostgreSQL's default Read Committed isolation, a following command gets a new snapshot and can see a conflicting transaction that committed. At stronger isolation levels, handle serialization failures according to the application's retry policy. The duplicate is safe only if the key means the same operation.

A mismatch can indicate:

- a producer bug that reused an ID;
- two tenants collapsed into an incorrectly scoped key;
- inconsistent canonicalization;
- an event schema change; or
- malicious or corrupted input.

Do not overwrite the original receipt with the new payload. That destroys the evidence used to decide what already happened.

For request-response APIs, the same table can store a response code and response body, allowing a legitimate retry to receive the original result. For asynchronous messages, storing the outcome record or resulting resource ID improves auditability even when no response is returned to the producer.

## Do Not Stretch One Transaction Across External Systems

PostgreSQL cannot roll back an email, payment provider call, or arbitrary API. If the receipt is inserted and an external call succeeds before the database commit, a later rollback can lead to a repeated external call. If the receipt is committed first, a crash can leave the call unmade.

Use a downstream idempotency key when the API supports one, or write an outbox command in the same PostgreSQL transaction and let a separate worker retry it. For ambiguous external outcomes, persist states such as pending, submitted, and confirmed, then reconcile. Do not treat a committed "processing" row as proof that the external effect completed.

Kafka transactions likewise cover Kafka records and consumer offsets, not arbitrary external databases. Kafka's official design documentation says exactly-once delivery to other destination systems generally requires cooperation with those systems.

## Plan Retention and Replay

A key is remembered only as long as its unique row remains. Retention must cover the maximum plausible redelivery horizon, including queue retention, dead-letter recovery, delayed retry, backup restoration, and manual replay.

Deleting a receipt makes that old key eligible again. That can be intentional for rebuilding a projection, but it is unsafe for irreversible effects unless the business record has its own permanent unique invariant.

Monitor receipt insertion rate, duplicate rate, key conflicts with different digests, transaction failures, and table growth. Test simultaneous inserts, a crash before commit, a crash after commit but before acknowledgment, and replay after cleanup. The expected result is one committed business effect for each scoped idempotency key.

## Official Documentation

- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL INSERT and ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Apache Kafka message delivery semantics](https://kafka.apache.org/43/design/design/#messagesemantics)
- [RabbitMQ consumer acknowledgements and delivery tags](https://www.rabbitmq.com/docs/confirms)
- [Amazon SQS FIFO message deduplication IDs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html)
- [Amazon SQS FIFO deduplication behavior](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
