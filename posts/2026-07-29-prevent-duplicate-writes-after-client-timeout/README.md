# How to Prevent Duplicate Writes When a Client Retries After Timing Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, API, Database, PostgreSQL, Retry, Distributed System

Description: Make timed-out writes safe to repeat with client operation keys, database uniqueness, atomic result storage, and reconciliation for external side effects.

---

When a client times out after sending a write, it cannot infer whether the server committed the operation. The response may have been lost after a successful commit:

```text
client                server                 database
  |  create order       |                       |
  |-------------------->|  INSERT + COMMIT      |
  |                     |---------------------->|
  |                     |<----------------------|
  |    response lost    |                       |
  |<------- X ----------|                       |
  |  timeout            |                       |
```

Repeating an unprotected create can produce two orders. The fix is not to increase a timeout until the ambiguity becomes rare. The fix is to give every logical write a stable identity and make the server enforce it atomically.

## Use One Key per Logical Operation

The client generates an unpredictable idempotency key before the first attempt:

```python
from uuid import uuid4

operation_key = str(uuid4())
```

It sends the same key with every retry of that operation:

```http
POST /v1/orders HTTP/1.1
Host: api.example.com
Idempotency-Key: 1b835e1a-a701-44ca-a175-9e968a3250e2
Content-Type: application/json

{"customer_id":"c-42","items":[{"sku":"A7","quantity":2}]}
```

A new user action receives a new key. A retry reuses the old key. Generating a new key after a timeout defeats duplicate detection.

Scope keys by tenant, account, or authenticated principal so one customer's key cannot collide with another customer's operation.

## Enforce Uniqueness in the Database

An in-memory map is not sufficient across replicas or restarts. Store the key behind a unique constraint in the same durable system that stores the write:

```sql
CREATE TABLE idempotency_records (
    tenant_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash bytea NOT NULL,
    state text NOT NULL CHECK (state IN ('processing', 'completed')),
    response_status integer,
    response_body jsonb,
    resource_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    PRIMARY KEY (tenant_id, idempotency_key)
);
```

The primary key is the concurrency primitive. Two servers can receive the same retry at once, but only one can create the key record.

Also store a hash of the normalized operation inputs. If a client reuses a key with different parameters, reject it rather than returning a result from an unrelated request. Stripe documents the same parameter-consistency principle for its idempotency layer.

Do not put credentials, email addresses, or other sensitive values directly into keys.

## Commit the Key and Business Write Together

For a write entirely inside one relational database, use one transaction:

```sql
BEGIN;

INSERT INTO idempotency_records (
    tenant_id,
    idempotency_key,
    request_hash,
    state
)
VALUES ($1, $2, $3, 'processing')
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
RETURNING tenant_id;

-- Continue only when the INSERT returned a row.

INSERT INTO orders (id, tenant_id, customer_id, state)
VALUES ($4, $1, $5, 'pending');

UPDATE idempotency_records
SET
    state = 'completed',
    response_status = 201,
    response_body = $6,
    resource_id = $4,
    completed_at = now()
WHERE tenant_id = $1
  AND idempotency_key = $2;

COMMIT;
```

Application logic must branch on whether the first `INSERT ... RETURNING` produced a row:

- row returned: this transaction owns the new operation;
- no row returned: load the existing record, verify the request hash, and return or wait for its result;
- transaction rolled back: neither the business write nor the key record should remain.

PostgreSQL documents that `ON CONFLICT DO NOTHING` avoids a unique-constraint error, and that `ON CONFLICT DO UPDATE` provides an atomic insert-or-update outcome. The exact concurrency flow should be tested with the application's isolation level and driver.

Never insert the order in one transaction and the idempotency record in a later transaction. A crash between them leaves an unrecognized successful write.

## Handle Concurrent Retries

The duplicate request can arrive while the first transaction is still running. Define an explicit policy:

1. Let the unique-index conflict wait for the first transaction to finish, then read its record.
2. Return an operation-in-progress response and let the client poll.
3. Wait for a short bounded period, then return a retriable in-progress result.

Do not let both handlers perform the side effect while racing to store a final response.

If using a long-lived `processing` state outside a single database transaction, include ownership and lease-recovery rules. A permanent `processing` row after a crashed worker otherwise blocks the operation forever. A single local transaction avoids that intermediate durable state because uncommitted rows roll back on connection loss.

## Return the Original Logical Result

Store enough of the outcome to make a replay useful:

- HTTP or RPC status;
- stable resource identifier;
- response body or a reproducible result reference;
- completion timestamp;
- selected response metadata.

On a matching retry, return the stored result without executing the write again.

Whether to persist error results is an API-contract decision. Stripe documents that it saves the first result after endpoint execution begins, including `500` results. Your system may choose a different policy, but clients must know it. Validation failures that occur before operation ownership is established generally should not reserve a key.

## Add a Natural Business Constraint Too

An idempotency table protects retries that reuse a key. A domain constraint protects invariants even when a buggy client generates a new key:

```sql
ALTER TABLE payments
ADD CONSTRAINT payments_provider_reference_unique
UNIQUE (tenant_id, provider_reference);
```

Examples include:

- one payment per provider transaction reference;
- one subscription renewal per billing period;
- one imported event per source event ID;
- one order per externally assigned purchase ID.

Use both when possible. The idempotency key models the request; the business key models the real-world uniqueness rule.

## External Side Effects Need Another Boundary

A local transaction cannot atomically commit both PostgreSQL state and an arbitrary email, payment provider call, or message-broker publish.

Use one of these patterns:

- pass the same idempotency key to a downstream API that enforces it;
- write an outbox event in the same database transaction, then publish it asynchronously;
- give the downstream command a stable business identifier and deduplicate there;
- reconcile local and remote state after an ambiguous failure.

An outbox makes local state and the intent to publish atomic:

```sql
BEGIN;

INSERT INTO orders (id, tenant_id, customer_id, state)
VALUES ($1, $2, $3, 'pending');

INSERT INTO outbox_events (
    event_id,
    aggregate_id,
    event_type,
    payload
)
VALUES ($4, $1, 'order.created', $5);

COMMIT;
```

The publisher can deliver the outbox event more than once, so consumers still need event-ID deduplication or an idempotent effect.

## Status Lookup Reduces Blind Retries

Expose a way to query an operation by key or operation ID:

```http
GET /v1/operations/1b835e1a-a701-44ca-a175-9e968a3250e2
```

Possible states might be `processing`, `succeeded`, `failed`, and `unknown`. The exact model depends on whether work continues asynchronously.

After a timeout, a client can first look up status rather than immediately resubmitting a costly write. The original POST still needs duplicate protection because status responses can also be lost or delayed.

## Choose a Retention Window

Keep idempotency records for at least the maximum period in which a client, queue, or operator can legitimately replay the request. Consider:

- mobile clients reconnecting after hours;
- queue redelivery and dead-letter replay;
- workflow recovery after an incident;
- client retry policies;
- regulatory or audit requirements;
- storage and privacy constraints.

If a key is deleted and later reused, the server can treat it as a new operation. Document that boundary. Do not base correctness on clients never retrying later than expected unless the protocol enforces expiry.

## Avoid These Designs

### Check then insert

This race is unsafe:

```text
SELECT key
if missing:
    perform write
    INSERT key
```

Two handlers can both observe missing. Make ownership conditional on an atomic unique insert.

### Key generated by the server after execution

The client has nothing stable to resend when the response containing that key is lost. The key must exist before the first attempt, or be derived from a stable business identifier already known to the client.

### Same key, different payload

Returning the old response silently can attach the wrong result to a new request. Store and compare a request hash.

### Deduplication cache without durable uniqueness

Cache eviction, restart, replication lag, or two application replicas can admit duplicates. A cache can accelerate lookup but should not be the only correctness boundary.

### Assuming PUT or DELETE solves all duplication

HTTP defines these methods as idempotent in their intended effect, but application-specific side effects can still violate that promise. Test the actual endpoint contract.

## Validation Checklist

1. Send two identical requests with the same key concurrently.
2. Drop the first response after the database commit, then retry.
3. Reuse the key with a different payload and confirm rejection.
4. Crash the handler before commit and confirm the operation can run again.
5. Crash after commit but before response and confirm replay returns the stored result.
6. Retry through different application replicas.
7. Replay after the documented retention boundary and verify defined behavior.
8. Test downstream event redelivery independently.

There is no reliable way for a client to distinguish a lost successful response from a failed write using a timeout alone. A durable operation key, atomic uniqueness, and replayable result turn that unknown outcome into a protocol the client can safely repeat.

## Official Documentation

- [RFC 9110 idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [AWS guidance for idempotent mutating operations](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html)
- [Amazon EC2 client-token idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html)
- [PostgreSQL INSERT and ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [PostgreSQL unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
