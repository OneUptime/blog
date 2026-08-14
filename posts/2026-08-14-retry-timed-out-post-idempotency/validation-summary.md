# Validation Summary: Retry a Timed-Out POST Without Duplicate Side Effects

## Status
validated

## Post Type
Technical guide / API design guide

## Technologies Covered
- HTTP/1.1 and POST semantics
- Idempotency keys and request fingerprints
- Conditional HTTP requests, ETags, and resource versions
- Retry policies, deadlines, backoff, and reconciliation
- Database transactions and uniqueness constraints
- Transactional outbox and at-least-once delivery
- Google Cloud Storage conditional idempotency
- Stripe API idempotency

## Sources Consulted
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), especially Sections 9.2.2, 9.3.3, 10.2.3, and 13.
- [RFC 9112: HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html), especially Sections 6.2 and 6.3 on request-body framing.
- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html), especially Section 8.7 on retries after connection errors.
- [RFC 9114: HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html), especially Sections 4.1.1 and 5.4 on cancellation and request handling after connection termination.
- [IANA HTTP Method Registry](https://www.iana.org/assignments/http-methods/http-methods.xhtml).
- [IANA HTTP Field Name Registry](https://www.iana.org/assignments/http-fields/http-fields.xhtml).
- [IETF Idempotency-Key Internet-Draft status](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/).
- [Google Cloud Storage retry strategy](https://docs.cloud.google.com/storage/docs/retry-strategy).
- [Google Cloud Storage request preconditions](https://docs.cloud.google.com/storage/docs/request-preconditions).
- [Stripe API v1 idempotent requests](https://docs.stripe.com/api/idempotent_requests).
- [Stripe advanced error handling and retries](https://docs.stripe.com/error-low-level#idempotency).
- [Stripe API v2 idempotency behavior](https://docs.stripe.com/api-v2-overview#idempotency).
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).

## Issues Found
1. **The HTTP/1.1 example did not frame its JSON request body.** Without `Content-Length` or `Transfer-Encoding`, RFC 9112 defines the request body length as zero. Added `Content-Length: 61`, matching the 61-octet ASCII JSON body.
2. **The atomicity guidance was too broad for cross-system effects.** A local transaction can atomically bind an idempotency record to a business effect only when both share the transaction. Qualified that guidance and added the required alternatives for an external effect: propagate the operation ID to a dependency with a documented idempotency contract, or use durable state and reconciliation.
3. **The precondition explanation overgeneralized resource versions and ETags.** An HTTP precondition guards the target representation; it does not by itself deduplicate unrelated side effects, and an ETag is not universally guaranteed to be a non-reused operation version. Changed the text to require a validator that changes on every relevant transition, is not reused, and is changed atomically by the guarded write.
4. **The Google Cloud Storage retry claim omitted ETags and implied one universal client behavior.** Cloud Storage recognizes ETags as condition cases for some conditionally idempotent operations, and exact retry defaults vary by tool and client library. Corrected the wording to match the official retry guidance.
5. **A negative status lookup was treated too loosely as proof that retrying is safe.** A lookup can race an original request that is still in flight. Changed the rule to require an API contract that also prevents a still-arriving original attempt from committing.
6. **The transactional-outbox statement did not state the atomic consumer requirement.** At-least-once delivery is safe only when consumer deduplication is atomic with its local effect, or when the operation ID is propagated to an idempotent dependency. Added that qualification.
7. **The idempotency wording covered all effects rather than the intended effect.** RFC 9110 permits per-request logging and similar effects even for idempotent methods. Changed “duplicate effects” to “duplicate intended business effects.”

## Review Notes
- The `Idempotency-Key` field has no universal semantics in RFC 9110. As of the validation date, the IETF proposal is an expired Internet-Draft and the field is not registered in the IANA HTTP Field Name Registry, so the post correctly requires an API-specific contract.
- Stripe's cited idempotency page describes API v1 behavior. Stripe API v2 has different scope, retention, and result-replay rules, which supports the post's guidance to follow each API's documented contract.
- The remaining HTTP semantics, stable-key guidance, payload matching, bounded jittered backoff, `Retry-After` guidance, failure-boundary tests, and cited external links were verified and are technically correct.
