# How to Define an SLO for a Service with Zero or Very Low Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, SLI, Service Level Objectives, Error Budget, SRE, Synthetic Monitoring

Description: Keep idle service periods honest and make low-volume reliability decisions without inventing successful requests.

---

For a request-based SLO, zero eligible requests produce no reliability observation. `0 good / 0 total` is undefined; it is neither 100% availability nor 0% availability. Low traffic is different: the ratio is defined, but each event carries a large share of the error budget.

Treat those two conditions explicitly instead of hiding them behind a default value.

## Start with the User Promise

Ask when users expect the service to work:

- If the promise applies only when a real request arrives, use an occurrence-based SLI and report an idle window as **no evidence**.
- If the service must be continuously reachable even while no customers are active, add an independent synthetic or time-slice availability objective.
- If the service runs only during declared business hours or scheduled events, make those eligible periods part of the SLO definition.
- If each request is rare but extremely valuable, one failed request may legitimately justify an investigation; do not tune alerting merely to suppress that fact.

The request SLO and the readiness promise can coexist. They measure different things.

## Keep Four States Separate

An SLO view should distinguish:

| State | Eligible events | Telemetry | Meaning |
|---|---:|---|---|
| Healthy traffic | Greater than zero | Present | Calculate good / total |
| Unhealthy traffic | Greater than zero | Present | Calculate good / total and budget burn |
| Idle | Zero | Present and fresh | No request-based observation |
| Unknown | Unknown | Missing or stale | Monitoring failure; do not infer compliance |

Never use `or vector(1)` to turn an empty ratio into success. It makes an instrumentation outage look exactly like a perfectly reliable idle service.

Expose numerator and denominator beside the ratio. A dashboard can display `N/A (0 requests)` when the known denominator is zero and `UNKNOWN (telemetry missing)` when counters or scrapes are absent.

## Choose a Low-Traffic Strategy

### Extend the Evidence Window

A 28-day rolling window contains more events and four complete weekly cycles. This stabilizes reporting, but it does not create information that is not there and it makes changes slower to observe.

Calculate whether the target is statistically and operationally meaningful. At 99.9%, 2,000 requests over 28 days permit only two bad requests. At 200 requests, the nominal budget is 0.2 request: one failure immediately misses the objective. You cannot fix this granularity problem with more decimal places.

### Aggregate Only Related Work

Related low-volume operations that implement one user promise can share an SLO. For example, several rarely used account-recovery endpoints might be measured as one recovery journey. Do not combine unrelated services simply to make the graph smooth; a busy endpoint would hide failures in the quiet one.

### Add Synthetic Coverage as a Separate Signal

Run a realistic canary from locations and identities that exercise the dependency path users need:

```text
Synthetic SLI = successful scheduled journeys / attempted scheduled journeys
```

Keep this SLI separate from real-user requests. If 10 synthetic successes are added to one real failure, the synthetic traffic dilutes the very user impact it was meant to reveal. Google SRE's low-traffic guidance explicitly calls out this failure mode.

Synthetic coverage also has limits: probes may bypass customer DNS, authentication state, browser behavior, or tenant-specific data. Document what the probe does and does not cover.

### Change the Product or Target

Retries, queued completion, idempotency, and graceful degradation can reduce the impact of an individual attempt failure. Measure the logical outcome after those mechanisms. If one logical failure is tolerable but a 99.9% target pages on every event, the target and response policy disagree; choose a realistic target or use a ticket rather than pretending the event did not happen.

## Monitor Telemetry and Traffic Independently

Prometheus can detect a missing counter series:

```promql
absent_over_time(http_requests_total{service="recovery-api"}[10m])
```

It can separately identify a scrape target that exists but is failing:

```promql
max_over_time(up{job="recovery-api"}[10m]) == 0
```

A present counter with no increase may mean legitimate idleness:

```promql
sum(increase(http_requests_total{service="recovery-api",sli_eligible="true"}[1h])) == 0
```

Route the first two conditions as telemetry or platform incidents. Route the third according to business expectations: it may be normal overnight or a sign that ingress, scheduling, or demand-generation failed.

## Define the SLO in Plain Language

A complete low-traffic definition might say:

> Over a rolling 28 days, at least 99% of eligible password-recovery journeys initiated by a customer will complete within 10 minutes. A period with zero initiated journeys is reported as no observation. Separately, at least 99.5% of five-minute synthetic checks during supported hours must complete successfully.

This definition states the event, deadline, window, idle behavior, and independent coverage signal. Also specify the minimum event count at which product reports should compare cohorts or declare a trend.

## References

- [Google SRE Workbook: Low-Traffic Services and Error Budget Alerting](https://sre.google/workbook/alerting-on-slos/#low-traffic-services-and-error-budget-alerting)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google Cloud Observability: Properties of a good SLI](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Prometheus query functions: `absent_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## Conclusion

Zero traffic is an absence of request evidence, while low traffic is a coarse but real signal. Preserve that distinction, keep synthetic and real-user measurements separate, and align the target and alert response with the actual impact of one failed event.
