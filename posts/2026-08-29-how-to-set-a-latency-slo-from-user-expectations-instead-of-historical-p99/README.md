# How to Set a Latency SLO from User Expectations Instead of Historical P99

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, SLI, Latency, User Experience, Service Level Objectives, Prometheus

Description: Turn a user-visible deadline into a latency SLO, then use historical percentiles to test feasibility rather than define the promise.

---

Yesterday's p99 describes the system you already have. It does not tell you when users abandon a task, miss a business deadline, or stop trusting the product. A latency SLO should begin with those consequences and work backward to a measurable event and threshold.

Historical latency is still useful, but as evidence about feasibility and cost—not as the source of user expectations.

## Define the Interaction Before the Number

Write down five things:

1. **User and journey:** an interactive shopper submitting payment is different from a bulk client exporting data.
2. **Start event:** button click, accepted API request, or message enqueue.
3. **Successful end event:** rendered confirmation, durable commit, or consumable output.
4. **Deadline:** the point after which the outcome has materially less value.
5. **Eligible population:** operation, payload class, geography, client type, and supported load.

Measure as close to the user as practical. Server duration omits DNS, connection setup, queues, gateways, response transfer, and browser work. If server telemetry is the only immediate option, call it a proxy and plan how to validate its correlation with client experience.

## Find Thresholds from Consequences

Useful inputs include user research, task-completion studies, support data, abandonment curves, downstream deadlines, contracts, and product requirements. Ask product owners questions such as:

- At what delay do users retry and risk duplicate work?
- When does an interactive action stop feeling interactive?
- When must a result arrive to be useful to the next business process?
- Are accessibility tools, mobile networks, or large tenants materially slower?
- Which latency increase would cause an engineering decision?

The output should be a threshold with a reason, not an arbitrary percentile copied from a dashboard.

## Express Latency as Good Events

A practical SLO states the proportion of eligible outcomes that finish within a threshold:

> Over a rolling 28 days, 95% of eligible checkout submissions complete within 400 ms and 99% complete within 1.5 s, measured from the public edge to the durable order confirmation.

Multiple grades capture both typical and tail experience without reducing the entire distribution to an average. The slower threshold can protect against severe outliers while the faster threshold represents the normal interaction.

For a classic Prometheus histogram with an exact `0.4`-second bucket, calculate the threshold ratio directly:

```promql
sum(
  rate(checkout_duration_seconds_bucket{le="0.4",outcome="success"}[5m])
)
/
sum(
  rate(checkout_duration_seconds_count{outcome="success"}[5m])
)
```

Failed requests need an explicit policy. Commonly, availability counts them as bad and latency evaluates successful outcomes only; alternatively, treat failures as not satisfying the latency promise so one SLO captures both. State the choice because it changes the denominator.

For a threshold-based SLO, a bucket boundary at the threshold provides an exact classic-histogram count. `histogram_quantile()` answers the inverse question—what duration corresponds to a chosen rank—and interpolates within buckets. It is useful for exploration, but it is not the direct numerator for “requests no slower than 400 ms.”

## Use History as a Feasibility Test

Now overlay the proposed thresholds on several representative periods:

- normal and peak load;
- weekdays and weekends;
- each supported region and client class;
- releases and known incidents;
- warm-cache and cold-start behavior;
- seasonal or end-of-month workloads.

Calculate the allowed bad events and identify which failure modes consume them. If the product needs 99% under 400 ms but current performance is 92%, do not quietly redefine user happiness as the current p99. Choose explicitly among architecture work, narrower supported scope, an aspirational objective with a dated improvement plan, or a product negotiation about the experience.

Avoid a target that the system beats by an enormous margin forever. Users learn the service they actually receive, and the objective will not guide a decision. Also avoid an unattainable target that keeps the team permanently in emergency mode.

## Validate That the SLI Represents Users

After launch, compare latency budget loss with abandonment, complaints, conversion, and incident timelines. A technically precise SLI can still be the wrong proxy. Review it when:

- user behavior changes without SLI movement;
- the SLI degrades without user impact;
- a new client or payload class changes the distribution;
- retries or async behavior move the true completion boundary;
- the target never influences prioritization.

Keep the rationale, measurement point, exclusions, owners, and next review date with the definition. A number without this context will eventually be cargo-culted into a contract.

## References

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google Cloud Observability: Properties of a good SLI](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)

## Conclusion

Set a latency threshold where delay changes a user or business outcome. Use historical p99 and the rest of the distribution to assess the engineering gap, not to decide what users should tolerate.
