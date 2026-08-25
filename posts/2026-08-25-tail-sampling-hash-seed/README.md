# How to Keep Probabilistic Sampling Deterministic Across Collectors by Pinning `hash_seed`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Probabilistic Sampling, OpenTelemetry Collector, Distributed Tracing, Configuration

Description: Pin the probabilistic sampler's legacy hash mode across replicas, avoid invalid sequential hash tiers, and distinguish `hash_seed` from tail sampling's `hash_salt`.

---

The Collector Contrib `probabilistic_sampler` processor can make a stateless decision from a trace ID. In its legacy hash mode, the decision is a function of the trace ID, sampling percentage, and 32-bit `hash_seed`. Replicas with the same configuration therefore select the same trace IDs without sharing state.

Pin the seed explicitly even though its default is zero. An explicit value makes configuration drift visible and prevents an unnoticed default or template difference between deployments.

## Configure the Same Seed at One Tier

```yaml
processors:
  probabilistic_sampler:
    mode: hash_seed
    sampling_percentage: 10
    hash_seed: 314159265

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [probabilistic_sampler]
      exporters: [otlp]
```

`sampling_percentage` is a percentage, so `10` means 10%, not `0.10%`. `hash_seed` is an unsigned 32-bit integer. Keep both values identical across all Collectors that are replicas of the same logical sampling tier.

For trace spans, the processor hashes the trace ID, so all spans with that ID receive the same decision even if they happen to pass through different replicas. This provides decision determinism; it does not assemble a trace or make arbitrary content-based tail decisions.

That statement assumes the input does not already carry OpenTelemetry probability-sampling `rv` or `th` fields. Current legacy hash mode treats either field as an error and applies `fail_closed` behavior, rather than hashing that span normally.

## Keep Seed Consistency Within One Logical Tier

At one load-balanced tier, use the same seed so retrying or rerouting an item does not change its selection.

Do not extend the older same-seed/different-seed rule to a chain of current `hash_seed` processors. Current trace processing writes OpenTelemetry sampling randomness and threshold information into W3C `tracestate` on spans it keeps. A later `hash_seed` processor treats an existing `rv` or `th` value as an error because legacy hash mode is not intended to consume probability-sampling state.

With the current default `fail_closed: true`, that second legacy hash processor rejects the affected span. Setting `fail_closed: false` makes the error path pass the span rather than applying the requested second percentage, so it does not create the older independent-rate behavior either.

Some configuration comments still describe using different seeds at different tiers, reflecting the processor's earlier hash-only behavior. For a current multi-stage probability pipeline, use the probability-aware modes instead: `proportional` reduces the incoming effective probability by the configured ratio, while `equalizing` lowers it to a configured absolute probability when needed. Pin and replay the exact Collector version during migrations because this behavior is version-sensitive.

Seeds are not secrets and do not provide adversarially secure sampling. The hash mode uses a limited 14-bit legacy hash decision. If hostile clients control trace IDs, do not treat `hash_seed` as abuse protection.

## Do Not Confuse `hash_seed` and `hash_salt`

`hash_seed` belongs to the standalone `probabilistic_sampler` processor. The probabilistic policy inside `tail_sampling` has a different schema:

```yaml
processors:
  tail_sampling:
    policies:
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
          hash_salt: production-tail-v1
```

That `hash_salt` is a string and defaults to `default-hash-seed` in current source when unset. Supplying `hash_seed` under the tail policy is not the equivalent configuration.

The standalone processor is more efficient when the only desired rule is a fixed probabilistic sample. If the pipeline already incurs tail-sampling state for errors, latency, or whole-trace attributes, adding its probabilistic policy avoids a separate processor that could discard traces selected by those other rules.

## Consider the Probability-Aware Modes

Current `probabilistic_sampler` also supports `proportional` and `equalizing` modes based on OpenTelemetry probability-sampling information in W3C `tracestate`. Those modes use 56-bit randomness and propagate thresholds for adjusted counts. `hash_seed` selects the legacy FNV-based mode and does not provide the same standard probability semantics.

For a new probability-aware pipeline, evaluate those modes against the OpenTelemetry TraceState probability-sampling specification. Use `hash_seed` when compatibility with the existing hash selection is required, and set `mode: hash_seed` explicitly so an upgrade or reader cannot mistake the intent.

The tail sampler has a separate alpha `processor.tailsamplingprocessor.usetracestate` gate for its probabilistic policy. Review that feature independently; it does not rename `hash_salt` to `hash_seed`.

## Validate Determinism Before Rollout

Build a fixed corpus of trace IDs and send it to every replica's test endpoint. Compare the exact kept-ID set, not only aggregate percentages. Test:

1. same seed and same percentage;
2. one intentionally changed seed;
3. old and new Collector versions during a rolling upgrade;
4. retries routed to different replicas; and
5. input that already carries `ot` randomness or threshold fields; and
6. any sequential tier using `proportional` or `equalizing` with the intended effective probability.

Store the seed in normal version-controlled configuration. A ConfigMap checksum or deployment annotation helps prove that every replica loaded the same revision.

Deterministic sampling does not replace trace-ID affinity for tail sampling. Whole-trace policies still require every span to reach one stateful tail-sampling instance.

## Official Documentation

- [Probabilistic sampling processor modes and hash seed](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md#hash-seed)
- [`probabilistic_sampler` configuration struct](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/config.go)
- [Hash-mode implementation and default](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/sampler_mode.go)
- [Hash-mode handling of existing probability `tracestate`](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/tracesprocessor.go)
- [Tail-sampling probabilistic policy configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [OpenTelemetry TraceState probability sampling](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)

## Conclusion

Set `mode: hash_seed` and pin one explicit seed and percentage across replicas of a single logical probabilistic tier. Do not chain current legacy hash processors to obtain nested or independent rates; use the probability-aware modes for sequential sampling. Keep the schema distinction clear: the standalone processor uses numeric `hash_seed`; the tail-sampling probabilistic policy uses string `hash_salt`.
