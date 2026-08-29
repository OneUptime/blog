# No Traffic or Broken Telemetry? How Missing Data Should Affect an SLO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, SLI, Prometheus, PromQL, Monitoring, Observability

Description: Preserve unknown SLO state, distinguish idle traffic from collection failure, and alert on telemetry without fabricating good or bad events.

---

No traffic and no telemetry can both produce an empty SLO graph, but they mean different things. An idle request-based service has a known denominator of zero. Broken telemetry means the denominator itself is unknown. Neither condition should be silently converted to 100% success.

Model SLO status as at least `compliant`, `noncompliant`, `idle/no observation`, and `unknown`.

## Keep the Evidence States Distinct

| Request counter | Collection health | State | SLO treatment |
|---|---|---|---|
| Present and increasing | Healthy | Traffic | Calculate good / total |
| Present and unchanged | Healthy | Idle | No request observation |
| Missing | Failing or unknown | Unknown | Alert on telemetry; do not infer success |
| Partially missing | Degraded | Biased/unknown | Investigate numerator and denominator coverage |

A counter initialized at zero and scraped regularly proves something different from a time series that vanished. Prometheus client-library guidance recommends initializing metrics where practical; this makes zero observable.

## Do Not Coerce Absence in the SLI Query

Avoid patterns such as:

```promql
# Dangerous: missing observations become perfect service.
(good / total) or vector(1)
```

Using `or vector(0)` is equally misleading in the other direction. Let the ratio be empty or undefined when evidence is insufficient, and render that state deliberately in the SLO system.

Calculate good and total from the same event family when possible so missing labels affect both consistently:

```promql
sum(rate(api_requests_total{service="orders",eligible="true",result="good"}[5m]))
/
sum(rate(api_requests_total{service="orders",eligible="true"}[5m]))
```

At zero observations, do not page from the ratio. Evaluate traffic expectation and telemetry health with separate rules.

## Detect Collection Failure Explicitly

Prometheus provides `absent_over_time()` for a series that has no samples in a range:

```promql
absent_over_time(api_requests_total{service="orders"}[10m])
```

For scrape targets, distinguish a present target that has failed every scrape from a target series that disappeared:

```promql
max_over_time(up{job="orders-api"}[10m]) == 0
```

```promql
absent_over_time(up{job="orders-api"}[10m])
```

A present request counter with no events can identify idleness:

```promql
sum(increase(api_requests_total{service="orders",eligible="true"}[30m])) == 0
```

That last expression is meaningful only if the expected counter series is known to exist. Pair it with the telemetry checks.

Also monitor rule evaluation and remote-write health. Prometheus notes that a slow rule group can skip evaluations and leave gaps in recording-rule output. A healthy target does not prove that the SLO pipeline, long-term store, or dashboard received its samples.

## Decide What an Unknown Period Does

There is no universal honest way to label unknown user outcomes as good or bad. Use this order:

1. Recover events from an independent, auditable source such as edge logs or a durable request ledger.
2. Backfill or restate the report with provenance and a revision marker if policy permits.
3. If outcomes cannot be recovered, mark the interval unknown and disclose coverage.
4. Apply an operational consequence—telemetry incident, release block, or manual review—based on risk.

For an external SLA, the contract may define missing-data treatment. Keep that calculation separate from the internal truth if it defaults unknown time to success. For an internal SLO, a policy can be conservative without falsifying the numerator: for example, block risky releases while SLI coverage is unknown.

## Detect Partial Bias

The most dangerous gap is not total absence but selective loss. If successful requests are counted in an application while gateway failures are counted elsewhere, loss of the gateway feed makes availability improve. Reconcile counts between client, load balancer, and application; alert on unexpected differences and label-set disappearance.

Track SLI coverage:

```text
events with a classifiable outcome / expected eligible events
```

Do not multiply an incomplete SLI by its coverage and call the result availability. Show both and repair the observation boundary.

## Encode a No-Data Policy

Store the expected metric series, maximum staleness, idle behavior, fallback evidence source, owner, and escalation in the SLO definition. OpenSLO includes an `alertWhenNoData` policy field, and Grafana Alerting represents No Data separately from Normal and Alerting. Whichever tool you use, test the behavior before an outage.

## References

- [Prometheus query functions: `absent_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus recording rules and missed evaluations](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [OpenSLO specification: no-data alert policy](https://github.com/OpenSLO/OpenSLO)
- [Grafana Alerting: No Data and Error states](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/)

## Conclusion

Known zero traffic is an idle observation boundary; missing telemetry is unknown evidence. Keep both out of the success ratio, alert on collection independently, recover from durable sources when possible, and make no-data policy an explicit part of the SLO.
