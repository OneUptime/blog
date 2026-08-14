# Expose Backoff Loops with Retry Metrics and Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retries, Backoff, OpenTelemetry, Metric, Distributed Tracing, Observability

Description: Separate logical calls from wire attempts in metrics and traces so retry amplification, hidden delay, exhaustion, and duplicate ownership become visible.

---

A dashboard can show a stable logical request rate while a dependency receives three times as many calls. The missing traffic is retries. If telemetry records only the final outcome, a successful request after four attempts looks healthy and its backoff delay disappears inside latency.

Model one logical operation and its individual attempts as different things. Then measure both.

## Define the Two Cardinalities

A **logical call** is the operation the application requested. An **attempt** is one actual send to a dependency. A call always has at least one attempt unless admission fails before sending, and it may have retries or hedges.

The first derived signal is retry amplification:

~~~text
attempt amplification = attempts started / logical calls started
retry overhead ratio = retry attempts / all attempts
~~~

Segment these by bounded operation, destination, region, and final outcome. An amplification of 1.0 means one send per call. A rising value with flat application traffic explains why the downstream sees unexpected load.

Keep hedges separate from sequential retries. Both add attempts, but one starts before another attempt fails and has a different latency and load tradeoff.

## Record a Minimal Metric Set

Where a library does not already expose standard instruments, useful custom metrics include:

| Custom metric | Type | Purpose |
| --- | --- | --- |
| <code>client.logical_calls</code> | counter | logical operations started |
| <code>client.attempts</code> | counter | actual sends, including initial, retry, and hedge |
| <code>client.retries</code> | counter | policy retries started |
| <code>client.retry_delay</code> | histogram | one scheduled backoff wait per retry |
| <code>client.operation_retry_delay</code> | histogram | cumulative backoff delay per completed logical call |
| <code>client.retry_exhausted</code> | counter | calls stopped by attempt or elapsed limit |
| <code>client.retry_budget_rejected</code> | counter | eligible retries denied by tokens |
| <code>client.retry_sleeping</code> | up-down counter | currently waiting retry operations |
| <code>client.operation_duration</code> | histogram | full logical latency including backoff |
| <code>client.attempt_duration</code> | histogram | transport latency for each send |

These names are examples, not OpenTelemetry semantic-convention names. Use instrumentation already provided by the protocol library when available.

Current gRPC OpenTelemetry support defines stable, enabled-by-default per-attempt instruments such as <code>grpc.client.attempt.started</code> and <code>grpc.client.attempt.duration</code>. Its per-call retry instruments, including <code>grpc.client.call.retries</code>, <code>grpc.client.call.transparent_retries</code>, <code>grpc.client.call.hedges</code>, and <code>grpc.client.call.retry_delay</code>, are experimental and disabled by default. Language availability can differ, so check and explicitly enable the instruments supported by the deployed implementation.

## Use Low-Cardinality Attributes

Good metric dimensions are bounded and operationally actionable:

- normalized RPC method or HTTP route template;
- destination service and region;
- final status class or gRPC status;
- attempt kind: initial, retry, transparent retry, or hedge;
- stop reason: success, non-retryable, deadline, exhausted, budget, or canceled;
- retry owner: SDK, application, mesh, or transport.

Do not use raw URLs, request IDs, idempotency keys, user IDs, stack traces, or error messages as metric labels. OpenTelemetry's <code>error.type</code> guidance calls for a predictable, low-cardinality classification. Put detailed identifiers in sampled logs or traces with appropriate data controls.

Tenant-level fairness needs care. Publishing every tenant as a metric label can create unbounded cardinality. Export tenant tier or a bounded cohort, and use logs or a top-N aggregation for specific noisy tenants.

## Trace Each Send Attempt

OpenTelemetry HTTP semantic conventions say HTTP client instrumentation should create a span for each physical request attempt, including retries and redirects. When hooks cannot expose attempts, instrumentation may create a span for only the top-level HTTP operation, but that loses attempt detail.

A useful structure is:

~~~text
logical application operation span
  attempt 1 HTTP client span -> 503
  retry wait event or child span -> 240 ms
  attempt 2 HTTP client span -> 503
  retry wait event or child span -> 610 ms
  attempt 3 HTTP client span -> 200
~~~

Follow the official instrumentation's span relationship rather than creating duplicate HTTP spans around it. If you add a logical wrapper, make it an application-level span, not a second encompassing HTTP client span. It can carry final outcome, total attempts, and cumulative delay, while attempt spans carry transport status and duration.

Backoff can be an event on the logical span when detailed wait spans would add too much volume. Record bounded fields such as attempt number, scheduled delay, and reason. Do not emit an error event and exception at every layer for the same failed attempt.

## Preserve Context Across Attempts

All attempts belong to one logical trace, but each outbound attempt injects the current trace context according to the instrumentation. A server sees separate requests and normally creates separate server spans. Do not forge identical span IDs across attempts.

Keep one stable application operation ID or idempotency key when the API contract requires it, but do not use it as a metric label. The retry helper should not start an unrelated root trace for each attempt.

If a service mesh performs hidden retries, application instrumentation may show only one client span while proxy telemetry shows multiple upstream attempts. Correlate proxy and workload traces, and expose the actual attempt count at the proxy boundary where supported.

## Alert on Precursors, Not Only Final Errors

Useful alerts combine signals:

- amplification rises while logical traffic stays flat;
- cumulative retry delay becomes a large share of operation latency;
- retry success probability falls with later attempt number;
- retry-token balance falls and budget rejections rise;
- sleeping retries or delayed-queue depth consume growing capacity;
- final success stays high only because attempts per call are rising;
- one route or owner shows much higher amplification than peers.

An exhausted-retry count without the original attempt rate lacks context. Alert on ratios with a minimum traffic threshold, and retain absolute counts to assess backend impact.

For service-level objectives, decide whether the logical operation latency and outcome are what users experience. A final success after the deadline should not be counted as healthy merely because one background attempt eventually completed.

## Avoid Double Logging

A common retry helper logs every failed attempt as an error and then the caller logs the final wrapped error. One outage produces several identical error entries per call.

Instead:

- emit attempt failures as trace data or structured debug information;
- count them in metrics;
- log one final operation outcome at the ownership boundary;
- include a compact attempt summary with count, last error class, cumulative delay, and stop reason;
- sample detailed attempt logs when diagnosis requires them.

Do not discard the earlier history. Retain structured attempt summaries on the final error so diagnosis does not depend on duplicate logs.

## Validate Telemetry with a Scripted Failure

Run one call that fails twice and succeeds once. The expected telemetry should show:

~~~text
logical calls: 1
attempts: 3
policy retries: 2
final successes: 1
amplification: 3.0
operation duration: attempts + both waits + local overhead
~~~

Then add an SDK retry below an application retry and verify that the attempt count exposes multiplication. Test cancellation during backoff, retry-budget rejection, transparent gRPC retry, and a hedge whose losing attempt is canceled.

## Official Documentation

- [OpenTelemetry semantic conventions for HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
- [OpenTelemetry error attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/error/)
- [gRPC OpenTelemetry metrics](https://grpc.io/docs/guides/opentelemetry-metrics/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)

## Conclusion

Count logical calls and physical attempts separately, trace each send when the instrumentation permits it, and expose retry delay, stop reason, budget rejection, and ownership. Those signals reveal a retry storm while final success still looks reassuring, giving operators time to reduce amplification before it becomes an outage.
