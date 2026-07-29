# Which Timeout Failures Are Safe to Retry, and Which Should Fail Fast?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Timeout, Retry, Idempotency, HTTP, gRPC, Database, Reliability

Description: Decide whether to retry a timeout by separating transient causes, repeatable operations, unknown outcomes, and the remaining end-to-end deadline.

---

A timeout says that one observer stopped waiting. It does not prove that an operation failed, that nothing changed, or that another attempt will help.

A safe automatic retry requires all of these conditions:

1. The failure is plausibly transient.
2. Repeating the operation is safe.
3. The previous outcome is known, or duplicates are controlled.
4. Enough end-to-end time remains for another useful attempt.
5. The retry will not make an overloaded dependency less likely to recover.

If any condition is unknown, fail fast or move to an explicit reconciliation path.

## First Ask Where the Timer Fired

The phase gives important evidence:

| Failure boundary | Did the operation reach the dependency? | Default posture |
| --- | --- | --- |
| Local pool acquisition | Usually no connection was obtained for this operation | Do not retry immediately during saturation |
| TCP connect | Usually no usable connection was established | Retry only a transient path failure with backoff |
| Authentication or login | It may have reached the service, but business work normally did not begin | Fail fast for bad credentials or policy; retry documented transient service failures |
| Statement or server command | The dependency received the operation | Retry only a documented transient error and a safe operation |
| Socket read after sending | The dependency may have committed the operation | Treat the result as unknown |
| Caller deadline | Downstream work may still be running | Do not blindly start a duplicate |

Exception names alone are not a complete protocol contract. Verify the exact library and service semantics.

## Safe to Repeat Is Different from Likely to Succeed

HTTP defines safe and idempotent method semantics. GET, HEAD, OPTIONS, TRACE, PUT, and DELETE are idempotent by specification, while POST is not idempotent by default.

Idempotent means that multiple identical requests have the same intended effect as one. It does not mean:

- every response is identical;
- no audit or access log is written;
- concurrent callers cannot race;
- retrying will succeed;
- an implementation actually honors the method semantics.

An idempotent GET against a service with exhausted workers is safe to repeat but an immediate retry can deepen the outage. Conversely, a POST with a server-enforced idempotency key may be safe to repeat even though POST is not idempotent by default.

Retry decisions need both axes:

```text
retry usefulness = transient failure and capacity to recover
retry safety     = repeatable effect or duplicate protection
```

## Fail Fast on Permanent Conditions

Do not spend a retry budget on an input or policy that cannot change during the call:

- invalid arguments or malformed payloads;
- authentication failure caused by bad credentials;
- authorization denial;
- unsupported operation or protocol version;
- missing required resource when creation is not expected;
- schema or integrity violation caused by the request;
- a precondition that requires new application state;
- a caller deadline that has already expired.

Some systems temporarily return a status commonly associated with permanent failure, and some credentials can be refreshed. Retry only when the API contract identifies that recovery behavior. A generic rule such as retry every 4xx or retry every exception is unsafe.

## Usually Retryable, with Conditions

Transient categories often include:

- connection refusal while instances restart;
- a brief network disconnect;
- explicit throttling with a server-provided delay;
- service unavailable during failover;
- a database deadlock victim or serialization failure;
- an idempotent read interrupted before a response.

Even here, use exponential backoff, jitter, a small attempt limit, and the caller's remaining deadline.

PostgreSQL provides a precise example. It documents SQLSTATE `40001` serialization failures as candidates for retry, but requires retrying the complete transaction, including the logic that decided which SQL and values to use. Repeating only the last statement can violate the transaction's assumptions.

## Ambiguous Outcomes Need Idempotency or Reconciliation

Consider a payment request:

```text
client sends charge request
server commits charge
response is lost
client read timer expires
```

The timeout is real, but a second unprotected charge is a duplicate. The safe choices are:

- repeat the request with the same server-enforced idempotency key;
- query operation status using a stable operation identifier;
- reconcile asynchronously;
- report an unknown result for manual or workflow-level handling.

Do not generate a new idempotency key for a retry. A new key describes a new logical operation.

gRPC makes the ambiguity explicit in its status documentation: `DEADLINE_EXCEEDED` can be returned for a state-changing operation even if that operation completed successfully, because the successful response may have been delayed beyond the deadline.

## Evaluate Common Timeout Cases

### Connection-pool acquisition timeout

The business statement generally did not reach the database because the caller never borrowed a connection. The pool might still have attempted to create a physical connection. Repeating the business operation is not a duplicate risk from that attempt, but immediate retries add demand to an already full pool.

Prefer load shedding, a short backoff, or failing the request. Retry only if a small budget remains and queue pressure is expected to clear.

### Connect timeout

For a single connection attempt, no usable channel was established. A retry can be reasonable for an idempotent operation when another endpoint or a recovering route may work.

Account for DNS results, multiple addresses, load balancers, and the fact that another layer may already retry connections.

### Read or socket timeout

If the request was sent, its outcome is unknown. Idempotent reads are generally safe to repeat. Writes require idempotency, a precondition, a transaction identifier, or a status check.

### Database statement timeout

A server-side statement timeout means the database received the statement; it then cancels or aborts the statement according to database-specific semantics. A client- or driver-side execution timeout can instead leave the outcome unknown. The transaction state after an error is database and driver specific. In PostgreSQL, an error inside an explicit transaction leaves it aborted; issue `ROLLBACK`, or `ROLLBACK TO SAVEPOINT` when a suitable savepoint exists, before more work can proceed in it.

Retry a lock or serialization conflict only according to the database contract and from the correct transaction boundary. A query that is consistently slower than its timeout is not transient.

### HTTP 408, 429, and 5xx

These statuses are not a universal permission slip. `429 Too Many Requests` is a strong reason to reduce request rate and honor `Retry-After` when supplied. `503 Service Unavailable` can be transient. A `500` might represent a bug that every retry repeats.

Google Cloud's retry guidance classifies `408`, `429`, and `5xx` as generally transient for its Cloud Storage API, while also requiring an idempotency check. Apply service-specific documentation rather than exporting that list to every API.

### gRPC status codes

`UNAVAILABLE` is commonly transient, but gRPC warns that non-idempotent operations are not always safe to retry. `FAILED_PRECONDITION` should wait until state is fixed. `ABORTED` commonly means retrying a higher-level sequence. `DEADLINE_EXCEEDED` has an ambiguous outcome for writes.

Configure retryable status codes per method. Do not mark every gRPC method retryable at the channel level.

## A Decision Function

Represent retry policy in data rather than scattering exception loops:

```python
from dataclasses import dataclass
from enum import Enum, auto


class Outcome(Enum):
    NOT_STARTED = auto()
    FAILED_ATOMICALLY = auto()
    UNKNOWN = auto()


@dataclass(frozen=True)
class Failure:
    transient: bool
    outcome: Outcome
    operation_is_idempotent: bool
    idempotency_key_enforced: bool


def may_retry(failure: Failure, remaining_seconds: float) -> bool:
    known_not_applied = failure.outcome in (
        Outcome.NOT_STARTED,
        Outcome.FAILED_ATOMICALLY,
    )
    duplicates_controlled = (
        failure.operation_is_idempotent
        or failure.idempotency_key_enforced
    )
    return (
        failure.transient
        and (known_not_applied or duplicates_controlled)
        and remaining_seconds > 0
    )
```

Real policy must also include attempt count, minimum useful attempt time, backoff, server guidance, and a system-wide retry budget. The example shows the questions that status-code-only policies omit.

## Bound the Retry

Every retry policy should define:

- retry owner, such as SDK, service client, or workflow;
- eligible operations;
- eligible failures;
- maximum total attempts, including the first;
- exponential backoff and jitter;
- maximum elapsed time;
- minimum remaining time needed to begin another attempt;
- idempotency mechanism;
- metrics and a kill switch.

Avoid retries at every layer. If a gateway, service, SDK, and database wrapper each make three attempts, the deepest dependency can receive many calls for one user request.

## Observe the Outcome

Track:

- original calls and retry attempts separately;
- retry reason and phase;
- attempt number;
- success after retry;
- exhausted retries;
- idempotency-key replays and conflicts;
- operation outcomes later found to have succeeded;
- retry traffic as a fraction of total dependency traffic;
- caller deadline remaining at each attempt.

A high retry-success rate can justify a carefully bounded policy. A low rate with rising downstream saturation means retries are converting latency into load.

The safest rule is not retry timeouts. It is retry a documented transient failure only when the operation is repeatable, an ambiguous result is controlled, and the system has budget for another attempt.

## Official Documentation

- [RFC 9110 idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110 Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [PostgreSQL serialization failure handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [Google Cloud Storage retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
