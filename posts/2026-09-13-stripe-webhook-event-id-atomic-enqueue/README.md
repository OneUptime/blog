# Claim Stripe Webhook Event IDs Before Enqueuing Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Stripe, Idempotency, PostgreSQL, Messaging, Deduplication

Description: Verify Stripe webhook signatures, atomically record event.id with durable queued work, and make duplicate delivery and enqueue failures safe to retry.

---

A webhook handler receives `evt_123`, records that it has seen the event, and then crashes before publishing a job. Stripe delivers the event again, but the handler skips it because the receipt already exists. The event was deduplicated successfully and its work was lost.

Reversing the order creates another failure: publish first, crash before saving the receipt, and the retry publishes the same work again.

Close this gap by making receipt creation and durable enqueue one transaction. The receipt should mean the work has been accepted durably, not merely that an HTTP request reached a process.

## Verify the request before trusting event.id

For Stripe snapshot events, verify the untouched request body with the endpoint signing secret and `Stripe-Signature` header. The official Python SDK provides this call:

```python
import stripe

event = stripe.Webhook.construct_event(
    payload=raw_body,
    sig_header=signature_header,
    secret=endpoint_signing_secret,
)
```

The variables come from your framework's raw-body reader, request headers, and configured secret store. Handle malformed input and signature verification failures as request rejection before writing a receipt. The [SDK webhook implementation](https://github.com/stripe/stripe-python/blob/master/stripe/_webhook.py) documents this snapshot-event API; thin event notifications use their corresponding parser.

Do not parse and reserialize the body before verification. Stripe documents the raw-body requirement and repeated deliveries in its [webhook guide](https://docs.stripe.com/webhooks).

## Scope a receipt to its actual consumer

Use a server-defined source scope that includes the relevant Stripe account context and test/live environment, plus a logical consumer name. For a connected-account endpoint, resolve the verified account information through your integration's account mapping.

Do not use a deployment instance ID or delivery attempt signature in this namespace. All replicas handling the same logical work need to share the receipt. Distinct consumers may legitimately process the same event independently.

```sql
CREATE TABLE stripe_inbox (
    source_scope text NOT NULL,
    consumer_name text NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    accepted_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source_scope, consumer_name, event_id)
);

CREATE TABLE stripe_jobs (
    source_scope text NOT NULL,
    consumer_name text NOT NULL,
    event_id text NOT NULL,
    payload jsonb NOT NULL,
    state text NOT NULL DEFAULT 'queued',
    PRIMARY KEY (source_scope, consumer_name, event_id),
    FOREIGN KEY (source_scope, consumer_name, event_id)
        REFERENCES stripe_inbox
);
```

The job table is a minimal durable queue for the example. A production worker also needs retry scheduling, attempts, ownership, and dead-letter handling. Retain enough receipt history to cover your supported redelivery and manual recovery horizon.

## Insert the receipt and job atomically

After verification and event-type filtering, execute this parameterized statement inside a transaction:

```sql
BEGIN;

WITH claimed AS (
    INSERT INTO stripe_inbox (
        source_scope, consumer_name, event_id, event_type, payload
    ) VALUES ($1, $2, $3, $4, $5::jsonb)
    ON CONFLICT (source_scope, consumer_name, event_id)
    DO NOTHING
    RETURNING source_scope, consumer_name, event_id, payload
)
INSERT INTO stripe_jobs (
    source_scope, consumer_name, event_id, payload
)
SELECT source_scope, consumer_name, event_id, payload
FROM claimed
RETURNING event_id;

COMMIT;
```

`$1` is the trusted source scope, `$2` the configured consumer, `$3` the verified event ID, `$4` its event type, and `$5` the verified event JSON. PostgreSQL's [INSERT documentation](https://www.postgresql.org/docs/current/sql-insert.html) specifies `ON CONFLICT` and `RETURNING` behavior.

If the claim is new, the statement inserts one job. If another transaction already committed the receipt, it inserts none. If the job insert fails, the transaction also rolls back the receipt. There is no committed state where this transaction accepted the event but omitted its job.

Only send a successful acknowledgment after commit. An already-accepted duplicate can also receive `200` because the durable job exists. If the database transaction fails, return an error so delivery can be retried. Keep the handler short by leaving business processing to the worker.

## Preserve the guarantee when using a broker

If the real destination is SQS, RabbitMQ, or another external broker, the local database transaction cannot atomically include an ordinary network publish. Treat `stripe_jobs` as an outbox instead.

A dispatcher reads unsent rows, publishes a message with a stable message identity, and then marks delivery. A crash after publication but before marking can publish again. Consumers therefore still need idempotent processing. The [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) describes this dual-write problem and the possibility of duplicate delivery.

Do not acknowledge the original webhook merely because a publish was scheduled in an in-memory background task. Acceptance must survive the process disappearing immediately afterward.

## Deduplicate again at the business boundary

An event ID identifies delivery of an event, not every possible business invariant. Two different event objects may relate to the same payment. Your ledger might need uniqueness on `(account, payment_id, ledger_action)` regardless of which event triggered it.

Stripe notes that some duplicate notifications have separate Event objects and suggests using object ID and event type to identify those cases. Apply that guidance with the event's meaning in mind: globally suppressing every later `customer.subscription.updated` for one subscription would discard legitimate updates.

For state updates, reconcile the relevant object. For an irreversible action, express a durable business identity such as one fulfillment per paid invoice. Keep delivery receipts and business-action records separate so both can be inspected during recovery.

## Validate the failure windows

Run two transactions concurrently with the same scoped event ID and assert one inbox row and one job. Force the job insert to fail and assert neither row commits. Retry afterward and verify successful acceptance.

Then simulate a crash after commit but before acknowledgment and a dispatcher crash after publication. The first should produce another harmless webhook acknowledgment; the second may produce another broker message but must not repeat the protected business effect.

## Conclusion

Claim a verified event ID in the same transaction that durably queues its work. Acknowledge only after that transaction commits, then preserve idempotency through broker dispatch and business processing. That makes duplicate webhook delivery recoverable without trading duplicate work for lost work.

## Official Documentation

- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Stripe Python webhook implementation](https://github.com/stripe/stripe-python/blob/master/stripe/_webhook.py)
- [PostgreSQL INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
