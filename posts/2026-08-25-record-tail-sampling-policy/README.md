# Record Which Tail-Sampling Policy Kept a Trace with `recordpolicy`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Debugging, Observability

Description: Enable alpha tail-sampling policy attribution, interpret its policy, composite, and cache markers, and verify how downstream exporters preserve them.

---

Per-policy Collector metrics tell you how often a policy votes to sample, but they do not tell an operator looking at one exported trace why it was retained. The alpha `processor.tailsamplingprocessor.recordpolicy` feature gate adds sampling-policy attribution to kept telemetry.

This is useful for rule migrations, cost investigations, and finding an unexpectedly broad policy. It is diagnostic enrichment, not part of the stable trace semantic conventions.

## Enable the Alpha Feature Gate

The setting is a process feature gate, not a YAML field:

```sh
otelcol-contrib \
  --feature-gates=+processor.tailsamplingprocessor.recordpolicy \
  --config=/etc/otelcol/config.yaml
```

For a Kubernetes workload, place the feature-gate argument in the container's `args` and roll the entire tail-sampling tier consistently. A mixed fleet produces traces with inconsistent attribution.

The tail-sampling configuration continues to use named policies:

```yaml
processors:
  tail_sampling:
    decision_wait: 20s
    decision_cache:
      sampled_cache_size: 500000
      non_sampled_cache_size: 3000000
    policies:
      - name: retain-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: retain-slow
        type: latency
        latency:
          threshold_ms: 1500
      - name: baseline-five-percent
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

Names become telemetry values, so make them stable, low-cardinality identifiers. Do not put timestamps, ticket numbers that change every deploy, customer IDs, or dynamically generated text in policy names.

## Interpret the Three Attribution Keys

The official tail-sampling documentation defines:

| Key | Meaning |
| --- | --- |
| `tailsampling.policy` | Configured top-level policy associated with the sampled outcome |
| `tailsampling.composite_policy` | Composite subpolicy recorded by a composite policy that returned a sampled decision |
| `tailsampling.cached_decision` | Marks release through a remembered sampled decision |

The current implementation writes these through instrumentation-scope attributes on the outgoing `ScopeSpans` structures. Some backends flatten scope attributes into searchable trace metadata; others do not. Inspect an exported OTLP payload before writing queries that assume they are ordinary span attributes.

The README describes `tailsampling.policy` as present on normally sampled traces and documents special behavior for decision-cache paths. Current source retains the top-level policy name in cache metadata when available and marks cached releases with `tailsampling.cached_decision=true`, but older releases and empty cache metadata can differ. The cache does not retain the composite subpolicy, so a cached late batch does not restore `tailsampling.composite_policy`. Treat the cache marker as the reliable explanation that this batch reused a prior outcome.

There is also a current no-cache edge case. A late batch can find a sampled final decision while that trace entry still remains in the live in-memory trace map governed by `num_traces`; that path forwards the batch directly without policy re-evaluation, but it does not add the cache marker or reapply the policy attribute. Do not treat absence of all three keys as proof that tail sampling did not retain a batch.

## Know Which Policy Gets Credit

Several positive policies can match one trace. In the normal trace-complete decision loop, the processor associates the first policy that returns a sampled decision with the final sampled outcome. It does not attach an array of every matching policy.

Therefore:

- order among non-drop policies affects attribution;
- `sample_on_first_match: true` stops after the first sample and makes that order even more significant;
- a later matching policy does not replace the first attribution; and
- a hard drop means the trace is not exported, so there is no retained trace to annotate.

When `tailsampling.policy` names a composite, `tailsampling.composite_policy` identifies the subpolicy that its allocation logic allowed. With the default `sample_on_first_match: false`, however, composite evaluators write the subpolicy attribute as they run, while the processor assigns top-level credit to the first policy that sampled. A later matching composite can therefore leave a composite subpolicy beside an earlier non-composite top-level policy, and the last of multiple matching composites can overwrite the subpolicy value. Use `sample_on_first_match: true` or mutually exclusive matches if you require the two keys to form an unambiguous pair during normal evaluation.

The processor moves top-level `drop` policies to the front automatically. Among non-drop policies, choose the order to reflect the explanation you want; a common order is exceptional rules such as errors, then latency, then a probabilistic baseline.

## Use Metrics for the Full Vote Picture

The top-level attribution answers “which policy got credit for this exported trace?” It does not answer “which other policies also matched?” Use the generated policy counters for that:

```promql
sum by (policy, decision) (
  rate(otelcol_processor_tail_sampling_count_traces_sampled[5m])
)
```

Compare with:

```promql
sum by (decision) (
  rate(otelcol_processor_tail_sampling_global_count_traces_sampled[5m])
)
```

When `sample_on_first_match` is enabled or a drop short-circuits, later policies are not evaluated and their counters naturally omit those traces.

## Validate Backend Preservation

Send one fixed trace for each policy and one late batch for a sampled trace. Capture OTLP immediately after tail sampling with a controlled debug or test exporter and verify:

1. the top-level policy name is correct;
2. composite attribution reflects the expected composite match, including overlap behavior when full evaluation is enabled;
3. the late batch has the cache marker;
4. the production exporter preserves scope attributes; and
5. backend indexing does not turn these values into uncontrolled cardinality.

If another processor rewrites instrumentation scope or converts trace formats, repeat the check after that component. Policy attribution cannot help incident response if it disappears before storage.

## Plan for Feature Evolution

The generated component documentation marks `recordpolicy` alpha. Pin a Collector version, review the component changelog and generated feature-gate table on upgrade, and keep dashboards tolerant of missing attribution. Do not make billing, compliance, or data-retention enforcement depend solely on an alpha annotation.

## Official Documentation

- [Tail-sampling policy tracking](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#tracking-sampling-policy)
- [Tail-sampling generated feature gates and metrics](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [Policy attribution and cached-decision implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)
- [Scope-attribute helper used for attribution](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/util.go)

## Conclusion

Enable `recordpolicy` when trace-level explanations justify an alpha feature, give policies stable names, and interpret `tailsampling.policy` as first-policy attribution rather than a complete match set. Verify scope-attribute preservation through the real exporter and pair the annotation with per-policy and final-decision metrics.
