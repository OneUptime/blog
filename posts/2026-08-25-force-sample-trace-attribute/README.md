# Force-Sample a Trace While Preserving a Hard Do-Not-Sample Rule

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Debugging, Data Governance

Description: Add a trusted force-sample escape hatch while ensuring a top-level drop policy always wins when a trace carries a non-negotiable do-not-sample marker.

---

An attribute-based force-sample switch is useful for a support session or one reproducible request. It becomes dangerous when it can override a privacy, compliance, or explicit do-not-export rule.

The tail sampler needs two different decision types: a normal `Sampled` vote for the escape hatch and a `Dropped` veto for the hard exclusion.

## Configure Both Intentions Explicitly

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 20s
    sample_on_first_match: false
    policies:
      - name: hard-do-not-sample
        type: drop
        drop:
          drop_sub_policy:
            - name: do-not-sample-attribute
              type: boolean_attribute
              boolean_attribute:
                key: app.do_not_sample
                value: true
      - name: operator-force-sample
        type: boolean_attribute
        boolean_attribute:
          key: app.force_sample
          value: true
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

Current tail-sampling loading puts top-level drop policies before ordinary policies. The final decision logic gives `Dropped` precedence over `Sampled`. A trace containing both boolean attributes is therefore dropped; the force attribute cannot rescue it.

Do not express the hard rule as a top-level `not` or a normal boolean policy that returns `NotSampled`. Ordinary non-sampled votes are soft: another policy can still sample the trace.

## Decide Where the Attribute Must Appear

The boolean attribute policy scans resource and span attributes in the received trace and matches if any value equals the configured boolean. Put the force marker on the root span or propagate it consistently so it reaches the tail sampler within the decision window.

Use a real boolean value:

```text
app.force_sample = true
```

A textual true value is not the same value type for `boolean_attribute`.

If different spans carry contradictory values, the presence of any `true` value matches. Define one trusted writer and strip untrusted copies before the tail sampler.

## Treat the Escape Hatch as Privileged Input

Do not allow an arbitrary public request header to become `app.force_sample=true` without authorization and rate control. Otherwise a client can bypass sampling budgets and create an ingestion-cost incident.

A safer flow is:

1. an authenticated operator creates a short-lived diagnostic token;
2. a trusted edge validates it and sets a bounded internal attribute;
3. instrumentation propagates the decision through the trace;
4. the Collector removes or ignores untrusted user-provided versions; and
5. an audit metric counts forced traces.

Keep the hard do-not-sample marker controlled by an even stronger trust boundary. If it protects sensitive data, sampling is only one defense: redact at instrumentation to keep the data out of Collector memory, or at the earliest processor in every applicable Collector pipeline to minimize exposure in buffers, logs, and other branches before the tail drop.

## Preserve Whole-Trace Precedence

Use `trace-complete` and a wait that covers relevant spans. If the do-not-sample marker arrives after a force-sampled decision, late spans follow that decision while it remains in memory; configure `decision_cache.sampled_cache_size` to preserve the sampled outcome after eviction. Neither path can retroactively delete exported spans.

Trace-ID routing is equally important. A force marker on one tail-sampling replica and a hard-drop marker on another produces incomplete evidence. Use the documented trace-ID load-balancing tier.

Although current code sorts drop policies before samples, keep `sample_on_first_match: false` for clear diagnostics and version-tested behavior. It also allows per-policy vote metrics for later matching policies when no drop short-circuits.

## Distinguish Other Sampling Overrides

The standalone `probabilistic_sampler` processor recognizes a special `sampling.priority` attribute. That is a different component and precedence model. The tail-sampling configuration above uses ordinary boolean policies and a hard drop.

An SDK head sampler can still defeat the force request. If the SDK does not record and export the marked span, the Collector never sees it. Ensure the upstream sampler and propagation strategy admit diagnostic traces before depending on the tail attribute.

## Test the Four Outcomes

| `app.force_sample` | `app.do_not_sample` | Expected final result |
| --- | --- | --- |
| false/missing | false/missing | Other policies decide |
| true | false/missing | Sampled |
| false/missing | true | Dropped |
| true | true | Dropped |

Send the two attributes in separate OTLP batches and reverse their arrival order. Test just before and after `decision_wait`, during replica rollout, and with an upstream head drop. Inspect final exporter output in addition to per-policy counters.

## Official Documentation

- [Tail-sampling practical force and do-not-sample example](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#a-practical-example)
- [Tail-sampling final decision flow](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#policy-decision-flow)
- [Boolean and drop policy configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Drop-first loading and final precedence implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)

## Conclusion

Make force-sample a normal positive boolean policy and make do-not-sample a top-level drop policy. The hard drop then wins even when both attributes are present. Protect attribute provenance, wait for the whole trace, preserve trace-ID affinity, and remember that neither marker can recover a span rejected by the SDK.
