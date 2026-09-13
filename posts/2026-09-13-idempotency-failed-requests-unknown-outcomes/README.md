# Should You Cache Failed Idempotent Requests?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Error Handling, API Design, PostgreSQL, Reliability

Description: Classify failed requests by execution and commit state, decide which errors to replay, and recover unknown outcomes without creating duplicate business effects.

---

An HTTP `500` does not tell you whether a business operation happened. The server might have failed before opening a transaction, after committing an order, or after a downstream provider accepted a payment.

That makes a rule such as cache successes and delete failures unsafe. Deleting an idempotency record after an uncertain failure can authorize a second execution of work that already succeeded.

Design the failure policy around durable execution state. HTTP status is useful to clients, but it is not a transaction log.

## Classify the point of failure

For an API you control, distinguish these cases:

| Evidence | Suggested behavior |
| --- | --- |
| Authentication or syntax rejected before execution | Return the error without claiming an operation |
| Another request owns the operation | Report pending or wait; preserve the owner |
| Local transaction definitely rolled back | Allow the same logical request to retry |
| Business decision completed and was committed | Replay the recorded decision |
| Business write committed but response transmission failed | Replay the committed response |
| Commit or downstream outcome is unknown | Reconcile under the existing identity |

These are design recommendations, not universal rules for third-party APIs. A provider can intentionally adopt different caching semantics.

For example, Stripe API v1 retains the initial status and body once endpoint execution begins, including `500` responses. It excludes certain validation and concurrent-conflict cases that do not begin execution. Consult its [idempotent request contract](https://docs.stripe.com/api/idempotent_requests) rather than assuming all errors behave alike.

## Keep pre-execution rejection separate

Check credentials, request shape, required fields, and basic key validity before beginning business execution. These failures often have no operation result to remember.

That does not mean a client should silently change an in-flight request while retaining its key. The client must know the earlier attempt was rejected before execution. After a timeout, changing either payload or key is not an equivalent retry.

Document how corrected input is submitted. A straightforward client policy is to create a new intent with a new key after an explicit validation rejection, while preserving the original key for network retries of unchanged input.

A duplicate with a mismatched fingerprint is also a rejection, but it must leave the existing record untouched. Deleting that record would remove the protection for the operation that originally claimed it.

## Record completed business failures deliberately

Suppose a transfer fails because its destination is closed. The request can be well formed and the business evaluation complete even though the result is a `409` or `422`.

One coherent policy is to commit that outcome with the idempotency record. Retrying the same intent then returns the same decision. If the destination is reopened later, the caller creates a new intent and receives a fresh evaluation.

Another policy can allow reevaluation of selected failures, but it must prove that no protected effect committed and explain that behavior to clients. Do not let exception classes accidentally choose the API contract.

Keep the saved error stable and sanitized. Persist a public error code and safe response body, not a stack trace, SQL text, or temporary credential that happens to be attached to an exception.

## Use rollback evidence for local database failures

For effects entirely inside PostgreSQL, put the claim, business change, and saved outcome in one transaction. PostgreSQL's [transaction model](https://www.postgresql.org/docs/current/tutorial-transactions.html) gives the useful boundary: the changes commit together or are rolled back together.

The application outline is:

```text
begin transaction
claim scoped key
if a completed matching result exists:
    finish transaction and replay it
else:
    apply business changes
    serialize and store public result
    commit
send the stored result
```

If a serialization failure or deadlock aborts the transaction, retry the whole transaction within a bounded policy. PostgreSQL identifies these conditions with SQLSTATE `40001` and `40P01`; use error codes instead of matching localized message text. See the [PostgreSQL error code appendix](https://www.postgresql.org/docs/current/errcodes-appendix.html).

Do not save an unrelated generic `500` in a separate transaction merely because the original transaction raised an exception. First establish whether it rolled back. A second write can obscure the original state or conflict with another caller already retrying the operation.

## Treat a lost commit acknowledgment as unknown

A connection failure while committing is different from a confirmed rollback. The database might have committed and lost the acknowledgment on the network.

Reconnect to the authoritative write database and run the same scoped claim protocol. A committed result should be replayed; a successful new claim allows execution after the earlier transaction failed. The uniqueness gate also resolves an earlier transaction that is still in progress.

Do not query a lagging replica, observe no record, and immediately perform the effect. Absence on that replica is not proof that the primary rolled back. Preserve the same key and fingerprint throughout recovery.

## External side effects need an explicit unknown state

PostgreSQL cannot roll back a payment call that succeeded remotely. A useful workflow records a stable operation ID, the downstream key, request fingerprint, provider object ID when known, and a state such as `pending`, `submitted_unknown`, or `confirmed`.

```text
persist intent and outbound work atomically
send with the intent's stable downstream key
if the provider confirms success:
    persist provider object ID and confirmed outcome
if transmission or provider outcome is ambiguous:
    retain submitted_unknown and schedule reconciliation
```

Reconciliation can query the provider by a known object reference, retry under its documented idempotency contract, or consume a verified webhook. Never generate a fresh downstream key simply to escape a cached error.

For API v1, Stripe specifically advises treating `500` outcomes as indeterminate because side effects may have occurred, and describes reconciliation and webhook behavior in its [advanced error handling guide](https://docs.stripe.com/error-low-level).

## Test the evidence, not just status codes

Inject failures before claiming, after the business write but before commit, after commit but before sending, and during downstream response delivery. Inspect durable business state and the idempotency record together.

Verify that a confirmed rollback permits a retry, a committed result survives a lost response, and an unknown external outcome remains recoverable without a fresh execution identity. Also test that pending conflicts and payload mismatches cannot replace the winning record.

## Conclusion

Cache completed decisions according to a documented contract, retry confirmed rollbacks through the same claim, and reconcile unknown outcomes under the original identity. The critical question is what durably happened, not whether the caller saw a success status.

## Official Documentation

- [Stripe API v1 idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe advanced error handling](https://docs.stripe.com/error-low-level)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
