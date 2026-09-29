# How to Measure Impact During a Partial or Multi-Tenant Outage Using Segmented SLIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, SRE, Prometheus, Observability

Description: Measure partial outage impact with bounded cohort SLIs, volume-aware queries, explicit missing-data states, and separate request and tenant impact estimates.

A service-wide success rate can stay above 99% while an entire customer cohort cannot use the product. If 99,000 requests succeed in one region and all 1,000 requests fail in another, aggregate success is 99%. The second region is experiencing a complete outage.

During a partial incident, measure both overall impact and impact within the boundaries that could fail independently. Keep request impact, affected tenants, and measurement coverage separate so one reassuring percentage does not erase a severe local failure.

Google's SLO guidance uses good events divided by total eligible events as a common SLI form and emphasizes indicators tied to user experience. The examples below apply that approach to segmented incident assessment. [Google: Implementing SLOs](https://sre.google/workbook/implementing-slos/)

## Define the Unit Before Counting It

For checkout, decide whether the unit is an HTTP attempt, an order submission, or a completed purchase. Retries can produce several requests for one failed customer action. An internal 200 response may still represent a failed transaction if work never completes.

Write the incident measurement contract:

```text
Journey: submit an order
Eligible event: one valid checkout attempt admitted at the service boundary
Good: order accepted with a valid confirmation before its deadline
Bad: service failure or deadline exceeded
Excluded: intentionally rejected invalid input, under the agreed SLI policy
Segments: region, serving cell, bounded tenant tier
Window: five-minute operational view plus incident interval totals
Coverage: boundary instrumentation and independent synthetic journeys
```

Timeouts and failures before the instrumented boundary need another signal. A server cannot count requests that never reached it. Document that blind spot instead of describing the metric as complete customer impact.

## Choose Bounded Segments

Useful labels often correspond to routing or deployment boundaries: region, cell, availability zone, operation, release cohort, and a small tenant-tier classification. Start with the dimensions that test the suspected failure, then add independent slices when evidence warrants them.

Avoid putting arbitrary customer IDs on every metric. Prometheus cautions that each label set creates an additional time series, making unbounded dimensions expensive. Use access-controlled logs, events, or an analytical store for exact tenant lists when cardinality is large. [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)

A tenant tier is not a substitute for tenant impact. Two customers in the same tier can have different routing, data size, or feature exposure. Use bounded metrics to localize the incident, then investigate the affected tenants with more detailed evidence.

## Calculate Cohort Rates from Counters

Assume an application-defined counter named `checkout_outcomes_total` with labels `environment`, `region`, `cell`, `tenant_tier`, and `outcome`. It increments once when each eligible attempt completes or its deadline expires, and the application initializes both `good` and `bad` outcome series for active cohorts. An independent deadline check must classify stuck attempts; counting only handlers that return would hide the worst failures. Keep retries and later completion from counting the same attempt twice, and monitor the classifier's freshness.

The five-minute bad fraction is:

```promql
sum by (region, cell, tenant_tier) (
  rate(checkout_outcomes_total{environment="production",outcome="bad"}[5m])
)
/
sum by (region, cell, tenant_tier) (
  rate(checkout_outcomes_total{environment="production",outcome=~"good|bad"}[5m])
)
```

Show request volume beside it:

```promql
sum by (region, cell, tenant_tier) (
  increase(checkout_outcomes_total{environment="production",outcome=~"good|bad"}[5m])
)
```

Apply `rate()` or `increase()` to each counter series before summing, so resets remain detectable. `increase()` extrapolates over the window and may return fractional estimates; it is useful operationally, but is not an exact billing or tenant ledger. [Prometheus function semantics](https://prometheus.io/docs/prometheus/latest/querying/functions/)

A zero denominator is not evidence of perfect availability. Missing series are also different from an observed zero. Compare the cohorts returned by these queries against an expected active-cohort inventory and inspect scrape or pipeline freshness independently.

## Keep Three Impact Views

Use a compact table during the response:

| Cohort | Observed bad / total | Customer interpretation | Coverage |
| --- | --- | --- | --- |
| EU cell 3 | 1,000 / 1,000 | Observed checkout attempts all fail | Boundary data current |
| EU cell 4 | 20 / 10,000 | Limited failures under investigation | Boundary data current |
| US cells | 0 / 89,000 | No failures observed in this window | Synthetic checks also pass |
| APAC cell 2 | unavailable | Impact unknown | Telemetry delayed |

These are illustrative exact counts for explaining the view; a PromQL estimate should be labeled as such.

For the global bad fraction, sum bad events and total events separately, then divide; the success SLI is one minus that fraction. Averaging cohort percentages assigns equal weight to cohorts with very different traffic volumes and answers a different question.

For affected tenants, count distinct tenants with verified failed journeys in an appropriate event store. State the denominator: active tenants in the interval, all provisioned tenants, or tenants mapped to the affected cell. Those are three different impact claims. Report confirmed affected tenants separately from tenants potentially exposed to the failing path.

## Handle Quiet Cohorts and Changing Traffic

One failure out of two requests is a noisy rate, but it can still be important to those users. Treat minimum-volume guards as a way to interpret statistical confidence, not a reason to remove a cohort from the incident.

Use synthetic journeys for low-volume critical paths and inspect concrete failures. Record whether users stopped trying, routing moved them elsewhere, or the mitigation reduced admitted traffic. A falling error rate can reflect a changing denominator rather than recovery.

After a traffic shift, track both the original affected cohort and the destination. Verify that transferred demand succeeds and does not push a shared dependency beyond capacity.

## Conclusion

Segmented SLIs make partial failures visible when aggregate metrics hide them. Define the customer event, use bounded failure-domain labels, display volume and coverage, and keep tenant counts distinct from request rates. Recovery is credible when the affected cohorts improve and the measurements still cover the customers whose traffic changed.
