# No Traffic or Broken Telemetry? How Missing Data Should Affect an SLO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, SLI, Prometheus, PromQL, Monitoring, Observability

Description: Preserve unknown SLO state, distinguish idle traffic from collection failure, and alert on telemetry without fabricating good or bad events.

---

No traffic and no telemetry can both produce an empty SLO graph, but they mean different things. With a healthy, initialized request counter, no traffic produces an observed denominator of zero. Broken telemetry means the denominator itself is unknown. Neither condition should be silently converted to 100% success.

Model SLO status as at least `compliant`, `noncompliant`, `idle/no observation`, and `unknown`.

## Keep the Evidence States Distinct

| Request counter | Collection health | State | SLO treatment |
|---|---|---|---|
| Present and increasing | Healthy | Traffic | Calculate good / total |
| Present with no observed increase | Healthy | No observed traffic; potentially idle | No request observation |
| Missing | Failing or unknown | Unknown | Alert on telemetry; do not infer success |
| Partially missing | Degraded | Biased/unknown | Investigate numerator and denominator coverage |

A counter initialized at zero and scraped regularly establishes an observed zero, which is different from a time series that vanished. Prometheus client-library guidance recommends initializing metrics where practical; this makes zero observable.

## Do Not Coerce Absence in the SLI Query

Avoid patterns such as:

```promql
# Dangerous: a completely absent aggregate ratio falls back to perfect service.
(sum(good) / sum(total)) or vector(1)
```

Using `or vector(0)` is equally misleading in the other direction. PromQL's `or` is a label-set union, not a general no-data operator: for this unlabeled aggregate it supplies the fallback only when the ratio is absent. With present numerator and denominator series, enough range samples, and no increments, the ratio below is `0 / 0`, which remains `NaN`. Preserve either no-evidence state and render it deliberately in the SLO system.

Calculate good and total from the same event family when possible to reduce instrumentation drift. Initialize and monitor every expected result label set because selective loss can still empty or bias the ratio:

```promql
sum(rate(api_requests_total{service="orders",eligible="true",result="good"}[5m]))
/
sum(rate(api_requests_total{service="orders",eligible="true"}[5m]))
```

At zero observations, do not page from the ratio. Evaluate traffic expectation and telemetry health with separate rules.

## Detect Collection Failure Explicitly

Prometheus provides `absent_over_time()` to detect when no series matched by a selector has samples in a range:

```promql
absent_over_time(api_requests_total{service="orders"}[10m])
```

This returns a 1-valued result only when the entire selector has no samples. It does not identify one missing label set while another matching series remains; select each expected series explicitly or compare against an inventory for that case.

For a specifically expected scrape target, distinguish a window containing one or more `up` samples that are all failed scrapes from a window containing no `up` samples:

```promql
max_over_time(up{job="orders-api",instance="orders-api-1:8080"}[10m]) == 0
```

```promql
absent_over_time(up{job="orders-api",instance="orders-api-1:8080"}[10m])
```

A counter with no observed increase can support an idle classification after current presence and coverage are verified:

```promql
sum(increase(api_requests_total{service="orders",eligible="true"}[30m])) == 0
```

That last expression is meaningful only if all expected counter series are known to exist and have enough samples for `increase()`. Pair it with the telemetry checks.

Also monitor rule evaluation and remote-write health. Prometheus notes that a slow rule group can skip evaluations and leave gaps in recording-rule output. A healthy target does not prove that the SLO pipeline, long-term store, or dashboard received its samples.

## Decide What an Unknown Period Does

There is no universal honest way to label unknown user outcomes as good or bad. Use this order:

1. Recover events from an independent, auditable source such as edge logs or a durable request ledger.
2. Backfill or restate the report with provenance and a revision marker if policy permits.
3. If outcomes cannot be recovered, mark the interval unknown and disclose coverage.
4. Apply an operational consequence-telemetry incident, release block, or manual review-based on risk.

For an external SLA, the contract may define missing-data treatment. Keep that calculation separate from the internal truth if it defaults unknown time to success. For an internal SLO, a policy can be conservative without falsifying the numerator: for example, block risky releases while SLI coverage is unknown.

## Detect Partial Bias

The most dangerous gap is not total absence but selective loss. If successful requests are counted in an application while gateway failures are counted elsewhere, loss of the gateway feed makes availability improve. Reconcile counts between client, load balancer, and application; alert on unexpected differences and label-set disappearance.

Track SLI coverage:

```text
events with a classifiable outcome / expected eligible events
```

Do not multiply an incomplete SLI by its coverage and call the result availability. Show both and repair the observation boundary.

## Encode a No-Data Policy

Store the expected metric series, maximum staleness, idle behavior, fallback evidence source, owner, and escalation in the SLO definition. OpenSLO includes a boolean `spec.alertWhenNoData` field on `AlertPolicy`, and Grafana-managed alert rules represent No Data separately from Normal and Alerting. Whichever tool you use, test the behavior before an outage.

## References

- [Prometheus query functions: `absent_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus recording rules and missed evaluations](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [OpenSLO specification: no-data alert policy](https://github.com/OpenSLO/OpenSLO)
- [Grafana Alerting: No Data and Error states](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/)

## Conclusion

Zero observed traffic from healthy, fully covered counters is an idle observation boundary; missing telemetry is unknown evidence. Keep both out of the success ratio, alert on collection independently, recover from durable sources when possible, and make no-data policy an explicit part of the SLO.
