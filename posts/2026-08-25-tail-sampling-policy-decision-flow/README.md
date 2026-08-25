# Why Multiple Tail-Sampling Policies Do Not Behave Like a Simple OR—and How Drop Vetoes Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Sampling Policies, Observability

Description: Understand final tail-sampling precedence, hard drop policies, soft non-matches, nested policy logic, and the effects of early policy evaluation.

---

It is tempting to read a tail-sampling `policies` list as `policy_a OR policy_b OR policy_c`. That is close for ordinary positive policies, but it misses the most important rule: a `Dropped` decision vetoes every sampled vote. It also ignores nested `and`, `not`, and `composite` semantics and optional early evaluation.

## Start with the Final Precedence

For current non-deprecated decisions, the processor's trace-complete flow is:

1. If any policy returns `Dropped`, do not sample the trace.
2. Otherwise, if any policy returns `Sampled`, sample the trace.
3. Otherwise, do not sample the trace.

An ordinary `NotSampled` means “this policy did not select the trace.” It does not mean “no policy may select it.” This is why a top-level route policy that does not match cannot suppress a separate error policy.

Deprecated inverted decision types add historical precedence rules and are another reason to migrate `invert_match` to explicit wrappers.

## Build Hard Vetoes with `drop`

```yaml
processors:
  tail_sampling:
    sample_on_first_match: false
    policies:
      - name: legal-do-not-export
        type: drop
        drop:
          drop_sub_policy:
            - name: prohibited
              type: boolean_attribute
              boolean_attribute:
                key: app.do_not_sample
                value: true
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 1500
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

An error trace with `app.do_not_sample=true` is dropped. An error trace without that attribute is sampled. A routine trace is sampled only if the probabilistic policy selects it.

Within one `drop` wrapper, every `drop_sub_policy` must return a matching sampled outcome before the wrapper emits `Dropped`. That makes the list an AND. Put alternative exact values in one attribute policy or use separate top-level drop policies for independent vetoes.

Current processor loading moves all top-level drop policies ahead of non-drop policies while preserving their relative groups. Evaluation stops as soon as a drop returns `Dropped`.

## Understand the Nested Operators

- `and` returns sampled only when all its subpolicies match. Its non-match is still a soft top-level `NotSampled`.
- `not` flips `Sampled` and `NotSampled` for one wrapped policy. It creates a positive complement, not a hard veto.
- `drop` returns `Dropped` when all its subpolicies match.
- `composite` checks ordered subpolicies and applies span-per-second allocations; it emits one top-level vote.

For example, “sample slow checkout traces” belongs in `and`. “sample traces that are not health checks” can use `not`. “never export prohibited traces” requires `drop`.

## Decide Whether to Use `sample_on_first_match`

The default false setting evaluates all policies unless a drop short-circuits. With `sample_on_first_match: true`, evaluation stops after the first sampled policy. Because current loading places drop policies first, a top-level hard drop still gets its chance before ordinary samples.

Early matching can reduce decision time for expensive policy lists, but it changes diagnostics and interactions with stateful policies:

- later policy vote metrics are not recorded for that trace;
- later token buckets or composite allocations are not consulted;
- `recordpolicy` attributes identify the first sampled policy reached; and
- policy order among non-drop policies becomes operationally significant.

Keep it false until a replay proves that skipped evaluations are harmless.

## Read Policy Metrics as Votes

The generated per-policy counters expose `policy` and `decision`. A useful sampled-vote ratio is:

```promql
sum by (policy) (
  rate(otelcol_processor_tail_sampling_count_traces_sampled{decision="sampled"}[5m])
)
/
sum by (policy) (
  rate(otelcol_processor_tail_sampling_count_traces_sampled[5m])
)
```

That is not the final trace retention rate. A trace counted as sampled for the error policy can later be vetoed by a drop policy—although current drop-first ordering often means later policies are never evaluated in that case. Use `global_count_traces_sampled` for final decisions and compare exporter output when validating rules.

## Test a Decision Matrix

For the example configuration, create fixtures for:

| Trace facts | Expected result |
| --- | --- |
| prohibited and error | Dropped |
| prohibited and slow | Dropped |
| error only | Sampled |
| slow only | Sampled |
| neither, baseline hash passes | Sampled |
| neither, baseline hash fails | Not sampled |

Split facts across several OTLP batches and test late arrival. In `trace-complete`, the wait window determines whether all facts participate. `span-ingest` has different pending and per-batch evaluation semantics, so do not reuse the same truth table without replaying it.

## Official Documentation

- [Tail-sampling policy decision flow](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#policy-decision-flow)
- [Tail-sampling policy configuration types](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Final decision and drop-first implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)
- [`drop` evaluator semantics](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/drop.go)
- [`not` evaluator semantics](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/not.go)

## Conclusion

Ordinary sampled votes act like OR, ordinary non-matches do not veto, and `Dropped` overrides them all. Put non-negotiable exclusions in explicit top-level drop policies, use nested operators for positive classification, and validate `sample_on_first_match`, ordering, and policy metrics against a trace-level decision matrix.
