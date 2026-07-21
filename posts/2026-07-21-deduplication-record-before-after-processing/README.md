# The Deduplication Race: Should You Record a Message Before or After Processing?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Message Queue, Deduplication, Transaction, Idempotent Processing

Description: Eliminate the record-before versus record-after crash window with an atomic inbox transaction, deliberate acknowledgments, and durable remote-work state.

---

Recording a message ID before processing can lose the business effect. Recording it after processing can duplicate the effect. If the deduplication record and business change share one transactional database, write both in the same transaction and acknowledge the broker only after that transaction commits.

When the effect is in another service, no ordering of two independent writes removes the failure window. Use a durable workflow plus downstream idempotency or reconciliation.

## See the two failure windows

Consider a consumer that handles "payment-authorized."

### Record first

1. Insert the message ID into processed_message.
2. Crash before updating the order.
3. The broker redelivers the message.
4. The consumer sees the ID and skips it.

The message appears processed, but the order never changes. This is effectively message loss at the application layer.

### Process first

1. Update the order.
2. Crash before inserting the message ID.
3. The broker redelivers the message.
4. The consumer updates the order again.

The business effect happens twice. A counter, balance, email, shipment, or external charge can be duplicated.

Acknowledging before either sequence creates another loss window. Acknowledging after it protects against loss but permits redelivery if the acknowledgment is lost. Azure Service Bus documents the same tradeoff: receive-and-delete is at-most-once and can lose work, while peek-lock is at-least-once and can redeliver after the lock expires. RabbitMQ similarly requeues an unacknowledged manual delivery when its channel or connection closes.

## Make the local work one atomic unit

When the inbox and business state are in the same database, put them in one ACID transaction. This example assumes a unique constraint on `(consumer_name, message_id)`:

```sql
BEGIN;

WITH claimed AS (
    INSERT INTO processed_message (
        consumer_name,
        message_id,
        processed_at
    )
    VALUES (
        'order-payment-consumer',
        'operation-8f2c',
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (consumer_name, message_id) DO NOTHING
    RETURNING message_id
), changed AS (
    UPDATE orders
    SET payment_status = 'authorized'
    FROM claimed
    WHERE orders.order_id = 'order-417'
      AND orders.payment_status = 'pending'
    RETURNING orders.order_id
)
SELECT
    EXISTS (SELECT 1 FROM claimed) AS claimed,
    EXISTS (SELECT 1 FROM changed) AS changed;

-- Inspect both flags in application code. Do not acknowledge yet.
```

The update can read only a row returned by the successful inbox insert. On a duplicate, `claimed` is empty and the update cannot mutate the order. If both flags are true, commit and then acknowledge. If both are false, end the unchanged transaction and acknowledge the safe duplicate. If `claimed` is true but `changed` is false, roll back and do not acknowledge unless the domain explicitly treats the existing state as successful; in that case, commit the inbox row before acknowledging.

The important property is not whether the insert statement appears first or last. It is that neither change becomes visible without the other:

- If the process crashes before commit, the database rolls both changes back.
- If commit succeeds, both changes persist.
- If the process crashes after commit but before broker acknowledgment, redelivery finds the unique inbox row and does not repeat the effect.

PostgreSQL documents transactions as all-or-nothing operations and unique constraints as enforcing uniqueness even when concurrent sessions race. Use the corresponding transactional and uniqueness guarantees in your chosen datastore.

## Let the unique constraint arbitrate concurrency

Never implement deduplication as an unlocked read followed later by an insert:

```text
if message ID does not exist:
    perform effect
    insert message ID
```

Two workers can both read "not found" before either inserts. A database primary key or unique constraint must decide the winner.

Scope that key correctly. If each consumer is allowed to apply an event once, use (consumer_name, message_id). Add a producer namespace or operation type when message IDs are not globally unique. Keep all key fields non-null so null semantics cannot admit apparent duplicates.

For an aggregate transition, add a domain guard too. Updating an order from pending to authorized is safer than blindly incrementing a status counter. The inbox protects against the same message; the state predicate protects against conflicting messages that request the same transition.

## Acknowledge after durable completion

Use manual settlement and acknowledge only after the local transaction commits. The expected sequence is:

1. Receive and lock the message.
2. Validate its identity and schema.
3. Begin the database transaction.
4. Claim the unique inbox key.
5. Apply the business change when the claim succeeds.
6. Commit.
7. Acknowledge or complete the broker delivery.

The final two operations cannot generally be one distributed transaction. A crash between them causes a redelivery, which is safe because the committed inbox row exists. This intentionally chooses a possible duplicate delivery over a possible lost business effect.

Keep the broker lock or acknowledgment deadline long enough for processing and renew it where supported. Renewal reduces churn; the inbox key still handles lease and acknowledgment failures.

Google Cloud Pub/Sub's exactly-once documentation still requires subscribers to retain processing progress until acknowledgment succeeds and notes that multiple publisher sends can create distinct message IDs. Application state remains part of the proof.

## Distinguish received from completed

Some workflows need to persist receipt before long-running work begins. That is safe only if the row is a resumable state record, not a permanent "done" marker.

Use explicit states such as:

```text
received -> executing -> succeeded
                    +-> failed_retryable
                    +-> failed_terminal
```

A redelivery that finds received, executing with an expired lease, or failed_retryable should resume or reclaim the work. Only succeeded and deliberately terminal outcomes suppress further execution.

Store a lease owner and expiry when multiple workers can claim a long task. Update claims conditionally so one worker owns the current attempt. Do not use a stuck executing row as evidence of success.

For invalid messages, define "processed" explicitly. A schema error may be recorded as a terminal rejection and then acknowledged, with enough nonsensitive evidence for audit. A transient database or dependency failure should leave the message eligible for retry. A repeatedly failing poison message should follow the documented dead-letter policy rather than loop indefinitely.

## Remote side effects need another design

A database transaction cannot normally include a charge at a payment provider, an email API, or a separate service database. Holding a database transaction open during an HTTP request does not make the remote effect atomic and can create lock contention.

Suppose the consumer records executing, calls a payment API, the provider succeeds, and the consumer crashes before recording succeeded. On recovery, the local state cannot tell whether the charge occurred. Writing succeeded before the call merely changes the failure to a missed charge.

Use this order instead:

1. In one local transaction, claim the message and persist a durable command with a stable operation or idempotency key.
2. Commit and acknowledge the incoming message when loss of the durable command is no longer possible.
3. Let a worker execute the command.
4. Retry with the same downstream idempotency key.
5. Store the confirmed remote result and advance the workflow state.

This is an inbox plus durable outbox or work-queue pattern. AWS's transactional-outbox guidance describes storing business state and an outbound event in one transaction, while warning that the relay can publish duplicates and consumers must remain idempotent.

If the remote API has no idempotency contract, the crash window after remote success remains ambiguous. The worker must query by a stable business reference, consume a callback, or route the command to reconciliation before retrying. A state machine makes uncertainty visible; it does not magically provide atomicity across systems.

## Do not confuse a transaction with long work

Keep local transactions short. Parse and validate data before opening one when possible. Avoid network calls inside it. For CPU-intensive work, persist a claim or job and commit, then execute under a recoverable lease.

If the business mutation itself takes a long time, split it into idempotent state transitions. Each transition should have:

- a durable input identity
- an allowed prior state
- one local atomic commit
- a recorded result
- a recovery action for an interrupted attempt

This gives operators a known state instead of a message that is either silently skipped or blindly repeated.

## Test every crash point

Correctness becomes clear when failure is injected deliberately:

- before the inbox insert
- after the insert but before the business update
- after the update but before local commit
- after commit but before broker acknowledgment
- after a remote request is sent but before its response is stored
- during acknowledgment or lease renewal

For each point, restart the consumer and verify the final business state, message state, inbox row, and external effect. Run concurrent duplicate deliveries too. A design is not proven by the happy path or by a broker setting named "exactly once."

## The decision rule

For local transactional work, record the message and effect together, then acknowledge after commit. For long work, record a resumable status rather than a premature completion marker. For an external effect, persist intent first and complete it through an idempotent or reconcilable workflow.

The apparent before-or-after choice is a warning that two facts need atomicity. Solve that boundary directly instead of choosing which crash loses.

## Official documentation

- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Azure Service Bus message loss and duplicate processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates)
- [RabbitMQ consumer acknowledgments and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [Google Cloud Pub/Sub exactly-once delivery](https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
