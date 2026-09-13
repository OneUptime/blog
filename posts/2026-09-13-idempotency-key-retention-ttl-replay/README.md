# How Long Should Idempotency Keys Live?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Reliability, PostgreSQL, Retries, API Design

Description: Choose idempotency retention from real retry and replay horizons, separate response expiry from operation identity, and clean up records without enabling duplicate effects.

---

Deleting an idempotency record changes the behavior of a future request. Yesterday, key `refund-204` meant replay the recorded refund. After deletion, the same key may mean create another refund.

An idempotency TTL is therefore part of the API contract. Treating it as an arbitrary cache setting makes safe retries depend on cleanup timing that clients cannot see.

The first design question is whether expiry should permit the same operation to execute again. For a search export, that may be acceptable. For a refund, a durable business identifier should usually outlive the response cache.

## Start with the longest supported retry path

List the ways an operation can return after its initial request:

| Path | Example horizon to measure |
| --- | --- |
| Client retry loop | SDK backoff and total deadline |
| Offline client | Persisted submission after reconnect |
| Queue redelivery | Retention plus processing outage |
| Dead-letter recovery | Operator replay after repair |
| Support tooling | Manual retries from incident records |
| Disaster recovery | Restore and replay of old commands |

For paths that happen sequentially, add the delays. A command might spend two days in a queue and then wait a week for manual recovery. Taking only the largest individual timeout would miss that nine-day path.

Choose the maximum supported elapsed time from first accepted intent to last permitted retry, then add explicit operational margin. Also define which paths are unsupported. An unbounded promise to accept historical replays cannot be backed by a small finite TTL.

## Keep provider retention separate from your own

Stripe's API v1 documentation allows pruning idempotency keys once they are at least 24 hours old and describes reuse after pruning as a new request. That is a provider-specific guarantee, not a default for every API. See [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests).

If your workflow retries a downstream provider after your own longer retention window, your local record does not extend the provider's deduplication guarantee. Store the downstream object identifier and reconcile before resubmitting old commands. Never assume a week-old provider key still protects a new call.

Likewise, incoming webhook redelivery has its own horizon. Do not reuse outbound API-key retention as webhook-receipt retention just because both features are called idempotency.

## Separate response retention from operation identity

A response can contain sensitive data or a large document. Keeping those bytes forever is unnecessary if a smaller durable record can prevent duplicate execution.

Consider two records:

```sql
CREATE TABLE operation_receipts (
    tenant_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    business_id text NOT NULL,
    completed_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, operation, idempotency_key)
);

CREATE TABLE operation_responses (
    tenant_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    status_code integer NOT NULL,
    body bytea NOT NULL,
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, operation, idempotency_key),
    FOREIGN KEY (tenant_id, operation, idempotency_key)
        REFERENCES operation_receipts
);

CREATE INDEX operation_responses_expiry
ON operation_responses (expires_at);
```

Write both records and the local business change in one transaction. PostgreSQL's [constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) describes the composite primary key and foreign key mechanisms used here.

After response expiry, the receipt still identifies the completed operation. Your contract might return `409` with `idempotency_response_expired` and an authorized operation lookup link. It can also return a documented representation reconstructed from the business record. Reconstruction is not byte-for-byte replay, so clients need to know which promise they receive.

## Choose a fixed expiry reference point

For completed synchronous requests, a practical rule is a fixed response expiry calculated from completion time. That prevents a long-running operation from exhausting its replay period before its response exists.

Define the clock source and boundary precisely. For example: replay is available when `expires_at > statement_timestamp()` on the authoritative database. Retries do not extend this timestamp. A sliding TTL can allow a malfunctioning client to keep large records alive indefinitely.

Business identity can have a different retention policy. If receipts must eventually be removed, preserve an equivalent invariant on the business table, such as uniqueness of `(tenant_id, merchant_refund_reference)`. Removing every trace of identity necessarily ends the guarantee against replaying that historical intent.

## Clean up in bounded batches

Delete only disposable response records:

```sql
WITH expired AS (
    SELECT tenant_id, operation, idempotency_key
    FROM operation_responses
    WHERE expires_at <= statement_timestamp()
    ORDER BY expires_at
    LIMIT 1000
    FOR UPDATE SKIP LOCKED
)
DELETE FROM operation_responses AS response
USING expired
WHERE response.tenant_id = expired.tenant_id
  AND response.operation = expired.operation
  AND response.idempotency_key = expired.idempotency_key;
```

`SKIP LOCKED` supports multiple cleanup workers without waiting on the same selected rows. Its intentionally incomplete view is appropriate for this maintenance queue, not for deciding whether a business operation exists. PostgreSQL explains that distinction in the [SELECT locking clause](https://www.postgresql.org/docs/current/sql-select.html).

A replay racing cleanup should fall back to the retained receipt and the documented expired-response outcome. It must never treat a missing response row as a new operation. Keeping that decision separate makes cleanup timing harmless to effect uniqueness.

## Test retention as behavior

Use controlled timestamps to test just before expiry, exactly at expiry, and after deletion. Include an old request with a matching fingerprint, an old request with changed input, and cleanup running while a duplicate arrives.

Restore a backup into an isolated environment and replay a historical command. Verify that the operation's durable business identifier still protects the effect. If your recovery process can restore the ledger without its receipts, the database backup is not sufficient evidence of idempotency safety.

Monitor retained response bytes, cleanup lag, retries after the guaranteed window, and attempts to reuse expired keys. Those measurements tell you whether the documented horizon matches actual client behavior.

## Conclusion

Choose retention from complete retry paths and publish the expiry behavior. Separate the lifetime of replayable response bytes from the lifetime of operation identity, and ensure cleanup cannot reopen a completed business action. A smaller response cache can then coexist with durable duplicate protection.

## Official Documentation

- [Stripe API v1 idempotent request retention](https://docs.stripe.com/api/idempotent_requests)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL SELECT and SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html)
