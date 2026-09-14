# How to Monitor Idempotency: First-Execution, Replay, Conflict, and Expired-Key Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Prometheus, Monitoring, Observability, API

Description: Instrument idempotency decisions with bounded labels, separate execution from replay, and distinguish key expiry from evidence of a duplicate business effect.

---

An API handles 10,000 successful responses, but only 7,000 represent new work. The remaining 3,000 replay stored results after client retries. An HTTP success chart cannot tell whether idempotency is working, retry traffic is increasing, or a deployment changed key generation.

Measure decisions at the idempotency boundary, execution results at the business boundary, and response delivery at the HTTP boundary. These are related observations with different meanings.

## Define a decision vocabulary

Use a counter with one terminal decision per request that enters the idempotency layer:

| Decision | Meaning |
| --- | --- |
| `first` | This attempt acquired permission to execute new work |
| `replay` | This attempt selected an existing stored result |
| `conflict` | The key exists with different protected inputs |
| `in_progress` | Another attempt owns execution and this request stops waiting |
| `invalid` | The supplied key violates the endpoint contract |
| `bypass` | The endpoint allows this request to proceed without a key |
| `store_error` | The idempotency lookup or claim could not complete |
| `expired_rejected` | An expired identity was recognized and policy rejected reuse |

These names define an example application contract, not standard Prometheus or HTTP outcomes. If a request waits for an owner and later obtains its result, classify it as `replay`; record waiting duration separately. Do not also count it as `in_progress` in the same terminal-decision counter.

Acquiring first-execution rights does not mean a business transaction committed. Record the eventual execution outcome separately, including failure and uncertainty. A stored failure response can be replayed just as a stored success can, depending on the API's policy. Stripe is one concrete example with documented result retention, parameter comparisons, and exclusions for pre-execution failures. [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## Keep request identity out of labels

An example exposition is:

```text
# HELP api_idempotency_decisions_total Requests classified by the idempotency layer.
# TYPE api_idempotency_decisions_total counter
api_idempotency_decisions_total{operation="create_order",decision="first"} 7000
api_idempotency_decisions_total{operation="create_order",decision="replay"} 3000
api_idempotency_decisions_total{operation="create_order",decision="conflict"} 12
```

Use a small configured operation vocabulary such as `create_order`, not the raw URL. Avoid key, user, tenant, order ID, trace ID, payload hash, and full exception message labels. Hashing a unique key does not reduce the number of time series. Prometheus warns that each distinct label set consumes resources. [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)

Initialize known decision series to zero when creating the metric. Otherwise a missing conflict series can complicate ratios and alerts before the first conflict occurs. Use logs or traces with controlled retention and access for individual-operation investigation, and avoid recording sensitive payloads.

## Separate traffic, work, and state

Add a small group of complementary measurements:

```text
api_idempotency_execution_attempts_total{operation,outcome}
api_idempotency_wait_duration_seconds{operation}
api_idempotency_lookup_duration_seconds{operation}
api_idempotency_records{operation,state}
api_idempotency_expirations_total{operation}
```

The first counts completed execution attempts, with a bounded outcome such as `committed`, `rolled_back`, or `unknown`. Durations should use histograms with buckets selected for the service. Records is a gauge collected from durable state or maintained with reconciliation. Expirations counts records removed or transitioned by retention processing; it is not a count of clients retrying expired keys.

An in-process counter is operational telemetry, not an exactly-once audit ledger. A process can commit a business effect and die before updating or exporting a counter. If exact committed-operation counts matter, derive them from durable business records or a transactional audit stream. Do not turn a metrics-export failure into another business execution.

Use base units and consistent suffixes so queries remain understandable. [Prometheus metric naming](https://prometheus.io/docs/practices/naming/)

## Calculate a replay share with an explicit denominator

For protected requests that either start execution or select a stored result:

```promql
sum by (operation) (
  rate(api_idempotency_decisions_total{decision="replay"}[5m])
)
/
sum by (operation) (
  rate(api_idempotency_decisions_total{decision=~"first|replay"}[5m])
)
```

This excludes invalid requests, conflicts, bypass traffic, and store failures. Name the panel accordingly. To show replays as a share of all requests, deliberately change the denominator instead of interpreting these two ratios interchangeably.

At zero traffic, leave the ratio undefined and display no traffic. Clamping the denominator to one changes the meaning at low request rates. Apply `rate` before summing so counter resets are handled per series. [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

A conflict-volume query is simpler:

```promql
sum by (operation) (
  increase(api_idempotency_decisions_total{decision="conflict"}[15m])
)
```

Prometheus extrapolates range calculations; this can produce fractional estimates. Use it for trends and alert thresholds, not exact billing or incident reconciliation.

## Recognize what expiry cannot tell you

After physically deleting a key with no remaining evidence, the next lookup looks like a never-seen key. You cannot honestly label that request an expired-key retry merely because it arrived late.

To distinguish the cases, retain a minimal tombstone, consult a durable operation record, or use another explicitly designed recognition mechanism. Define its own retention period and storage cost. If policy allows recognized expired keys to execute again, record that as a new execution plus a separate recognized-expiry event; keep the primary decision mutually exclusive.

Expiry should be evaluated against the retry and replay horizon. A successful first execution after key expiry can still violate a longer-lived business uniqueness rule. Alert on duplicate business records separately from retention activity.

## Alert on cause and impact

A higher replay share can indicate a healthy safeguard responding to network failures. Compare it with HTTP latency, client timeouts, upstream retries, store latency, and execution volume before paging.

Conflicts often point to a reused key or mutable retry payload. Store errors mean the service cannot establish its protection contract. A growing pending count with an old unfinished operation suggests stuck ownership or reconciliation. Define absolute and relative thresholds from observed traffic and the operation's impact; do not assume one universal replay percentage is dangerous.

Exercise the vocabulary with a small fixture: one new success, two replays, one changed payload, one keyless legacy call, one store failure, and one recognized expired rejection. Assert the classifications and durable effects independently. Restart the service between samples and verify that rate queries remain sensible. A useful dashboard explains both how much retry traffic arrived and whether the business invariant survived it.
