# How to Keep Low-Traffic Burn-Rate Alerts from Paging on a Single Failed Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Error Budget, Alerting, Prometheus, PromQL, Synthetic Monitoring

Description: Preserve every failed event while adding evidence, impact, and routing policies that make low-volume alerts actionable.

---

At low traffic, a single failure can produce an enormous burn rate. With 10 requests per hour and a 99.9% SLO, one failed request creates a 10% hourly error rate: `0.10 / 0.001 = 100x` burn, consuming `1 / (10 x 24 x 30 x 0.001) = 13.9%` of the nominal 30-day request budget. The linked Google SRE Workbook currently prints `1,000x` for this example, but its burn-rate definition and 13.9% result imply `100x`. The example still shows why low-volume paging needs special treatment.

The solution is not to erase the event. Separate SLO accounting from paging and choose a response policy that reflects evidence and business impact.

## Check Whether One Failure Really Matters

If a request transfers money, restores access, or performs an unretryable control-plane change, one failure may justify immediate human response. A high target can be appropriate, but burn alerts arrive after the user is already affected; add proactive synthetic and dependency signals.

If one transient failure is not worth waking someone, a target that permits only a few monthly failures and a policy that pages on every one are inconsistent. Change alert routing, improve the logical outcome with retries, combine related promises, or choose an achievable target.

## Add an Evidence Gate to Paging

Keep the unmodified bad event in SLO counters, dashboards, and reports. Gate only the page. For service-labeled Prometheus counters, a simple policy can require both high burn and enough eligible events:

```promql
(
  sum by (service) (
    increase(api_requests_total{eligible="true",result="bad"}[1h])
  )
  /
  sum by (service) (
    increase(api_requests_total{eligible="true"}[1h])
  )
  > 14.4 * (1 - 0.999)
)
and on (service)
(
  sum by (service) (
    increase(api_requests_total{eligible="true"}[1h])
  ) >= 100
)
```

PromQL comparisons filter by default, and `and on (service)` keeps the burn result only where a matching volume condition exists. Apply `increase()` to each counter before summing so resets remain detectable.

The value `100` is an example, not a statistical law. Derive it from how many bad logical outcomes justify a page, detection time, normal traffic, and the cost of delay. A minimum-volume rule can suppress pages indefinitely during a total demand outage, so pair it with traffic, telemetry, and synthetic alerts.

You can also require an absolute bad-event count or consecutive failed logical journeys. This is an alert-policy choice; it must not remove early failures from the budget.

## Use Severity Tiers

- **Page:** enough evidence of ongoing user impact, several high-value failures, or corroborating synthetic/dependency failure.
- **Ticket:** any meaningful slow burn or the first isolated failure that consumes a notable budget share.
- **Dashboard/event review:** all classified bad events, including those below notification thresholds.

Multiwindow, multi-burn-rate alerts remain useful at adequate volume. At low volume, the short window often contains zero or one event, so use longer evidence windows for tickets and avoid pretending the ratio is smooth.

## Add Independent Coverage

Google SRE recommends several options for low-traffic services:

- generate artificial traffic;
- combine related small services into a meaningful higher-level function;
- modify the product so more than one attempt is needed for a logical failure or each failure has less impact.

Keep synthetic outcomes in their own SLI. Mixing successful probes into real-user traffic can hide the one real failure. Synthetic checks should exercise realistic DNS, authentication, data, dependencies, and geography, and should page only for a tested actionable failure pattern.

Combine operations only when they serve the same user promise or share a failure domain. Pooling an unrelated busy endpoint merely dilutes the quiet service's errors.

## Monitor the Conditions That Gates Hide

Add separate rules for:

- missing request counters with `absent_over_time()`;
- failing scrape targets through `up`;
- expected traffic absent during supported periods;
- synthetic journey failure;
- queue backlog or deadline risk for async work;
- the first bad high-value event, routed as a ticket if not a page.

Test alert rules with zero events, one good, one bad, a burst, sustained low-rate errors, counter reset, telemetry loss, and a complete outage before deployment.

## Revisit the SLO's Event Unit

Server attempts are often too granular. If the product transparently retries safely and the user receives a correct response within the deadline, count the logical interaction as good while tracking failed attempts diagnostically. Do not deduplicate separate user requests, and do not call a late retry success good if the promise already expired.

## References

- [Google SRE Workbook: Low-Traffic Services and Error Budget Alerting](https://sre.google/workbook/alerting-on-slos/#low-traffic-services-and-error-budget-alerting)
- [Google SRE Workbook: Multiwindow, Multi-Burn-Rate Alerts](https://sre.google/workbook/alerting-on-slos/#6-multiwindow-multi-burn-rate-alerts)
- [Prometheus operators: comparisons and logical `and`](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus query functions: `increase()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## Conclusion

One failed low-volume request can honestly consume substantial budget without always deserving a page. Record it, then use explicit evidence and impact thresholds, severity tiers, separate synthetic coverage, and an SLO target that matches the product's real tolerance.
