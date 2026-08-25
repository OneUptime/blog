# Why Tail Sampling Cannot Recover an Error Trace Dropped by the SDK—and How to Set the Upstream Sampler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, SDK Sampling, Distributed Tracing, OpenTelemetry Collector

Description: Configure SDK head sampling so decision-relevant spans reach the Collector, and understand the parent, remote-boundary, and capacity tradeoffs tail sampling cannot undo.

---

An SDK sampler runs when a span is created. If it returns `DROP`, the span is not recording and normal span processors and exporters do not deliver a completed span to the Collector. A tail sampler cannot infer that missing span later, even if the operation eventually returns HTTP 500 or throws an exception.

Tail sampling can select only from telemetry that survived every upstream stage.

## Keep the Trace Recording Path Open

The general OpenTelemetry SDK environment configuration defaults to:

```sh
export OTEL_TRACES_SAMPLER=parentbased_always_on
```

This is `ParentBased(root=AlwaysOn)`: new root traces are recorded and sampled, and ordinary child decisions follow the sampled flag of their parent. When all participating services use this model and no earlier component drops spans, the Collector receives the trace population needed for error, latency, and attribute-based tail decisions.

Support for environment variables varies by language and distribution. Verify the language-specific compliance and startup logs rather than assuming the variable was honored.

Do not combine an upstream ratio sampler with an expectation that tail sampling will keep every rare error:

```sh
# Only about 10% of root traces can ever reach the tail sampler.
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.10
```

An error that occurs after span creation cannot change a root decision already made by a fixed head sampler. The tail sampler can keep 100% of errors only within the approximately 10% population admitted upstream.

## Account for Remote Unsampled Parents

`ParentBased(root=AlwaysOn)` does not mean “always record every span.” The ParentBased specification has separate branches for remote/local and sampled/not-sampled parents. By default, a remote parent whose sampled flag is false invokes `AlwaysOff`.

This matters at public edges and migration boundaries. A request from an external or previously head-sampled system can carry an unsampled parent, causing the first internal service to drop its span even though its root delegate is AlwaysOn.

Choose the boundary deliberately:

- preserve the parent decision when end-to-end trace consistency is more important and the upstream sampler is trusted;
- configure language-specific ParentBased branches so `remoteParentNotSampled` records when the internal tail tier needs visibility; or
- use `AlwaysOn` at a controlled boundary, understanding that upstream portions can remain absent and sampled flags can change within the distributed trace.

The standard environment names do not expose every ParentBased branch in every SDK. Custom programmatic sampler configuration may be required. Document the resulting partial-trace behavior.

## Audit Every Pre-Tail Drop Point

SDK configuration is only the first gate. Check for:

- agent or auto-instrumentation sampler settings;
- collector `probabilistic_sampler` or filter processors before the tail tier;
- load shedding and memory-limiter refusals;
- exporter queue overflow and retry exhaustion;
- receivers rejecting oversized requests; and
- vendor gateways applying their own sampling.

The tail sampler's `trace_flags` policy can preserve traces whose sampled flag was already set, but it cannot restore spans that were not exported.

## Size the Full-Fidelity Path

Moving from 10% head sampling to an all-recording upstream path can multiply SDK CPU, allocation, export bandwidth, Collector ingestion, and pending tail state. Roll out in stages:

1. Measure spans, trace IDs, and bytes per second at the current rate.
2. Estimate the all-on multiplier and verify SDK batch queues.
3. Scale the trace-ID load-balancing and tail-sampling tiers.
4. Recalculate `num_traces`, memory or tail storage, decision caches, and exporter queues.
5. Set `maximum_trace_size_bytes` and overload alerts.

Tail sampling moves cost downstream; it does not make recording every span free.

## Verify with a Deliberately Unsampled Error

Create a test endpoint whose root head decision is known. Under an AlwaysOff or zero-ratio configuration, trigger an error and confirm no span reaches a debug receiver before tail sampling. Then switch to the intended sampler and verify the error policy retains it:

```yaml
processors:
  tail_sampling:
    decision_wait: 15s
    policies:
      - name: retain-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
```

Repeat with a sampled remote parent and an unsampled remote parent. This exposes ParentBased boundary behavior that a locally started root test misses.

## Official Documentation

- [OpenTelemetry Tracing SDK sampler specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampler)
- [General SDK sampler environment configuration](https://opentelemetry.io/docs/languages/sdk-configuration/general/#otel_traces_sampler)
- [OpenTelemetry trace API recording and status behavior](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [Tail-sampling processor policies and requirements](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)

## Conclusion

Use an all-recording, consistently propagated SDK path when tail policies must see every possible error or slow trace. `parentbased_always_on` is the standard starting point, but audit remote unsampled parents and every processor before the tail tier. Then capacity-plan the much larger full-fidelity stream—the Collector cannot sample data that never arrives.
