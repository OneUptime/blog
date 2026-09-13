# Concurrent Idempotency Keys: Wait, Replay, or Return 409?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, PostgreSQL, Concurrency, HTTP, API Design

Description: Choose a bounded wait or conflict policy for concurrent idempotent requests, using PostgreSQL uniqueness, transaction snapshots, and explicit retry behavior.

---

Two requests with the same idempotency key can arrive before either has committed. The second request cannot replay a result that does not exist yet. It must wait for a decision, receive an explicit pending response, or retry later.

The useful distinction is between the database rule and the HTTP policy. A unique constraint chooses which transaction owns the operation. Your endpoint decides how long another caller may wait and how it reports that wait ending.

This example concerns short operations whose business changes and saved response fit in one PostgreSQL transaction. A workflow that calls an external payment provider needs additional recovery rules.

## Define the outcomes before choosing a lock

For `POST /orders`, consider this contract:

| Condition | Result |
| --- | --- |
| New scoped key | Perform the operation and save its result |
| Existing key, matching input, completed result | Replay the saved response |
| Existing key, different input | Reject key reuse with a distinct error code |
| Matching operation still executing | Wait within a small budget, then report pending |
| Storage unavailable or unrelated lock contention | Report a retryable service error |

For this API, a known pending operation returns `409` with an `idempotency_in_progress` code. A mismatched request also uses `409`, but has an `idempotency_payload_mismatch` code and must not be retried unchanged. These are application conventions. [HTTP defines 409 as a conflict with resource state](https://www.rfc-editor.org/rfc/rfc9110.html#name-409-conflict); it does not prescribe a complete idempotency protocol.

## Let the unique index decide ownership

Use a composite key with authenticated scope:

```sql
CREATE TABLE api_results (
    tenant_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_status integer,
    response_body bytea,
    PRIMARY KEY (tenant_id, operation, idempotency_key)
);
```

Start the transaction and claim the key:

```sql
BEGIN;
SET LOCAL lock_timeout = '150ms';
SET LOCAL statement_timeout = '2s';

INSERT INTO api_results (
    tenant_id, operation, idempotency_key, request_hash
) VALUES ($1, $2, $3, $4)
ON CONFLICT (tenant_id, operation, idempotency_key)
DO NOTHING
RETURNING idempotency_key;
```

These parameterized statements are an application transaction outline. If `RETURNING` produces a row, execute the business write and fill in the response before committing. Do not commit the empty reservation in this design. If any step fails, roll back both the claim and the business write.

If no row is returned, perform a separate query:

```sql
SELECT request_hash, response_status, response_body
FROM api_results
WHERE tenant_id = $1
  AND operation = $2
  AND idempotency_key = $3;
```

Compare the fingerprint before replaying the result. Keep all queries on the same checked-out connection and use Read Committed for this outlined flow.

## Understand what the duplicate insert actually does

Suppose transaction A has inserted the key but not committed. B's conflicting insert can wait for A. If A commits, B returns no inserted row. If A rolls back, B may insert successfully and become the owner. PostgreSQL documents these conflict and snapshot semantics in its [INSERT reference](https://www.postgresql.org/docs/current/sql-insert.html) and [Read Committed discussion](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED).

The separate `SELECT` matters. A single statement that combines `INSERT ... DO NOTHING` with a fallback table read can miss a conflicting row that was invisible to that statement's snapshot. A subsequent Read Committed statement starts with a fresh snapshot.

Cleanup can still delete the record between statements. Coordinate retention with active requests; if the result disappears, restart the claim protocol within the request budget. Do not interpret a missing result as permission to run the business operation without another successful claim.

## Bound the wait without misclassifying failures

`lock_timeout = '150ms'` limits a lock acquisition wait. `statement_timeout = '2s'` limits each statement, so also enforce an application deadline for the complete transaction. Setting `lock_timeout` to zero disables it; zero is not a nonblocking mode. See [PostgreSQL timeout settings](https://www.postgresql.org/docs/current/runtime-config-client.html).

A lock timeout aborts the current transaction unless recovered through a suitable savepoint. In a simple handler, roll back and return the connection cleanly to the pool before sending the response.

Do not turn every lock timeout into `idempotency_in_progress`. A table lock held by a migration can cause the same failure. Without evidence identifying the contention as this key's executing request, return a retryable `503` such as `idempotency_store_busy`. Reserve the precise `409` diagnosis for a design that can establish it.

For example, a deliberately committed pending record can make execution state visible. That architecture also requires ownership, leases, fencing, and recovery after crashes. It is substantially different from keeping the complete operation in one transaction.

## Decide whether waiting is worth the connection

A short wait helps when normal execution finishes in tens of milliseconds. Most duplicates then receive the final response immediately. Under a retry storm, however, every waiting request consumes application capacity and may occupy a database connection.

Measure duplicate wait duration and pool saturation. Limit concurrent waiters, enforce a total retry budget, and have clients back off with jitter. Keep the same key and payload for retryable contention. Changing the key creates another operation and defeats the database gate.

An asynchronous API can instead return `202` with an operation resource after durably accepting work. That is useful when processing naturally takes seconds or minutes, but requires a documented status lookup and completion contract.

## Validate the three race outcomes

In a disposable PostgreSQL database, hold A open after claiming a key and run B concurrently. Verify that B waits and replays after A commits, wins after A rolls back, and aborts within the configured lock budget when A remains open.

Also inspect the business table: a collection of plausible HTTP responses does not prove that only one effect committed. Include mismatched payloads, cleanup overlap, and an unrelated table lock in the test cases.

## Conclusion

Use uniqueness to arbitrate concurrent ownership, then apply a bounded HTTP waiting policy. Replay only a completed matching result, distinguish pending work from storage contention, and make every retry pass through the same claim. That keeps a latency decision from accidentally becoming permission to execute twice.

## Official Documentation

- [PostgreSQL INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL client timeout settings](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [HTTP 409 Conflict](https://www.rfc-editor.org/rfc/rfc9110.html#name-409-conflict)
