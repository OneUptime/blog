# The Inbox Pattern: Atomically Deduplicating Messages with Business Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Inbox Pattern, Idempotency, At-Least-Once Delivery, Database Transaction, Message Consumer

Description: Use a database inbox and uniqueness constraint to make message deduplication atomic with local business state changes.

---

The inbox pattern makes an at-least-once consumer safe by recording a stable message ID in the same database transaction as the business update. A unique constraint decides which concurrent delivery is first; every later delivery becomes a committed no-op.

The phrase “same transaction” is essential. Checking an inbox before the transaction, recording the ID after the update, or storing deduplication in an unrelated cache leaves a crash or race that can repeat the effect.

## Understand the two unsafe gaps

A naïve consumer often checks then acts:

```text
if message ID is not in processed_messages:
    update business state
    insert message ID into processed_messages
```

It has a concurrency race. Two workers can both observe “not processed” before either inserts, and both apply the update.

It also has a crash gap. If the business update commits but the inbox insert does not, redelivery applies the update again. Reversing the two writes creates the opposite gap: the inbox can say processed even though the business update never committed.

The database must accept or roll back both writes as one unit, and uniqueness—not an application-level read—must arbitrate concurrent duplicates.

## Design the inbox identity

A minimal PostgreSQL table is:

```sql
CREATE TABLE message_inbox (
    consumer_name text NOT NULL,
    message_id text NOT NULL,
    payload_hash bytea,
    processed_at timestamptz NOT NULL DEFAULT now(),
    source text,
    PRIMARY KEY (consumer_name, message_id)
);
```

Scope identity to a logical consumer, not a process instance. `billing-projection` and `fraud-detector` must each process the same event, so each gets its own `consumer_name`. Ten replicas of `billing-projection` share the same scope.

The incoming `message_id` must represent the logical event and remain stable through broker retries, dead-letter redrive, and republishing. Generate it at the source before the first send. A Kafka `(topic, partition, offset)` can identify one log record, and an SQS `MessageId` identifies one sent SQS message, but neither recognizes a logical event newly published elsewhere. A source-generated event ID is usually more durable.

An optional payload hash detects an upstream contract violation in which the same ID is reused with different content. On conflict, compare the stored fingerprint and quarantine a mismatch instead of silently treating it as a valid duplicate.

## Let the unique constraint claim the event

Use `INSERT ... ON CONFLICT DO NOTHING`, then apply the effect only if the insert returned a row:

```sql
BEGIN;

WITH claimed AS (
    INSERT INTO message_inbox (
        consumer_name, message_id, payload_hash, source
    ) VALUES (
        'account-balance', :message_id, :payload_hash, :source
    )
    ON CONFLICT (consumer_name, message_id) DO NOTHING
    RETURNING 1
),
applied AS (
    UPDATE account_balance
    SET balance_minor = balance_minor + :delta,
        version = version + 1
    WHERE account_id = :account_id
      AND EXISTS (SELECT 1 FROM claimed)
    RETURNING 1
)
SELECT
    (SELECT count(*) FROM claimed) AS claimed_count,
    (SELECT count(*) FROM applied) AS applied_count;

COMMIT;
```

PostgreSQL enforces the primary key with a unique index. If two transactions insert the same identity concurrently, one becomes the winner; the other cannot also insert the key. The business update is guarded by the successful claim. Application code must accept `(1, 1)` as new work and `(0, 0)` as a duplicate. A result of `(1, 0)` means the account update did not find its target; roll back so the inbox claim does not suppress a retry. Do not issue `COMMIT` until that assertion passes.

After the transaction commits, acknowledge the RabbitMQ message, delete the SQS message, or commit the Kafka offset. If the process fails before settlement, the broker redelivers. The second transaction finds the inbox row and performs no business update, then settlement can succeed.

## Enumerate the crash behavior

The design has predictable outcomes:

| Failure point | Database state | On redelivery |
|---|---|---|
| Before transaction | No inbox or effect | Process normally |
| During transaction before commit | Both roll back | Process normally |
| After commit before broker settlement | Inbox and effect both exist | Skip effect, settle duplicate |
| After settlement | Inbox and effect both exist | No ordinary redelivery expected; duplicate still safe |

This is at-least-once invocation with an effectively-once local outcome. It does not mean the handler function executes once, and it does not extend the transaction across remote systems.

## Keep transient failures out of the inbox

If the business update fails, roll back the transaction so the inbox claim also disappears and the message remains eligible for retry. Do not catch a transient exception, commit only the inbox row, and acknowledge; that permanently suppresses unfinished work.

For terminal input failures, choose an explicit policy. You can reject to a dead-letter destination without an inbox record, or transactionally record a terminal disposition and audit details, then settle the message. Ensure redrive tooling knows whether a corrected message needs a new ID or an authorized reset of the terminal record.

Serialization failures and deadlocks can occur under concurrency. PostgreSQL's transaction documentation requires retrying the whole transaction from the beginning after a serialization failure. Reuse the same message ID and payload; do not generate a new identity for the database retry.

## Compose inbox and outbox for downstream messages

Suppose the consumer updates its database and must publish another event. Publishing directly inside or after the transaction recreates the dual-write problem. In one transaction:

1. insert the inbox claim;
2. update local business state;
3. insert an outbound event into an outbox;
4. commit;
5. settle the incoming message.

```sql
BEGIN;

-- Claim incoming event under a unique key.
INSERT INTO message_inbox (consumer_name, message_id)
VALUES ('order-payment', :incoming_event_id)
ON CONFLICT DO NOTHING
RETURNING message_id;

-- Only on a successful claim:
UPDATE orders SET paid = true WHERE order_id = :order_id;

INSERT INTO outbox_event (event_id, aggregate_id, event_type, payload)
VALUES (:outgoing_event_id, :order_id, 'OrderPaid', :payload);

COMMIT;
```

Application code must branch on the returned inbox row so the update and outbox insert are skipped together for duplicates. For a new claim, it must also require exactly one updated business row and exactly one inserted outbox row before committing; otherwise it rolls the transaction back. The outbox relay can publish more than once, and its consumers apply their own inboxes. This creates a reliable chain without pretending a cross-service transaction exists.

## Remote effects require a different boundary

A local inbox does not make a payment API, email service, or object store part of the database transaction. Marking the inbox complete before the API risks forgetting the call; marking it after the API allows the call to repeat after a crash.

Persist an outbound command or outbox row in the inbox transaction. A separate worker sends it using a stable downstream idempotency key and records the result. If the provider lacks idempotency, retain an explicit unknown state and reconcile before retrying.

Do not keep a database transaction open during a long network call merely to appear atomic. The remote service still cannot roll back with the local transaction, while locks and connections remain occupied.

## Use a transaction in non-relational stores too

The pattern is about an atomic storage boundary, not SQL specifically. In DynamoDB, a `TransactWriteItems` request can conditionally put an inbox item and update a business item as one all-or-nothing transaction. Use a condition such as `attribute_not_exists` on the inbox key.

DynamoDB also supports a client request token for idempotent `TransactWriteItems` calls within a documented ten-minute window. That API retry feature is useful, but the durable inbox key still defines deduplication beyond the request-token window and across message redrive.

If the inbox and business data live in different databases, they cannot participate in this simple atomic form. Move the deduplication key into the business store, redesign the update to be inherently idempotent, or use a workflow with compensating and reconciliation logic.

## Handle ordering separately from duplication

An inbox answers “have I applied this event?” It does not answer “is this the next valid event?” Include an aggregate version when state transitions require order:

```sql
UPDATE order_projection
SET status = :status,
    version = :incoming_version
WHERE order_id = :order_id
  AND version = :incoming_version - 1;
```

Decide explicitly whether a zero-row update means a duplicate, a stale event, or a gap waiting for an earlier version. Store enough audit data to distinguish them. Do not insert the inbox row for an event you intend to retry because its predecessor is missing unless your state model separately retains and resumes deferred events.

## Retention is part of correctness

An inbox can grow indefinitely, but deleting entries too early re-enables old duplicates. Retention must cover:

- broker message and dead-letter retention;
- maximum redrive and incident-recovery age;
- Kafka offset resets and topic replay policy;
- backups or archives that can republish historical events;
- contractual request-id reuse windows.

For permanent event IDs, archive compact keys or partition the inbox by processing date rather than expiring blindly. Document what happens when replay intentionally exceeds the window: rebuild into a fresh projection with a new consumer scope, or restore the corresponding inbox history.

Monitor inbox conflicts, hash mismatches, transaction retries, age and size by consumer, handler outcomes, and time between database commit and broker settlement. A sudden increase in conflicts can reveal visibility expirations, consumer rebalances, relay duplication, or failing acknowledgements.

Test two concurrent deliveries of the same ID, a crash immediately before and after commit, a lost broker acknowledgement, a payload mismatch under the same ID, serialization retries, and redrive after the planned retention boundary. The invariant is always the same: for one consumer and message identity, the local effect and its inbox evidence exist together or not at all.

## Official Documentation

- [PostgreSQL `INSERT` and `ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [PostgreSQL transaction isolation and transaction retries](https://www.postgresql.org/docs/current/transaction-iso.html)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Amazon DynamoDB condition expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html)
- [Amazon DynamoDB `TransactWriteItems`](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html)
- [AWS Lambda Powertools idempotency utility](https://docs.aws.amazon.com/powertools/python/latest/utilities/idempotency/)
