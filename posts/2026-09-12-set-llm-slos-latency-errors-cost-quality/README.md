# Set SLOs and Alerts for LLM Latency, Errors, Cost, and Quality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, Monitoring

Description: Define separate LLM service indicators for responsiveness, reliability, spend, and answer quality, then alert on actionable budget consumption.

An LLM service can return HTTP 200 for every request while producing slow, expensive, or unhelpful answers. A single uptime objective hides these failures. Conversely, turning every low judge score into a page creates noise without a clear operational response.

Define separate indicators for reliability, latency, cost, and quality. Each needs an eligible population, a good-event definition, a measurement window, and an owner who can act when it degrades.

## Start with the User Journey

Choose a request class with a clear contract, such as answering a support question with evidence. Decide when a request becomes eligible and how cancellations, refusals, abstentions, and timeouts are classified.

An expected policy refusal may count as correctly handled for reliability while remaining outside an answer-quality population. A request that times out after acceptance should not vanish from the denominator just because no model response was returned.

Write down independent indicators:

| Dimension | Example good event | Required context |
|---|---|---|
| Reliability | Eligible request reaches its intended terminal outcome | Failure taxonomy and recovery policy |
| Responsiveness | First visible text arrives within a threshold | Output kind and client delivery boundary |
| Completion latency | Eligible request completes within its deadline | Full request timing, including retries |
| Cost | Task stays within a defined consumption budget | Final or estimated usage provenance |
| Quality | Reviewed answer meets a versioned rubric | Eligible sample and evaluation coverage |

These examples are design choices, not universal target values. Set thresholds from user needs and observed workloads.

## Measure Reliability with Unsampled Counters

Emit one terminal request event per eligible logical request. Keep provider attempts separate so retries do not inflate the request denominator. Define a bounded outcome vocabulary and ensure every accepted request reaches one terminal classification.

For a custom Prometheus counter, the failure ratio might be:

```promql
sum(rate(app_llm_requests_total{outcome="failed"}[5m]))
/
sum(rate(app_llm_requests_total[5m]))
```

This assumes the metric includes only the eligible request population and that `failed` includes all outcomes your contract counts as failures. The metric name is illustrative application instrumentation. Missing data or a zero denominator requires a separate no-traffic or telemetry-health rule, not an automatic success interpretation.

Initialize each bounded outcome series at zero, including `outcome="failed"`, when the application starts. Otherwise, before the first failure, the numerator can be absent even while successful requests produce a denominator. Prometheus recommends exporting known series at zero to avoid this ambiguity. [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/).

Use unsampled counters for the ratio. A trace store that retains all failures but only a fraction of successes is deliberately biased and cannot supply this denominator directly.

## Turn Latency into Good Events

A percentile is useful for exploration, but an SLO often needs a direct fraction of requests meeting a threshold. With a classic histogram that includes a five-second bucket, the fraction completing within five seconds can be calculated as:

```promql
sum(rate(app_llm_request_duration_seconds_bucket{le="5"}[5m]))
/
sum(rate(app_llm_request_duration_seconds_count[5m]))
```

Observe the histogram once for each eligible terminal request, including failure durations if that is the indicator's contract. Ensure the bucket boundary exists in the emitted histogram. Prometheus documents why histograms support aggregation and threshold calculations, and why averaging per-instance quantiles is incorrect. [Prometheus histograms](https://prometheus.io/docs/practices/histograms/).

Measure first visible text separately from completion. Tool-only responses may have no visible text, so classify them intentionally rather than recording zero time to first token. Track abandoned streams and client disconnects alongside successful completion timing.

## Use Error-Budget Burn for Paging

For an objective of 99 percent good events, the allowed bad fraction is 0.01. A measured bad fraction of 0.02 burns budget at twice the sustainable rate. Compute burn from the indicator's bad-event ratio divided by its allowed bad fraction.

Use both a longer and shorter window to page on sustained, currently active degradation. A long window confirms meaningful budget consumption; a short window avoids paging on a problem that has already recovered. Google's SRE workbook explains multiwindow burn-rate alerting and the tradeoffs between precision and detection time. [Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/).

Tune windows and thresholds to the service's traffic and response requirements. For low-volume features, supplement ratio alerts with absolute event counts and synthetic checks. One failure in one request is a large ratio but may not justify the same response as thousands of failures.

## Treat Cost and Quality on Their Own Terms

Cost per completed task can rise because answers became longer, retries increased, or fewer tasks completed. Track total spend rate, usage completeness, attempts per request, and cost per successful task together. Keep final provider usage separate from estimates and unknown consumption.

A financial budget threshold may warrant a ticket, a product decision, or automatic admission controls rather than an availability page. Define the action before enabling the alert. Avoid using a fluctuating denominator to declare a cost regression without checking workload mix.

Quality is usually evaluated on a sample or with delayed labels. Report rubric version, sample size, coverage, and evaluator availability. Keep a judge outage separate from a rise in incorrect answers. A rule such as "quality fell below 90 percent" is incomplete without a sampling design and minimum evidence requirement.

Use representative evaluation for trend detection and retained failure traces for diagnosis. Do not treat the curated collection of known bad answers as a population estimate.

## Attach a Concrete Response Plan

Every alert should identify the affected feature, configuration version, indicator, and relevant trace examples. A reliability alert may lead to provider fallback or rollback. A parser regression may require restoring a schema or prompt revision. A cost alert may require reducing retries or changing routing.

Exercise alerts with synthetic failed, slow, expensive, and low-quality cases. Confirm denominators, grouping, missing-data behavior, and recovery. Then review whether the on-call engineer can choose an action from the alert without first rebuilding the entire measurement model.

## Conclusion

LLM SLOs work when each dimension has an explicit population and outcome contract. Use unbiased metrics for service ratios, budget burn for actionable paging, and provenance-aware signals for cost and quality.

## Official Documentation

- [Google SRE workbook: alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Prometheus instrumentation and missing metrics](https://prometheus.io/docs/practices/instrumentation/)
- [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/)
