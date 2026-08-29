# How to Stop a Global SLO from Hiding Reliability Problems for Small Customers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Multi-Tenancy, Customer Experience, SLI, Prometheus, Cardinality

Description: Keep a request-weighted global SLO while adding cohort and customer guardrails that expose concentrated harm.

---

A global request-based SLO answers, “What fraction of all requests were good?” It does not answer, “Did every customer receive acceptable reliability?” A high-volume tenant can dominate the denominator and hide a complete outage for a small customer.

Keep the global SLO for population-wide impact, then add bounded cohorts and a customer-level reliability floor. Do not replace one aggregation mistake with an unweighted average of noisy customer ratios.

## See How the Global Ratio Masks Harm

Suppose a large tenant receives 9,999,000 good outcomes from 10,000,000 requests, while a small tenant receives 0 good outcomes from 100 requests:

```text
global SLI = 9,999,000 / 10,000,100 = 99.989%
```

A 99.9% global objective is green while the small tenant is completely down. The calculation is correct for request-weighted reliability; the objective lacks a fairness or concentration constraint.

## Build a Layered SLO Set

### Global Request SLO

Use total good events divided by total eligible events. It measures aggregate user impact and prevents a tiny cohort from making the whole product look unavailable.

### Bounded Cohort SLOs

Split only along dimensions that imply different risk or promises, such as:

- paid tier or contract class;
- region or data residency;
- client platform or API version;
- critical operation;
- architecture shard or migration cohort.

Prometheus can preserve a bounded label such as `customer_tier`:

```promql
sum by (customer_tier) (
  rate(api_requests_total{sli_eligible="true",sli_result="good"}[5m])
)
/
sum by (customer_tier) (
  rate(api_requests_total{sli_eligible="true"}[5m])
)
```

Apply the same good/eligible definition to numerator and denominator. A cohort change is an SLO change; version and review it.

### Customer Reliability Floor

Use a durable event store or analytics job to calculate the percentage of sufficiently active customers that met a minimum objective:

```text
customers meeting their reliability floor / eligible active customers
```

For example: “At least 99% of customers with 100 or more eligible journeys in 28 days will achieve at least 99% journey success.” Report lower-volume customers separately as insufficient evidence, and use incidents, synthetic checks, or a longer view for them.

This is better than averaging all customer success ratios. An average gives a tenant with one request the same weight as one with a million and can swing wildly on a single event.

## Control Cardinality

Do not add unbounded `customer_id` labels to every Prometheus series. Tenant-by-route-by-status-by-region combinations can overwhelm storage and queries. Instead:

- keep low-cardinality tiers and cohorts in metrics;
- store per-customer events or aggregates in logs, a warehouse, or a dedicated SLO system;
- precompute only the customer summaries needed for alerting;
- link an affected-customer drill-down from the global alert;
- expire or archive inactive-customer state deliberately.

Customer IDs can remain in trace or event records where lookup is appropriate; they do not need to become metric dimensions.

## Alert on Concentration, Not Every Tiny Ratio

Use fast burn on global and high-volume cohort objectives. For customer-level protection:

- page when several customers or a critical contracted customer show simultaneous severe impact;
- create a ticket for a single low-volume customer's sustained failure;
- alert on affected-customer count and share, not only request count;
- require enough evidence or consecutive failed logical journeys to avoid flapping;
- retain a direct escalation path for high-value one-off operations where one failure matters.

The response policy should reflect impact. A minimum-event guard changes alert routing, not whether a failed user outcome is recorded.

## Audit for Blind Spots and Gaming

Review the worst cohorts and customers even when global compliance is green. Compare budget loss with support tickets, renewals, and incident reports. Watch for:

- traffic moving to an excluded route or client version;
- failing tenants being reclassified into a looser cohort;
- a regional outage hidden by global traffic shifting elsewhere;
- inactive tenants disappearing from reports before their incident is resolved;
- retries inflating high-volume tenants' weight;
- shared infrastructure that makes “small” cohorts systemically important.

Google SRE recommends grading interaction importance and bucketing requests when classes have different expectations. Use that principle sparingly: a handful of decision-relevant slices is more useful than hundreds of dashboards nobody owns.

## References

- [Google SRE Workbook: Grading Interaction Importance](https://sre.google/workbook/implementing-slos/#grading-interaction-importance)
- [Google SRE Book: What Do You and Your Users Care About?](https://sre.google/sre-book/service-level-objectives/#what-do-you-and-your-users-care-about)
- [Prometheus instrumentation guidance on labels](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)

## Conclusion

Preserve the global request-weighted truth, but add a few risk-based cohort objectives and a properly qualified customer reliability floor. Use durable per-customer analysis instead of unbounded metric labels or statistically meaningless ratio averages.
