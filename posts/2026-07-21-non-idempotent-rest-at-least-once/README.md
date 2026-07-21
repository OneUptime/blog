# Handling Non-Idempotent REST APIs Under At-Least-Once Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, At-Least-Once Delivery, Idempotency, Distributed System

Description: Make at-least-once consumers safe around non-idempotent REST calls with stable keys, durable commands, reconciliation, and explicit ambiguity.

---

An at-least-once consumer can receive the same message again. A non-idempotent REST operation can create another charge, shipment, ticket, or notification each time it runs. The safe design is to give the downstream operation a stable identity and make retries converge on one result.

If the external API supports an idempotency key, persist one key per logical operation and reuse it for every attempt. If it does not, use a queryable business reference or callback to reconcile an uncertain result before retrying. If the API offers neither idempotency nor reconciliation, exactly-once effects are impossible to guarantee across a network failure. The workflow must expose that uncertainty instead of blindly calling again.

## Understand the ambiguous failure

The hardest case is not a clear HTTP error. It is a lost response:

1. The consumer sends a create-payment request.
2. The provider commits the payment.
3. The connection closes before the response reaches the consumer.
4. The broker redelivers the original message.

Locally, this looks identical to a request that never reached the provider. Retrying might complete missing work or create a duplicate. Recording the message as complete before the call risks losing the payment; recording it afterward risks charging twice.

## HTTP method semantics are only the starting point

RFC 9110 defines PUT, DELETE, and safe HTTP methods as idempotent in their intended effect. POST is not guaranteed to be idempotent. That does not mean every real PUT implementation is correct or that a POST cannot offer a stronger application contract.

Read the specific API documentation:

- Can the client choose the resource ID?
- Does the endpoint accept an idempotency or request token?
- What scopes the token: account, endpoint, or operation type?
- How long is the token retained?
- What happens when the same token has different parameters?
- Are errors cached?
- Can the result be queried by a client reference?

An "Idempotency-Key" header has no useful effect unless the receiving API documents and enforces its behavior.

## Prefer a downstream idempotency contract

Generate the operation ID before the first external attempt and persist it durably. Derive or store the provider key from that operation ID. Every retry caused by a message redelivery, worker crash, or timeout must send the same key and semantically identical parameters.

For example:

```http
POST /v1/payments HTTP/1.1
Host: api.provider.example
Authorization: Bearer REDACTED
Idempotency-Key: payment-operation-8f2c
Content-Type: application/json

{
  "order_reference": "order-417",
  "amount_minor": 2599,
  "currency": "GBP"
}
```

Do not generate a fresh UUID inside the retry loop. That identifies attempts, not the logical payment, and tells the provider to execute each attempt independently.

Stripe's API illustrates a provider-specific contract. Once endpoint execution begins, it stores the first result for a key, including a 500, replays it for matching retries, compares parameters, and permits key removal after at least 24 hours. Validation failures and concurrent-execution conflicts are not stored as idempotent results. A cached Stripe 500 remains indeterminate because reconciliation can later reveal side effects; a repeated 500 does not prove nothing happened. Other providers differ.

The provider's key lifetime must cover the application's retry and replay horizon. If a queue can replay a message after 30 days but the provider forgets keys after one day, retrying on day 30 can create a new effect. Before that boundary, reconcile and close the operation, move it to manual review, or obtain a longer downstream contract.

## Persist intent before making the call

Use the incoming message transaction to create a durable outbound command:

```sql
CREATE TABLE outbound_command (
    operation_id text PRIMARY KEY,
    source_message_id text NOT NULL,
    destination text NOT NULL,
    request_fingerprint text NOT NULL,
    idempotency_key text NOT NULL,
    status text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 0,
    provider_reference text,
    last_error_code text,
    next_attempt_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
```

In one local transaction:

1. Claim the source message in the inbox.
2. Apply any local state transition.
3. Insert the outbound command with its stable operation ID and request fingerprint.
4. Commit.
5. Acknowledge the source delivery.

Now a crash cannot lose the intent. A separate worker claims ready commands with a lease, sends the request, and records the response. This is a transactional outbox or durable-command pattern. AWS's official outbox guidance describes the same answer to a local database plus outbound-notification dual write, and warns that delivery from the outbox can still duplicate.

Keep the request fingerprint immutable. If business data changes, create a new explicitly related operation rather than silently sending different parameters under the old key. Store only the minimum data required for execution and audit; avoid leaving credentials or unnecessary personal data in the work table.

## Model uncertainty as a real state

A useful command state machine is:

```text
ready -> in_flight -> succeeded
                 +-> retryable
                 +-> unknown
                 +-> failed_terminal
```

Use "unknown" when a request may have succeeded but the system lacks a trustworthy result. Do not map that state directly back to ready when the downstream operation is unsafe to repeat.

With a valid downstream idempotency key, the worker can usually retry unknown requests under the provider's documented rules. Without one, a reconciliation worker should:

1. Query the provider by the stable order, merchant, or client reference.
2. Consume a signed webhook or provider event if one is authoritative.
3. Compare the confirmed remote result with local intent.
4. Mark succeeded when the original effect exists.
5. Retry only when absence is authoritative.
6. Escalate when neither result can be proven.

A delayed webhook and a polling response can race, so update the state conditionally and make confirmation handling idempotent too.

## Use an idempotent resource shape when offered

When an API accepts a client-selected resource URI or unique business reference, use it. A documented PUT or create-if-absent uniqueness constraint can make retries converge.

Do not simulate this by searching loosely on amount, timestamp, or recipient. Two legitimate operations can share those values. Reconciliation needs a reference that is unique to the logical operation and searchable through the provider's supported API.

For APIs that expose a create endpoint plus a reliable lookup by client reference, use this sequence after an uncertain outcome:

- query first
- accept the existing matching result
- create only after authoritative absence
- query again if creation is ambiguous

## Retry only the failures the API says are retryable

Use bounded exponential backoff with jitter for transient failures and respect the provider's Retry-After and rate-limit instructions. Set connection and request timeouts, but remember that a client timeout does not cancel a committed server operation.

Classify outcomes:

- **Not sent:** A local validation or connection failure known to occur before transmission can be retried.
- **Definite terminal response:** Record the provider's result and stop according to its API contract.
- **Definite retryable response:** Schedule a retry using the same operation key.
- **Ambiguous transport outcome:** Retry only through idempotency or reconciliation.

Do not create a universal rule that every 4xx is terminal or every 5xx is safe to retry. Stripe documents pre-idempotency-layer cases such as some validation, authentication, and rate-limit failures, while an executed POST can cache a 500 that must still be reconciled as indeterminate. The API's contract and execution state decide.

Limit attempts and total retry age. Apply circuit breaking and concurrency limits so a provider outage does not produce a retry storm. Preserve the command after attempts stop; deleting it destroys the evidence needed for repair.

## Treat compensation as another operation

A refund, cancellation, or delete can compensate for a duplicate, but it is not an atomic rollback of the original remote effect. Compensation can fail, arrive late, incur fees, trigger notifications, or be legally impossible.

Model compensation as a new idempotent command with its own operation ID and observable state. For multi-service workflows, a saga can coordinate forward and compensating steps, but each remote step still needs retry, idempotency, and reconciliation rules.

## Test the dangerous boundaries

Build a fake provider or sandbox that can commit a request and then drop the response. Test:

- two consumers handling the same source message concurrently
- a crash before and after the outbound request
- a response lost after provider success
- the same key with changed parameters
- retry after the provider's key-retention window
- delayed and duplicated webhooks
- rate limiting and Retry-After behavior
- reconciliation during provider read lag
- worker lease expiry during a slow request

Verify that the final local state, provider objects, source acknowledgment, and audit trail agree. Monitor commands in unknown state, oldest pending age, retries per operation, key conflicts, reconciliation latency, and duplicate external effects.

## The practical hierarchy

Choose the strongest downstream primitive available:

1. A documented idempotency key retained for the entire replay horizon.
2. A client-selected resource ID or unique business reference with authoritative lookup.
3. A callback or event plus a reconciliation state machine.
4. Manual resolution for irreducibly ambiguous outcomes.

An outbox makes sure the call is not forgotten. It does not make a non-idempotent remote call exactly once. The downstream key or reconciliation path is what makes repeated delivery safe.

## Official documentation

- [RFC 9110: HTTP idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe advanced error handling and retries](https://docs.stripe.com/error-low-level)
- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [AWS saga orchestration pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html)
- [Azure retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
