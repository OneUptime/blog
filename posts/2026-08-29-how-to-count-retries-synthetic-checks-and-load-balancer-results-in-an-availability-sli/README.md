# Counting Retries, Synthetic Checks, and Load-Balancer Results in an SLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLI, SLO, Retry, Synthetic Monitoring, Load Balancer, Availability

Description: Count each user promise once, use the edge as an observation point, and keep synthetic and attempt telemetry from distorting availability.

---

An availability SLI needs one event unit and one observation boundary. Mixing client retries, synthetic probes, load-balancer requests, and application attempts in a single denominator double-counts some interactions and gives artificial traffic power to hide real users.

Choose the logical promise first. Use other sources to improve coverage and diagnosis without casually adding their counts together.

## Give Each Source One Role

| Source | Best role | Main trap |
|---|---|---|
| Logical client or journey outcome | User-facing SLI | Requires correlation across attempts and async stages |
| Load balancer or public edge | Request SLI proxy | Misses some DNS, client, and rendering failures |
| Application server | Rich diagnostic/component SLI | Misses requests rejected or lost before the process |
| Retry-attempt metric | Resilience diagnostic | Inflates denominator and failures |
| Synthetic check | Continuous independent SLI | Can dilute real-user failures if mixed |

Google SRE's implementation example prefers load-balancer metrics over server logs because they are closer to user experience. It also warns that successful artificial traffic can hide errors affecting real users when synthetic and real signals are combined.

## Count Retries at the Promised Boundary

If a client makes one logical call, transparently retries twice, and succeeds within the deadline, the user experienced one good outcome-not two bad attempts and one good request. Conceptually increment these counters (pseudocode):

```text
logical_outcomes_total{result="good"} += 1
dependency_attempts_total{result="error"} += 2
dependency_attempts_total{result="good"} += 1
```

Use an operation or idempotency ID in logs or a durable event store to correlate attempts. Do not put it in metric labels.

The boundary depends on the contract. If each raw HTTP request is independently promised to an API caller, each request can be an eligible event. If your SDK promises a logical operation with built-in retry, measure the SDK-visible outcome. Document which layer controls the official SLO.

Retries that succeed after the user deadline remain bad for the latency or timely-completion promise. Unsafe retries and duplicate side effects can also fail correctness even if the final status is `200`.

## Use the Load Balancer Without Double Counting

The edge often provides the most complete server-side denominator because it sees gateway-generated `5xx`, throttling, routing failure, and requests that never reach the application. Include only eligible public operations; exclude health checks, metrics scrapes, internal probes, unsupported traffic, and requests outside declared quotas according to a reviewed policy.

Count the response the edge actually delivered. A backend that logs success after the client timed out does not turn the client outcome good. A load balancer `502` caused by an upstream disconnect is bad for an eligible request even if the application has no corresponding log.

Do not add application request totals to edge totals. Reconcile them:

```text
eligible edge request IDs
- distinct eligible edge request IDs correlated to one or more application attempts
= edge-only or unclassified request IDs
```

Alert on an unexpected reconciliation gap and classify it. Separately flag multiple application attempts correlated to one edge request. Together, these signals can reveal gateway failures, telemetry loss, retries between layers, or inconsistent eligibility filters.

## Keep Synthetic Checks Separate

Define a synthetic objective such as:

```text
successful scheduled journeys / attempted scheduled journeys
```

Use it to cover idle periods and detect problems before real traffic arrives. Do not insert probe successes into the real-user numerator. Synthetic requests have a chosen sampling frequency, limited states, and often privileged network or identity paths; changing probe cadence would otherwise change reported user availability.

Show the two SLIs together:

```text
Real-user availability:  99.87% over 28 days, 2.1M events
Synthetic availability:  99.95% over 28 days, 8,064 checks
```

Disagreement is valuable evidence. Real red/synthetic green suggests coverage gaps or customer-specific impact. Synthetic red/no real traffic can justify proactive response without inventing user requests.

## Build a Canonical Outcome Counter

Where feasible, have an edge or journey evaluator increment one counter after final classification. A bounded label schema can look like this (pseudocode):

```text
availability_outcomes_total{
  service="<bounded service>",
  operation_class="<bounded operation class>",
  customer_tier="<bounded tier>",
  eligible="true",
  result="<good or bad>",
  reason="<none or bounded failure reason>"
} += 1
```

Keep labels bounded. Use `reason="none"` for good outcomes and a reviewed set such as `application`, `gateway`, `timeout`, `dependency`, or `quota` for bad outcomes. The SLI divides `result="good"` by all eligible outcomes over the SLO window. Attempt, synthetic, application, and reconciliation metrics remain adjacent diagnostics.

If no single system sees the full journey, join durable edge/client events offline and export aggregate results. A false single-source certainty is worse than a clearly disclosed proxy.

## Validate Edge Cases

Test a successful first attempt, successful retry, exhausted retry, client cancellation, client deadline before backend completion, gateway `502`, within-quota `429`, connection failure with no status, synthetic-only idle period, duplicated idempotency key, and telemetry loss at one layer. Each eligible logical promise must be classified exactly once after success, final failure, or its deadline.

## References

- [Google SRE Workbook: SLI implementation sources and load-balancer measurement](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Artificial traffic for low-traffic services](https://sre.google/workbook/alerting-on-slos/#generating-artificial-traffic)
- [Prometheus instrumentation guidance for client and server metrics](https://prometheus.io/docs/practices/instrumentation/)
- [RFC 9110: Idempotent methods and automatic retry](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## Conclusion

Count the event your user was promised exactly once. Let load-balancer data provide a strong edge proxy, retries explain resilience, and synthetic checks provide independent coverage-without merging their incompatible denominators.
