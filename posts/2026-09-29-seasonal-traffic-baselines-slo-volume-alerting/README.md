# Static Thresholds Fail on Seasonal Traffic: How to Combine Baselines, SLOs, and Minimum-Volume Guards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, SLO, Alerting

Description: Combine seasonal traffic diagnostics with SLO burn alerts and explicit low-volume policies without allowing baselines to learn an outage.

Traffic that doubles every weekday morning will overwhelm a static “more than 500 requests per second” warning. The same service may fail completely overnight while its raw error count stays below a fixed threshold. Separate unusual demand from unacceptable customer outcomes before choosing alert math.

A practical policy has three independent questions: is traffic unusual for this period, are real requests failing too often, and is there enough evidence to justify the chosen response? A historical baseline helps with the first question. It should not redefine what customers consider a successful request.

## Record a stable traffic series

Assume the application initializes a bounded set of `requests_total` counter series, including `outcome="error"` at zero. Record service and region traffic at a one-minute interval:

```yaml
groups:
  - name: service-traffic
    interval: 1m
    rules:
      - record: service_region:requests:rate5m
        expr: sum by (service, region) (rate(requests_total[5m]))
```

Keep ownership dimensions and remove ephemeral process labels only after taking the rate. Use a denominator that includes the exact set of eligible requests used by the SLO; do not mix health checks, retries and user operations unless the SLI definition requires it.

## Use seasonal history as a diagnostic

A simple starting point compares current demand with the same period last week:

```promql
service_region:requests:rate5m
>
1.5 * avg_over_time(
  service_region:requests:rate5m[30m] offset 1w
)
```

The trailing historical window smooths a single comparison point. This is a heuristic warning threshold, not a statistical confidence interval. Prometheus `offset 1w` means a fixed seven-day shift; it does not adjust for holidays or local daylight-saving changes. The [selector documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/#offset-modifier) defines those time semantics.

Require enough historical observations and retain a fixed capacity safety alert when history is absent. At a one-minute recording interval, 25 observations out of the expected 30 may be a reasonable initial completeness threshold. Backtest that policy using actual missed evaluations and deployments.

## Page on sustained budget consumption

For a 99.9% success SLO, the permitted error fraction is 0.001. A 14.4-times burn threshold corresponds to a 0.0144 observed error ratio. One illustrative fast-burn expression requires both a one-hour and five-minute window:

```promql
(
  sum by (service, region) (rate(requests_total{outcome="error"}[1h]))
  /
  sum by (service, region) (rate(requests_total[1h]))
  > 0.0144
)
and on (service, region)
(
  sum by (service, region) (rate(requests_total{outcome="error"}[5m]))
  /
  sum by (service, region) (rate(requests_total[5m]))
  > 0.0144
)
```

The short window tests whether the problem remains active; the long window establishes accumulated impact. The [Google SRE workbook](https://sre.google/workbook/alerting-on-slos/) develops this multiwindow approach. Choose thresholds from your SLO period, response time and budget policy rather than copying numbers in isolation.

Do not require traffic to exceed its seasonal baseline before this page can fire. A normal-sized workload can fail, and a total outage can reduce measured traffic below normal.

## Make the volume guard an explicit tradeoff

A small overnight service may see one failure in two requests. If that does not merit an immediate page, add an absolute evidence condition such as:

```promql
sum by (service, region) (
  increase(requests_total[1h])
) >= 100
```

Combine it with the ratio using matching service and region labels. The exact floor is a business policy: it intentionally suppresses some failures, including potentially a complete outage below that volume. Document which slower-window alert, synthetic transaction or individual critical-operation check covers the resulting gap.

Do not solve low volume by adding synthetic successes to the real-user denominator. Track synthetic results separately so an always-working canary does not dilute failures seen only by customers.

## Validate against unusual weeks

Replay a normal daily peak, an overnight total failure, a marketing event, a holiday and last week's incident. Check when each warning and page begins and ends. A baseline trained on a prior outage can normalize bad behavior; an offset alone does not remove that risk.

Also test missing error series, zero total traffic and absent regional telemetry. A division with no usable denominator cannot prove success. Route missing evidence to a distinct monitoring-health condition, and keep a regional probe for critical low-traffic paths.

## Conclusion

Use seasonal baselines to explain demand and SLO burn to identify unacceptable outcomes. Volume guards can improve paging precision only when their blind spots are explicit and covered. The result is a policy that tolerates normal cycles without silently exempting nights, new regions or low-volume failures.
