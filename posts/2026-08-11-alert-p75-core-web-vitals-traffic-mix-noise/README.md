# Alert on p75 Core Web Vitals Without Traffic-Mix Noise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Core Web Vitals, Alerting, Real User Monitoring, Percentile, Browser Monitoring, SRE

Description: Design p75 Core Web Vitals alerts with stable cohorts, sample guards, persistence, and telemetry-health checks so population shifts do not masquerade as regressions.

---

Core Web Vitals are assessed at the 75th percentile because the goal is to provide a good experience for most visits, including harder real-world conditions. That does not mean every five-minute p75 crossing should wake an engineer. A field percentile is a property of both the application and the traffic population. Device, browser, region, route, cache, and release mix can change the aggregate even when every underlying cohort is stable.

A useful alert therefore asks two questions:

1. Did user experience become materially worse?
2. Is there an actionable application or delivery change, rather than a small-sample or population-mix effect?

The alert must protect both sides of that contract.

## Collect One Comparable Value per Page View

Start with correct event semantics. The current Core Web Vitals are:

| Metric | Good | Needs improvement | Poor |
| --- | ---: | ---: | ---: |
| LCP | `<= 2,500 ms` | `> 2,500 ms` and `<= 4,000 ms` | `> 4,000 ms` |
| INP | `<= 200 ms` | `> 200 ms` and `<= 500 ms` | `> 500 ms` |
| CLS | `<= 0.1` | `> 0.1` and `<= 0.25` | `> 0.25` |

The recommended assessment is the 75th percentile of page loads, segmented across mobile and desktop devices. Use the official `web-vitals` library rather than inventing partial definitions from raw performance entries.

Callbacks can report a metric more than once during a visit. The metric `id` identifies a metric instance, and `delta` is the change since its previous report. If every report is inserted as an independent sample, instances reported more often receive more weight. Upsert the latest value by metric instance, using a per-instance sequence so out-of-order delivery cannot overwrite a later value. The default callbacks report at lifecycle checkpoints; CLS and INP can report again if a page returns from a hidden state and later changes. The `reportAllChanges` option is useful for debugging but is not generally recommended for production collection.

Capture immutable navigation context when each view begins rather than deriving it when the callback eventually runs. In the example, `navigationContext(metric)` returns that captured context. Current `web-vitals` versions also expose `navigationURL`, which prevents a late callback from being attributed to the wrong SPA route.

```js
import { onCLS, onINP, onLCP } from "web-vitals";

const reportSequences = new WeakMap();

function publish(metric) {
  const reportSequence = (reportSequences.get(metric) ?? 0) + 1;
  reportSequences.set(metric, reportSequence);

  const context = navigationContext(metric);
  const payload = {
    metric_id: metric.id,
    metric_name: metric.name,
    report_sequence: reportSequence,
    value: metric.value,
    route: normalizedRoute(metric.navigationURL ?? context.url),
    form_factor: context.formFactor,
    release: context.release,
    environment: context.environment,
    visibility_at_start: context.visibilityAtStart,
    navigation_started_at: context.startedAt,
    reported_at: Date.now(),
  };

  const body = JSON.stringify(payload);

  // Upsert only if report_sequence is greater for (metric_id, metric_name).
  if (!navigator.sendBeacon?.("/rum/vitals", body)) {
    void fetch("/rum/vitals", { body, method: "POST", keepalive: true });
  }
}

onCLS(publish);
onINP(publish);
onLCP(publish);
```

If your library version has different options, follow that version's API documentation. Reports with the same metric ID are not additional visits; a back/forward cache restoration creates new metric instances because it is treated as a separate visit. Soft-navigation reporting is opt-in in `web-vitals` v6, so enable and validate it separately if SPA route changes belong in your page-view population. Retain append-only reports or equivalent version history alongside the latest-value view if you need to replay what an alert would have seen in the past.

## Calculate the Percentile from the Intended Population

A p75 estimate locates the 75% point of a distribution. For a finite sample, the exact result depends on the percentile method: `percentile_disc` returns the first observed value whose ordered position reaches 75%, while `percentile_cont` can interpolate between adjacent observations. Compute the percentile from one deduplicated, latest reported value per metric instance over an explicit cohort and window. The query below uses the immutable navigation start time and an illustrative five-minute reporting-lateness watermark to select a closed 30-minute window. Tune the watermark from observed reporting delays and track page-view-to-metric coverage separately because some visits report later or never report. Filtering on the mutable report time would select a different population.

```sql
SELECT
  metric_name,
  route,
  form_factor,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75,
  count(value) AS samples
FROM rum_vital_latest
WHERE navigation_started_at >= now() - interval '35 minutes'
  AND navigation_started_at < now() - interval '5 minutes'
  AND environment = 'production'
  AND visibility_at_start = 'visible'
GROUP BY metric_name, route, form_factor;
```

Choose `percentile_cont` or `percentile_disc` deliberately and keep the method consistent. If your telemetry backend stores histograms, configure bucket resolution around the thresholds; a coarse histogram can only approximate p75. CrUX's published p75 is calculated from its own eligible population and aggregation. Do not mix CrUX values with individual first-party RUM observations in one percentile.

INP needs special sample accounting: pages with no qualifying interaction do not yield an INP value. Show both page views and INP-eligible page views. An apparent INP improvement can occur because users stopped interacting with the slow control.

## Why Aggregate p75 Moves Without a Regression

Suppose mobile p75 LCP is 3.2 seconds and desktop p75 is 1.5 seconds. If mobile traffic rises from 30% to 60%, the all-device p75 can cross your threshold even when both segment percentiles are unchanged. This is a traffic-mix change, but it still represents a worse experience for the current population. The distinction matters for response:

- the **raw aggregate** describes the user outcome now;
- **stable cohorts** help determine whether the system regressed;
- a **fixed-mix aggregate** estimates what performance would have been under a reference population.

Keep all three where volume permits. Never replace the raw result with reweighted data and claim users became faster.

| View | Purpose | Suitable for paging? |
| --- | --- | --- |
| Raw route/form-factor p75 | Current user experience | Yes, with persistence and impact guards |
| Stable cohort p75 by route, device, browser, region | Regression localization | Yes for high-volume, owned cohorts |
| Fixed-reference weighted distribution | Release comparison independent of mix | Good corroborating signal, not the only user-impact signal |
| CrUX p75 | Public rolling Chrome field view | Usually trend/reporting, not minute-level paging |

## Design Stable Cohorts

Start with route template and form factor because page behavior and Core Web Vitals guidance make these meaningful. Add dimensions only when they change an operational decision. A sensible hierarchy is:

```text
site
└── normalized route group
    ├── mobile
    │   ├── current release
    │   └── previous/canary release
    └── desktop
        ├── current release
        └── previous/canary release
```

Browser engine or region can be a drill-down or a dedicated alert for very high-volume services. Avoid arbitrary combinations such as route × browser version × region × network × experiment. They create tiny buckets, unstable quantiles, and excessive metric cardinality.

Use URL templates such as `/products/:productId`, not raw paths or query strings. Bucket versions and regions to a maintained allowlist. Suppress or roll up cohorts that do not meet the privacy and sample requirements.

## Add Sample, Coverage, and Persistence Guards

A production alert should include at least these guards:

### Minimum eligible observations

Require enough distinct metric instances in the evaluation window. There is no universal magic count: determine it from historical bootstrap or replay analysis and the sensitivity you need. The threshold for a busy home page can be much higher than for checkout. When the count is low, display "insufficient data" rather than zero or good.

### Persistent breach

Require the threshold to be breached across multiple evaluation windows or for a sustained duration. Overlapping windows smooth noise but are correlated; test the actual rule against historical data rather than assuming three overlapping evaluations are three independent confirmations.

### Material change

Combine an absolute user-experience boundary with a relative regression. For example, page when mobile checkout LCP p75 is above 4 seconds **and** at least 20% worse than its time-of-week baseline or concurrent control. This avoids paging when a chronically 4.01-second route wiggles by a few milliseconds, though chronic poor performance still needs backlog ownership.

### Affected volume

Estimate the number or rate of poor experiences, not only the percentile. A high-volume degradation deserves a faster response. A low-volume route may create a ticket rather than a page.

### Telemetry health

Require or separately alert on expected SDK initialization, accepted event volume, browser mix, beacon acceptance, consent cohort, and pipeline lag. If Safari or low-end mobile reporting disappears, p75 may improve precisely when observability has failed.

## Separate Page-Worthy and Ticket-Worthy Signals

Core Web Vitals often move gradually and do not always indicate an immediate outage. Define severity from actionability:

**Page an on-call engineer when:**

- a critical, high-volume journey crosses a poor boundary materially and persistently;
- the breach aligns with a deployment, CDN issue, or backend latency event;
- both user impact and telemetry health checks are valid;
- there is a documented mitigation such as rollback, feature disablement, or traffic shift.

**Create a ticket or daily alert when:**

- p75 crosses from good into needs-improvement gradually;
- CrUX trends worsen across its rolling window;
- a low-volume route has enough weekly but not hourly evidence;
- a segment is chronically poor without a safe immediate mitigation.

An alert without a plausible on-call action is a report wearing a pager costume.

## A Concrete Multi-Signal Rule

For a critical route, an example policy in vendor-neutral pseudocode is:

```yaml
name: checkout-mobile-lcp-regression
window: 30m
evaluate_every: 5m
conditions:
  - samples >= 1000
  - telemetry_acceptance_ratio >= 0.95
  - subcohort_mix within_expected_range_or_accounted_for
  - lcp_p75_ms > 4000
  - lcp_p75_ms > baseline_same_cohort * 1.20
  - poor_page_views_per_minute > 100
for: 15m
```

This is a design example, not a universal set of numbers. Derive limits from route traffic, historical variability, business impact, and response time. The baseline must use the same metric definition and cohort. Prefer a concurrent canary/control comparison over a distant historical period when possible because both sides then share current traffic and infrastructure conditions.

For CLS, watch threshold direction and units carefully; CLS is unitless. For LCP and INP, standardize storage units-milliseconds are convenient-and encode the unit in schema or metric name.

## Validate the Alert Before Enabling Paging

Replay at least several weeks of events through the proposed rule. For every simulated page, inspect:

1. Was there a user-visible change?
2. Did cohort share change?
3. Did sample or telemetry coverage fall?
4. Was a deployment or infrastructure event present?
5. Would the runbook have led to a useful action?

Then inject known regressions into a synthetic or canary environment and confirm the field pipeline, quantile calculation, and notification path. Review false positives and false negatives after launch. Percentile alerting is a measurement system that requires its own reliability work.

## Official Documentation

- [Web Vitals thresholds and p75 assessment](https://web.dev/articles/vitals)
- [How Core Web Vitals thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [CrUX API percentiles](https://developer.chrome.com/docs/crux/api)
- [CrUX metrics methodology](https://developer.chrome.com/docs/crux/methodology/metrics)
- [Best practices for measuring Web Vitals in the field](https://web.dev/articles/vitals-field-measurement-best-practices)
- [web-vitals library](https://github.com/GoogleChrome/web-vitals)

## Conclusion

Alerting on p75 is useful only when the observation unit, population, and sample are explicit. Store one current value per metric instance, alert on stable route and form-factor cohorts, display raw population outcomes beside fixed-mix comparisons, and gate pages on volume, persistence, material change, and telemetry health. The result still respects the Core Web Vitals p75 convention, while avoiding the fiction that every movement in a changing field distribution is a new code regression.
