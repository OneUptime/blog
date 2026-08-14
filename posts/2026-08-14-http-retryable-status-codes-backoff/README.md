# Which HTTP Errors Should Your Client Retry with Backoff?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP, Retries, Exponential Backoff, Rate Limiting, Idempotency, Reliability

Description: Classify HTTP 408, 409, 429, and 5xx responses using operation safety, server guidance, deadlines, and bounded backoff instead of a status-only allowlist.

---

An HTTP status code tells you why one attempt failed. It does not, by itself, prove that repeating the operation is safe or useful. A reliable retry decision needs three independent answers:

1. Is the failure plausibly transient?
2. Can the exact operation be repeated without duplicate or conflicting effects?
3. Is there enough time and retry budget left for another attempt?

Only retry when all three answers are yes. This prevents a convenient status-code allowlist from turning a timeout into two charges, a conflict into a hot loop, or an outage into a retry storm.

## Classify the Commonly Confused Responses

| Response | What HTTP specifies | Default retry decision |
| --- | --- | --- |
| <code>408 Request Timeout</code> | The server did not receive a complete request in the time it was prepared to wait, and it should send <code>Connection: close</code> | Retry on a new connection only when the operation and body are replayable |
| <code>409 Conflict</code> | The request conflicts with the current state of the target resource | Do not blindly retry; re-read state, resolve the conflict, or follow API-specific guidance |
| <code>429 Too Many Requests</code> | The client has exceeded a rate limit; the response may include <code>Retry-After</code> | Retry a safe operation after valid server guidance or jittered backoff |
| <code>500 Internal Server Error</code> | The server encountered an unexpected condition | Retry only safe operations because execution may already have had effects |
| <code>501 Not Implemented</code> | The server does not support the functionality required for the request | Do not retry unchanged |
| <code>502 Bad Gateway</code> | A gateway received an invalid response from an upstream server | Often transient, but still require replay safety and a budget |
| <code>503 Service Unavailable</code> | The server is temporarily unable to handle the request and may send <code>Retry-After</code> | Usually retryable with bounded delay when the operation is safe |
| <code>504 Gateway Timeout</code> | A gateway did not receive a timely upstream response | Often transient, but the upstream might still have completed the operation |

The important surprise is <code>409</code>. A version conflict, duplicate identifier, invalid state transition, or uniqueness violation does not become correct merely because time passes. Some APIs explicitly use a conflict response for transient lock contention, but that is an API contract, not a general HTTP rule. Retry only the documented subtype, usually after refreshing state or changing a precondition.

Likewise, do not treat every <code>5xx</code> response as transient. <code>501</code> is a permanent capability mismatch for the unchanged request. Other server errors can expose a durable bug or invalid route. Keep the allowlist narrow and make API-specific error codes more authoritative than a broad status class.

## Check Replay Safety Separately

HTTP defines safe methods and idempotent methods. <code>GET</code>, <code>HEAD</code>, <code>OPTIONS</code>, and <code>TRACE</code> are safe. <code>PUT</code>, <code>DELETE</code>, and the safe methods are idempotent in their intended semantics. That does not mean every implementation is bug-free, nor does it make every response cheap to repeat.

<code>POST</code> is not inherently idempotent. A timed-out POST can have committed before its response was lost. Retry it only when the API supplies a real deduplication contract, a conditional write, or another way to determine that the first attempt was not applied. Reuse the same idempotency key and identical logical payload across attempts; creating a new key inside the retry loop defeats deduplication.

A transport error before any response is also ambiguous. The client may know that it failed to write any request bytes, but after bytes leave the process it generally cannot infer whether application logic ran. Let the HTTP library perform only the transparent retries it documents, and apply operation-level retry rules above that boundary.

## Build a Two-Stage Classifier

Keep failure classification separate from the scheduling policy. The first stage decides whether another attempt is eligible. The second computes a delay subject to the overall deadline, attempt cap, and retry-token budget.

~~~typescript
type Operation = {
  replaySafe: boolean;
  apiErrorCode?: string;
};

function retryEligible(status: number, op: Operation): boolean {
  if (!op.replaySafe) return false;

  if (op.apiErrorCode === "LOCK_TEMPORARILY_UNAVAILABLE") return true;
  if (status === 408 || status === 429) return true;
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  return false;
}
~~~

This example is intentionally conservative. Adapt it to the exact API contract. Authentication failures, invalid input, permissions errors, and unresolved conflicts should fail fast. If the provider documents a structured retryable error code, match that code before falling back to HTTP status.

## Honor Server Timing Without Giving Up Client Limits

For <code>429</code> and <code>503</code>, a valid <code>Retry-After</code> value is stronger information than a guessed exponential delay. It can be either a non-negative number of seconds or an HTTP date. Parse it strictly, account for clock skew when using a date, and reject malformed, negative, or overflowing values.

Treat a valid server delay as the earliest time to retry, not a value to clamp down to a shorter client cap. The client can wait longer when its local backoff requires it. If the server delay exceeds the caller's deadline or local maximum wait policy, stop or durably reschedule instead of retrying early. Attempt caps still protect against a broken or malicious upstream.

When no valid server delay exists, use capped exponential backoff with jitter. Jitter must be applied independently by callers so that a fleet does not wake at the same instant.

## Validate the Policy Under Failure

Test more than the happy retry:

- a retryable status on a non-replayable POST must stop;
- a <code>409</code> must stop unless its structured API error is explicitly transient;
- a valid <code>Retry-After</code> beyond the overall deadline must stop or reschedule, not be shortened;
- malformed server guidance must fall back to local policy, not to zero delay;
- the final response and attempt history must remain available to the caller;
- retry exhaustion and retry-budget rejection must be distinguishable in telemetry.

Run a load test where many clients receive the same <code>503</code>. The expected result is bounded, dispersed retry traffic, not a new synchronized peak at the backoff cap.

## Official Documentation

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 6585: Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585.html)
- [Google Cloud Storage retry strategy](https://docs.cloud.google.com/storage/docs/retry-strategy)

## Conclusion

Retry decisions are a product of failure transience, operation replay safety, and remaining budget. Treat <code>408</code>, <code>429</code>, <code>500</code>, <code>502</code>, <code>503</code>, and <code>504</code> as candidates rather than commands, treat <code>409</code> as a state problem unless the API says otherwise, and never let a status-only allowlist repeat an unsafe side effect.
