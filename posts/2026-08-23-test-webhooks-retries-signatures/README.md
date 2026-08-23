# Capture and Verify Webhooks, Retries, and Signatures in API Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Webhook, Security, Testing, Test Automation

Description: Build webhook tests that preserve raw payloads, validate provider signatures, correlate events, prove idempotency, and model real retry behavior.

---

Webhook testing reverses the usual API test direction. The system under test sends an HTTP request to a receiver, often after an asynchronous action. A useful suite must capture that delivery, verify its provider-specific signature, correlate it with the action that triggered it, and prove correct behavior under duplicates, retries, delays, and reordering.

Testing only that some POST reached a temporary URL misses the hardest bugs. A handler can accept forged payloads, verify a reformatted body instead of the signed bytes, process one delivery twice, or acknowledge an event before it is durably recorded.

## Choose the Right Test Boundary

Use three complementary layers:

1. **Handler tests** send controlled raw HTTP requests directly to the receiver. They cover signature edge cases, malformed bodies, event routing, deduplication, and response codes quickly.
2. **Integration tests** trigger an event in a provider sandbox or test account and capture the provider's real delivery. They prove endpoint configuration, network reachability, API version, secret selection, and real signing.
3. **Production canaries** exercise a harmless event on a schedule where appropriate. They detect environment drift but should not be the only CI coverage.

Simulate retries in handler tests and reserve a smaller real-provider test for provider-controlled behavior.

## Build a Capture Receiver

The receiver should preserve evidence before application processing changes it. For each attempt, capture:

- raw request body bytes;
- relevant original headers;
- receive time from a synchronized clock;
- provider event and delivery identifiers;
- test run correlation metadata when the provider propagates it;
- response status returned by the receiver; and
- processing outcome and durable side-effect ID.

Protect this data. Webhook payloads can contain personal or financial information, and signing secrets must never be stored with captures. Apply retention limits and access controls. Redact unrelated headers such as cookies or authorization credentials.

The receiver must be reachable from the real provider. Use a dedicated test endpoint or the provider's official local forwarding tool. If a tunnel is necessary, give each run a unique route or correlation value so concurrent runs do not consume one another's events.

## Verify the Exact Raw Body

Signature schemes are provider-specific. Always implement the provider's current documentation or official library. A common failure is parsing JSON and then serializing it before verification. Whitespace, key order, escaping, or encoding can change even though the object looks equivalent, which changes the signature input.

GitHub signs the payload with HMAC-SHA256 and sends the hex digest with a `sha256=` prefix in `X-Hub-Signature-256`. GitHub says to compute the HMAC over the payload contents and use a constant-time comparison rather than plain equality. Its documentation publishes a secret, payload, and expected signature that make a good deterministic test vector.

Stripe sends `Stripe-Signature` and recommends verification through its official libraries using the raw body, header, and endpoint secret. Its signature includes a timestamp; the libraries apply a default recency tolerance. Stripe explicitly warns that a tolerance of zero disables the recency check.

A correct test matrix includes:

| Case | Expected behavior |
| --- | --- |
| valid raw payload and current secret | accept |
| one changed payload byte | reject |
| missing signature header | reject |
| signature from a different endpoint secret | reject |
| malformed signature value | reject without crashing |
| previous secret during documented rotation overlap | follow provider rotation policy |
| stale signed timestamp where the scheme has one | reject according to configured tolerance |

Do not apply Stripe timestamp rules to GitHub or invent a generic `X-Signature` contract. The capture harness can be generic; verification cannot.

## Correlate the Event with the Trigger

Trigger the provider action using a unique test-run value in a supported field such as metadata, reference, or object name. Capture the authoritative provider object ID from the triggering response. Wait for an event whose type and object ID match both the expected action and this test.

Avoid consuming the next webhook or filtering only by event type. Parallel tests may legitimately create the same event type. Also record events that do not match, up to a bounded limit, because they can explain a timeout without letting one test steal another's delivery.

The final assertion should verify business meaning, not the full payload byte-for-byte unless exact encoding is the contract. Check the documented event type, API version where applicable, object identity, relevant changed fields, tenant or account context, and absence of sensitive unexpected data.

## Prove Idempotent Processing

Webhook delivery is generally at least once. Duplicate receipt must not duplicate the business effect. Store a provider-defined stable identifier under a unique constraint, acknowledge an already processed delivery according to provider guidance, and make the side effect atomic with the deduplication decision where possible.

Use the right identifier:

- GitHub recommends `X-GitHub-Delivery`; a requested redelivery retains the original delivery ID.
- Stripe recommends logging processed event IDs. Stripe notes that, in some cases, two distinct Event objects can represent duplicates, so handlers may also need the object ID plus event type for the relevant business operation.

Test two concurrent identical deliveries, not only sequential duplicates. Both requests may pass a check-then-insert race unless the database enforces uniqueness or the processing transaction is designed correctly. Assert two successful acknowledgements if that is the receiver contract, one durable receipt, and exactly one downstream effect.

## Test Retries According to the Provider

Retry behavior differs substantially. Stripe currently documents automatic live-mode retries for up to three days with exponential backoff, and three sandbox attempts over several hours. It creates a new signature and timestamp for a retried attempt. GitHub, by contrast, documents that it does not automatically redeliver failed webhook deliveries; users or automation can request redelivery.

Therefore a provider-neutral assertion such as every webhook retries three times is wrong. Build a provider matrix covering:

- which response statuses count as success;
- connection timeout behavior;
- automatic versus manual retry;
- approximate retry horizon rather than brittle exact timing;
- whether delivery IDs remain stable;
- whether signatures and timestamps change; and
- how endpoint disablement affects pending attempts.

In a fast receiver test, configure the endpoint to return a transient failure on the first attempt and success on the next. Verify that your own retrying component follows its documented policy. In a provider integration test, use the provider's delivery log or official redelivery facility and avoid asserting timing more precisely than its documentation guarantees.

## Acknowledge Quickly, Process Durably

Providers impose response deadlines. GitHub advises returning a `2xx` response within 10 seconds. Stripe advises quickly returning a `2xx` before complex processing. A common design verifies the signature, records the event durably, enqueues work, and then acknowledges it.

Test both sides of that boundary:

- invalid signatures are rejected and never queued;
- a valid event is durably recorded before success is returned;
- downstream processing can fail and retry without asking the provider to redeliver unnecessarily;
- receipt of a duplicate does not repeat the effect; and
- acknowledgement remains within the provider deadline under expected load.

Returning `2xx` before durable receipt risks losing the event on a crash. Performing all business logic before responding risks provider timeouts and duplicates.

## Expect Delays and Reordering

Do not assume webhook order unless the provider contract guarantees it. GitHub troubleshooting documentation notes that deliveries may arrive in a different order than the events occurred. Stripe also states that it does not guarantee event delivery order.

Handlers should use object versions, event creation times, or a fresh provider API read where the provider recommends it. Tests should deliver related events out of order and verify that current state does not regress. Keep the webhook wait bounded and report every observed matching attempt when it expires.

## Include Security Failure Cases

In addition to signature tests, verify HTTPS and certificate validation in real-provider environments, secret rotation, payload size limits, content type handling, and replay defense. GitHub recommends HTTPS, webhook secrets, and delivery-ID tracking. Stripe's signed timestamp supports recency checks, but event-ID deduplication is still needed.

Never place the signing secret in the callback URL, test report, or captured headers. Rotate a test secret through the provider's supported workflow and prove both the overlap period and final retirement behavior.

## Official Documentation

- [GitHub webhook signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [GitHub failed webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries)
- [GitHub webhook troubleshooting and ordering](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks)
- [Stripe webhook signatures, retries, and duplicate handling](https://docs.stripe.com/webhooks)
- [Stripe webhook signature troubleshooting](https://docs.stripe.com/webhooks/signature)

## Conclusion

Reliable webhook tests preserve raw bytes, use the provider's exact signature scheme, correlate deliveries to one trigger, and verify one durable effect under duplicate and concurrent receipt. Model retries and ordering from each provider's documentation, then separate quick acknowledgement from retryable downstream processing.
