# Use Idempotency Keys and Correlation IDs for Safe API Retries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Correlation ID, Retries, HTTP, Observability

Description: Separate duplicate-side-effect protection from request correlation, design a durable idempotency record, and preserve useful support IDs on replayed responses.

---

An idempotency key and a correlation ID may both look like random strings, but substituting one for the other creates subtle failures. The idempotency key identifies a protected business operation whose result can be reused. The correlation ID helps explain an execution in logs.

A retry can therefore use the same idempotency key while receiving a new server correlation ID. The server records that this new request reused an earlier result instead of performing the side effect again.

## Define the contract with a concrete example

Suppose a client submits an order and times out before receiving the response. It retries the same intended order:

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
Content-Length: 51
Idempotency-Key: 8e28bd74-6cc4-40ed-97af-7b551a5965d0
X-Correlation-ID: client-workflow-73

{"cart_id":"cart-204","delivery_option":"standard"}
```

The key and semantic payload stay the same on retry. A new order intent gets a new key, even if the payload happens to be identical. Otherwise, a legitimate second order could be mistaken for a retry of the first.

The server may generate its own request correlation ID and log the association with the client's workflow reference. The client should keep the response reference from each attempt because that is the value support can reliably find in server logs.

## Do not assume every API implements the same rules

An idempotency header only works when the server defines and implements it. A generic HTTP server does not become idempotent because the caller adds the header.

Stripe provides a concrete documented contract: it associates results with an idempotency key, compares parameters on reuse, and can retain the initial status and body even when that status is 500. Its documentation describes retention and cases where execution never began, so a result was not saved. Consult the [Stripe idempotent request reference](https://docs.stripe.com/api/idempotent_requests) for that API's exact behavior.

For your own API, specify key scope, payload comparison, retention, concurrent requests, failures, and response replay. Clients need these details to decide whether a timeout can be retried safely.

## Store the decision durably

A useful PostgreSQL schema scopes each key by authenticated tenant and operation:

```sql
CREATE TABLE api_idempotency (
    tenant_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash bytea NOT NULL,
    state text NOT NULL CHECK (state IN ('in_progress', 'completed')),
    response_status integer,
    response_body jsonb,
    original_correlation_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, operation, idempotency_key)
);
```

Validate key length before storing it. Obtain `tenant_id` from authenticated application state, not from a diagnostic header. Compute `request_hash` from a versioned canonical representation of the inputs that determine the side effect. Raw JSON bytes can differ because of whitespace or key order while representing the same operation.

The correlation ID is stored as evidence of the original execution. It is not part of the uniqueness constraint because each retry can have a different request ID.

## Make reservation and side effects atomic

For a side effect entirely inside the same PostgreSQL database, use one transaction to reserve the key, perform the business change, and store the completed result. The following is a transaction outline; the application controls the branch after `RETURNING`:

```sql
BEGIN;

INSERT INTO api_idempotency (
    tenant_id, operation, idempotency_key, request_hash,
    state, original_correlation_id
) VALUES ($1, $2, $3, $4, 'in_progress', $5)
ON CONFLICT DO NOTHING
RETURNING idempotency_key;

-- If a row was returned: perform the business write in this transaction,
-- then store its status/body and set state='completed' before COMMIT.
-- Otherwise: read the existing row in a subsequent statement,
-- compare request_hash, and return its stored result or a conflict.

COMMIT;
```

Under PostgreSQL's normal Read Committed behavior, a conflicting insert can wait for another transaction. A subsequent statement gets a new snapshot, which matters when reading the row after `ON CONFLICT DO NOTHING`. Configure appropriate lock and request timeouts and handle aborted transactions explicitly.

This outline deliberately does not commit an `in_progress` reservation before the database side effect. If you choose a multi-transaction workflow instead, define leases, abandoned reservations, ownership, and recovery. Otherwise, a process crash can leave the key stuck forever.

An external API call is not made atomic by a local database transaction. Use the downstream API's idempotency contract and a durable workflow/outbox design appropriate to that boundary. Never claim local uniqueness alone guarantees an external side effect happened exactly once.

## Preserve useful correlation on replay

When serving a stored response, return a new request correlation header for the current attempt. Log fields such as:

```json
{
  "event": "idempotency.replayed",
  "correlation_id": "current-request-id",
  "original_correlation_id": "first-request-id",
  "idempotency_outcome": "replayed",
  "operation": "create-order"
}
```

Avoid blindly replaying all original headers. A stored `Date`, transient cookie, or old support header may be inappropriate for the new HTTP response. Define which response data is replayed and which headers are generated afresh.

If an error body embeds a support ID, document whether it references the original execution or the current request. Keeping both named explicitly can be useful; two conflicting values with the same label are confusing.

## Test the failure windows

Exercise a lost response after commit, two simultaneous requests with one key, the same key with changed input, a process crash before commit, and expiry followed by reuse. Assert one business effect within the documented contract and clear log links for every attempt.

Also verify tenant isolation. The same textual key from two different tenants must not expose one tenant's stored result to another.

## Conclusion

Use idempotency keys to control repeated side effects and correlation IDs to explain individual executions. Persist the idempotency decision with the business outcome, record links between retries, and define replay and retention behavior clearly enough that clients can recover from uncertain responses.

## Official Documentation

- [Stripe idempotent request behavior](https://docs.stripe.com/api/idempotent_requests)
- [PostgreSQL INSERT and ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
