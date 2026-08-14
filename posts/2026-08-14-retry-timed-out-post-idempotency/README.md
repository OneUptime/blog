# Retry a Timed-Out POST Without Duplicate Side Effects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP, POST, Idempotency, Retries, Distributed System, API Design

Description: Make timed-out POST retries safe with a stable operation identity, atomic deduplication, payload matching, result replay, and explicit reconciliation.

---

A client timeout proves only that the client stopped waiting. It does not prove that the server stopped processing, rolled back a transaction, or failed to commit. The server can create an order, charge a card, and lose the response on its way back. Sending the same POST again can then create a second side effect.

The safe solution is not a longer delay. It is an operation protocol that makes an ambiguous result recoverable.

## Start with the Ambiguity Window

Consider this sequence:

1. The client sends <code>POST /payments</code>.
2. The server commits payment <code>pay_123</code>.
3. The response is delayed or the connection breaks.
4. The client reaches its deadline.

At step 4, the client cannot distinguish a committed request from one that never reached the service. Cancellation is a resource-management signal, not a distributed rollback. An idempotent retry must therefore identify the *logical operation*, not merely send similar bytes again.

HTTP defines POST as a request for resource-specific processing; it is not idempotent by definition. An <code>Idempotency-Key</code> header is useful only when the target API documents its behavior. RFC 9110 does not assign universal deduplication semantics to that header.

## Use One Stable Key for One Logical Operation

Generate an unpredictable key before the first attempt and retain it through every retry:

~~~http
POST /payments HTTP/1.1
Host: api.example.com
Content-Type: application/json
Idempotency-Key: 3a46c0a7-8f5e-4a73-a94c-233865cf43dd

{"account_id":"acct_42","amount_minor":2500,"currency":"GBP"}
~~~

Do not generate the key inside the retry loop. Do not reuse it for a later, intentional payment. Persist it with durable job state when a process restart can occur between attempts.

The server-side contract should define:

- the scope of uniqueness, such as account plus endpoint plus key;
- how long a key remains valid;
- whether concurrent requests with the same key wait, conflict, or replay a result;
- what happens when the same key is paired with different input;
- which response fields and failure results are replayed.

Key retention must cover the longest period in which the client can retry or reconcile. After expiration, the same key may no longer protect against duplication, so the client must not silently retry an old ambiguous operation.

## Make Deduplication Atomic with the Side Effect

A separate cache check followed by a business write is racy:

~~~text
look up key
key is absent
create payment
store key
~~~

Two concurrent attempts can both observe absence and both create a payment. Instead, claim the key and commit the side effect in one transactional boundary, or use a uniqueness constraint plus a transaction that produces a single durable outcome.

A useful record contains:

~~~text
scope
idempotency_key
canonical_request_digest
state: in_progress | succeeded | failed
resource_id
stable_response
created_at
expires_at
~~~

When an existing key arrives:

- if the request digest differs, reject it instead of returning an unrelated result;
- if the operation succeeded, return the stored resource or stable response;
- if it is in progress, wait for the owner, return a documented conflict, or provide a status URL;
- if it failed, follow the API's documented policy for replaying terminal versus retryable failures.

Hash a canonical representation of the logical inputs, not incidental transport details such as header order. Never use the digest as the operation identity by itself: two intentional purchases can have identical amounts and still be separate operations.

## Prefer Preconditions When the Operation Targets Existing State

Some POST-like workflows are better expressed as a conditional update. If the service exposes a resource version or ETag, submit the expected version and let the server reject stale state. A precondition can make a write conditionally idempotent because only the intended version transition can succeed.

This pattern is common in object storage. Google Cloud Storage, for example, distinguishes always-idempotent, conditionally idempotent, and non-idempotent operations, and retries conditional operations only when the required generation or metageneration precondition is present.

Preconditions and idempotency keys solve different problems:

- a precondition protects a state transition against stale writers;
- an idempotency key deduplicates repeated delivery of one logical command.

Some operations need both.

## Add Reconciliation for Unknown Outcomes

Not every dependency offers deduplication. For an unsafe POST without a documented idempotency contract, automatic replay is not safe. Give the client a way to reconcile:

1. Create a client operation ID before sending.
2. Include it in a documented business field if the API supports one.
3. After a timeout, query a status or list endpoint by that ID.
4. Retry only if the query proves that no operation exists.
5. Escalate an unresolved outcome instead of guessing.

If no status lookup or unique business reference exists, surface an <code>outcome_unknown</code> result. That is operationally awkward, but it is more honest than returning failure and creating a duplicate in the background.

For internal systems, a transactional outbox can carry the command from the caller's database to a worker. The local transaction records both business intent and a unique operation ID. At-least-once delivery remains safe because the consumer deduplicates the operation ID.

## Keep Retry Mechanics Consistent

Every attempt must preserve:

- the same method, target operation, logical body, and idempotency key;
- any conditional version that is part of the operation;
- the overall deadline and attempt budget;
- enough attempt history to explain the final result.

Credentials and per-request signatures may need regeneration for each attempt. That does not change the operation identity. Conversely, changing the amount, target account, or business parameters requires a new operation and a new key.

Retry only transient transport failures and documented transient responses. Use bounded jittered backoff, honor valid server delay guidance, and stop when the operation deadline expires. Idempotency prevents duplicate effects; it does not make unlimited retry load harmless.

## Test the Failure Boundaries

An integration test should deliberately cut the response after commit. Assert that the retry returns the original resource and that exactly one business row or external effect exists. Also test:

- two concurrent attempts with the same key and payload;
- the same key with a different payload;
- a process restart between attempts;
- a key near and beyond retention expiry;
- a terminal validation failure versus a retryable server failure;
- a status lookup while the original attempt remains in progress.

These cases validate the contract that matters during a real timeout, not just the normal request path.

## Official Documentation

- [RFC 9110: HTTP method semantics and idempotency](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Google Cloud Storage retry strategy and conditional idempotency](https://docs.cloud.google.com/storage/docs/retry-strategy)
- [Stripe API idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Conclusion

A timed-out POST has an unknown outcome until the protocol proves otherwise. Reuse one logical operation key, atomically bind it to the side effect and request digest, replay the original result, and provide reconciliation for uncertain cases. If the API offers none of those guarantees, do not hide the ambiguity behind an automatic retry.
