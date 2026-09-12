# Sample LLM Traces Without Hiding Hallucinations and Tool Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, Monitoring

Description: Combine baseline sampling, failure-aware retention, and delayed evaluation records to reduce trace volume while keeping rare LLM failures diagnosable.

Keeping every LLM trace can become expensive, especially when agents create many spans and capture large messages. Randomly keeping one percent is cheap, but it can remove the only examples of a rare tool failure or newly introduced answer defect.

A useful sampling design has two purposes: preserve enough representative traffic to measure ordinary behavior, and retain enough evidence to investigate known failures. These purposes need separate policies and honest limits.

## Understand When a Decision Is Possible

Head sampling decides near the start of a trace. It cannot know that the answer will fail a grounding check thirty seconds later. Tail sampling waits for trace information and can use outcomes, duration, or attributes that appear near completion. Neither can recover spans already discarded upstream. [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/).

For failure-aware tail sampling, ensure the upstream SDK and collector path actually retain and forward the necessary spans. A one-percent head sampler followed by an error-retaining tail sampler still loses most errors before the second policy sees them.

Decide what constitutes failure before writing the policy. HTTP success is not proof of answer quality. Mark tool errors, parsing failures, loop termination, and completed synchronous evaluation outcomes using bounded application attributes.

## Keep a Baseline and Known Failures

The following collector configuration fragment illustrates a policy set. It assumes an OpenTelemetry Collector distribution that includes the tail sampling processor. The values are starting examples, not capacity recommendations.

```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: quality-failures
        type: string_attribute
        string_attribute:
          key: app.quality.outcome
          values: [fail]
      - name: slow-requests
        type: latency
        latency:
          threshold_ms: 15000
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

Add the processor to your trace pipeline and place downstream batching and export appropriately for the deployment. Do not assume declaring a processor activates it. Check the actual collector version's configuration and policy behavior before deployment. [Tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor).

These policies retain traces that satisfy the configured keep conditions, plus the probabilistic baseline. A string attribute such as `app.quality.outcome` must be emitted by your application or evaluator before the decision; it is not automatically inferred by OpenTelemetry.

## Plan for Delayed Hallucination Detection

A hallucination may be discovered minutes later by an evaluator or days later by a user. The original trace may already have been discarded. Increasing the collector wait to days is not a practical solution: it creates a large stateful buffer and still does not guarantee complete retention.

Keep a durable lightweight response record for all eligible requests: response ID, trace ID, configuration versions, outcome, usage status, and a permitted evidence reference. Store delayed evaluations separately, keyed to that response. Where content retention is allowed, use a bounded temporary evidence store with an expiry aligned to the evaluation window.

If no content may be retained, record that some retrospective failures cannot be fully reconstructed. Use the feedback to select an approved reproduction or synthetic case. A sampling policy cannot remove a privacy constraint or recreate missing evidence.

## Size and Route the Sampling Tier

Tail sampling is stateful. Spans for the same trace need to reach the same collector instance so the decision sees the full trace. Arbitrary round-robin routing can split evidence across instances and produce incomplete or inconsistent retention. [Tail sampling processor requirements](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor).

Estimate buffered trace count from arrival rate and the decision window, then account for burstiness and long-running agents. Trace count alone is insufficient: a ten-span request and a thousand-span agent have very different memory footprints. Bound payload capture before it reaches this tier.

Monitor early trace eviction, late spans, sampling decision latency, exporter failures, and memory pressure. An intended keep-all-errors policy is only as reliable as the pipeline that delivers those errors. Test behavior during collector restarts and traffic bursts.

## Do Not Compute SLOs from Biased Samples

A retained set that keeps every error and five percent of successes intentionally overrepresents failures. Dividing retained failures by retained requests produces a misleading error rate.

Use unsampled application metrics for request totals, duration histograms, and failure counters. Use sampled traces to explain those metrics. If analytical estimates must come from samples, retain sampling strata and inclusion probabilities and use an appropriate estimator; do not infer a uniform rate from mixed policies.

Quality estimates need their own sampling design. Review a representative sample of eligible answers, preserve the evaluator version, and report sample size and evaluation coverage. Known bad cases retained for debugging are valuable but are not a representative quality survey.

## Test What the Policy Can Actually Save

Send synthetic traces for a normal success, an ERROR span, a quality failure, and a slow request. Then delay the quality label beyond the decision window. Confirm the late case behaves as documented rather than assuming it will restore a discarded trace.

Repeat with spans routed across collector instances and with buffer pressure. These checks reveal whether your architecture supports the promise in the dashboard: rare failures should be easier to find, but retention still has defined timing and capacity limits.

## Conclusion

Combine representative baseline sampling with outcome-aware retention, and keep delayed quality evidence outside the collector's short decision window. Measure service health with unbiased metrics and use retained traces for diagnosis.

## Official Documentation

- [OpenTelemetry sampling concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [Collector pipelines](https://opentelemetry.io/docs/collector/configuration/)
